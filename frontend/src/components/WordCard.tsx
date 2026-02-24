import { Volume2, Loader2 } from 'lucide-react'
import type { VocabEntry, PitchSyllable, ThaiSyllable, LearnerMode } from '../types'
import { useTTS } from '../hooks/useTTS'
import { romajiMoraToThai, rtgsToKatakana } from '../utils/phonetics'

interface Props {
  entry: VocabEntry
  mode: LearnerMode
}

// ─── Japanese pitch‐accent display ──────────────────────────────────────────
function PitchDisplay({ syllables }: { syllables: PitchSyllable[] }) {
  return (
    <div className="flex items-end gap-1.5 flex-wrap">
      {syllables.map((s, i) => (
        <div key={i} className="flex flex-col items-center">
          {/* Pitch bar */}
          <div
            className={`w-full h-1 rounded-full mb-1 transition-colors ${
              s.isHigh ? 'bg-red-400' : 'bg-gray-600'
            } ${s.isAccentDrop ? 'border-r-2 border-red-400' : ''}`}
          />
          {/* Romaji */}
          <span className="text-sm text-gray-300">{s.roman}</span>
          {/* Kana */}
          <span className="text-xs text-gray-500">{s.kana}</span>
          {/* Thai phonetic aid */}
          <span className="text-xs text-amber-400/80 mt-0.5 font-medium">
            {s.thai ?? romajiMoraToThai(s.roman)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Thai tone display ────────────────────────────────────────────────────────
const TONE_COLOR: Record<string, string> = {
  mid: 'text-blue-400',
  low: 'text-purple-400',
  falling: 'text-red-400',
  high: 'text-green-400',
  rising: 'text-yellow-400',
}

const TONE_LABEL: Record<string, string> = {
  mid: 'กลาง',
  low: 'เอก',
  falling: 'โท',
  high: 'ตรี',
  rising: 'จัตวา',
}

const TONE_LABEL_JA: Record<string, string> = {
  mid: '中',
  low: '低',
  falling: '下降',
  high: '高',
  rising: '上昇',
}

function ToneDisplay({ syllables, mode }: { syllables: ThaiSyllable[]; mode: LearnerMode }) {
  return (
    <div className="flex items-end gap-3 flex-wrap">
      {syllables.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <span className={`text-xs font-semibold ${TONE_COLOR[s.tone]}`}>
            {mode === 'ja-th' ? TONE_LABEL_JA[s.tone] : TONE_LABEL[s.tone]}
          </span>
          <span className="text-base text-gray-200">{s.roman}</span>
          <span className={`text-sm ${TONE_COLOR[s.tone]}`}>{s.thai}</span>
          {/* Katakana phonetic aid for Japanese learners */}
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

// ─── Main WordCard ─────────────────────────────────────────────────────────────
export function WordCard({ entry, mode }: Props) {
  const { speak, isSpeaking } = useTTS()
  const isJapanese = mode === 'th-ja'

  const meaning = isJapanese ? entry.meaningTh : entry.meaningJa
  const accentColor = isJapanese ? 'text-red-400' : 'text-amber-400'
  const badgeColor = isJapanese ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
      {/* Category badge */}
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${badgeColor}`}>
        {entry.category}
      </span>

      {/* Main word */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`text-6xl font-bold leading-tight ${accentColor}`}>
              {entry.word}
            </div>
            {entry.word !== entry.reading && (
              <div className="text-2xl text-gray-400 mt-1">{entry.reading}</div>
            )}
          </div>

          {/* TTS Button */}
          <button
            onClick={() => speak(entry.word, entry.ttsLang)}
            disabled={isSpeaking}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold transition-all ${
              isSpeaking
                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                : isJapanese
                  ? 'bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-200'
                  : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 hover:text-amber-200'
            }`}
            title="Listen to pronunciation"
          >
            {isSpeaking ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Volume2 size={20} />
            )}
            <span className="text-sm">{isSpeaking ? '...' : '🔊 Listen'}</span>
          </button>
        </div>

        {/* Romanization */}
        <div className="text-xl text-gray-300 font-mono tracking-wider">
          /{entry.romanization}/
        </div>

        {entry.ipa && (
          <div className="text-sm text-gray-500 font-mono">[{entry.ipa}]</div>
        )}
      </div>

      {/* Pitch / Tone breakdown */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
          {isJapanese ? 'ピッチアクセント / Pitch Accent' : 'วรรณยุกต์ / Tone Class'}
        </div>
        <div className="bg-black/20 rounded-2xl p-4">
          {isJapanese ? (
            <PitchDisplay syllables={entry.syllables as PitchSyllable[]} />
          ) : (
            <ToneDisplay syllables={entry.syllables as ThaiSyllable[]} mode={mode} />
          )}
        </div>
        {isJapanese && (
          <p className="text-xs text-gray-600">
            🔴 = high pitch &nbsp;|&nbsp; ⬇ = pitch drops after this mora
            &nbsp;|&nbsp; <span className="text-amber-400/70">สีทอง</span> = Thai phonetic
          </p>
        )}
        {!isJapanese && (
          <p className="text-xs text-gray-600">
            <span className="text-blue-400/70">青字</span> = Katakana approximation for Japanese speakers
          </p>
        )}
      </div>

      {/* Meaning */}
      <div className="space-y-1">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
          {isJapanese ? 'ความหมาย / Meaning' : '意味 / ความหมาย'}
        </div>
        <div className="text-2xl text-white font-medium">{meaning}</div>
      </div>

      {/* Example sentence */}
      <div className="space-y-2 border-t border-white/5 pt-5">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
          {isJapanese ? 'ตัวอย่างประโยค' : '例文'}
        </div>
        <button
          onClick={() => speak(entry.exampleSentence, entry.ttsLang)}
          className="text-left group"
        >
          <p className={`text-lg font-medium group-hover:${accentColor} transition-colors`}>
            {entry.exampleSentence}
          </p>
        </button>
        <p className="text-gray-400 text-base italic">{entry.exampleTranslation}</p>
      </div>

      {/* Notes */}
      {entry.notes && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-yellow-300 text-sm">
            💡 {entry.notes}
          </p>
        </div>
      )}
    </div>
  )
}
