// JKH adjacent mark per Octave brand guideline (height = x-height of O in Octave).
export default function JKHLogo({ size = 14, color }) {
  const style = {
    fontFamily: "var(--font-display)",
    fontWeight: 500,
    fontSize: `${size}px`,
    letterSpacing: '0.3em',
    color: color || 'var(--text-muted)',
    userSelect: 'none'
  };
  return <span style={style} aria-label="John Keells Holdings">JKH</span>;
}
