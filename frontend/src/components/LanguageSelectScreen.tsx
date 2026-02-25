import type { LearnerMode, AppLang } from '../types'
import { t } from '../utils/i18n'

interface Props {
  mode: LearnerMode
  appLang: AppLang
  onSelect: (mode: LearnerMode) => void
  onContinue: () => void
  onAppLangChange: (lang: AppLang) => void
}

// flag images served from public/flag/
const FLAG_JP = '/flag/japan.png'
const FLAG_TH = '/flag/thailand.png'

interface LangOption {
  mode: LearnerMode
  targetFlag: string
  titleKey: string
  subtitleKey: string
  dirTag: string
  accentBg: string
  accentBorder: string
  accentText: string
  accentBtn: string
}

const OPTIONS: LangOption[] = [
  {
    mode:        'th-ja',
    targetFlag:  FLAG_JP,
    titleKey:    'learnJpTitle',
    subtitleKey: 'learnJpSub',
    dirTag:      'TH → JP',
    accentBg:    'bg-red-500/10',
    accentBorder:'border-red-500/40',
    accentText:  'text-red-400',
    accentBtn:   'bg-red-500 hover:bg-red-600 shadow-red-500/30',
  },
  {
    mode:        'ja-th',
    targetFlag:  FLAG_TH,
    titleKey:    'learnThTitle',
    subtitleKey: 'learnThSub',
    dirTag:      'JP → TH',
    accentBg:    'bg-amber-500/10',
    accentBorder:'border-amber-500/40',
    accentText:  'text-amber-400',
    accentBtn:   'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30',
  },
]

// App UI language selector options
const LANG_OPTS: { lang: AppLang; flagSrc: string; label: string }[] = [
  { lang: 'th', flagSrc: '/flag/thailand.png',       label: 'ไทย'     },
  { lang: 'ja', flagSrc: '/flag/japan.png',           label: '日本語'  },
  { lang: 'en', flagSrc: '/flag/united-kingdom.png',  label: 'English' },
]

export function LanguageSelectScreen({ mode, appLang, onSelect, onContinue, onAppLangChange }: Props) {
  const selectedOpt = OPTIONS.find(o => o.mode === mode)!

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-2">

      {/* ── App language selector ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">
          {t('appLanguageLabel', appLang)}
        </span>
        <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
          {LANG_OPTS.map(({ lang, flagSrc, label }) => (
            <button
              key={lang}
              onClick={() => onAppLangChange(lang)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200
                ${appLang === lang
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              <img src={flagSrc} alt={label} className="w-4 h-auto rounded-[2px]" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="text-center space-y-1 pt-1">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src={FLAG_TH} alt="Thailand" className="w-12 h-auto" />
          <span className="text-xl text-gray-500">⇄</span>
          <img src={FLAG_JP} alt="Japan" className="w-12 h-auto" />
        </div>
        <h2 className="text-2xl font-bold text-white">PROJECT-J</h2>
        <p className="text-gray-400 text-sm">
          {t('selectLanguage', appLang)}
        </p>
      </div>

      {/* ── Language option cards ───────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {OPTIONS.map((opt) => {
          const isSelected = mode === opt.mode
          return (
            <button
              key={opt.mode}
              onClick={() => onSelect(opt.mode)}
              className={`w-full text-left rounded-3xl border-2 p-5 transition-all duration-300
                ${isSelected
                  ? `${opt.accentBg} ${opt.accentBorder} shadow-lg scale-[1.01]`
                  : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                }`}
            >
              <div className="flex items-center gap-4">
                {/* Target language flag */}
                <div className="shrink-0">
                  <img src={opt.targetFlag} alt="target language" className="w-14 h-auto" />
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xl font-bold leading-tight ${isSelected ? opt.accentText : 'text-white'}`}>
                    {t(opt.titleKey, appLang)}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5 leading-snug">
                    {t(opt.subtitleKey, appLang)}
                  </p>
                  <p className={`text-xs mt-1.5 font-mono tracking-widest ${isSelected ? opt.accentText : 'text-gray-600'}`}>
                    {opt.dirTag}
                  </p>
                </div>

                {/* Selection circle */}
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                  ${isSelected ? `${opt.accentBorder} ${opt.accentText}` : 'border-white/20'}`}>
                  {isSelected && <span className="text-sm">✓</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Start button ────────────────────────────────────────────────── */}
      <button
        onClick={onContinue}
        className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-200 active:scale-95 shadow-lg
          ${selectedOpt.accentBtn}`}
      >
        {t('startLearning', appLang)}
      </button>
    </div>
  )
}
