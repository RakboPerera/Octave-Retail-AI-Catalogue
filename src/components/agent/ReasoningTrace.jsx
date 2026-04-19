import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import * as Icons from 'lucide-react';
import './ReasoningTrace.css';

// Agent reasoning trace. Each step has:
//   type: 'think' | 'tool' | 'result' | 'speak' | 'negotiate' | 'vision'
//       | 'guardrail' | 'retry' | 'hitl' | 'plan' | 'reject'
//   label: short headline
//   body:  optional detail line
//   code:  optional code/JSON block
//   confidence: optional 0-1, rendered as a calibrated bar
//   gateStatus: for guardrail steps — 'pass' | 'block' | 'warn' | 'review'
export default function ReasoningTrace({ steps, playing, onDone, speed = 1 }) {
  const prefersReduced = useReducedMotion();
  const [revealed, setRevealed] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    // When playback stops, preserve the current revealed state so the user
    // can read the finished trace. Don't wipe it.
    if (!playing) return;

    // Starting a new run (or steps identity changed mid-play, i.e. scenario
    // switch) — animate from step 0. Parents MUST memoize dynamic steps by
    // scenario id so this effect doesn't re-fire on every parent re-render.
    setRevealed(0);
    let i = 0;
    let cancelled = false;
    const timers = [];
    const next = () => {
      if (cancelled) return;
      if (i >= steps.length) { doneRef.current && doneRef.current(); return; }
      setRevealed(i + 1);
      const step = steps[i];
      const base = (
        step.type === 'think' ? 650
        : step.type === 'plan' ? 750
        : step.type === 'tool' ? 850
        : step.type === 'guardrail' ? 700
        : step.type === 'retry' ? 600
        : step.type === 'hitl' ? 950
        : step.type === 'reject' ? 700
        : 1050
      );
      const delay = prefersReduced ? 180 : (step.delayMs || base) / Math.max(0.5, speed);
      i++;
      timers.push(setTimeout(next, delay));
    };
    timers.push(setTimeout(next, prefersReduced ? 120 : 300 / Math.max(0.5, speed)));
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [playing, steps, speed, prefersReduced]);

  // Clamp revealed to current steps length in case scenario switched while
  // stopped (fewer steps than previously revealed).
  const safeRevealed = Math.min(revealed, steps.length);

  return (
    <div className="trace">
      <div className="trace-head">
        <div className="trace-dot" data-on={playing} />
        <span className="trace-title">Agent reasoning trace</span>
        <span className="trace-count">{safeRevealed} / {steps.length}</span>
      </div>
      <div className="trace-list">
        <AnimatePresence initial={false}>
          {steps.slice(0, safeRevealed).map((step, i) => (
            <TraceItem key={i} step={step} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const TYPE_META = {
  think:     { icon: 'Brain',          color: 'var(--fog-200)',   tone: 'neutral' },
  plan:      { icon: 'ListTree',       color: 'var(--fog-100)',   tone: 'neutral' },
  tool:      { icon: 'Wrench',         color: 'var(--accent)',    tone: 'tool' },
  vision:    { icon: 'Eye',            color: 'var(--accent)',    tone: 'tool' },
  result:    { icon: 'FileCheck',      color: 'var(--accent)',    tone: 'tool' },
  speak:     { icon: 'MessageSquare',  color: 'var(--octave-pink)', tone: 'out' },
  negotiate: { icon: 'Handshake',      color: 'var(--octave-pink)', tone: 'out' },
  guardrail: { icon: 'ShieldCheck',    color: '#F7B84A',          tone: 'guard' },
  retry:     { icon: 'RotateCcw',      color: '#F7B84A',          tone: 'warn' },
  hitl:      { icon: 'UserCheck',      color: '#8A7DF7',          tone: 'hitl' },
  reject:    { icon: 'ShieldX',        color: '#E85C5C',          tone: 'reject' }
};

function TraceItem({ step }) {
  const meta = TYPE_META[step.type] || { icon: 'Circle', color: 'var(--text-muted)', tone: 'neutral' };
  const Icon = Icons[meta.icon] || Icons.Circle;

  return (
    <motion.div
      className={`trace-item trace-item--${meta.tone}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="trace-item-icon" style={{ color: meta.color }}>
        <Icon size={14} strokeWidth={2} />
      </div>
      <div className="trace-item-body">
        <div className="trace-item-head">
          <span className="trace-item-type" style={{ color: meta.color }}>{step.type.toUpperCase()}</span>
          <span className="trace-item-label">{step.label}</span>
          {step.gateStatus && <GateBadge status={step.gateStatus} />}
        </div>
        {step.body && <div className="trace-item-detail">{step.body}</div>}
        {typeof step.confidence === 'number' && <ConfidenceBar value={step.confidence} />}
        {step.code && <pre className="trace-item-code">{step.code}</pre>}
      </div>
    </motion.div>
  );
}

function GateBadge({ status }) {
  const map = {
    pass:   { label: 'PASS',    cls: 'pass' },
    block:  { label: 'BLOCK',   cls: 'block' },
    warn:   { label: 'WARN',    cls: 'warn' },
    review: { label: 'REVIEW',  cls: 'review' }
  };
  const m = map[status] || map.pass;
  return <span className={`trace-gate trace-gate--${m.cls}`}>{m.label}</span>;
}

function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(1, value));
  const pctStr = `${Math.round(pct * 100)}%`;
  const tone = pct >= 0.8 ? 'hi' : pct >= 0.6 ? 'mid' : 'lo';
  return (
    <div className={`trace-conf trace-conf--${tone}`} title={`Agent confidence ${pctStr}`}>
      <span className="trace-conf-lbl">confidence</span>
      <span className="trace-conf-bar"><span style={{ width: pctStr }} /></span>
      <span className="trace-conf-val">{pctStr}</span>
    </div>
  );
}
