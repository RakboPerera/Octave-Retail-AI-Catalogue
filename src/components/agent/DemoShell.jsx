import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import './DemoShell.css';

// Wraps an agent demo with playback controls.
// children receives { playing, runKey, onDone }
export default function DemoShell({ title, subtitle, children, initialPlaying = false }) {
  const [playing, setPlaying] = useState(initialPlaying);
  const [runKey, setRunKey] = useState(0);

  const run = () => { setRunKey((k) => k + 1); setPlaying(true); };
  const replay = () => {
    setPlaying(false);
    // One frame later, bump the key and start again — child resets, then plays.
    requestAnimationFrame(() => {
      setRunKey((k) => k + 1);
      setPlaying(true);
    });
  };
  const handleDone = () => setPlaying(false);

  return (
    <div className="demo-shell">
      <div className="demo-shell-head">
        <div>
          <span className="eyebrow">Live demo</span>
          <h3 className="demo-shell-title">{title}</h3>
          {subtitle && <p className="demo-shell-sub">{subtitle}</p>}
        </div>
        <div className="demo-shell-controls">
          {!playing ? (
            <button className="btn btn-primary demo-run" onClick={run}>
              <Play size={16} fill="currentColor" /> {runKey === 0 ? 'Run demo' : 'Run again'}
            </button>
          ) : (
            <button className="btn btn-ghost demo-run" onClick={replay}>
              <RotateCcw size={16} /> Replay
            </button>
          )}
        </div>
      </div>

      <div className="demo-shell-body">
        {typeof children === 'function'
          ? children({ playing, runKey, onDone: handleDone })
          : children}
      </div>
    </div>
  );
}
