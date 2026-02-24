/**
 * SiriOrb — thin forwardRef wrapper around the official smoothui/siri-orb.
 *
 * The outer div is what's ref’d so the audio rAF loop can write:
 *   --orb-scale  (1.0 → 1.22)  → transform: scale()  via 0.15s transition
 *   --orb-shadow               → box-shadow glow
 *
 * The smoothui orb inside runs its own rotation/fluid animation untouched.
 */
import { forwardRef } from 'react'
import SmoothSiriOrb from '@/components/smoothui/siri-orb/index'

// Sun palette — deep red bg → vivid red → saturated orange → warm golden-white
const SUN_COLORS = {
  bg: 'oklch(14% 0.16 27)',   // deep saturated red base
  c1: 'oklch(54% 0.32 22)',   // vivid crimson-red
  c2: 'oklch(71% 0.28 42)',   // saturated orange
  c3: 'oklch(89% 0.19 72)',   // warm golden-white highlight
}

const SiriOrb = forwardRef<HTMLDivElement, { size?: number; className?: string }>(
  ({ size = 192, className = '' }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'inline-flex',
        borderRadius: '50%',
        // Voice scale: poll loop writes --orb-scale; transition eases it
        transform: 'scale(var(--orb-scale, 1))',
        transition: 'transform 0.15s ease-out',
        // Glow: poll loop writes --orb-shadow
        boxShadow: 'var(--orb-shadow, 0 0 55px rgba(220,70,0,0.38), 0 0 100px rgba(200,50,0,0.16))',
        willChange: 'transform, box-shadow',
      }}
    >
      <SmoothSiriOrb
        size={`${size}px`}
        animationDuration={18}
        colors={SUN_COLORS}
      />
    </div>
  )
)

SiriOrb.displayName = 'SiriOrb'
export default SiriOrb

