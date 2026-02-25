import type { LearnerMode } from '../types'

interface Props {
  mode: LearnerMode
  onSelect: (mode: LearnerMode) => void
  onContinue: () => void
}

// flag images served from public/flag/
const FLAG_JP = '/flag/japan.png'
const FLAG_TH = '/flag/thailand.png'

interface LangOption {
  mode: LearnerMode
  targetFlag: string   // image path of the language being learned
  learnerFlag: string  // image path of the learner's native language
  titleTh: string
  titleJa: string
  subtitleTh: string
  subtitleJa: string
  accentBg: string
  accentBorder: string
  accentText: string
}

const OPTIONS: LangOption[] = [
  {
    mode: 'th-ja',
    targetFlag: FLAG_JP,   // learning Japanese → show Japanese flag prominently
    learnerFlag: FLAG_TH,  // learner is Thai
    titleTh: 'เรียนภาษาญี่ปุ่น',
    titleJa: 'คนไทยเรียนญี่ปุ่น',
    subtitleTh: 'สำหรับคนไทยที่อยากฝึกออกเสียงภาษาญี่ปุ่น',
    subtitleJa: 'ไทย語→日本語',
    accentBg: 'bg-red-500/10',
    accentBorder: 'border-red-500/40',
    accentText: 'text-red-400',
  },
  {
    mode: 'ja-th',
    targetFlag: FLAG_TH,   // learning Thai → show Thai flag prominently
    learnerFlag: FLAG_JP,  // learner is Japanese
    titleTh: 'タイ語を学ぶ',
    titleJa: '日本人がタイ語を学ぶ',
    subtitleTh: 'タイ語の発音を練習したい日本人のために',
    subtitleJa: '日本語→タイ語',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/40',
    accentText: 'text-amber-400',
  },
]

export function LanguageSelectScreen({ mode, onSelect, onContinue }: Props) {
  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-2">
      {/* Header area */}
      <div className="text-center space-y-1 pt-2">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src={FLAG_TH} alt="Thailand" className="w-12 h-auto" />
          <span className="text-xl text-gray-500">⇄</span>
          <img src={FLAG_JP} alt="Japan" className="w-12 h-auto" />
        </div>
        <h2 className="text-2xl font-bold text-white">PROJECT-J</h2>
        <p className="text-gray-400 text-sm">
          เลือกภาษาที่ต้องการเรียน・学ぶ言語を選んでください
        </p>
      </div>

      {/* Language option cards */}
      <div className="flex flex-col gap-4">
        {OPTIONS.map((opt) => {
          const isSelected = mode === opt.mode
          return (
            <button
              key={opt.mode}
              onClick={() => onSelect(opt.mode)}
              className={`w-full text-left rounded-3xl border-2 p-6 transition-all duration-300
                ${isSelected
                  ? `${opt.accentBg} ${opt.accentBorder} shadow-lg scale-[1.01]`
                  : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                }`}
            >
              <div className="flex items-center gap-4">
                {/* Target language flag only */}
                <div className="shrink-0">
                  <img
                    src={opt.targetFlag}
                    alt="target language"
                    className="w-16 h-auto"
                  />
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xl font-bold leading-tight ${isSelected ? opt.accentText : 'text-white'}`}>
                    {opt.titleTh}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {opt.subtitleTh}
                  </p>
                  <p className={`text-xs mt-1 font-mono ${isSelected ? opt.accentText : 'text-gray-600'}`}>
                    {opt.subtitleJa}
                  </p>
                </div>

                {/* Selection badge */}
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                  ${isSelected ? `${opt.accentBorder} ${opt.accentText} bg-current/10` : 'border-white/20'}`}>
                  {isSelected && <span className="text-sm">✓</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Start button */}
      <button
        onClick={onContinue}
        className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-200 active:scale-95
          ${mode === 'th-ja'
            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 shadow-lg'
            : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 shadow-lg'
          }`}
      >
        {mode === 'th-ja' ? 'เริ่มเรียน!' : '始めましょう！'}
      </button>
    </div>
  )
}
