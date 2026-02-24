/**
 * SiriOrb — faithful smoothui implementation, dark-theme + always crimson.
 *
 * Voice reactivity is driven entirely by CSS custom properties set directly
 * on the container div from the audio rAF loop — zero React re-renders.
 *
 * CSS vars the parent can write at any time:
 *   --input-level  0-1  (raw voice level; drives blur, contrast, scale, glow)
 *   --anim-dur     e.g. "5s" (rotation speed; lower = faster / more agitated)
 *   --orb-shadow   full box-shadow string (optional override for glow)
 */
import { forwardRef } from 'react'

const SiriOrb = forwardRef<HTMLDivElement, { size?: number; className?: string }>(
  ({ size = 192, className = '' }, ref) => {
    const blur    = Math.max(size * 0.015, 4)
    const contrast= Math.max(size * 0.008, 1.5)
    const dot     = Math.max(size * 0.008, 0.1)
    const shadow  = Math.max(size * 0.008, 2)
    const maskR   = size < 100 ? '15%' : '25%'

    // Inline CSS keeps the component fully self-contained (no globals needed)
    const css = `
      @property --angle {
        syntax: "<angle>";
        inherits: false;
        initial-value: 0deg;
      }

      .siri-orb {
        display: grid;
        grid-template-areas: "stack";
        border-radius: 50%;
        overflow: hidden;
        position: relative;
        /* Default glow — overridden by --orb-shadow from JS */
        box-shadow: var(--orb-shadow, 0 0 50px rgba(200,30,30,0.28), 0 0 90px rgba(180,20,20,0.10));
        /* Scale up slightly when voice is present */
        transform: scale(calc(1 + var(--input-level, 0) * 0.045));
        transition: transform 0.12s ease;
      }

      .siri-orb::before,
      .siri-orb::after {
        content: "";
        display: block;
        grid-area: stack;
        width: 100%; height: 100%;
        border-radius: 50%;
      }

      /* ── Main fluid layer ── */
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
        /* blur + contrast react to voice level — this IS the Siri liquid effect */
        filter:
          blur(calc(${blur}px + var(--input-level, 0) * 16px))
          contrast(calc(${contrast} + var(--input-level, 0) * 1.1));
        /* rotation speed driven by --anim-dur (set from JS audio loop) */
        animation: siri-orb-rotate var(--anim-dur, 22s) linear infinite;
      }

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
        .siri-orb::before { animation: none; }
      }
    `

    return (
      <div
        ref={ref}
        className={`siri-orb ${className}`}
        style={{
          width: size,
          height: size,
          /* ── Always crimson palette ── */
          '--bg': 'oklch(7% 0.03 15)',    // near-black with red tint
          '--c1': 'oklch(60% 0.26 18)',   // vivid red
          '--c2': 'oklch(50% 0.30 5)',    // deep crimson
          '--c3': 'oklch(66% 0.22 34)',   // red-orange corona
        } as React.CSSProperties}
      >
        <style>{css}</style>
      </div>
    )
  }
)

SiriOrb.displayName = 'SiriOrb'
export default SiriOrb
