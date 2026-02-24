import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, RefreshCw } from 'lucide-react'
import { transcribeAudio, assessPronunciation, lookupWord } from '../services/api'
import type { LearnerMode, VocabEntry, TranscribeResponse, AssessResponse } from '../types'
import { WordCard } from './WordCard'
import { AccuracyFeedback } from './AccuracyFeedback'

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

      {/* ── Mic hero ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3">

        {/* Outer breathing ring (recording only) */}
        <div className="relative flex items-center justify-center">
          {recording && (
            <span
              className={`absolute rounded-full border transition-all duration-700
                ${isJapanese ? 'border-red-500/25' : 'border-amber-500/25'}`}
              style={{
                width: 'calc(100% + 28px)',
                height: 'calc(100% + 28px)',
                animation: 'ring-breathe 2s ease-in-out infinite',
              }}
            />
          )}

          {/* Main circle */}
          <button
            onClick={recording ? stopDetect : !loading ? startDetect : undefined}
            disabled={loading || practiceRecording}
            aria-label={recording ? 'Stop' : 'Start recording'}
            className={`relative w-28 h-28 rounded-full border flex items-center justify-center
              transition-all duration-500 focus:outline-none
              ${loading
                ? isJapanese
                  ? 'border-red-500/35 bg-red-500/5 cursor-default'
                  : 'border-amber-500/35 bg-amber-500/5 cursor-default'
                : recording
                  ? isJapanese
                    ? 'border-red-500/55 bg-red-500/8 active:scale-95 cursor-pointer'
                    : 'border-amber-500/55 bg-amber-500/8 active:scale-95 cursor-pointer'
                  : isComplete
                    ? isJapanese
                      ? 'border-red-500/45 bg-red-500/6 hover:border-red-500/70 active:scale-95 cursor-pointer'
                      : 'border-amber-500/45 bg-amber-500/6 hover:border-amber-500/70 active:scale-95 cursor-pointer'
                    : 'border-white/12 bg-white/2 hover:border-white/25 active:scale-95 cursor-pointer'
              }`}
          >
            {loading ? (
              /* Spinner arc */
              <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin
                ${isJapanese ? 'border-red-400' : 'border-amber-400'}`} />
            ) : (
              /* Mic icon */
              <Mic className={`w-8 h-8 transition-colors duration-300
                ${recording
                  ? isJapanese ? 'text-red-400' : 'text-amber-400'
                  : isComplete
                    ? isJapanese ? 'text-red-400/80' : 'text-amber-400/80'
                    : 'text-white/30'
                }`}
              />
            )}
          </button>
        </div>

        {/* State label */}
        <p className={`text-[10px] tracking-[0.2em] uppercase font-semibold transition-all duration-300
          ${recording
            ? isJapanese ? 'text-red-400' : 'text-amber-400'
            : loading
              ? isJapanese ? 'text-red-400/60' : 'text-amber-400/60'
              : isComplete
                ? isJapanese ? 'text-red-400/70' : 'text-amber-400/70'
                : 'text-white/20'
          }`}
        >
          {recording
            ? (isJapanese ? 'กำลังฟัง' : 'Listening')
            : loading
              ? (isJapanese ? 'วิเคราะห์...' : 'Analyzing...')
              : isComplete
                ? (isJapanese ? 'เสร็จสิ้น' : 'Complete')
                : (isJapanese ? 'แตะเพื่อพูด' : 'Tap to speak')}
        </p>

        {/* Waveform bars — recording only */}
        {recording && (
          <div className="flex items-end gap-0.75" style={{ height: '28px' }}>
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className={`bar ${hasSound
                  ? isJapanese ? 'bg-red-400' : 'bg-amber-400'
                  : 'bg-white/15'}`}
                style={{
                  '--i': i,
                  height: `${[40, 65, 85, 100, 90, 100, 85, 65, 40][i]}%`,
                  animationPlayState: hasSound ? 'running' : 'paused',
                  opacity: hasSound ? 0.75 : 0.2,
                } as React.CSSProperties}
              />
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
