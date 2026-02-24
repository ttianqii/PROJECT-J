import { useState, useRef } from 'react'
import { Mic, MicOff, RefreshCw } from 'lucide-react'
import { transcribeAudio, assessPronunciation } from '../services/api'
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

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const practiceMediaRef = useRef<MediaRecorder | null>(null)
  const practiceChunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceRafRef = useRef<number | null>(null)
  const [hasSound, setHasSound] = useState(false)

  const accentCls = isJapanese ? 'bg-red-500' : 'bg-amber-500'
  const accentRingCls = isJapanese ? 'ring-red-400' : 'ring-amber-400'
  const accentColor = isJapanese ? 'text-red-400' : 'text-amber-400'
  const accentBg = isJapanese ? 'bg-red-500/10' : 'bg-amber-500/10'
  const accentBorder = isJapanese ? 'border-red-500/30' : 'border-amber-500/30'

  const hintText = isJapanese
    ? 'ลองพูดคำภาษาญี่ปุ่น — AI จะจับเสียงและค้นหาความหมาย'
    : 'タイ語で話してみてください — AIが音声を認識し意味を調べます'

  // ── Detect recording ──────────────────────────────────────────────────────
  const startDetect = async () => {
    // Always reset previous result immediately before starting
    setTranscribeResult(null)
    setMatchedEntry(null)
    setAssessResult(null)
    setPracticeError(null)
    setError(null)
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
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
        setLoading(true)
        try {
          const res = await transcribeAudio(blob, lang)
          setTranscribeResult(res)
          if (res.ok && res.transcribed) {
            setMatchedEntry(findMatch(res.transcribed, dataset))
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
    setTranscribeResult(null)
    setMatchedEntry(null)
    setAssessResult(null)
    setPracticeError(null)
    setError(null)
  }

  return (
    <div className="flex flex-col gap-5 py-4 px-4 max-w-md mx-auto">
      {/* Title */}
      <div className="text-center">
        <h2 className={`text-lg font-bold ${accentColor}`}>
          {isJapanese ? 'จับเสียงอิสระ' : 'フリー音声認識'}
        </h2>
        <p className="text-sm text-gray-500 mt-1 leading-snug">{hintText}</p>
      </div>

      {/* ── Mic control: 3 distinct states ───────────────────────────────── */}
      {loading ? (
        /* ── State 3: Processing ── */
        <div className={`flex flex-col items-center gap-3 py-6 rounded-2xl border ${accentBg} ${accentBorder}`}>
          {/* Spinning ring */}
          <div className={`w-16 h-16 rounded-full border-4 border-t-transparent animate-spin
            ${isJapanese ? 'border-red-500' : 'border-amber-500'}`}
          />
          <p className={`text-sm font-semibold ${accentColor}`}>
            {isJapanese ? 'กำลังประมวลผล...' : '処理中...'}
          </p>
          <p className="text-xs text-gray-500">
            {isJapanese ? 'Whisper กำลังแปลงเสียง' : 'Whisperが音声を認識しています'}
          </p>
        </div>
      ) : recording ? (
        /* ── State 2: Recording ── */
        <div className={`flex flex-col items-center gap-4 py-6 rounded-2xl border ${accentBg} ${accentBorder}`}>
          {/* Pulsing mic rings */}
          <div className="relative flex items-center justify-center">
            <span className={`absolute w-20 h-20 rounded-full opacity-30 animate-ping
              ${isJapanese ? 'bg-red-500' : 'bg-amber-500'}`}
            />
            <span className={`absolute w-16 h-16 rounded-full opacity-20 animate-ping [animation-delay:150ms]
              ${isJapanese ? 'bg-red-500' : 'bg-amber-500'}`}
            />
            <div className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center shadow-lg
              ${isJapanese ? 'bg-red-500' : 'bg-amber-500'}`}>
              <Mic className="w-7 h-7 text-white" />
            </div>
          </div>
          <p className={`text-sm font-semibold ${accentColor}`}>
            {isJapanese ? 'กำลังฟัง...' : '聴いています...'}
          </p>
          {/* Sound indicator bars */}
          <div className="flex items-end gap-1 h-6">
            {[0, 80, 160, 240, 320].map((delay, i) => (
              <div
                key={i}
                style={{ animationDelay: `${delay}ms` }}
                className={[
                  'w-1.5 rounded-full transition-all duration-150',
                  hasSound
                    ? `animate-bounce ${isJapanese ? 'bg-red-400' : 'bg-amber-400'}`
                    : 'bg-gray-700',
                  // vary heights for a waveform look
                  i === 0 || i === 4 ? 'h-2' : i === 1 || i === 3 ? 'h-4' : 'h-6',
                ].join(' ')}
              />
            ))}
          </div>
          {/* Stop button */}
          <button
            onClick={stopDetect}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 border border-white/20
              hover:bg-white/20 text-white text-sm font-semibold transition-all active:scale-95"
          >
            <MicOff size={16} />
            {isJapanese ? 'หยุดและประมวลผล' : '停止して認識'}
          </button>
        </div>
      ) : (
        /* ── State 1: Idle / has-result ── */
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={startDetect}
            disabled={practiceRecording}
            className={[
              'w-20 h-20 rounded-full flex items-center justify-center shadow-lg ring-4',
              'transition-all duration-200 active:scale-95',
              practiceRecording
                ? 'bg-gray-700 ring-gray-600 cursor-not-allowed'
                : `${accentCls} ${accentRingCls} hover:brightness-110`,
            ].join(' ')}
          >
            <Mic className="w-9 h-9 text-white" />
          </button>
          <p className="text-xs text-gray-400">
            {transcribeResult
              ? isJapanese ? 'กดเพื่อพูดใหม่' : 'もう一度話すには押してください'
              : isJapanese ? 'กดแล้วพูดคำภาษาญี่ปุ่น' : '押してタイ語を話してください'
            }
          </p>
        </div>
      )}

      {/* ── Transcription result banner ───────────────────────────────────── */}
      {transcribeResult && transcribeResult.ok && transcribeResult.transcribed && !loading && (
        <div className={`rounded-2xl border p-4 ${accentBg} ${accentBorder}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                {isJapanese ? 'AI ได้ยินว่า' : 'AIが聞こえたこと'}
              </p>
              <p className={`text-2xl font-bold ${accentColor}`}>{transcribeResult.transcribed}</p>
            </div>
            <button
              onClick={resetAll}
              title={isJapanese ? 'ลองใหม่' : 'やり直す'}
              className="text-gray-600 hover:text-gray-300 transition mt-1"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <p className={`text-xs mt-2 ${matchedEntry ? 'text-green-400' : 'text-gray-500'}`}>
            {matchedEntry
              ? isJapanese ? '✅ พบคำในคลังศัพท์' : '✅ 語彙リストで見つかりました'
              : isJapanese ? '⚠️ ไม่พบคำนี้ในคลัง ลองพูดคำอื่น' : '⚠️ 語彙リストに見つかりません。他の語を試してください。'
            }
          </p>
        </div>
      )}

      {/* ── Matched vocab card + practice ────────────────────────────────── */}
      {matchedEntry && (
        <>
          <WordCard entry={matchedEntry} mode={mode} />

          {/* Practice section */}
          <div className={`rounded-2xl border p-4 ${accentBg} ${accentBorder} space-y-3`}>
            <p className={`text-sm font-bold ${accentColor}`}>
              🎤 {isJapanese ? 'ฝึกออกเสียงคำนี้' : 'この単語を練習する'}
            </p>

            {assessResult ? (
              <AccuracyFeedback
                result={assessResult}
                mode={mode}
                onReset={() => { setAssessResult(null); setPracticeError(null) }}
              />
            ) : practiceLoading ? (
              /* Processing state */
              <div className="flex flex-col items-center gap-2 py-3">
                <div className={`w-10 h-10 rounded-full border-4 border-t-transparent animate-spin
                  ${isJapanese ? 'border-red-500' : 'border-amber-500'}`}
                />
                <p className={`text-xs font-semibold ${accentColor}`}>
                  {isJapanese ? 'กำลังวิเคราะห์คะแนน...' : 'スコアを分析中...'}
                </p>
              </div>
            ) : practiceRecording ? (
              /* Recording state */
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className={`absolute w-12 h-12 rounded-full opacity-30 animate-ping
                    ${isJapanese ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center
                    ${isJapanese ? 'bg-red-500' : 'bg-amber-500'}`}>
                    <Mic size={18} className="text-white" />
                  </div>
                </div>
                <p className={`text-xs font-semibold ${accentColor}`}>
                  {isJapanese ? 'กำลังฟัง...' : '聴いています...'}
                </p>
                <button
                  onClick={stopPractice}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20
                    hover:bg-white/20 text-white text-xs font-semibold transition-all active:scale-95"
                >
                  <MicOff size={14} />
                  {isJapanese ? 'หยุดและให้คะแนน' : '停止してスコア計算'}
                </button>
              </div>
            ) : (
              /* Idle state */
              <>
                <button
                  onClick={startPractice}
                  className={`w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2
                    transition-all active:scale-95 ${accentCls} hover:brightness-110`}
                >
                  <Mic size={18} />
                  {isJapanese ? 'กดแล้วพูดเพื่อรับคะแนน' : '押して話すとスコアが出ます'}
                </button>
                {practiceError && (
                  <p className="text-red-400 text-xs mt-1">{practiceError}</p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
