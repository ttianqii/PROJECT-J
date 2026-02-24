import { useState } from 'react'
import { X, Mic, MicOff } from 'lucide-react'
import type { SentenceToken, PitchSyllable, ThaiSyllable, LearnerMode, AssessResponse } from '../types'
import { romajiMoraToThai, rtgsToKatakana } from '../utils/phonetics'
import { WordCard } from './WordCard'
import { AccuracyFeedback } from './AccuracyFeedback'
import { assessPronunciation } from '../services/api'

interface Props {
  sentence: string
  tokens: SentenceToken[]
  mode: LearnerMode
}

// ── Mini pitch display (same style as WordCard but compact) ──────────────────
function MiniPitch({ syllables }: { syllables: PitchSyllable[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flexWrap: 'wrap' }}>
      {syllables.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '100%', height: 3, borderRadius: 999, marginBottom: 3,
            minWidth: 12,
            background: s.isHigh ? '#f87171' : '#4b5563',
            borderRight: s.isAccentDrop ? '2px solid #f87171' : 'none',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#d1d5db' }}>{s.roman}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6b7280', marginTop: 1 }}>{s.kana}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(251,191,36,0.75)', marginTop: 1 }}>
            {s.thai ?? romajiMoraToThai(s.roman)}
          </span>
        </div>
      ))}
    </div>
  )
}

const TONE_COLOR: Record<string, string> = {
  mid: '#60a5fa', low: '#a78bfa', falling: '#f87171', high: '#4ade80', rising: '#facc15',
}

function MiniTone({ syllables, mode }: { syllables: ThaiSyllable[]; mode: LearnerMode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
      {syllables.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: TONE_COLOR[s.tone] }}>
            {s.tone[0]?.toUpperCase()}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#e5e7eb' }}>{s.roman}</span>
          <span style={{ fontSize: 11, color: TONE_COLOR[s.tone] }}>{s.thai}</span>
          {mode === 'ja-th' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(96,165,250,0.75)', marginTop: 1 }}>
              {s.katakana ?? rtgsToKatakana(s.roman)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Token chip ────────────────────────────────────────────────────────────────
interface ChipProps {
  token: SentenceToken
  mode: LearnerMode
  isActive: boolean
  onClick: () => void
}

function TokenChip({ token, mode, isActive, onClick }: ChipProps) {
  const [hovered, setHovered] = useState(false)
  const isJapanese = mode === 'th-ja'
  const accent = isJapanese ? 'rgba(248,113,113,' : 'rgba(251,146,60,'

  const particleStyle = token.isParticle

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Hover tooltip — meaning */}
      {hovered && !isActive && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, whiteSpace: 'nowrap',
          background: 'rgba(15,15,18,0.96)', border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(12px)', borderRadius: 8,
          padding: '6px 10px',
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 500,
          color: 'rgba(255,255,255,0.80)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          animation: 'fadeUp 0.12s ease both',
          pointerEvents: 'none',
        }}>
          {isJapanese ? token.meaningTh : token.meaningJa}
          {/* small arrow */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(255,255,255,0.10)',
          }} />
        </div>
      )}

      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          padding: particleStyle ? '8px 10px' : '10px 14px',
          borderRadius: 12, border: 'none', cursor: 'pointer',
          transition: 'background 0.18s, border-color 0.18s, transform 0.12s, box-shadow 0.18s',
          background: isActive
            ? `${accent}0.12)`
            : hovered
              ? 'rgba(255,255,255,0.06)'
              : particleStyle
                ? 'rgba(255,255,255,0.02)'
                : 'rgba(255,255,255,0.04)',
          outline: isActive ? `1.5px solid ${accent}0.45)` : '1.5px solid transparent',
          transform: hovered && !isActive ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isActive ? `0 0 18px ${accent}0.15)` : 'none',
          opacity: particleStyle && !isActive ? 0.55 : 1,
        }}
      >
        {/* Word */}
        <span style={{
          fontSize: particleStyle ? 13 : 18, fontWeight: particleStyle ? 500 : 700,
          color: isActive ? (isJapanese ? '#f87171' : '#fb923c') : (hovered ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.75)'),
          transition: 'color 0.15s', lineHeight: 1.1,
        }}>
          {token.word}
        </span>

        {/* Mini pitch/tone chart — hidden for particles */}
        {!particleStyle && token.syllables?.length > 0 && (
          <div style={{ opacity: 0.85 }}>
            {isJapanese
              ? <MiniPitch syllables={token.syllables as PitchSyllable[]} />
              : <MiniTone syllables={token.syllables as ThaiSyllable[]} mode={mode} />
            }
          </div>
        )}

        {/* Romanization under particle */}
        {particleStyle && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em' }}>
            {token.romanization}
          </span>
        )}
      </button>
    </div>
  )
}

