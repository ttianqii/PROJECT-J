import { useState } from 'react'
import {
  Hand, Hash, Utensils, MessageCircle, Plane, Palette,
  Star, Languages, ChevronLeft, Mic, Volume2, XCircle,
} from 'lucide-react'
import type { LearnerMode, VocabEntry, AssessResponse, AppLang } from '../types'
import { t } from '../utils/i18n'
import { WordCard } from './WordCard'
import { PronunciationRecorder } from './PronunciationRecorder'
import { AccuracyFeedback } from './AccuracyFeedback'

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>

interface CategoryMeta {
  id: string
  Icon: LucideIcon
  i18nKey: string
}

const CATEGORY_META: CategoryMeta[] = [
  { id: 'greetings', Icon: Hand,          i18nKey: 'catGreetings' },
  { id: 'numbers',   Icon: Hash,          i18nKey: 'catNumbers'   },
  { id: 'food',      Icon: Utensils,      i18nKey: 'catFood'      },
  { id: 'common',    Icon: MessageCircle, i18nKey: 'catCommon'    },
  { id: 'travel',    Icon: Plane,         i18nKey: 'catTravel'    },
  { id: 'colors',    Icon: Palette,       i18nKey: 'catColors'    },
]

interface Props {
  mode: LearnerMode
  appLang: AppLang
  dataset: VocabEntry[]
  onSelectPreset?: (ids: string[]) => void
}

export function PresetScreen({ mode, appLang, dataset }: Props) {
  const isJapanese   = mode === 'th-ja'
  const accentColor  = isJapanese ? 'text-red-400'              : 'text-amber-400'
  const accentBg     = isJapanese ? 'bg-red-500/10'             : 'bg-amber-500/10'
  const accentBorder = isJapanese ? 'border-red-500/30'         : 'border-amber-500/30'
  const accentActiveBg = isJapanese ? 'bg-red-500'              : 'bg-amber-500'

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [selectedEntry, setSelectedEntry]   = useState<VocabEntry | null>(null)
  const [assessResult, setAssessResult]     = useState<AssessResponse | null>(null)
  const [assessError, setAssessError]       = useState<string | null>(null)

  const filteredWords =
    activeCategory === 'all'
      ? dataset
      : dataset.filter((e) => e.category === activeCategory)

  const availableCategories = CATEGORY_META.filter((m) =>
    dataset.some((e) => e.category === m.id),
  )

  function openEntry(entry: VocabEntry) {
    setSelectedEntry(entry)
    setAssessResult(null)
    setAssessError(null)
  }

  function goBack() {
    setSelectedEntry(null)
    setAssessResult(null)
    setAssessError(null)
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedEntry) {
    return (
      <div
        className="flex flex-col gap-4 px-4 pt-4 pb-2"
        style={{ animation: 'slideInRight 0.22s cubic-bezier(0.32,0.72,0,1) both' }}
      >
        {/* Back button */}
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors self-start"
        >
          <ChevronLeft size={18} />
          {t('backToList', appLang)}
        </button>

        {/* Word card */}
        <WordCard entry={selectedEntry} mode={mode} />

        {/* Practice section */}
        <div className={`rounded-2xl border p-4 ${accentBg} ${accentBorder}`}>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
            <Mic size={12} />
            {t('pronunciationTitle', appLang)}
          </p>
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
            <Volume2 size={12} className={accentColor} />
            <span>{t('listenThenSpeak', appLang)}</span>
          </div>

          {assessResult ? (
            <AccuracyFeedback
              result={assessResult}
              mode={mode}
              onReset={() => { setAssessResult(null); setAssessError(null) }}
            />
          ) : (
            <PronunciationRecorder
              entry={selectedEntry}
              mode={mode}
              onResult={(r) => { setAssessResult(r); setAssessError(null) }}
              onError={(msg) => setAssessError(msg)}
            />
          )}

          {assessError && !assessResult && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mt-2">
              <p className="text-red-400 text-sm font-semibold flex items-center gap-2">
                <XCircle size={14} /> {assessError}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-4 px-4 pt-4 pb-2"
      style={{ animation: 'slideInLeft 0.22s cubic-bezier(0.32,0.72,0,1) both' }}
    >
      {/* Header */}
      <div className="space-y-0.5 pt-1">
        <h2 className={`text-xl font-bold ${accentColor} flex items-center gap-2`}>
          <Star size={18} />
          {t('presetTitle', appLang)}
        </h2>
        <p className="text-gray-400 text-sm">
          {appLang === 'ja'
            ? `${filteredWords.length}語 — タップして詳細を見る`
            : appLang === 'th'
            ? `${filteredWords.length} คำ — แตะเพื่อดูรายละเอียด`
            : `${filteredWords.length} words — tap for details`}
        </p>
      </div>

      {/* Language badge */}
      <div className={`rounded-2xl border px-4 py-3 ${accentBg} ${accentBorder} flex items-center gap-3`}>
        <Languages size={20} className={accentColor} />
        <div>
          <p className={`text-sm font-semibold ${accentColor}`}>
            {isJapanese ? t('learningJp', appLang) : t('learningTh', appLang)}
          </p>
          <p className="text-xs text-gray-500">
            {appLang === 'ja' ? `全${dataset.length}語` : appLang === 'th' ? `${dataset.length} คำทั้งหมด` : `${dataset.length} words total`}
          </p>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* "All" chip */}
        <button
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            activeCategory === 'all'
              ? `${accentActiveBg} border-transparent text-white`
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
          }`}
        >
          {t('presetAll', appLang)}
        </button>

        {availableCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeCategory === cat.id
                ? `${accentActiveBg} border-transparent text-white`
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <cat.Icon size={11} />
            {t(cat.i18nKey, appLang)}
          </button>
        ))}
      </div>

      {/* Responsive word grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {filteredWords.map((entry) => (
          <button
            key={entry.id}
            onClick={() => openEntry(entry)}
            className="flex flex-col items-start gap-1.5 rounded-2xl p-3.5 border bg-white/5 border-white/10
              hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-150 text-left w-full"
          >
            {/* Word */}
            <span
              className={`font-bold leading-none ${accentColor} w-full truncate`}
              style={{
                fontSize: `clamp(1.05rem, ${(13 / Math.max(entry.word.length, 1)).toFixed(2)}rem, 1.9rem)`,
              }}
            >
              {entry.word}
            </span>
            {/* Romanization */}
            <span className="text-[10px] text-gray-500 leading-tight font-mono w-full truncate">
              {entry.romanization}
            </span>
            {/* Meaning */}
            <span className="text-[11px] text-gray-400 leading-snug line-clamp-2">
            {isJapanese ? entry.meaningTh : entry.meaningJa}
            </span>
          </button>
        ))}
      </div>

      {filteredWords.length === 0 && (
        <p className="text-center text-gray-600 text-sm py-10">
          {t('noWordsInCat', appLang)}
        </p>
      )}
    </div>
  )
}
