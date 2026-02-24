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

        // ── Voice-reactive orb: smooth RMS → glow only (orb animation never changes) ──
        // Exponential MA: damps spikes so glow is smooth, not flickery
        smoothRmsRef.current = smoothRmsRef.current * 0.82 + rms * 0.18
        const s = smoothRmsRef.current
        if (orbRef.current) {
          // Only write box-shadow (GPU-composited, no repaint, no flicker)
          const level  = Math.min(s / 48, 1)
          const glow   = Math.round(44 + level * 90)
          const alpha1 = Math.min(0.30 + level * 0.55, 0.85).toFixed(2)
          const alpha2 = Math.min(0.10 + level * 0.22, 0.30).toFixed(2)
          orbRef.current.style.setProperty('--orb-shadow',
            `0 0 ${glow}px rgba(234,88,12,${alpha1}), 0 0 ${glow * 2}px rgba(251,146,60,${alpha2})`)
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
    <div className="flex flex-col items-center gap-5 py-8 px-4 max-w-sm mx-auto">

      {/* ── Siri Orb hero ──────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-5">

        {/* Ripple ring container — rings appear around the orb on voice */}
        <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>

          {/* Idle float wrapper */}
          <div style={{ animation: 'orb-float 5s ease-in-out infinite' }}>

            {/* Pulse rings — CSS-only, driven by hasSound React state */}
            {recording && hasSound && (
              [0, 0.6, 1.2].map((delay) => (
                <span key={delay} className="absolute rounded-full pointer-events-none" style={{
                  width: 192, height: 192,
                  top: '50%', left: '50%',
                  translate: '-50% -50%',
                  border: '1.5px solid rgba(251,146,60,0.60)',
                  animation: `siri-pulse 2.2s cubic-bezier(0.4,0,0.6,1) ${delay}s infinite`,
                }} />
              ))
            )}

            {/* Tap target wraps the orb so the button click area is the full circle */}
            <button
              onClick={recording ? stopDetect : !loading ? startDetect : undefined}
              disabled={loading || practiceRecording}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              style={{
                position: 'relative', width: 192, height: 192,
                borderRadius: '50%', padding: 0, border: 'none',
                background: 'none', outline: 'none',
                cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {/* SiriOrb — ref receives class + --orb-shadow from audio rAF loop */}
              <SiriOrb ref={orbRef} size={192} className={recording ? '' : ''} />

              {/* Mic / spinner — floated above the orb */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {loading ? (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                ) : (
                  <Mic style={{
                    width: 34, height: 34,
                    color: recording ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.28)',
                    filter: recording
                      ? 'drop-shadow(0 0 14px rgba(255,255,255,0.7))'
                      : 'none',
                    transform: recording && hasSound
                      ? 'scale(1.25)' : recording ? 'scale(1.07)' : 'scale(1)',
                    transition: 'all 0.25s ease',
                  }} />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* State label */}
        <p style={{
          fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
          fontWeight: 600, transition: 'color 0.4s ease',
          color: recording
            ? 'rgba(251,146,60,0.95)'
            : loading
              ? 'rgba(251,146,60,0.45)'
              : isComplete
                ? 'rgba(251,146,60,0.65)'
                : 'rgba(255,255,255,0.20)',
        }}>
          {recording
            ? (isJapanese ? 'กำลังฟัง...' : 'Listening...')
            : loading
              ? (isJapanese ? 'วิเคราะห์...' : 'Analyzing...')
              : isComplete
                ? (isJapanese ? 'เสร็จสิ้น' : 'Complete')
                : (isJapanese ? 'แตะเพื่อพูด' : 'Tap to speak')}
        </p>

        {/* Waveform bars — crimson when voice, dim when silent */}
        {recording && (
          <div className="flex items-end gap-0.75" style={{ height: 26 }}>
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="bar" style={{
                '--i': i,
                height: `${[38,62,82,100,88,100,82,62,38][i]}%`,
                background: hasSound ? '#fb923c' : 'rgba(255,255,255,0.12)',
                animationPlayState: hasSound ? 'running' : 'paused',
                opacity: hasSound ? 0.85 : 0.2,
              } as React.CSSProperties} />
            ))}
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="error-box w-full" style={{ animation: 'fadeUp 0.3s ease both' }}>
          {error}
        </div>
      )}

      {/* ── YOU SAID card — live interim while recording, then Whisper final result ──── */}
      {displayText ? (
        <div className="section-card w-full" style={{ animation: 'fadeUp 0.25s ease both' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="ui-label mb-2">You said</p>
              {/* Live interim: plain updating text (no stagger — it changes too fast) */}
              {recording && (
                <p className={`text-2xl font-bold leading-snug ${accentColor}`}>
                  {interimText}
                </p>
              )}
              {/* Whisper confirmed result: per-word blur-fade-in animation */}
              {!recording && (transcribeResult?.ok && transcribeResult.transcribed) && (
                <p className={`text-2xl font-bold leading-snug ${accentColor}`} key={transcribeResult.transcribed}>
                  {transcribeResult.transcribed.split(/\s+/).map((word, i) => (
                    <span key={i} className="word-appear" style={{ animationDelay: `${i * 0.07}s` }}>
                      {word}{' '}
                    </span>
                  ))}
                </p>
              )}
              {/* During Whisper loading: show last interim as muted placeholder */}
              {loading && !transcribeResult && interimText && (
                <p className={`text-2xl font-bold leading-snug ${accentColor} opacity-40`}>
                  {interimText}
                </p>
              )}
            </div>
            {!loading && !recording && (
              <button
                onClick={resetAll}
                title="Reset"
                className="text-white/20 hover:text-white/50 transition-colors mt-1 shrink-0"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── PRONUNCIATION GUIDE skeleton — while GPT lookup runs ──────────── */}
      {isLookingUp && (
        <div className="section-card w-full" style={{ animation: 'fadeUp 0.35s ease both' }}>
          <p className="ui-label mb-3">
            {isJapanese ? 'Pronunciation guide' : 'Pronunciation guide'}
          </p>
          <div className="flex items-center gap-3">
            <div className="thinking">
              <span /><span /><span />
            </div>
            <span className="text-xs text-white/25 font-mono">
              {isJapanese ? 'กำลังสร้างคำแนะนำ...' : 'Generating guide...'}
            </span>
          </div>
        </div>
      )}

      {/* ── WordCard + practice ────────────────────────────────────────────── */}
      {matchedEntry && !loading && (
        <>
          <button
            onClick={resetAll}
            className="self-start flex items-center gap-1.5 text-[11px] text-white/20
              hover:text-white/50 transition-colors -mb-1"
          >
            <RefreshCw size={11} />
            {isJapanese ? 'กลับ / พูดคำอื่น' : '戻る / 別の語を話す'}
          </button>

          <WordCard entry={matchedEntry} mode={mode} />

          {/* Practice */}
          <div className="section-card w-full space-y-3">
            <p className={`section-label flex items-center gap-1.5`}>
              <Mic size={11} />
              {isJapanese ? 'ฝึกออกเสียง' : '発音練習'}
            </p>

            {assessResult ? (
              <AccuracyFeedback
                result={assessResult}
                mode={mode}
                onReset={() => { setAssessResult(null); setPracticeError(null) }}
              />
            ) : practiceLoading ? (
              <div className="flex items-center gap-3 py-1">
                <div className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin shrink-0
                  ${isJapanese ? 'border-red-400' : 'border-amber-400'}`} />
                <span className="text-xs text-white/30 font-mono">
                  {isJapanese ? 'กำลังวิเคราะห์...' : 'Scoring...'}
                </span>
              </div>
            ) : practiceRecording ? (
              <div className="flex flex-col items-center gap-3 py-1">
                <p className={`text-[10px] tracking-[0.18em] uppercase ${accentColor}`}>
                  {isJapanese ? 'กำลังฟัง...' : 'Listening...'}
                </p>
                <button
                  onClick={stopPractice}
                  className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60
                    transition border border-white/10 hover:border-white/20
                    px-4 py-1.5 rounded-full"
                >
                  <MicOff size={11} />
                  {isJapanese ? 'หยุดและให้คะแนน' : 'Stop & score'}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={startPractice}
                  className={`w-full py-2.5 rounded-xl text-white text-xs font-semibold
                    tracking-[0.12em] uppercase flex items-center justify-center gap-2
                    transition-all active:scale-[0.98]
                    ${isJapanese
                      ? 'bg-red-500/70 hover:bg-red-500/90'
                      : 'bg-amber-500/70 hover:bg-amber-500/90'
                    }`}
                >
                  <Mic size={13} />
                  {isJapanese ? 'พูดเพื่อรับคะแนน' : 'Speak to score'}
                </button>
                {practiceError && (
                  <p className="text-xs text-red-400/80">{practiceError}</p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Preset chips — only when idle with no result ───────────────────── */}
      {!matchedEntry && !loading && !transcribeResult && (
        <div className="w-full" style={{ animation: 'fadeUp 0.4s ease both' }}>
          <p className="ui-label mb-3">
            {isJapanese ? 'หรือเลือกคำจากคลัง' : 'または語彙から選ぶ'}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {dataset.map((entry) => (
              <button
                key={entry.id}
                onClick={() => pickPreset(entry)}
                className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border
                  transition-all active:scale-95 hover:brightness-125
                  ${accentBg} ${accentBorder}`}
              >
                <span className={`text-sm font-bold ${accentColor}`}>{entry.word}</span>
                <span className="text-xs text-white/30 mt-0.5">{entry.romanization}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
