import React from 'react'
import { Search } from 'lucide-react'
import SiriOrb from '@/components/SiriOrb'
import { useClickOutside } from './use-click-outside'

const DOCK_HEIGHT = 44
const FEEDBACK_WIDTH = 360
const FEEDBACK_HEIGHT = 220
const FEEDBACK_BORDER_RADIUS = 14
const DOCK_BORDER_RADIUS = 22

interface FooterContext {
  showFeedback: boolean
  success: boolean
  isLoading: boolean
  openFeedback: () => void
  closeFeedback: () => void
}

const FooterContext = React.createContext({} as FooterContext)
const useFooter = () => React.useContext(FooterContext)

export function MorphSurface({
  isJapanese = false,
  onSubmit: externalOnSubmit,
  onChange: externalOnChange,
  placeholder,
  dockLabel,
  fullWidth = false,
  isLoading = false,
}: {
  isJapanese?: boolean
  onSubmit?: (message: string) => void
  onChange?: (value: string) => void
  placeholder?: string
  dockLabel?: string
  fullWidth?: boolean
  isLoading?: boolean
}) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const feedbackRef = React.useRef<HTMLTextAreaElement | null>(null)
  const [showFeedback, setShowFeedback] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const closeFeedback = React.useCallback(() => {
    setShowFeedback(false)
    feedbackRef.current?.blur()
  }, [])

  const openFeedback = React.useCallback(() => {
    setShowFeedback(true)
    setTimeout(() => feedbackRef.current?.focus())
  }, [])

  const onFeedbackSuccess = React.useCallback(
    (msg: string) => {
      if (externalOnSubmit) externalOnSubmit(msg)
      closeFeedback()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 1500)
    },
    [closeFeedback, externalOnSubmit],
  )

  useClickOutside(rootRef, closeFeedback)

  const context = React.useMemo(
    () => ({ showFeedback, success, isLoading, openFeedback, closeFeedback }),
    [showFeedback, success, isLoading, openFeedback, closeFeedback],
  )

  const effectiveWidth = fullWidth ? '100%' : FEEDBACK_WIDTH

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: effectiveWidth, minHeight: FEEDBACK_HEIGHT }}>
      <div
        ref={rootRef}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1), height 0.35s cubic-bezier(0.4,0,0.2,1), border-radius 0.35s cubic-bezier(0.4,0,0.2,1)',
          width: showFeedback ? effectiveWidth : 'auto',
          height: showFeedback ? FEEDBACK_HEIGHT : DOCK_HEIGHT,
          borderRadius: showFeedback ? FEEDBACK_BORDER_RADIUS : DOCK_BORDER_RADIUS,
        }}
      >
        <FooterContext.Provider value={context}>
          <Dock isJapanese={isJapanese} dockLabel={dockLabel} />
          <Feedback
            onSuccess={onFeedbackSuccess}
            ref={feedbackRef}
            isJapanese={isJapanese}
            onChange={externalOnChange}
            placeholder={placeholder}
          />
        </FooterContext.Provider>
      </div>
    </div>
  )
}

