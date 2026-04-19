import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import './ArchitectureDiagram.css';

// Grid-based architecture diagram: Signals (left) -> Agent core (centre) -> Actions (right)
// Draws real connecting SVG bezier paths between every chip and the core, with
// hover highlighting, so it actually looks like a wired architecture — not a static grid.
export default function ArchitectureDiagram({ signals, tools, actions, agentName = 'Agent', guardrails = [] }) {
  const [hover, setHover] = useState(null);
  const gridRef = useRef(null);
  const coreRef = useRef(null);
  const signalRefs = useRef([]);
  const actionRefs = useRef([]);
  const [paths, setPaths] = useState({ inPaths: [], outPaths: [], size: { w: 0, h: 0 } });

  const recompute = () => {
    const grid = gridRef.current;
    const core = coreRef.current;
    if (!grid || !core) return;
    const g = grid.getBoundingClientRect();
    const c = core.getBoundingClientRect();
    const coreLeft  = { x: c.left - g.left,            y: c.top - g.top + c.height / 2 };
    const coreRight = { x: c.left - g.left + c.width,  y: c.top - g.top + c.height / 2 };

    const buildPath = (from, to) => {
      const dx = Math.max(24, (to.x - from.x) * 0.55);
      return `M ${from.x},${from.y} C ${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`;
    };

    const inPaths = signalRefs.current.map((el, i) => {
      if (!el || !signals[i]) return null;
      const r = el.getBoundingClientRect();
      const from = { x: r.left - g.left + r.width, y: r.top - g.top + r.height / 2 };
      return { id: signals[i].id, d: buildPath(from, coreLeft) };
    }).filter(Boolean);

    const outPaths = actionRefs.current.map((el, i) => {
      if (!el || !actions[i]) return null;
      const r = el.getBoundingClientRect();
      const to = { x: r.left - g.left, y: r.top - g.top + r.height / 2 };
      return { id: actions[i].id, d: buildPath(coreRight, to) };
    }).filter(Boolean);

    setPaths({ inPaths, outPaths, size: { w: g.width, h: g.height } });
  };

  useLayoutEffect(() => { recompute(); /* eslint-disable-next-line */ }, [signals, actions]);

  useEffect(() => {
    const ro = new ResizeObserver(recompute);
    if (gridRef.current) ro.observe(gridRef.current);
    window.addEventListener('resize', recompute);
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute); };
    // eslint-disable-next-line
  }, []);

  const activeId = hover?.item?.id;

  return (
    <div className="arch">
      <div className="arch-grid" ref={gridRef}>
        <svg
          className="arch-lines"
          viewBox={`0 0 ${paths.size.w || 1} ${paths.size.h || 1}`}
          preserveAspectRatio="none"
          width={paths.size.w}
          height={paths.size.h}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="line-in" x1="0" x2="1">
              <stop offset="0"   stopColor="rgba(38,234,159,0)" />
              <stop offset="0.5" stopColor="rgba(38,234,159,0.45)" />
              <stop offset="1"   stopColor="rgba(38,234,159,0.75)" />
            </linearGradient>
            <linearGradient id="line-out" x1="0" x2="1">
              <stop offset="0"   stopColor="rgba(232,42,174,0.75)" />
              <stop offset="0.5" stopColor="rgba(232,42,174,0.45)" />
              <stop offset="1"   stopColor="rgba(232,42,174,0)" />
            </linearGradient>
            <linearGradient id="line-in-hot" x1="0" x2="1">
              <stop offset="0" stopColor="rgba(38,234,159,0.2)" />
              <stop offset="1" stopColor="rgba(38,234,159,1)" />
            </linearGradient>
            <linearGradient id="line-out-hot" x1="0" x2="1">
              <stop offset="0" stopColor="rgba(232,42,174,1)" />
              <stop offset="1" stopColor="rgba(232,42,174,0.2)" />
            </linearGradient>
          </defs>

          {paths.inPaths.map((p) => (
            <path
              key={`in-${p.id}`}
              d={p.d}
              className={`arch-line arch-line--in ${activeId === p.id ? 'is-hot' : ''}`}
              stroke={activeId === p.id ? 'url(#line-in-hot)' : 'url(#line-in)'}
              fill="none"
            />
          ))}
          {paths.outPaths.map((p) => (
            <path
              key={`out-${p.id}`}
              d={p.d}
              className={`arch-line arch-line--out ${activeId === p.id ? 'is-hot' : ''}`}
              stroke={activeId === p.id ? 'url(#line-out-hot)' : 'url(#line-out)'}
              fill="none"
            />
          ))}

          {paths.inPaths.map((p, i) => (
            <circle key={`pin-${p.id}`} r="2.4" fill="var(--octave-turquoise)" className="arch-packet">
              <animateMotion dur={`${3.2 + (i % 3) * 0.6}s`} repeatCount="indefinite" path={p.d} />
            </circle>
          ))}
          {paths.outPaths.map((p, i) => (
            <circle key={`pout-${p.id}`} r="2.4" fill="var(--octave-pink)" className="arch-packet">
              <animateMotion dur={`${3.6 + (i % 3) * 0.55}s`} repeatCount="indefinite" path={p.d} begin={`${i * 0.3}s`} />
            </circle>
          ))}
        </svg>

        <div className="arch-col arch-col-in">
          <span className="arch-col-label">Signals in</span>
          {signals.map((s, i) => (
            <AgentChip
              key={s.id}
              item={s}
              onHover={setHover}
              side="in"
              active={activeId === s.id}
              ref={(el) => (signalRefs.current[i] = el)}
            />
          ))}
        </div>

        <div className="arch-col arch-col-core">
          <div className="arch-core" ref={coreRef}>
            <div className="arch-core-label">Agent core</div>
            <div className="arch-core-name">{agentName}</div>
            <div className="arch-core-pulse" />
            <div className="arch-core-tools">
              <span className="arch-core-tools-head">Tools / Integrations</span>
              <div className="arch-tool-grid">
                {tools.map((t) => (
                  <AgentChip key={t.id} item={t} onHover={setHover} side="tool" compact />
                ))}
              </div>
            </div>
            {guardrails.length > 0 && (
              <div className="arch-core-guards">
                <span className="arch-core-tools-head">Guardrails</span>
                <ul className="arch-guard-list">
                  {guardrails.map((g, i) => (
                    <li key={i}><Icons.ShieldCheck size={12} strokeWidth={2.2} /><span>{g}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="arch-col arch-col-out">
          <span className="arch-col-label">Actions out</span>
          {actions.map((a, i) => (
            <AgentChip
              key={a.id}
              item={a}
              onHover={setHover}
              side="out"
              active={activeId === a.id}
              ref={(el) => (actionRefs.current[i] = el)}
            />
          ))}
        </div>
      </div>

      <div className="arch-detail">
        {hover ? (
          <>
            <span className="arch-detail-label">{hover.item.label}</span>
            <p>{hover.item.detail}</p>
          </>
        ) : (
          <p className="arch-detail-hint">Hover a signal, tool or action to trace it through the agent core.</p>
        )}
      </div>
    </div>
  );
}

const AgentChip = forwardRef(function AgentChip({ item, onHover, side, compact = false, active = false }, ref) {
  const Icon = Icons[item.icon] || Icons.Dot;
  return (
    <div
      ref={ref}
      className={`arch-chip arch-chip-${side} ${compact ? 'arch-chip-compact' : ''} ${active ? 'is-active' : ''}`}
      onMouseEnter={() => onHover({ item, side })}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover({ item, side })}
      onBlur={() => onHover(null)}
      tabIndex={0}
    >
      <div className="arch-chip-icon"><Icon size={compact ? 14 : 16} strokeWidth={1.8} /></div>
      <div className="arch-chip-label">{item.label}</div>
    </div>
  );
});
