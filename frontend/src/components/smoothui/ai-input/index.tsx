import React from 'react'
import SiriOrb from '@/components/SiriOrb'
import { useClickOutside } from './use-click-outside'

const DOCK_HEIGHT = 44
const FEEDBACK_WIDTH = 360
const FEEDBACK_HEIGHT = 200
const FEEDBACK_BORDER_RADIUS = 14
const DOCK_BORDER_RADIUS = 22

interface FooterContext {
  showFeedback: boolean
  success: boolean
  openFeedback: () => void
  closeFeedback: () => void
}

const FooterContext = React.createContext({} as FooterContext)
const useFooter = () => React.useContext(FooterContext)

export function MorphSurface({
  isJapanese = false,
  onSubmit: externalOnSubmit,
}: {
  isJapanese?: boolean
  onSubmit?: (message: string) => void
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
    () => ({ showFeedback, success, openFeedback, closeFeedback }),
    [showFeedback, success, openFeedback, closeFeedback],
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: FEEDBACK_WIDTH, height: FEEDBACK_HEIGHT }}>
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
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1), border-radius 0.3s cubic-bezier(0.4,0,0.2,1)',
          width: showFeedback ? FEEDBACK_WIDTH : 'auto',
          height: showFeedback ? FEEDBACK_HEIGHT : DOCK_HEIGHT,
          borderRadius: showFeedback ? FEEDBACK_BORDER_RADIUS : DOCK_BORDER_RADIUS,
        }}
      >
        <FooterContext.Provider value={context}>
          <Dock isJapanese={isJapanese} />
          <Feedback onSuccess={onFeedbackSuccess} ref={feedbackRef} isJapanese={isJapanese} />
        </FooterContext.Provider>
      </div>
    </div>
  )
}

function Dock({ isJapanese }: { isJapanese?: boolean }) {
  const { showFeedback, openFeedback } = useFooter()

  return (
    <div style={{ marginTop: 'auto', display: 'flex', height: DOCK_HEIGHT, alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
        {/* Orb — hidden when expanded */}
        <div style={{ width: 24, height: 24, opacity: showFeedback ? 0 : 1, transition: 'opacity 0.2s ease', pointerEvents: 'none' }}>
          <SiriOrb size={24} />
        </div>

        <button
          onClick={openFeedback}
          style={{
            flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px 8px', borderRadius: 999,
            fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
            color: 'rgba(255,255,255,0.55)', transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.90)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
        >
          {isJapanese ? 'ถาม AI' : 'Ask AI'}
        </button>
      </div>
    </div>
  )
}

function Feedback({
  ref,
  onSuccess,
  isJapanese,
}: {
  ref: React.Ref<HTMLTextAreaElement>
  onSuccess: (msg: string) => void
  isJapanese?: boolean
}) {
  const { closeFeedback, showFeedback } = useFooter()
  const submitRef = React.useRef<HTMLButtonElement>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const msg = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value ?? ''
    onSuccess(msg)
    form.reset()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') closeFeedback()
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault()
      submitRef.current?.click()
    }
  }

  return (
    <form
      style={{
        position: 'absolute', bottom: 0,
        width: FEEDBACK_WIDTH, height: FEEDBACK_HEIGHT,
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
            AI Input
          </p>
          <button
            ref={submitRef}
            type="submit"
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}
          >
            <Kbd>⌘</Kbd>
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
          placeholder={isJapanese ? 'ถามอะไรก็ได้...' : 'Ask me anything...'}
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
