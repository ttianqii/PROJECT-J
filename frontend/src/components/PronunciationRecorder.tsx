import { Mic, MicOff, Loader2, RotateCcw } from 'lucide-react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { assessPronunciation } from '../services/api'
import type { AssessResponse, LearnerMode, VocabEntry } from '../types'

interface Props {
  entry: VocabEntry
  mode: LearnerMode
  onResult: (result: AssessResponse) => void
  onError: (msg: string) => void
}

export function PronunciationRecorder({ entry, mode, onResult, onError }: Props) {
  const { state, start, stop, error } = useAudioRecorder()
  const isJapanese = mode === 'th-ja'
  const lang: 'ja' | 'th' = isJapanese ? 'ja' : 'th'

  const accentColor = isJapanese ? 'red' : 'amber'
  const ringClass = isJapanese
    ? 'ring-red-500 shadow-red-500/50'
    : 'ring-amber-500 shadow-amber-500/50'
  const btnActiveClass = isJapanese
    ? 'bg-red-500 hover:bg-red-600'
    : 'bg-amber-500 hover:bg-amber-600'

  async function handleRecord() {
    if (state === 'idle') {
      await start()
    } else if (state === 'recording') {
      const blob = await stop()
      if (!blob) {
        onError('No audio captured. Please try again.')
        return
      }
      try {
        const result = await assessPronunciation(
          blob,
          entry.word,
          entry.romanization,
          lang,
        )
        onResult(result)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Assessment failed'
        onError(msg)
      }
    }
  }

  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'

  return (
    <div className="space-y-4">
      {/* Prompt text */}
      <div className="text-center space-y-1">
        <p className="text-white/80 font-medium">
          {isJapanese
            ? 'กด 🎤 แล้วพูด — กดอีกครั้งเพื่อหยุด'
            : '🎤 ボタンを押して話し、もう一度押して止める'}
        </p>
        <p className="text-gray-500 text-sm">
          {isJapanese
            ? `ออกเสียง: "${entry.romanization}"`
            : `読み: "${entry.romanization}"`}
        </p>
      </div>

      {/* Mic button */}
      <div className="flex justify-center">
        <button
          onClick={handleRecord}
          disabled={isProcessing}
          className={`relative flex items-center justify-center w-24 h-24 rounded-full font-bold text-white transition-all duration-300 shadow-2xl
            ${isProcessing
              ? 'bg-gray-700 cursor-not-allowed'
              : isRecording
                ? `${btnActiveClass} ring-4 ${ringClass} shadow-lg recording-pulse`
                : `${btnActiveClass} hover:scale-105 hover:shadow-xl hover:ring-2 ${ringClass}`
            }`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isProcessing ? (
            <Loader2 size={36} className="animate-spin" />
          ) : isRecording ? (
            <MicOff size={36} />
          ) : (
            <Mic size={36} />
          )}

          {/* Live dot */}
          {isRecording && (
            <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-white animate-ping" />
          )}
        </button>
      </div>

      {/* Status text */}
      <div className="text-center text-sm">
        {isRecording && (
          <span className={`text-${accentColor}-400 font-semibold animate-pulse`}>
            ● กำลังบันทึก... / 録音中...
          </span>
        )}
        {isProcessing && (
          <span className="text-blue-400 font-semibold">
            ⏳ กำลังวิเคราะห์เสียง... / 音声を分析中...
          </span>
        )}
        {state === 'idle' && !isProcessing && (
          <span className="text-gray-500">
            {isJapanese ? 'พร้อมบันทึก' : '録音準備完了'}
          </span>
        )}
      </div>

      {/* Error display */}
      {(error) && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
          <RotateCcw size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