// ── Detail panel (full WordCard-style + pronunciation practice) ───────────────
function TokenDetail({
  token, mode, onClose,
}: { token: SentenceToken; mode: LearnerMode; onClose: () => void }) {
  const isJapanese = mode === 'th-ja'
  const lang = isJapanese ? 'ja' : 'th'
  const accentColor = isJapanese ? '#f87171' : '#fb923c'
  const accent = isJapanese ? 'rgba(248,113,113,' : 'rgba(251,146,60,'

  const [practiceRecording, setPracticeRecording] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [assessResult, setAssessResult] = useState<AssessResponse | null>(null)
  const [practiceError, setPracticeError] = useState<string | null>(null)
  const mediaRef = { current: null as MediaRecorder | null }
  const chunksRef = { current: [] as Blob[] }

  const startPractice = async () => {
    setPracticeError(null)
    setAssessResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' })
        setPracticeLoading(true)
        try {
          const res = await assessPronunciation(blob, token.word, token.romanization, lang)
          setAssessResult(res)
        } catch (e) {
          setPracticeError(e instanceof Error ? e.message : 'Error')
        } finally {
          setPracticeLoading(false)
        }
      }
      mr.start()
      mediaRef.current = mr
      setPracticeRecording(true)
    } catch {
      setPracticeError(isJapanese ? 'ไม่สามารถเข้าถึงไมค์ได้' : 'マイクにアクセスできません')
    }
  }

  const stopPractice = () => {
    mediaRef.current?.stop()
    mediaRef.current = null
    setPracticeRecording(false)
  }

  return (
    <div style={{
      width: '100%', borderRadius: 16, animation: 'fadeUp 0.22s ease both',
      background: 'rgba(255,255,255,0.025)', border: `1px solid ${accent}0.18)`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: accentColor, lineHeight: 1 }}>{token.word}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            /{token.romanization}/
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.40)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.80)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)' }}
        >
          <X size={13} />
        </button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Meaning */}
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', margin: '0 0 5px' }}>
            {isJapanese ? 'ความหมาย' : '意味'}
          </p>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.90)', margin: 0 }}>
            {isJapanese ? token.meaningTh : token.meaningJa}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.30)', margin: '4px 0 0' }}>
            {isJapanese ? token.meaningJa : token.meaningTh}
          </p>
        </div>

        {/* Pitch / tone detail */}
        {token.syllables?.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', margin: '0 0 10px' }}>
              {isJapanese ? 'ピッチアクセント' : 'วรรณยุกต์'}
            </p>
            <div style={{ background: 'rgba(0,0,0,0.20)', borderRadius: 12, padding: '12px 14px' }}>
              {isJapanese
                ? <MiniPitch syllables={token.syllables as PitchSyllable[]} />
                : <MiniTone syllables={token.syllables as ThaiSyllable[]} mode={mode} />
              }
            </div>
            {isJapanese && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.18)', margin: '6px 0 0', display: 'flex', gap: 10 }}>
                <span><span style={{ color: '#f87171' }}>●</span> high pitch</span>
                <span>↓ drops after mora</span>
                <span><span style={{ color: 'rgba(251,191,36,0.75)' }}>●</span> Thai phonetic</span>
              </p>
            )}
          </div>
        )}

        {/* Practice */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mic size={9} style={{ opacity: 0.5 }} />
            {isJapanese ? 'ฝึกออกเสียง' : '発音練習'}
          </p>

          {assessResult ? (
            <AccuracyFeedback result={assessResult} mode={mode} onReset={() => { setAssessResult(null); setPracticeError(null) }} />
          ) : practiceLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${accent}0.50)`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Scoring...</span>
            </div>
          ) : practiceRecording ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0, color: isJapanese ? 'rgba(248,113,113,0.85)' : 'rgba(251,146,60,0.85)' }}>
                Listening...
              </p>
              <button onClick={stopPractice} style={{
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'rgba(255,255,255,0.40)', cursor: 'pointer', background: 'none',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '5px 14px', transition: 'all 0.2s',
              }}>
                <MicOff size={10} /> Stop &amp; score
              </button>
            </div>
          ) : (
            <>
              <button onClick={startPractice} style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                color: 'rgba(255,255,255,0.92)',
                background: isJapanese
                  ? 'linear-gradient(135deg, rgba(220,38,38,0.70), rgba(185,28,28,0.80))'
                  : 'linear-gradient(135deg, rgba(234,88,12,0.70), rgba(251,146,60,0.80))',
              }}>
                <Mic size={12} />
                {isJapanese ? 'พูดเพื่อรับคะแนน' : 'Speak to score'}
              </button>
              {practiceError && (
                <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(252,165,165,0.75)' }}>
                  {practiceError}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main SentenceBreakdown ────────────────────────────────────────────────────
export function SentenceBreakdown({ sentence, tokens, mode }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const isJapanese = mode === 'th-ja'

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.25s ease both' }}>

      {/* Sentence heading */}
      <div style={{ borderRadius: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', margin: '0 0 6px' }}>
          {isJapanese ? 'ประโยค' : '文'}
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.88)', margin: 0, lineHeight: 1.4 }}>
          {sentence}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.22)', margin: '6px 0 0' }}>
          {isJapanese ? 'กดที่คำเพื่อดูรายละเอียด • hover เพื่อดูความหมาย' : '単語をクリックで詳細 • ホバーで意味表示'}
        </p>
      </div>

      {/* Token chips row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
        {tokens.map((token, i) => (
          <TokenChip
            key={i}
            token={token}
            mode={mode}
            isActive={activeIdx === i}
            onClick={() => setActiveIdx(activeIdx === i ? null : i)}
          />
        ))}
      </div>

      {/* Legend */}
      {isJapanese && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.16)', margin: 0, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span><span style={{ color: '#f87171' }}>●</span> high pitch</span>
          <span>↓ drops after mora</span>
          <span><span style={{ color: 'rgba(251,191,36,0.70)' }}>●</span> Thai phonetic</span>
          <span style={{ opacity: 0.5 }}>dim = particle</span>
        </p>
      )}

      {/* Detail panel for active token */}
      {activeIdx !== null && tokens[activeIdx] && (
        <TokenDetail
          key={activeIdx}
          token={tokens[activeIdx]!}
          mode={mode}
          onClose={() => setActiveIdx(null)}
        />
      )}
    </div>
  )
}
