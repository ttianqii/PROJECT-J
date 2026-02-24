import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, RefreshCw } from 'lucide-react'
import { transcribeAudio, assessPronunciation, lookupWord } from '../services/api'
import type { LearnerMode, VocabEntry, TranscribeResponse, AssessResponse } from '../types'
import { WordCard } from './WordCard'
import { AccuracyFeedback } from './AccuracyFeedback'
import SiriOrb from './SiriOrb'

interface Props {
  mode: LearnerMode
  dataset: VocabEntry[]
}

/** Find the best matching vocab entry for transcribed text. */
function findMatch(transcribed: string, dataset: VocabEntry[]): VocabEntry | null {
  const t = transcribed.trim().toLowerCase()
  if (!t) return null
  // 1. Exact match on word or reading
  const exact = dataset.find(
    (e) =>
      e.word.trim().toLowerCase() === t ||
      e.reading.trim().toLowerCase() === t ||
      e.romanization.trim().toLowerCase() === t,
  )
  if (exact) return exact
  // 2. Partial: transcribed includes word, or word includes transcribed
  return (
    dataset.find(
      (e) =>
        t.includes(e.word.trim().toLowerCase()) ||
        e.word.trim().toLowerCase().includes(t) ||
        t.includes(e.reading.trim().toLowerCase()),
    ) ?? null
  )
}

