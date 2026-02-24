import { useState } from 'react'
import { Volume2, Mic, MicOff, Loader2, X } from 'lucide-react'
import type { SentenceToken, PitchSyllable, ThaiSyllable, LearnerMode, AssessResponse } from '../types'
import { romajiMoraToThai, rtgsToKatakana } from '../utils/phonetics'
import { AccuracyFeedback } from './AccuracyFeedback'
import { assessPronunciation } from '../services/api'
import { useTTS } from '../hooks/useTTS'

interface Props {
  sentence: string
  tokens: SentenceToken[]
  mode: LearnerMode
}

// ── Same PitchDisplay as WordCard ─────────────────────────────────────────────
function PitchDisplay({ syllables }: { syllables: PitchSyllable[] }) {
  return (
    <div className="flex items-end gap-1.5 flex-wrap">
      {syllables.map((s, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className={`w-full h-1 rounded-full mb-1 transition-colors ${s.isHigh ? 'bg-red-400' : 'bg-gray-600'} ${s.isAccentDrop ? 'border-r-2 border-red-400' : ''}`} />
          <span className="text-sm text-gray-300">{s.roman}</span>
          <span className="text-xs text-gray-500">{s.kana}</span>
          <span className="text-xs text-amber-400/80 mt-0.5 font-medium">
            {s.thai ?? romajiMoraToThai(s.roman)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Same ToneDisplay as WordCard ──────────────────────────────────────────────
const TONE_COLOR_CLS: Record<string, string> = {
  mid: 'text-blue-400', low: 'text-purple-400', falling: 'text-red-400',
  high: 'text-green-400', rising: 'text-yellow-400',
}
const TONE_LABEL: Record<string, string> = {
  mid: 'กลาง', low: 'เอก', falling: 'โท', high: 'ตรี', rising: 'จัตวา',
}
const TONE_LABEL_JA: Record<string, string> = {
  mid: '中', low: '低', falling: '下降', high: '高', rising: '上昇',
}

function ToneDisplay({ syllables, mode }: { syllables: ThaiSyllable[]; mode: LearnerMode }) {
  return (
    <div className="flex items-end gap-3 flex-wrap">
      {syllables.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <span className={`text-xs font-semibold ${TONE_COLOR_CLS[s.tone]}`}>
            {mode === 'ja-th' ? TONE_LABEL_JA[s.tone] : TONE_LABEL[s.tone]}
          </span>
          <span className="text-base text-gray-200">{s.roman}</span>
          <span className={`text-sm ${TONE_COLOR_CLS[s.tone]}`}>{s.thai}</span>
          {mode === 'ja-th' && (
            <span className="text-xs text-blue-400/80 mt-0.5 font-medium">
              {s.katakana ?? rtgsToKatakana(s.roman)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Reusable practice recorder ───────────────────────────────────────────────
function PracticeSection({ word, romanization, mode }: { word: string; romanization: string; mode: LearnerMode }) {
  const isJapanese = mode === 'th-ja'
  const lang = isJapanese ? 'ja' : 'th'
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = { current: null as MediaRecorder | null }
  const chunksRef = { current: [] as Blob[] }

  const start = async () => {
    setError(null); setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
        setLoading(true)
        try { setResult(await assessPronunciation(blob, word, romanization, lang)) }
        catch (err) { setError(err instanceof Error ? err.message : 'Error') }
        finally { setLoading(false) }
      }
      mr.start(); mediaRef.current = mr; setRecording(true)
    } catch { setError(isJapanese ? 'ไม่สามารถเข้าถึงไมค์ได้' : 'マイクにアクセスできません') }
  }
  const stop = () => { mediaRef.current?.stop(); mediaRef.current = null; setRecording(false) }

  if (result) return <AccuracyFeedback result={result} mode={mode} onReset={() => { setResult(null); setError(null) }} />
  if (loading) return <div className="flex items-center gap-3"><Loader2 size={16} className="animate-spin text-gray-400" /><span className="text-xs text-gray-500 font-mono">Scoring...</span></div>
  if (recording) return (
    <div className="flex flex-col items-center gap-3">
      <p className={`text-xs font-mono uppercase tracking-widest ${isJapanese ? 'text-red-400/80' : 'text-amber-400/80'}`}>Listening...</p>
      <button onClick={stop} className="flex items-center gap-2 text-xs font-mono text-white/40 border border-white/10 rounded-full px-4 py-1.5 hover:border-white/25 hover:text-white/70 transition-all">
        <MicOff size={10} /> Stop &amp; score
      </button>
    </div>
  )
  return (
    <>
      <button onClick={start} className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-white/90 flex items-center justify-center gap-2 transition-all ${isJapanese ? 'bg-gradient-to-r from-red-700/70 to-red-600/80 hover:from-red-600/80 hover:to-red-500/90' : 'bg-gradient-to-r from-orange-700/70 to-amber-600/80 hover:from-orange-600/80 hover:to-amber-500/90'}`}>
        <Mic size={13} /> {isJapanese ? 'พูดเพื่อรับคะแนน' : 'Speak to score'}
      </button>
      {error && <p className="text-xs text-red-400/75 font-mono mt-1">{error}</p>}
    </>
  )
}

// ── Word detail panel (shown inside the card when a chip is tapped) ───────────
function WordDetail({ token, mode, onClose }: { token: SentenceToken; mode: LearnerMode; onClose: () => void }) {
  const isJapanese = mode === 'th-ja'
  const accentCls = isJapanese ? 'text-red-400' : 'text-amber-400'
  const meaning = isJapanese ? token.meaningTh : token.meaningJa
  const also = isJapanese ? token.meaningJa : token.meaningTh
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden" style={{ animation: 'fadeUp 0.18s ease both' }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
        <div>
          <div className={`font-bold leading-none ${accentCls}`} style={{ fontSize: `clamp(1.6rem, ${(22 / Math.max(token.word.length, 1)).toFixed(2)}rem, 3rem)` }}>{token.word}</div>
          {token.reading && token.reading !== token.word && <div className="text-gray-400 mt-0.5" style={{ fontSize: 'clamp(0.9rem, 4vw, 1.2rem)' }}>{token.reading}</div>}
          <div className="text-sm text-gray-300 font-mono tracking-wider mt-1">/{token.romanization}/</div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all shrink-0 ml-3">
          <X size={13} />
        </button>
      </div>
      <div className="p-5 space-y-5">
        {!token.isParticle && token.syllables?.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
              {isJapanese ? 'ピッチアクセント / Pitch Accent' : 'วรรณยุกต์ / Tone Class'}
            </div>
            <div className="bg-black/20 rounded-2xl p-4">
              {isJapanese
                ? <PitchDisplay syllables={token.syllables as PitchSyllable[]} />
                : <ToneDisplay syllables={token.syllables as ThaiSyllable[]} mode={mode} />
              }
            </div>
            {isJapanese && (
              <p className="text-xs text-gray-600 flex gap-3 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> high pitch</span>
                <span>↓ pitch drops after this mora</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400/70 inline-block" /> Thai phonetic</span>
              </p>
            )}
          </div>
        )}
        <div className="space-y-1">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">{isJapanese ? 'ความหมาย / Meaning' : '意味 / ความหมาย'}</div>
          <div className="text-2xl text-white font-medium">{meaning}</div>
          {also && <div className="text-sm text-gray-500">{also}</div>}
        </div>
        <div className="space-y-3 border-t border-white/5 pt-4">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Mic size={10} className="opacity-50" />
            {isJapanese ? 'ฝึกออกเสียงคำนี้' : 'この単語を練習'}
          </div>
          <PracticeSection word={token.word} romanization={token.romanization} mode={mode} />
        </div>
      </div>
    </div>
  )
}

// ── Main — ONE card, word chips inside, click to see detail ──────────────────
export function SentenceBreakdown({ sentence, tokens, mode }: Props) {
  const { speak, isSpeaking } = useTTS()
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const isJapanese = mode === 'th-ja'
  const accentCls = isJapanese ? 'text-red-400' : 'text-amber-400'
  const badgeColor = isJapanese ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
  const fullRoman = tokens.map(t => t.romanization).join(' ')
  const fullMeaning = tokens.filter(t => !t.isParticle).map(t => isJapanese ? t.meaningTh : t.meaningJa).join(' · ')

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5" style={{ animation: 'fadeUp 0.25s ease both' }}>

      {/* Badge + TTS */}
      <div className="flex items-center justify-between">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${badgeColor}`}>
          {isJapanese ? 'ประโยค' : '文'}
        </span>
        <button
          onClick={() => speak(sentence, isJapanese ? 'ja-JP' : 'th-TH')}
          disabled={isSpeaking}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSpeaking ? 'bg-white/10 text-white/40 cursor-not-allowed' : isJapanese ? 'bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-200 hover:scale-110 active:scale-95' : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 hover:text-amber-200 hover:scale-110 active:scale-95'}`}
        >
          {isSpeaking ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Full sentence big text */}
      <div className="space-y-1">
        <div className={`font-bold leading-tight ${accentCls}`} style={{ fontSize: 'clamp(1.6rem, 7vw, 2.8rem)' }}>
          {sentence}
        </div>
        <div className="text-base text-gray-300 font-mono tracking-wider pt-1">/{fullRoman}/</div>
      </div>

      {/* Clickable word chips */}
      <div className="space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
          {isJapanese ? 'แตะคำเพื่อดูรายละเอียด' : '単語をタップ'}
        </div>
        <div className="flex flex-wrap gap-2">
          {tokens.map((token, i) => {
            const isActive = activeIdx === i
            return (
              <button
                key={i}
                onClick={() => setActiveIdx(isActive ? null : i)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all duration-150
                  ${isActive
                    ? isJapanese ? 'bg-red-500/20 border-red-400/40 text-red-300' : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white/90'
                  } ${token.isParticle ? 'opacity-50 text-xs font-normal' : ''}`}
              >
                {token.word}
                {token.reading && token.reading !== token.word && (
                  <span className="block text-xs font-normal opacity-60 leading-tight">{token.reading}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Word detail expands here */}
        {activeIdx !== null && tokens[activeIdx] && (
          <WordDetail key={activeIdx} token={tokens[activeIdx]!} mode={mode} onClose={() => setActiveIdx(null)} />
        )}
      </div>

      {/* Full meaning */}
      <div className="space-y-1 border-t border-white/5 pt-5">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
          {isJapanese ? 'ความหมาย / Meaning' : '意味 / ความหมาย'}
        </div>
        <div className="text-xl text-white font-medium leading-snug">{fullMeaning}</div>
      </div>

      {/* Practice full sentence */}
      <div className="space-y-3 border-t border-white/5 pt-5">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <Mic size={10} className="opacity-50" />
          {isJapanese ? 'ฝึกออกเสียงประโยค' : '文の発音練習'}
        </div>
        <PracticeSection word={sentence} romanization={fullRoman} mode={mode} />
      </div>
    </div>
  )
}