function Dock({ isJapanese, dockLabel }: { isJapanese?: boolean; dockLabel?: string }) {
  const { showFeedback, openFeedback, isLoading } = useFooter()
  const label = dockLabel ?? (isJapanese ? 'ถาม AI...' : 'Ask AI...')

  return (
    <div style={{ marginTop: 'auto', display: 'flex', height: DOCK_HEIGHT, alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', width: '100%' }}>
        {/* Orb or spinner */}
        <div style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: showFeedback ? 0 : 1, transition: 'opacity 0.2s ease', pointerEvents: 'none' }}>
          {isLoading ? (
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.12)',
              borderTopColor: isJapanese ? 'rgba(248,113,113,0.85)' : 'rgba(251,146,60,0.85)',
              animation: 'spin 0.75s linear infinite',
            }} />
          ) : (
            <SiriOrb size={24} />
          )}
        </div>

        <button
          onClick={isLoading ? undefined : openFeedback}
          disabled={isLoading}
          style={{
            flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center',
            background: 'none', border: 'none', cursor: isLoading ? 'default' : 'pointer',
            padding: '2px 8px', borderRadius: 999,
            fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
            color: isLoading
              ? (isJapanese ? 'rgba(248,113,113,0.60)' : 'rgba(251,146,60,0.60)')
              : 'rgba(255,255,255,0.32)',
            transition: 'color 0.25s',
            letterSpacing: '0.01em',
            gap: 6,
          }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.color = 'rgba(255,255,255,0.70)' }}
          onMouseLeave={e => { if (!isLoading) e.currentTarget.style.color = 'rgba(255,255,255,0.32)' }}
        >
          {isLoading ? (
            <>
              <span style={{ opacity: 0.75 }}>{isJapanese ? 'กำลังค้นหา' : '検索中'}</span>
              {/* animated trailing dots */}
              <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 2 }}>
                {[0, 0.18, 0.36].map((delay, i) => (
                  <span
                    key={i}
                    style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: isJapanese ? 'rgba(248,113,113,0.80)' : 'rgba(251,146,60,0.80)',
                      animation: `loading-dot 1.1s ease-in-out ${delay}s infinite`,
                      display: 'inline-block',
                    }}
                  />
                ))}
              </span>
            </>
          ) : label}
        </button>

        <div style={{ flexShrink: 0, opacity: (showFeedback || isLoading) ? 0 : 0.30, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
          <Search size={14} color="rgba(255,255,255,0.6)" />
        </div>
      </div>
    </div>
  )
}

function Feedback({
  ref,
  onSuccess,
  isJapanese,
  onChange,
  placeholder,
}: {
  ref: React.Ref<HTMLTextAreaElement>
  onSuccess: (msg: string) => void
  isJapanese?: boolean
  onChange?: (value: string) => void
  placeholder?: string
}) {
  const { closeFeedback, showFeedback } = useFooter()
  const submitRef = React.useRef<HTMLButtonElement>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const msg = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value ?? ''
    onSuccess(msg)
    form.reset()
    if (onChange) onChange('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { closeFeedback(); return }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitRef.current?.click()
    }
  }

  const effectivePlaceholder = placeholder ?? (isJapanese ? 'ถามอะไรก็ได้...' : 'Ask me anything...')

  return (
    <form
      style={{
        position: 'absolute', bottom: 0,
        width: '100%', height: FEEDBACK_HEIGHT,
        pointerEvents: showFeedback ? 'all' : 'none',
        opacity: showFeedback ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
      onSubmit={onSubmit}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 6 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px', position: 'relative' }}>
          {/* Small orb top-left */}
          <div style={{ position: 'absolute', top: 4, left: 2, pointerEvents: 'none' }}>
            <SiriOrb size={24} />
          </div>
          <p style={{ margin: '0 0 0 34px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
            {isJapanese ? 'ค้นหาคำศัพท์' : 'Search Vocab'}
          </p>
          <button
            ref={submitRef}
            type="submit"
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}
          >
            <Kbd>Enter</Kbd>
          </button>
        </div>
        {/* Textarea */}
        <textarea
          name="message"
          ref={ref}
          required
          spellCheck={false}
          onKeyDown={onKeyDown}
          onChange={e => { if (onChange) onChange(e.target.value) }}
          placeholder={effectivePlaceholder}
          style={{
            flex: 1, width: '100%', resize: 'none', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 14px', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 13,
            color: 'rgba(255,255,255,0.80)', lineHeight: 1.6,
          }}
        />
      </div>
    </form>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd style={{ display: 'flex', height: 22, minWidth: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 5, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)', padding: '0 5px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
      {children}
    </kbd>
  )
}

export default MorphSurface
