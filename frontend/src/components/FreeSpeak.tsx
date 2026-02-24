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
    setError(null)
    setTranscribeResult(null)
    setMatchedEntry(null)
    setAssessResult(null)
    setPracticeError(null)
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
    } catch {
      setError(isJapanese
        ? 'ไม่สามารถเข้าถึงไมค์ได้ กรุณาอนุญาตการใช้ไมค์'
        : 'マイクにアクセスできません。許可してください。')
    }
  }

  const stopDetect = () => {
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

      {/* ── Detect mic button ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={recording ? stopDetect : startDetect}
          disabled={loading || practiceRecording}
          className={[
            'w-20 h-20 rounded-full flex items-center justify-center shadow-lg',
            'transition-all duration-200 active:scale-95 ring-4',
            recording
              ? `${accentCls} ring-offset-2 ${accentRingCls} animate-pulse`
              : loading
                ? 'bg-gray-700 ring-gray-600 cursor-not-allowed'
                : `${accentCls} ${accentRingCls} hover:brightness-110`,
          ].join(' ')}
        >
          {recording ? <MicOff className="w-9 h-9 text-white" /> : <Mic className="w-9 h-9 text-white" />}
        </button>
        <p className="text-xs text-gray-400">
          {recording
            ? isJapanese ? 'กำลังฟัง… กดอีกครั้งเพื่อหยุด' : '聴いています…もう一度で停止'
            : loading
              ? isJapanese ? 'กำลังประมวลผล...' : '処理中...'
              : isJapanese ? 'กดแล้วพูดคำภาษาญี่ปุ่น' : '押してタイ語を話してください'}
        </p>
      </div>

      {/* Loading shimmer */}
      {loading && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 animate-pulse space-y-2">
          <div className="h-3 bg-white/10 rounded w-1/3" />
          <div className="h-8 bg-white/10 rounded w-2/3" />
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
            ) : (
              <>
                <button
                  onClick={practiceRecording ? stopPractice : startPractice}
                  disabled={practiceLoading}
                  className={[
                    'w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2',
                    'transition-all active:scale-95',
                    practiceRecording
                      ? `${accentCls} animate-pulse`
                      : practiceLoading
                        ? 'bg-gray-700 cursor-not-allowed'
                        : `${accentCls} hover:brightness-110`,
                  ].join(' ')}
                >
                  {practiceRecording
                    ? <><MicOff size={18} />{isJapanese ? 'หยุดและให้คะแนน' : '停止してスコア計算'}</>
                    : practiceLoading
                      ? <span>{isJapanese ? 'กำลังวิเคราะห์...' : '分析中...'}</span>
                      : <><Mic size={18} />{isJapanese ? 'กดแล้วพูดเพื่อรับคะแนน' : '押して話すとスコアが出ます'}</>
                  }
                </button>
                {practiceError && (
                  <p className="text-red-400 text-xs">{practiceError}</p>
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
