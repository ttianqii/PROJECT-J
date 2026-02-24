import { useState, useEffect } from 'react'
import type { LearnerMode, VocabEntry, AssessResponse } from './types'
import { Header } from './components/Header'
import { WordCard } from './components/WordCard'
import { PronunciationRecorder } from './components/PronunciationRecorder'
import { AccuracyFeedback } from './components/AccuracyFeedback'
import thJaData from './data/th-ja.json'
import jaThData from './data/ja-th.json'

// Cast raw JSON to VocabEntry[]
const TH_JA: VocabEntry[] = thJaData as unknown as VocabEntry[]
const JA_TH: VocabEntry[] = jaThData as unknown as VocabEntry[]

// Group entries by category
function groupByCategory(entries: VocabEntry[]): Record<string, VocabEntry[]> {
  return entries.reduce<Record<string, VocabEntry[]>>((acc, e) => {
    ;(acc[e.category] ??= []).push(e)
    return acc
  }, {})
}

export default function App() {
  const [mode, setMode] = useState<LearnerMode>('th-ja')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [assessResult, setAssessResult] = useState<AssessResponse | null>(null)
  const [assessError, setAssessError] = useState<string | null>(null)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)

  const dataset = mode === 'th-ja' ? TH_JA : JA_TH
  const grouped = groupByCategory(dataset)
  const selectedEntry = dataset.find((e) => e.id === selectedId) ?? dataset[0]

  // Check backend connectivity on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => setBackendOk(r.ok))
      .catch(() => setBackendOk(false))
  }, [])

  // Reset selection and result when mode changes
  function handleModeChange(newMode: LearnerMode) {
    setMode(newMode)
    setSelectedId(null)
    setAssessResult(null)
    setAssessError(null)
  }

  function handleWordSelect(id: string) {
    setSelectedId(id)
    setAssessResult(null)
    setAssessError(null)
  }

  const isJapanese = mode === 'th-ja'
  const accentBg = isJapanese
    ? 'bg-red-500/10 border-red-500/30'
    : 'bg-amber-500/10 border-amber-500/30'
  const accentBgActive = isJapanese
    ? 'bg-red-500/20 border-red-500/40'
    : 'bg-amber-500/20 border-amber-500/40'
  const accentText = isJapanese ? 'text-red-400' : 'text-amber-400'

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <Header mode={mode} onModeChange={handleModeChange} />

      {/* Backend status banner */}
      {backendOk === false && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-300 text-sm font-semibold">
                Backend is offline — pronunciation scoring is unavailable
              </p>
              <p className="text-yellow-500/70 text-xs">
                Run{' '}
                <code className="font-mono bg-black/30 px-1 rounded">bun run dev:backend</code>{' '}
                and add your{' '}
                <code className="font-mono bg-black/30 px-1 rounded">OPENAI_API_KEY</code> to{' '}
                <code className="font-mono bg-black/30 px-1 rounded">backend/.env</code>
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

          {/* ── Left: Word List Sidebar ───────────────────────────────────── */}
          <aside className="space-y-4">
            <h2 className="text-xs text-gray-500 uppercase tracking-widest font-semibold px-1">
              {isJapanese ? 'คำศัพท์ภาษาญี่ปุ่น' : '語彙リスト'}
            </h2>

            {Object.entries(grouped).map(([category, entries]) => (
              <div key={category} className="space-y-1">
                <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold px-2 py-1">
                  {category}
                </p>
                {entries.map((entry) => {
                  const isActive = entry.id === (selectedId ?? dataset[0].id)
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleWordSelect(entry.id)}
                      className={`w-full text-left rounded-xl px-4 py-3 border transition-all ${
                        isActive
                          ? `${accentBgActive} text-white`
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p
                            className={`font-semibold text-lg leading-tight ${
                              isActive ? accentText : ''
                            }`}
                          >
                            {entry.word}
                          </p>
                          <p className="text-xs text-gray-500">{entry.romanization}</p>
                        </div>
                        <span className="text-xs text-gray-500 text-right leading-tight max-w-[80px] truncate">
                          {isJapanese ? entry.meaningTh : entry.meaningJa}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </aside>

          {/* ── Right: Main Content ───────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Word Card */}
            <WordCard entry={selectedEntry} mode={mode} />

            {/* Practice Section */}
            <div className={`rounded-3xl border p-8 space-y-6 ${accentBg}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-1 h-8 rounded-full ${
                    isJapanese ? 'bg-red-400' : 'bg-amber-400'
                  }`}
                />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {isJapanese ? '🎙️ ฝึกออกเสียง' : '🎙️ 発音練習'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {isJapanese
                      ? 'กด 🔊 ฟังตัวอย่างก่อน แล้วค่อยกด 🎤 พูด'
                      : '🔊を押してお手本を聞いてから 🎤 を押して話してください'}
                  </p>
                </div>
              </div>

              {assessResult ? (
                <AccuracyFeedback
                  result={assessResult}
                  mode={mode}
                  onReset={() => {
                    setAssessResult(null)
                    setAssessError(null)
                  }}
                />
              ) : (
                <PronunciationRecorder
                  entry={selectedEntry}
                  mode={mode}
                  onResult={(r) => {
                    setAssessResult(r)
                    setAssessError(null)
                  }}
                  onError={(msg) => setAssessError(msg)}
                />
              )}

              {assessError && !assessResult && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
                  <p className="text-red-400 text-sm font-semibold">❌ {assessError}</p>
                  <p className="text-red-400/70 text-xs mt-1">
                    {isJapanese
                      ? 'โปรดตรวจสอบการเชื่อมต่อและ API Key ของคุณ'
                      : 'バックエンドの接続とAPIキーを確認してください'}
                  </p>
                </div>
              )}
            </div>

            {/* Tips card */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-widest">
                {isJapanese ? '💡 เคล็ดลับ' : '💡 学習ヒント'}
              </h4>
              {isJapanese ? (
                <ul className="space-y-2 text-gray-400 text-sm list-none">
                  <li>🔴 = โมระเสียงสูง &nbsp;|&nbsp; สีเทา = โมระเสียงต่ำ</li>
                  <li>⬇ = จุดที่เสียงตก (accent drop) ในภาษาญี่ปุ่น</li>
                  <li>ฟัง 🔊 ก่อนพูดอย่างน้อย 3 รอบ</li>
                  <li>ลองพูดช้าๆ ก่อน แล้วค่อยเพิ่มความเร็ว</li>
                </ul>
              ) : (
                <ul className="space-y-2 text-gray-400 text-sm list-none">
                  <li>タイ語には5つの声調があります — 高・低・中・下降・上昇</li>
                  <li>声調を間違えると意味が変わってしまいます！</li>
                  <li>🔊を何度も聞いて耳に声調を刷り込みましょう</li>
                  <li>ゆっくり発音することから始めてください</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600 text-sm space-y-1">
          <p>PROJECT-J — Thai ↔ Japanese Pronunciation Trainer</p>
          <p>Powered by OpenAI Whisper · Web Speech API · Bun + Elysia · React + Vite</p>
        </div>
      </footer>
    </div>
  )
}
