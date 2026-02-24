interface Props {
  mode: 'th-ja' | 'ja-th'
  onToggle: (mode: 'th-ja' | 'ja-th') => void
}

export function LanguageToggle({ mode, onToggle }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-1.5 border border-white/10">
      <button
        onClick={() => onToggle('th-ja')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          mode === 'th-ja'
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="text-lg">🇹🇭</span>
        <span>เรียนภาษาญี่ปุ่น</span>
        <span className="text-xs opacity-70">→ 🇯🇵</span>
      </button>

      <button
        onClick={() => onToggle('ja-th')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
          mode === 'ja-th'
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="text-lg">🇯🇵</span>
        <span>タイ語を学ぶ</span>
        <span className="text-xs opacity-70">→ 🇹🇭</span>
      </button>
    </div>
  )
}
