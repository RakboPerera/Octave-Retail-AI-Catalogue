// Octave wordmark — uses the brand asset at /octave-logo.png.
// `size` = target wordmark cap-height in px (e.g. 18 in nav, 16 in footer).
export default function OctaveLogo({ size = 20, className = '' }) {
  // Image has some vertical padding; scale height ~1.55× cap-height to match
  // the optical size the typographic wordmark was giving us.
  const height = Math.round(size * 1.55);
  return (
    <img
      src="/octave-logo.png"
      alt="Octave"
      className={className}
      style={{
        height: `${height}px`,
        width: 'auto',
        display: 'inline-block',
        userSelect: 'none',
        // Ensures the logo stays crisp at small sizes
        imageRendering: '-webkit-optimize-contrast'
      }}
      draggable={false}
    />
  );
}
