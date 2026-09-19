/**
 * TRIBUNAL — court seal.
 *
 * Inline SVG rather than the ⚖ character: 200-ui.mdc forbids emoji in product UI.
 * Concentric rules and a balance motif, 1px strokes, no fill.
 */

interface SealProps {
  size?: number;
  className?: string;
}

export function Seal({ size = 20, className }: SealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      aria-hidden="true"
      className={className}
    >
      <circle cx="24" cy="24" r="23" />
      <circle cx="24" cy="24" r="19.5" strokeOpacity="0.5" />

      {/* Column and beam */}
      <path d="M24 12v26" />
      <path d="M11 17h26" />
      <path d="M17.5 38h13" />

      {/* Pans */}
      <path d="M11 17l-4.5 9h9L11 17z" strokeLinejoin="round" />
      <path d="M37 17l-4.5 9h9L37 17z" strokeLinejoin="round" />

      <circle cx="24" cy="12" r="1.75" />
    </svg>
  );
}
