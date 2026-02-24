import { Globe, BookOpen, Mic, Star, Lock } from 'lucide-react'
import type { LearnerMode } from '../types'

export type AppTab = 'language' | 'words' | 'practice' | 'preset'

interface Props {
  activeTab: AppTab
  mode: LearnerMode
  onTabChange: (tab: AppTab) => void
  locked?: boolean   // true = only language tab is accessible
}

interface NavItem {
  tab: AppTab
  Icon: React.ElementType
  labelTh: string
  labelJa: string
}

const NAV_ITEMS: NavItem[] = [
  { tab: 'language', Icon: Globe,     labelTh: 'ภาษา',   labelJa: '言語'   },
  { tab: 'words',    Icon: BookOpen,  labelTh: 'คำศัพท์', labelJa: '語彙'   },
  { tab: 'practice', Icon: Mic,       labelTh: 'ฝึกพูด',  labelJa: '練習'   },
  { tab: 'preset',   Icon: Star,      labelTh: 'ชุดฝึก',  labelJa: 'セット' },
]

export function BottomNav({ activeTab, mode, onTabChange, locked = false }: Props) {
  const isJapanese = mode === 'th-ja'
  const activeColor = isJapanese ? 'text-red-400' : 'text-amber-400'
  const activeBg    = isJapanese ? 'bg-red-500/15 border-red-500/30' : 'bg-amber-500/15 border-amber-500/30'

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {NAV_ITEMS.map(({ tab, Icon, labelTh, labelJa }) => {
          const isActive = tab === activeTab
          const isDisabled = locked && tab !== 'language'
          return (
            <button
              key={tab}
              onClick={() => !isDisabled && onTabChange(tab)}
              disabled={isDisabled}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200
                ${isDisabled
                  ? 'text-gray-700 cursor-not-allowed'
                  : isActive
                    ? activeColor
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all duration-200
                ${isActive && !isDisabled ? activeBg + ' border' : ''}`}>
                {isDisabled
                  ? <Lock size={20} strokeWidth={1.6} />
                  : <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
                }
                <span className="text-[10px] font-semibold leading-none tracking-wide">
                  {isJapanese ? labelTh : labelJa}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
