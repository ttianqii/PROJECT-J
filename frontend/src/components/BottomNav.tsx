import { Globe, BookOpen, Mic, Star, Lock } from 'lucide-react'
import type { LearnerMode, AppLang } from '../types'
import { t } from '../utils/i18n'

export type AppTab = 'language' | 'words' | 'practice' | 'preset'

interface Props {
  activeTab: AppTab
  mode: LearnerMode
  appLang: AppLang
  onTabChange: (tab: AppTab) => void
  locked?: boolean   // true = only language tab is accessible
}

interface NavItem {
  tab: AppTab
  Icon: React.ElementType
  i18nKey: string
}

const NAV_ITEMS: NavItem[] = [
  { tab: 'language', Icon: Globe,    i18nKey: 'navLanguage' },
  { tab: 'words',    Icon: BookOpen, i18nKey: 'navWords'    },
  { tab: 'practice', Icon: Mic,      i18nKey: 'navPractice' },
  { tab: 'preset',   Icon: Star,     i18nKey: 'navPreset'   },
]

export function BottomNav({ activeTab, mode, appLang, onTabChange, locked = false }: Props) {
  const isJapanese = mode === 'th-ja'
  const activeColor = isJapanese ? 'text-red-400' : 'text-amber-400'
  const activeBg    = isJapanese ? 'bg-red-500/15 border-red-500/30' : 'bg-amber-500/15 border-amber-500/30'

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {NAV_ITEMS.map(({ tab, Icon, i18nKey }) => {
          const isActive = tab === activeTab
          const isDisabled = locked && tab !== 'language'
          return (
            <button
              key={tab}
              onClick={() => !isDisabled && onTabChange(tab)}
              disabled={isDisabled}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200
                ${isDisabled
                  ? 'text-gray-700 cursor-not-allowed'
                  : isActive
                    ? activeColor
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all duration-200
                ${isActive && !isDisabled ? activeBg + ' border' : ''}`}>
                {isDisabled
                  ? <Lock size={18} strokeWidth={1.6} />
                  : <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                }
                <span className="text-[10px] font-semibold leading-none tracking-wide">
                  {t(i18nKey, appLang)}
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
