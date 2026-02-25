import { useState, useEffect } from 'react'
import type { LearnerMode, VocabEntry, AssessResponse, AppLang } from './types'
import { t } from './utils/i18n'
import { BottomNav, type AppTab } from './components/BottomNav'
import { LanguageSelectScreen } from './components/LanguageSelectScreen'
import { PresetScreen } from './components/PresetScreen'
import { WordCard } from './components/WordCard'
import { PronunciationRecorder } from './components/PronunciationRecorder'
import { AccuracyFeedback } from './components/AccuracyFeedback'
import { Volume2, Mic, AlertTriangle, XCircle } from 'lucide-react'
import FreeSpeak from './components/FreeSpeak'
import thJaData from './data/th-ja.json'
import jaThData from './data/ja-th.json'

const TH_JA: VocabEntry[] = thJaData as unknown as VocabEntry[]
const JA_TH: VocabEntry[] = jaThData as unknown as VocabEntry[]

function groupByCategory(entries: VocabEntry[]): Record<string, VocabEntry[]> {
  return entries.reduce<Record<string, VocabEntry[]>>((acc, e) => {
    ;(acc[e.category] ??= []).push(e)
    return acc
  }, {})
}

export default function App() {
  const [mode, setMode] = useState<LearnerMode>('th-ja')
  const [appLang, setAppLang] = useState<AppLang>(() => {
    return (localStorage.getItem('appLang') as AppLang | null) ?? 'th'
  })
  const [activeTab, setActiveTab] = useState<AppTab>('language')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [presetIds, setPresetIds] = useState<string[] | null>(null)
  const [assessResult, setAssessResult] = useState<AssessResponse | null>(null)
  const [assessError, setAssessError] = useState<string | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [showWordDetail, setShowWordDetail] = useState(false)
  const [languageChosen, setLanguageChosen] = useState(false)

  const dataset = mode === 'th-ja' ? TH_JA : JA_TH
  const visibleList = presetIds ? dataset.filter((e) => presetIds.includes(e.id)) : dataset
  const grouped = groupByCategory(visibleList)
  const selectedEntry = dataset.find((e) => e.id === selectedId) ?? dataset[0]!

  const isJapanese  = mode === 'th-ja'
  const accentColor  = isJapanese ? 'text-red-400'       : 'text-amber-400'
  const accentBg     = isJapanese ? 'bg-red-500/10'      : 'bg-amber-500/10'
  const accentBorder = isJapanese ? 'border-red-500/30'  : 'border-amber-500/30'

  useEffect(() => {
    fetch('/api/health')
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false))
  }, [])

  function handleAppLangChange(lang: AppLang) {
    setAppLang(lang)
    localStorage.setItem('appLang', lang)
  }

  function handleModeChange(newMode: LearnerMode) {
    setMode(newMode)
    setSelectedId(null)
    setPresetIds(null)
    setAssessResult(null)
    setAssessError(null)
    setShowWordDetail(false)
  }

  function handleWordSelect(id: string) {
    setSelectedId(id)
    setAssessResult(null)
    setAssessError(null)
    setShowWordDetail(true)
  }

  function handlePresetSelect(ids: string[]) {
    setPresetIds(ids)
    setSelectedId(null)
    setAssessResult(null)
    setAssessError(null)
    setShowWordDetail(false)
    setActiveTab('words')
  }

  // ── Tab: Language ────────────────────────────────────────────────────────
  const tabLanguage = (
    <LanguageSelectScreen
      mode={mode}
      appLang={appLang}
      onSelect={handleModeChange}
      onContinue={() => { setLanguageChosen(true); setActiveTab('words') }}
      onAppLangChange={handleAppLangChange}
    />
  )

  // ── Tab: Words ───────────────────────────────────────────────────────────
  const wordList = (
    <div className="flex flex-col gap-2 px-4 pt-4 pb-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className={`text-xl font-bold ${accentColor}`}>
            {t('vocabularyTitle', appLang)}
          </h2>
          {presetIds && (
            <p className="text-xs text-gray-500 mt-0.5">
              {appLang === 'ja' ? `${visibleList.length}語を選択中` : appLang === 'th' ? `${visibleList.length} คำที่เลือก` : `${visibleList.length} selected`}
              <button className="ml-2 text-gray-600 underline" onClick={() => setPresetIds(null)}>
                {t('showAll', appLang)}
              </button>
            </p>
          )}
        </div>
        <span className={`text-sm font-mono ${accentColor}`}>
          {appLang === 'ja' ? `${visibleList.length}語` : appLang === 'th' ? `${visibleList.length} คำ` : `${visibleList.length} words`}
        </span>
      </div>

      {Object.entries(grouped).map(([category, entries]) => (
        <div key={category}>
          <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold px-1 py-1 mt-2">
            {category}
          </p>
          <div className="flex flex-col gap-1">
            {entries.map((entry) => {
              const isActive = entry.id === (selectedId ?? dataset[0]?.id)
              return (
                <button
                  key={entry.id}
                  onClick={() => handleWordSelect(entry.id)}
                  className={`w-full text-left rounded-2xl px-4 py-3 border transition-all active:scale-[0.98]
                    ${isActive
                      ? `${accentBg} ${accentBorder} text-white`
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className={`font-bold text-xl leading-tight ${isActive ? accentColor : 'text-white'}`}>
                        {entry.word}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{entry.romanization}</p>
                    </div>
                    <span className="text-xs text-gray-500 text-right leading-tight max-w-[90px] truncate shrink-0">
                      {isJapanese ? entry.meaningTh : entry.meaningJa}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  const wordDetail = (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-2">
      <button
        onClick={() => { setShowWordDetail(false); setAssessResult(null); setAssessError(null) }}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors self-start"
      >
        {t('back', appLang)}
      </button>
      <WordCard entry={selectedEntry} mode={mode} />

      {/* ── Inline pronunciation practice ── */}
      <div className={`rounded-2xl border p-4 ${accentBg} ${accentBorder}`}>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
          <Mic size={12} className="inline mr-1" />
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

  const tabWords = (
    <>
      <div className="lg:hidden">
        {showWordDetail && selectedId ? wordDetail : wordList}
      </div>
      <div className="hidden lg:grid lg:grid-cols-[300px_1fr] gap-6 px-6 pt-4 pb-2">
        <div className="overflow-y-auto max-h-[calc(100vh-140px)] pr-1">{wordList}</div>
        <div className="overflow-y-auto max-h-[calc(100vh-140px)]">{wordDetail}</div>
      </div>
    </>
  )

  // ── Tab: Practice — free speak only ────────────────────────────────────
  const tabPractice = <FreeSpeak mode={mode} dataset={dataset} />

  // ── Tab: Preset ──────────────────────────────────────────────────────────
  const tabPreset = (
    <PresetScreen
      mode={mode}
      appLang={appLang}
      dataset={dataset}
      onSelectPreset={handlePresetSelect}
    />
  )

  const TAB_CONTENT: Record<AppTab, React.ReactNode> = {
    language: tabLanguage,
    words:    tabWords,
    practice: tabPractice,
    preset:   tabPreset,
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      {/* ── Top mini-header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold ${accentColor}`}>PROJECT-J</span>
          </div>
          {backendOk === false && (
            <span className="text-[10px] bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <AlertTriangle size={10} /> offline
            </span>
          )}
          <div className={`text-xs font-semibold px-3 py-1 rounded-full border ${accentBg} ${accentBorder} ${accentColor}`}>
            {isJapanese ? 'TH → JP' : 'JP → TH'}
          </div>
        </div>
      </header>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto overflow-y-auto pb-[calc(88px+env(safe-area-inset-bottom))]">
        {!languageChosen ? tabLanguage : TAB_CONTENT[activeTab]}
      </main>

      {/* ── Bottom navigation ─────────────────────────────────────────────── */}
      <BottomNav
        activeTab={!languageChosen ? 'language' : activeTab}
        mode={mode}
        appLang={appLang}
        locked={!languageChosen}
        onTabChange={(tab) => {
          setActiveTab(tab)
          if (tab === 'words' && selectedId) setShowWordDetail(true)
        }}
      />
    </div>
  )
}