export default function FreeSpeak({ mode, dataset }: Props) {
  const lang = mode === 'th-ja' ? 'ja' : 'th'
  const isJapanese = lang === 'ja'

  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transcribeResult, setTranscribeResult] = useState<TranscribeResponse | null>(null)
  const [matchedEntry, setMatchedEntry] = useState<VocabEntry | null>(null)
  const [practiceRecording, setPracticeRecording] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [assessResult, setAssessResult] = useState<AssessResponse | null>(null)
  const [practiceError, setPracticeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [interimText, setInterimText] = useState('')   // live Web Speech API interim transcript

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const practiceMediaRef = useRef<MediaRecorder | null>(null)
  const practiceChunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceRafRef = useRef<number | null>(null)
  const [hasSound, setHasSound] = useState(false)

  // Direct DOM ref for CSS-var driven orb reactivity (no re-renders)
  const orbRef = useRef<HTMLDivElement>(null)
  // Exponential moving average — prevents flickering from raw RMS
  const smoothRmsRef = useRef(0)

  const resetOrbVars = () => {
    smoothRmsRef.current = 0
    orbRef.current?.style.removeProperty('--orb-shadow')
    orbRef.current?.style.removeProperty('--orb-scale')
  }

  // Web Speech API instance (interim-only, runs in parallel with MediaRecorder)
  const srRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SRConstructor = (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SRConstructor) return
    const sr = new SRConstructor()
    sr.continuous = true
    sr.interimResults = true
    srRef.current = sr
  }, [])

  const accentColor = isJapanese ? 'text-red-400' : 'text-amber-400'
  const accentBg = isJapanese ? 'bg-red-500/10' : 'bg-amber-500/10'
  const accentBorder = isJapanese ? 'border-red-500/30' : 'border-amber-500/30'

  // ── Detect recording ──────────────────────────────────────────────────────
  const startDetect = async () => {
    // Always reset previous result immediately before starting
    setTranscribeResult(null)
    setMatchedEntry(null)
    setAssessResult(null)
    setPracticeError(null)
    setError(null)
    setInterimText('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        // Clean up silence detection
        if (silenceRafRef.current) cancelAnimationFrame(silenceRafRef.current)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        audioCtxRef.current?.close()
        audioCtxRef.current = null
        setHasSound(false)
        resetOrbVars()
        try { srRef.current?.stop() } catch { /* ignore */ }
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
        setLoading(true)
        try {
          const res = await transcribeAudio(blob, lang)
          setTranscribeResult(res)
          if (res.ok && res.transcribed) {
            const preset = findMatch(res.transcribed, dataset)
            if (preset) {
              setMatchedEntry(preset)
            } else {
              // Not in presets — ask GPT-4o for full word data
              const looked = await lookupWord(res.transcribed, lang)
              if (looked.ok && looked.entry) setMatchedEntry(looked.entry)
            }
          } else {
            setError(res.error ?? 'Transcription failed')
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
          setLoading(false)
        }
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)

      // ── Web Speech API — live interim transcript only ──────────────────────
      if (srRef.current) {
        const sr = srRef.current
        sr.lang = lang === 'ja' ? 'ja-JP' : 'th-TH'
        sr.onresult = (event: Event & { resultIndex: number; results: SpeechRecognitionResultList }) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript
            // Accumulate final + interim into one live string
            interim += text
          }
          setInterimText(interim)
        }
        sr.onerror = () => { /* ignore SR errors, Whisper is the source of truth */ }
        sr.onend = () => { /* no-op */ }
        try { sr.start() } catch { /* already started */ }
      }

      // ── Silence detection via Web Audio API ──────────────────────────────
      const SILENCE_THRESHOLD = 10   // RMS below this = silent
      const SILENCE_DELAY_MS  = 2000 // auto-stop after 2 s of silence
      const MIN_SPEAK_MS      = 300  // don't start countdown until user has spoken for at least 300ms

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      let lastVoiceAt = Date.now()
      let hasSpoken = false
      let scheduledStop: ReturnType<typeof setTimeout> | null = null

      const poll = () => {
        analyser.getByteTimeDomainData(dataArray)
        // Compute RMS volume
        let sumSq = 0
        for (const v of dataArray) sumSq += (v - 128) ** 2
        const rms = Math.sqrt(sumSq / dataArray.length)

        // ── Voice-reactive orb: smooth RMS → scale + glow (zero re-renders) ──
        // Exponential MA: raw spikes don’t hit the DOM; CSS transition does the easing
        smoothRmsRef.current = smoothRmsRef.current * 0.82 + rms * 0.18
        const s = smoothRmsRef.current
        if (orbRef.current) {
          const level  = Math.min(s / 48, 1)
          // Scale: 1.0 (silent) → 1.22 (loudest) — CSS transition(0.15s) smooths it
          orbRef.current.style.setProperty('--orb-scale', (1 + level * 0.22).toFixed(3))
          // Glow: GPU-composited box-shadow, no repaint, no flicker
          const glow   = Math.round(52 + level * 95)
          const alpha1 = Math.min(0.32 + level * 0.55, 0.87).toFixed(2)
          const alpha2 = Math.min(0.12 + level * 0.24, 0.36).toFixed(2)
          orbRef.current.style.setProperty('--orb-shadow',
            `0 0 ${glow}px rgba(230,80,0,${alpha1}), 0 0 ${glow * 2}px rgba(249,188,41,${alpha2})`)
        }

        if (rms > SILENCE_THRESHOLD) {
          hasSpoken = true
          lastVoiceAt = Date.now()
          setHasSound(true)
          if (scheduledStop) { clearTimeout(scheduledStop); scheduledStop = null }
        } else if (hasSpoken) {
          const silentFor = Date.now() - lastVoiceAt
          const remaining = Math.max(0, SILENCE_DELAY_MS - silentFor)
          setHasSound(false)
          if (!scheduledStop && silentFor >= MIN_SPEAK_MS) {
            scheduledStop = setTimeout(() => {
              if (mediaRef.current) {
                mediaRef.current.stop()
                mediaRef.current = null
                setRecording(false)
              }
            }, remaining)
            silenceTimerRef.current = scheduledStop
          }
        }

        silenceRafRef.current = requestAnimationFrame(poll)
      }
      silenceRafRef.current = requestAnimationFrame(poll)
    } catch {
      setError(isJapanese
        ? 'ไม่สามารถเข้าถึงไมค์ได้ กรุณาอนุญาตการใช้ไมค์'
        : 'マイクにアクセスできません。許可してください。')
    }
  }

  const stopDetect = () => {
    if (silenceRafRef.current) cancelAnimationFrame(silenceRafRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    setHasSound(false)
    resetOrbVars()
    try { srRef.current?.stop() } catch { /* ignore */ }
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
  }

  // ── Practice recording (scored against matched word) ──────────────────────
  const startPractice = async () => {
    setPracticeError(null)
    setAssessResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      practiceChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) practiceChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (!matchedEntry) return
        const blob = new Blob(practiceChunksRef.current, { type: practiceChunksRef.current[0]?.type || 'audio/webm' })
        setPracticeLoading(true)
        try {
          const res = await assessPronunciation(blob, matchedEntry.word, matchedEntry.romanization, lang)
          setAssessResult(res)
        } catch (e) {
          setPracticeError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
          setPracticeLoading(false)
        }
      }
      mr.start()
      practiceMediaRef.current = mr
      setPracticeRecording(true)
    } catch {
      setPracticeError(isJapanese
        ? 'ไม่สามารถเข้าถึงไมค์ได้'
        : 'マイクにアクセスできません')
    }
  }

  const stopPractice = () => {
    practiceMediaRef.current?.stop()
    practiceMediaRef.current = null
    setPracticeRecording(false)
  }

  const resetAll = () => {
    try { srRef.current?.stop() } catch { /* ignore */ }
    setInterimText('')
    setTranscribeResult(null)
    setMatchedEntry(null)
    setAssessResult(null)
    setPracticeError(null)
    setError(null)
  }

  /** Tap a preset chip to instantly load its WordCard */
  const pickPreset = (entry: VocabEntry) => {
    setMatchedEntry(entry)
    setTranscribeResult(null)
    setAssessResult(null)
    setPracticeError(null)
    setError(null)
  }

  // Derive "complete" = transcription done, not loading, result is good
  const isComplete = !loading && !recording && transcribeResult?.ok && !!transcribeResult.transcribed
  // GPT lookup phase: Whisper done, still asking GPT-4o
  const isLookingUp = loading && !!transcribeResult?.transcribed
  // What to show in the YOU SAID card
  const displayText = (transcribeResult?.ok && transcribeResult.transcribed)
    ? transcribeResult.transcribed  // Whisper final result
    : interimText                   // live Web Speech API interim

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 20, paddingTop: 36, paddingBottom: 36, paddingLeft: 20, paddingRight: 20,
      maxWidth: 400, margin: '0 auto',
    }}>

      {/* ── Orb hero ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

        {/* Ring container */}
        <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
          <div style={{ animation: 'orb-float 5s ease-in-out infinite', position: 'relative' }}>

            {/* Loading scan-arc halo */}
            {loading && (
              <>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 218, height: 218, marginTop: -109, marginLeft: -109,
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, transparent 48%, rgba(249,115,22,0.12) 65%, rgba(251,146,60,0.55) 84%, rgba(255,200,80,0.95) 97%, rgba(255,220,120,1) 100%)',
                  WebkitMask: 'radial-gradient(circle, transparent 98px, black 100px, black 108px, transparent 110px)',
                  mask: 'radial-gradient(circle, transparent 98px, black 100px, black 108px, transparent 110px)',
                  boxShadow: '0 0 28px 6px rgba(251,146,60,0.30)',
                  animation: 'scan-arc-spin 1.55s linear infinite', pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: 232, height: 232, marginTop: -116, marginLeft: -116,
                  borderRadius: '50%',
                  background: 'conic-gradient(from 180deg, transparent 60%, rgba(249,115,22,0.06) 78%, rgba(251,146,60,0.20) 95%, rgba(251,146,60,0.28) 100%)',
                  WebkitMask: 'radial-gradient(circle, transparent 108px, black 110px, black 115px, transparent 117px)',
                  mask: 'radial-gradient(circle, transparent 108px, black 110px, black 115px, transparent 117px)',
                  animation: 'scan-arc-spin 3.8s linear infinite reverse', pointerEvents: 'none',
                }} />
              </>
            )}

            {/* Voice pulse rings */}
            {recording && hasSound && (
              [0, 0.6, 1.2].map((delay) => (
                <span key={delay} className="absolute rounded-full pointer-events-none" style={{
                  width: 192, height: 192, top: '50%', left: '50%', translate: '-50% -50%',
                  border: '1.5px solid rgba(251,146,60,0.60)',
                  animation: `siri-pulse 2.2s cubic-bezier(0.4,0,0.6,1) ${delay}s infinite`,
                }} />
              ))
            )}

            {/* Orb tap button */}
            <button
              onClick={recording ? stopDetect : !loading ? startDetect : undefined}
              disabled={loading || practiceRecording}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              style={{
                position: 'relative', width: 192, height: 192,
                borderRadius: '50%', padding: 0, border: 'none', background: 'none',
                outline: 'none', cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SiriOrb ref={orbRef} size={192} />
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {!loading && (
                  <Mic style={{
                    width: 34, height: 34,
                    color: recording ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.28)',
                    filter: recording ? 'drop-shadow(0 0 14px rgba(255,255,255,0.7))' : 'none',
                    transform: recording && hasSound ? 'scale(1.25)' : recording ? 'scale(1.07)' : 'scale(1)',
                    transition: 'all 0.25s ease',
                  }} />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Status label */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.20em',
          textTransform: 'uppercase', fontWeight: 500,
          transition: 'color 0.4s ease', margin: 0,
          color: recording ? 'rgba(251,146,60,0.90)'
            : loading ? 'rgba(251,146,60,0.40)'
            : isComplete ? 'rgba(251,146,60,0.55)'
            : 'rgba(255,255,255,0.16)',
        }}>
          {recording
            ? (isJapanese ? 'กำลังฟัง...' : 'Listening...')
            : loading
              ? (isJapanese ? 'วิเคราะห์...' : 'Analyzing...')
              : isComplete
                ? (isJapanese ? 'เสร็จสิ้น' : 'Complete')
                : (isJapanese ? 'แตะเพื่อพูด' : 'Tap to speak')}
        </p>

        {/* Waveform bars */}
        {recording && (
          <div className="flex items-end gap-0.75" style={{ height: 22, opacity: hasSound ? 0.85 : 0.18 }}>
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="bar" style={{
                '--i': i,
                height: `${[38,62,82,100,88,100,82,62,38][i]}%`,
                background: hasSound ? 'rgba(251,146,60,0.85)' : 'rgba(255,255,255,0.15)',
                animationPlayState: hasSound ? 'running' : 'paused',
              } as React.CSSProperties} />
            ))}
          </div>
        )}
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          width: '100%', padding: '10px 14px',
          borderRadius: 10, animation: 'fadeUp 0.3s ease both',
          border: '1px solid rgba(248,113,113,0.15)',
          background: 'rgba(248,113,113,0.05)',
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'rgba(252,165,165,0.80)',
        }}>
          {error}
        </div>
      )}

      {/* ── You said card ────────────────────────────────────────────────── */}
      {displayText && (
        <div style={{
          width: '100%', padding: '16px 18px',
          borderRadius: 14, animation: 'fadeUp 0.25s ease both',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
                marginBottom: 8, margin: '0 0 8px',
              }}>
                {isJapanese ? 'you said' : 'you said'}
              </p>
              {recording && (
                <p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: 0,
                  color: isJapanese ? '#f87171' : '#fb923c' }}>
                  {interimText}
                </p>
              )}
              {!recording && transcribeResult?.ok && transcribeResult.transcribed && (
                <p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: 0,
                  color: isJapanese ? '#f87171' : '#fb923c' }}
                  key={transcribeResult.transcribed}>
                  {transcribeResult.transcribed.split(/\s+/).map((word, i) => (
                    <span key={i} className="word-appear" style={{ animationDelay: `${i * 0.07}s` }}>
                      {word}{' '}
                    </span>
                  ))}
                </p>
              )}
              {loading && !transcribeResult && interimText && (
                <p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: 0,
                  color: isJapanese ? '#f87171' : '#fb923c', opacity: 0.35 }}>
                  {interimText}
                </p>
              )}
            </div>
            {!loading && !recording && (
              <button onClick={resetAll} title="Reset" style={{
                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                color: 'rgba(255,255,255,0.18)', marginTop: 2, flexShrink: 0,
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.50)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Pronunciation guide — loading skeleton ────────────────────────── */}
      {isLookingUp && (
        <div style={{
          width: '100%', padding: '16px 18px', borderRadius: 14,
          animation: 'fadeUp 0.35s ease both',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', margin: '0 0 12px' }}>
            pronunciation guide
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="thinking"><span /><span /><span /></div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
              {isJapanese ? 'Generating guide...' : 'Generating guide...'}
            </span>
          </div>
        </div>
      )}

      {/* ── WordCard + practice ───────────────────────────────────────────── */}
      {matchedEntry && !loading && (
        <>
          {/* Back / reset link */}
          <button onClick={resetAll} style={{
            alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.10em',
            color: 'rgba(255,255,255,0.18)', transition: 'color 0.2s', marginBottom: -4,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
          >
            <RefreshCw size={10} />
            {isJapanese ? 'กลับ / พูดคำอื่น' : '戻る / 別の語を話す'}
          </button>

          <WordCard entry={matchedEntry} mode={mode} />

          {/* Practice card */}
          <div style={{
            width: '100%', padding: '16px 18px', borderRadius: 14,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', margin: '0 0 14px',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mic size={10} style={{ opacity: 0.5 }} />
              {isJapanese ? 'ฝึกออกเสียง' : '発音練習'}
            </p>

            {assessResult ? (
              <AccuracyFeedback
                result={assessResult}
                mode={mode}
                onReset={() => { setAssessResult(null); setPracticeError(null) }}
              />
            ) : practiceLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `2px solid ${isJapanese ? 'rgba(248,113,113,0.60)' : 'rgba(251,146,60,0.60)'}`,
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite', flexShrink: 0,
                }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                  {isJapanese ? 'Scoring...' : 'Scoring...'}
                </span>
              </div>
            ) : practiceRecording ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '4px 0' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em',
                  textTransform: 'uppercase', margin: 0,
                  color: isJapanese ? 'rgba(248,113,113,0.85)' : 'rgba(251,146,60,0.85)' }}>
                  {isJapanese ? 'Listening...' : 'Listening...'}
                </p>
                <button onClick={stopPractice} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.10em',
                  color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                  background: 'none', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 999, padding: '6px 16px', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
                >
                  <MicOff size={11} />
                  {isJapanese ? 'Stop & score' : 'Stop & score'}
                </button>
              </div>
            ) : (
              <>
                <button onClick={startPractice} style={{
                  width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                  fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.10em', textTransform: 'uppercase', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  color: 'rgba(255,255,255,0.92)', transition: 'opacity 0.2s, transform 0.15s',
                  background: isJapanese
                    ? 'linear-gradient(135deg, rgba(220,38,38,0.75), rgba(185,28,28,0.85))'
                    : 'linear-gradient(135deg, rgba(234,88,12,0.75), rgba(251,146,60,0.85))',
                  boxShadow: isJapanese
                    ? '0 4px 24px rgba(220,38,38,0.20)'
                    : '0 4px 24px rgba(234,88,12,0.22)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <Mic size={13} />
                  {isJapanese ? 'พูดเพื่อรับคะแนน' : 'Speak to score'}
                </button>
                {practiceError && (
                  <p style={{ margin: '10px 0 0', fontFamily: 'var(--font-mono)',
                    fontSize: 11, color: 'rgba(252,165,165,0.75)' }}>
                    {practiceError}
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Preset word chips ─────────────────────────────────────────────── */}
      {!matchedEntry && !loading && !transcribeResult && (
        <div style={{ width: '100%', animation: 'fadeUp 0.4s ease both' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)',
            margin: '0 0 10px' }}>
            {isJapanese ? 'หรือเลือกจากคลัง' : 'または語彙から選ぶ'}
          </p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {dataset.map((entry) => (
              <button key={entry.id} onClick={() => pickPreset(entry)} style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '9px 14px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                border: isJapanese
                  ? '1px solid rgba(248,113,113,0.18)'
                  : '1px solid rgba(251,146,60,0.18)',
                transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.borderColor = isJapanese ? 'rgba(248,113,113,0.40)' : 'rgba(251,146,60,0.40)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = isJapanese ? 'rgba(248,113,113,0.18)' : 'rgba(251,146,60,0.18)'
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 15, fontWeight: 700,
                  color: isJapanese ? '#f87171' : '#fb923c' }}>
                  {entry.word}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'rgba(255,255,255,0.28)', marginTop: 3 }}>
                  {entry.romanization}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

