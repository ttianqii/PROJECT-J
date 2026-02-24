import type { LearnerMode, VocabEntry } from '../types'

interface Preset {
  category: string
  icon: string
  labelTh: string   // label in Thai (for Thai learners in th-ja)
  labelJa: string   // label in Japanese (for Japanese learners in ja-th)
  descTh: string
  descJa: string
}

const PRESETS: Preset[] = [
  {
    category: 'greetings',
    icon: '👋',
    labelTh: 'การทักทาย',
    labelJa: '挨拶',
    descTh: 'คำทักทายพื้นฐานที่ใช้ทุกวัน',
    descJa: '日常的に使う基本的な挨拶',
  },
  {
    category: 'numbers',
    icon: '🔢',
    labelTh: 'ตัวเลข',
    labelJa: '数字',
    descTh: 'ตัวเลข 1-10 และการนับ',
    descJa: '1〜10の数字と数え方',
  },
  {
    category: 'food',
    icon: '🍜',
    labelTh: 'อาหาร',
    labelJa: '食べ物',
    descTh: 'คำศัพท์เกี่ยวกับอาหารและเครื่องดื่ม',
    descJa: '食べ物・飲み物に関する語彙',
  },
  {
    category: 'common',
    icon: '💬',
    labelTh: 'คำทั่วไป',
    labelJa: '日常会話',
    descTh: 'คำที่ใช้บ่อยในชีวิตประจำวัน',
    descJa: '日常生活でよく使う言葉',
  },
  {
    category: 'travel',
    icon: '✈️',
    labelTh: 'การเดินทาง',
    labelJa: '旅行',
    descTh: 'คำศัพท์สำหรับนักเดินทาง',
    descJa: '旅行者のための語彙',
  },
  {
    category: 'colors',
    icon: '🎨',
    labelTh: 'สี',
    labelJa: '色',
    descTh: 'ชื่อสีต่าง ๆ',
    descJa: '色の名前',
  },
]

interface Props {
  mode: LearnerMode
  dataset: VocabEntry[]
  onSelectPreset: (ids: string[]) => void  // selects these words and opens Words tab
}

export function PresetScreen({ mode, dataset, onSelectPreset }: Props) {
  const isJapanese = mode === 'th-ja'   // Thai learner → show labels in Thai
  const accentColor = isJapanese ? 'text-red-400'    : 'text-amber-400'
  const accentBg    = isJapanese ? 'bg-red-500/10'   : 'bg-amber-500/10'
  const accentBorder= isJapanese ? 'border-red-500/30' : 'border-amber-500/30'
  const accentBtn   = isJapanese ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'

  // Count how many words are available per category in the active dataset
  function countForCategory(cat: string) {
    return dataset.filter((e) => e.category === cat).length
  }

  function handleSelect(category: string) {
    const ids = dataset.filter((e) => e.category === category).map((e) => e.id)
    onSelectPreset(ids)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-2">
      {/* Header */}
      <div className="space-y-1 pt-1">
        <h2 className={`text-xl font-bold ${accentColor}`}>
          {isJapanese ? '⭐ ชุดคำศัพท์' : '⭐ 単語セット'}
        </h2>
        <p className="text-gray-400 text-sm">
          {isJapanese
            ? 'เลือกหมวดหมู่แล้วกดเริ่มฝึกได้เลย'
            : 'カテゴリーを選んで練習を始めましょう'}
        </p>
      </div>

      {/* Current language indicator */}
      <div className={`rounded-2xl border px-4 py-3 ${accentBg} ${accentBorder} flex items-center gap-3`}>
        <span className="text-2xl">{isJapanese ? '🇯🇵' : '🇹🇭'}</span>
        <div>
          <p className={`text-sm font-semibold ${accentColor}`}>
            {isJapanese ? 'กำลังเรียนภาษาญี่ปุ่น' : 'タイ語を学習中'}
          </p>
          <p className="text-xs text-gray-500">
            {isJapanese ? `${dataset.length} คำทั้งหมด` : `全${dataset.length}語`}
          </p>
        </div>
      </div>

      {/* Preset cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((preset) => {
          const count = countForCategory(preset.category)
          if (count === 0) return null
          return (
            <button
              key={preset.category}
              onClick={() => handleSelect(preset.category)}
              className={`flex flex-col items-start gap-2 rounded-2xl border bg-white/5 border-white/10
                hover:${accentBg} hover:${accentBorder} active:scale-95 transition-all duration-150 p-4 text-left`}
            >
              <span className="text-3xl">{preset.icon}</span>
              <div className="w-full">
                <p className="text-white font-semibold text-sm leading-tight">
                  {isJapanese ? preset.labelTh : preset.labelJa}
                </p>
                <p className="text-gray-500 text-xs mt-0.5 leading-tight">
                  {isJapanese ? preset.descTh : preset.descJa}
                </p>
              </div>
              <span className={`text-xs font-mono ${accentColor} mt-auto`}>
                {isJapanese ? `${count} คำ →` : `${count}語 →`}
              </span>
            </button>
          )
        })}
      </div>

      {/* Practice all button */}
      <button
        onClick={() => onSelectPreset(dataset.map((e) => e.id))}
        className={`w-full py-4 rounded-2xl font-bold text-white transition-all duration-200 active:scale-95 ${accentBtn}`}
      >
        {isJapanese
          ? `🎯 ฝึกทั้งหมด ${dataset.length} คำ`
          : `🎯 全${dataset.length}語を練習する`}
      </button>
    </div>
  )
}
