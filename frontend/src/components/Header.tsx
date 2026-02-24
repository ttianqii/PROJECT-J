import type { LearnerMode } from '../types'
import { LanguageToggle } from './LanguageToggle'

interface Props {
  mode: LearnerMode
  onModeChange: (mode: LearnerMode) => void
}

export function Header({ mode, onModeChange }: Props) {
  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-3xl">🗾</span>
            <span className="absolute -bottom-1 -right-1 text-lg">🇹🇭</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              PROJECT-J
            </h1>
            <p className="text-xs text-gray-400">
              {mode === 'th-ja'
                ? 'เรียนออกเสียงภาษาญี่ปุ่นด้วย AI'
                : 'AIでタイ語発音を学ぼう'}
            </p>
          </div>
        </div>

        {/* Language toggle */}
        <LanguageToggle mode={mode} onToggle={onModeChange} />
      </div>
    </header>
  )
}
