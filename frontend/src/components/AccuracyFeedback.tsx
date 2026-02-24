import { RotateCcw } from 'lucide-react'
import type { AssessResponse, LearnerMode } from '../types'

interface Props {
  result: AssessResponse
  mode: LearnerMode
  onReset: () => void
}

// ─── Circular gauge SVG ────────────────────────────────────────────────────────
function AccuracyGauge({ accuracy }: { accuracy: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius  // ≈ 251.3
  const offset = circumference - (accuracy / 100) * circumference

  const color =
    accuracy >= 85
      ? '#22c55e'   // green
      : accuracy >= 60
        ? '#f59e0b' // amber
        : '#ef4444' // red

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="110" height="110" viewBox="0 0 110 110" className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx="55" cy="55" r={radius}
          fill="none"
          stroke="#ffffff15"
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx="55" cy="55" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Percentage — centered over SVG */}
      <div className="-mt-[90px] flex flex-col items-center pointer-events-none">
        <span className="text-3xl font-bold" style={{ color }}>
          {accuracy}
        </span>
        <span className="text-xs text-gray-400">%</span>
      </div>
      {/* Spacing filler */}
      <div className="mt-10" />
    </div>
  )
}

// ─── Character‑level diff display ──────────────────────────────────────────────
function CharDiffRow({ result, isJapanese }: { result: AssessResponse; isJapanese: boolean }) {
  if (!result.charDiff.length) return null

  // isJapanese = th-ja mode → learner is Thai → labels in Thai
  // !isJapanese = ja-th mode → learner is Japanese → labels in Japanese
  const labels = isJapanese
    ? { title: 'ตัวอักษรตรงกัน', correct: 'ถูก', wrong: 'ผิด', missing: 'ขาด', extra: 'เกิน' }
    : { title: '文字一致', correct: '正確', wrong: '違う', missing: '不足', extra: '余分' }

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
        {labels.title}
      </p>
      <div className="flex flex-wrap gap-1">
        {result.charDiff.map((token, i) => {
          const cls =
            token.status === 'correct'
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : token.status === 'wrong'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : token.status === 'missing'
                  ? 'bg-gray-500/20 text-gray-500 border border-gray-500/30 line-through'
                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
          return (
            <span key={i} className={`px-2 py-0.5 rounded-md text-sm font-mono ${cls}`}>
              {token.char}
            </span>
          )
        })}
      </div>
      <div className="flex gap-4 text-xs text-gray-600 flex-wrap mt-1">
        <span><span className="text-green-400">■</span> {labels.correct}</span>
        <span><span className="text-red-400">■</span> {labels.wrong}</span>
        <span><span className="text-gray-500">■</span> {labels.missing}</span>
        <span><span className="text-yellow-400">■</span> {labels.extra}</span>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function AccuracyFeedback({ result, mode, onReset }: Props) {
  const isJapanese = mode === 'th-ja'
  // Use the AI phonetic score as the primary display score.
  // Falls back to native-script character match if AI score unavailable.
  const displayScore = result.aiScore > 0 ? result.aiScore : result.accuracy

  const gradeLabel =
    displayScore >= 85
      ? { th: 'ยอดเยี่ยม!', ja: '優秀！', color: 'text-green-400' }
      : displayScore >= 60
        ? { th: 'ดีมาก', ja: 'よくできました', color: 'text-amber-400' }
        : displayScore >= 40
          ? { th: 'พยายามต่อไป', ja: '練習しましょう', color: 'text-orange-400' }
          : { th: 'ลองอีกครั้ง', ja: 'もう一度', color: 'text-red-400' }

  return (
    <div className="space-y-6">
      {/* Score row */}
      <div className="flex items-center gap-6">
        <AccuracyGauge accuracy={displayScore} />
        <div className="space-y-1">
          <p className={`text-2xl font-bold ${gradeLabel.color}`}>
            {isJapanese ? gradeLabel.th : gradeLabel.ja}
          </p>
          <p className="text-sm text-gray-400">
            {isJapanese ? 'คะแนนการออกเสียง (AI)' : '発音スコア (AI)'}
          </p>
          {/* Secondary: native-script character match */}
          {result.accuracy > 0 && result.accuracy !== displayScore && (
            <p className="text-xs text-gray-600">
              {isJapanese ? `ตัวอักษรตรง: ${result.accuracy}%` : `文字一致: ${result.accuracy}%`}
            </p>
          )}
        </div>
      </div>

      {/* Transcription */}
      <div className="bg-black/30 rounded-2xl p-4 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
          {isJapanese ? 'AI ได้ยิน' : 'AIが聞き取った内容'}
        </p>
        <p className="text-white text-lg font-mono">
          "{result.transcribed || '—'}"
        </p>
      </div>

      {/* Char diff */}
      <CharDiffRow result={result} isJapanese={isJapanese} />

      {/* AI coaching feedback (primary) */}
      {result.aiFeedback && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
            {isJapanese ? 'คำแนะนำ AI' : 'AIのアドバイス'}
          </p>
          <p className="text-white/90 text-base leading-relaxed">
            {result.aiFeedback}
          </p>
        </div>
      )}

      {/* Mispronounced highlights */}
      {result.mispronounced && result.mispronounced.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
          <p className="text-xs text-red-400 uppercase tracking-widest font-semibold">
            {isJapanese ? 'พยางค์ที่ต้องฝึก' : '練習が必要な部分'}
          </p>
          <div className="flex flex-wrap gap-2">
            {result.mispronounced.map((s, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md text-sm font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legacy simple feedback (fallback when no AI feedback) */}
      {!result.aiFeedback && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/90 text-base leading-relaxed">
            {isJapanese ? result.feedback.th : result.feedback.ja}
          </p>
        </div>
      )}

      {/* Try again button */}
      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all font-semibold"
      >
        <RotateCcw size={16} />
        {isJapanese ? 'ลองอีกครั้ง' : 'もう一度試す'}
      </button>
    </div>
  )
}
