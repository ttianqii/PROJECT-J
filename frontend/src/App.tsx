import { useState, useEffect } from 'react'
import type { LearnerMode, VocabEntry, AssessResponse } from './types'
import { BottomNav, type AppTab } from './components/BottomNav'
import { LanguageSelectScreen } from './components/LanguageSelectScreen'
import { PresetScreen } from './components/PresetScreen'
import { WordCard } from './components/WordCard'
import { PronunciationRecorder } from './components/PronunciationRecorder'
import { AccuracyFeedback } from './components/AccuracyFeedback'
import { Volume2 } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<AppTab>('language')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [presetIds, setPresetIds] = useState<string[] | null>(null)
  const [assessResult, setAssessResult] = useState<AssessResponse | null>(null)
  const [assessError, setAssessError] = useState<string | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [showWordDetail, setShowWordDetail] = useState(false)

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
      onSelect={handleModeChange}
      onContinue={() => setActiveTab('words')}
    />
  )

  // ── Tab: Words ───────────────────────────────────────────────────────────
  const wordList = (
    <div className="flex flex-col gap-2 px-4 pt-4 pb-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className={`text-xl font-bold ${accentColor}`}>
            {isJapanese ? '📖 คำศัพท์' : '📖 語彙リスト'}
          </h2>
          {presetIds && (
            <p className="text-xs text-gray-500 mt-0.5">
              {isJapanese ? `${visibleList.length} คำที่เลือก` : `${visibleList.length}語を選択中`}
              <button className="ml-2 text-gray-600 underline" onClick={() => setPresetIds(null)}>
                {isJapanese ? 'แสดงทั้งหมด' : 'すべて表示'}
              </button>
            </p>
          )}
        </div>
        <span className={`text-sm font-mono ${accentColor}`}>
          {isJapanese ? `${visibleList.length} คำ` : `${visibleList.length}語`}
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
        onClick={() => setShowWordDetail(false)}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors self-start"
      >
        ← {isJapanese ? 'กลับ' : '戻る'}
      </button>
      <WordCard entry={selectedEntry} mode={mode} />
      <button
        onClick={() => { setActiveTab('practice'); setAssessResult(null); setAssessError(null) }}
        className={`w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-95
          ${isJapanese ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
      >
        🎤 {isJapanese ? 'ฝึกออกเสียงคำนี้' : 'この語を練習する'}
      </button>
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

  // ── Tab: Practice ────────────────────────────────────────────────────────
  const tabPractice = (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-2">
      <div className={`rounded-2xl border p-4 ${accentBg} ${accentBorder}`}>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">
          {isJapanese ? 'คำที่กำลังฝึก' : '練習中の単語'}
        </p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`text-4xl font-bold ${accentColor}`}>{selectedEntry.word}</p>
            <p className="text-gray-400 text-sm mt-0.5">{selectedEntry.romanization}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {isJapanese ? selectedEntry.meaningTh : selectedEntry.meaningJa}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('words')}
            className="text-xs text-gray-500 hover:text-white underline shrink-0"
          >
            {isJapanese ? 'เปลี่ยนคำ' : '単語を変更'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400 px-1">
        <Volume2 size={14} className={accentColor} />
        <span>
          {isJapanese
            ? 'กด 🔊 ฟังก่อน แล้วค่อยกด 🎤 พูด'
            : '🔊でお手本を聞いてから 🎤 で話してください'}
        </span>
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
          <p className="text-red-400 text-sm font-semibold">❌ {assessError}</p>
          <p className="text-red-400/70 text-xs mt-1">
            {isJapanese
              ? 'ลองบันทึกเสียงใหม่ หรือตรวจสอบการเชื่อมต่อกับ backend'
              : 'もう一度録音するか、バックエンドの接続を確認してください'}
          </p>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          💡 {isJapanese ? 'เคล็ดลับ' : 'ヒント'}
        </p>
        {isJapanese ? (
          <ul className="space-y-1.5 text-gray-400 text-xs">
            <li>🔴 = โมระเสียงสูง · สีเทา = โมระเสียงต่ำ</li>
            <li>⬇ = จุดที่เสียงลดลง (accent drop)</li>
            <li>ฟัง 🔊 ก่อนพูดอย่างน้อย 3 รอบ</li>
            <li>พูดช้าๆ ก่อน แล้วค่อยเพิ่มความเร็วขึ้น</li>
          </ul>
        ) : (
          <ul className="space-y-1.5 text-gray-400 text-xs">
            <li>タイ語には5つの声調があります</li>
            <li>声調を間違えると意味が変わります！</li>
            <li>🔊を何度も聞いて声調を記憶してください</li>
            <li>ゆっくり発音することから始めましょう</li>
          </ul>
        )}
      </div>
    </div>
  )

  // ── Tab: Preset ──────────────────────────────────────────────────────────
  const tabPreset = (
    <PresetScreen
      mode={mode}
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
            <span className="text-xl">🗾</span>
            <span className={`text-base font-bold ${accentColor}`}>PROJECT-J</span>
          </div>
          {backendOk === false && (
            <span className="text-[10px] bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full font-semibold">
              ⚠️ offline
            </span>
          )}
          <div className={`text-xs font-semibold px-3 py-1 rounded-full border ${accentBg} ${accentBorder} ${accentColor}`}>
            {isJapanese ? '🇹🇭→🇯🇵' : '🇯🇵→🇹🇭'}
          </div>
        </div>
      </header>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto overflow-y-auto pb-[calc(88px+env(safe-area-inset-bottom))]">
        {TAB_CONTENT[activeTab]}
      </main>

      {/* ── Bottom navigation ─────────────────────────────────────────────── */}
      <BottomNav
        activeTab={activeTab}
        mode={mode}
        onTabChange={(tab) => {
          setActiveTab(tab)
          if (tab === 'words' && selectedId) setShowWordDetail(true)
        }}
      />
    </div>
  )
}
