// Small confidence pill — consistent visual for model confidence across all agents.
import './Confidence.css';

export default function Confidence({ value, label = 'confidence', compact = false }) {
  const pct = Math.round(value * 100);
  const tier = value >= 0.8 ? 'hi' : value >= 0.55 ? 'md' : 'lo';
  const mark = tier === 'hi' ? '✓' : tier === 'md' ? '⚠' : '!';
  return (
    <span className={`conf conf-${tier} ${compact ? 'conf-compact' : ''}`}>
      {compact ? <span className="conf-val">{pct}%</span> : (<><span className="conf-label">{label}</span><span className="conf-val">{value.toFixed(2)}</span></>)}
      <span className="conf-mark">{mark}</span>
    </span>
  );
}
