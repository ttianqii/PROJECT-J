/**
 * SiriOrb — always crimson, smooth ChatGPT-style pulse.
 *
 * JS drives two things via direct DOM access (zero re-renders):
 *   - Toggle class "siri-orb--speaking" when voice detected
 *   - Set CSS var --orb-shadow (glow intensity, smoothed so no flicker)
 *
 * All other animation (rotation, pulse) is pure CSS.
 */
import { forwardRef } from 'react'

const SiriOrb = forwardRef<HTMLDivElement, { size?: number; className?: string }>(
  ({ size = 192, className = '' }, ref) => {
    const blur     = Math.max(size * 0.015, 4)     // fixed blur — no JS changes
    const contrast = Math.max(size * 0.008, 1.5)   // fixed contrast
    const dot      = Math.max(size * 0.008, 0.1)
    const shadow   = Math.max(size * 0.008, 2)
    const maskR    = size < 100 ? '15%' : '25%'

    const css = `
      @property --angle {
        syntax: "<angle>";
        inherits: false;
        initial-value: 0deg;
      }

      /* ── Container — constant gentle breathe, never changes speed ── */
      .siri-orb {
        display: grid;
        grid-template-areas: "stack";
        border-radius: 50%;
        overflow: hidden;
        position: relative;
        box-shadow: var(
          --orb-shadow,
          0 0 48px rgba(234,88,12,0.35),
          0 0 90px rgba(220,60,0,0.14)
        );
        /* Always the same calm breathe — pulse rings handle voice reactivity */
        animation: siri-orb-pulse 5s ease-in-out infinite;
        will-change: transform, box-shadow;
      }

      @keyframes siri-orb-pulse {
        0%, 100% { transform: scale(1);    }
        50%       { transform: scale(1.07); }
      }

      .siri-orb::before,
      .siri-orb::after {
        content: "";
        display: block;
        grid-area: stack;
        width: 100%; height: 100%;
        border-radius: 50%;
      }

      /* ── Main conic fluid layer — fixed speed, no JS interference ── */
      .siri-orb::before {
        background:
          conic-gradient(from calc(var(--angle) * 2)  at 25% 70%, var(--c3), transparent 20% 80%, var(--c3)),
          conic-gradient(from calc(var(--angle) * 2)  at 45% 75%, var(--c2), transparent 30% 60%, var(--c2)),
          conic-gradient(from calc(var(--angle) * -3) at 80% 20%, var(--c1), transparent 40% 60%, var(--c1)),
          conic-gradient(from calc(var(--angle) * 2)  at 15%  5%, var(--c2), transparent 10% 90%, var(--c2)),
          conic-gradient(from calc(var(--angle) * 1)  at 20% 80%, var(--c1), transparent 10% 90%, var(--c1)),
          conic-gradient(from calc(var(--angle) * -2) at 85% 10%, var(--c3), transparent 20% 80%, var(--c3)),
          var(--bg);
        box-shadow: inset var(--bg) 0 0 ${shadow}px ${(shadow * 0.2).toFixed(1)}px;
        /* FIXED filter — never updated from JS, so zero flicker */
        filter: blur(${blur}px) contrast(${contrast});
        animation: siri-orb-rotate 14s linear infinite;
      }

      /* Rotation is always the same — consistent, natural ─── */

      /* ── Dot-grid glassy overlay ── */
      .siri-orb::after {
        background-image: radial-gradient(
          circle at center,
          var(--bg) ${dot}px,
          transparent ${dot}px
        );
        background-size: ${(dot * 2).toFixed(1)}px ${(dot * 2).toFixed(1)}px;
        backdrop-filter: blur(${(blur * 2).toFixed(0)}px) contrast(${(contrast * 2).toFixed(1)});
        mix-blend-mode: overlay;
        mask-image: radial-gradient(black ${maskR}, transparent 75%);
      }

      @keyframes siri-orb-rotate { to { --angle: 360deg; } }

      @media (prefers-reduced-motion: reduce) {
        .siri-orb, .siri-orb::before { animation: none; }
      }
    `

    return (
      <div
        ref={ref}
        className={`siri-orb ${className}`}
        style={{
          width: size,
          height: size,
          /*
           * Sun palette — ref image: deep red edge → orange mid → warm white center.
           * hue 18  = vivid red
           * hue 42  = bright orange
           * hue 72  = warm golden-white
           */
          '--bg': 'oklch(16% 0.07 22)',   // deep red-brown base (not pitch black)
          '--c1': 'oklch(57% 0.28 20)',   // vivid crimson-red
          '--c2': 'oklch(72% 0.22 44)',   // bright orange
          '--c3': 'oklch(88% 0.15 70)',   // warm golden-white highlight
        } as React.CSSProperties}
      >
        <style>{css}</style>
      </div>
    )
  }
)

SiriOrb.displayName = 'SiriOrb'
export default SiriOrb
