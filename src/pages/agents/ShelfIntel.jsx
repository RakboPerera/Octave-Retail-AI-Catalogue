import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import Confidence from '../../components/ui/Confidence.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './ShelfIntel.css';

// =============================================================
// Shelf scene — fictional UK grocery "Bakery & Morning Goods" aisle
// 3 shelves × 8 slots. Some slots are intentionally empty / mis-faced.
// =============================================================
const SHELF = [
  // shelf 0 — bread loaves
  [
    { sku: 'Warburtons 800g', price: '£1.40', tone: 'a' },
    { sku: 'Warburtons 800g', price: '£1.40', tone: 'a' },
    { sku: 'Hovis Soft White', price: '£1.35', tone: 'b' },
    { empty: true },
    { sku: 'Kingsmill 50/50', price: '£1.30', tone: 'c' },
    { sku: 'Kingsmill 50/50', price: '£1.30', tone: 'c' },
    { empty: true },
    { sku: "Tiger Bloomer", price: '£1.85', tone: 'd' }
  ],
  // shelf 1 — rolls & wraps
  [
    { sku: 'Brioche Rolls 6pk', price: '£1.60', tone: 'e' },
    { sku: 'Brioche Rolls 6pk', price: '£1.60', tone: 'e' },
    { sku: 'Wholemeal Rolls', price: '£1.10', tone: 'f' },
    { sku: 'Wholemeal Rolls', price: '£1.10', tone: 'f' },
    { sku: 'Seeded Wraps 8pk', price: '£1.90', tone: 'g', misfaced: true },
    { sku: 'Tortilla Wraps 8pk', price: '£1.75', tone: 'h' },
    { sku: 'Tortilla Wraps 8pk', price: '£1.75', tone: 'h' },
    { sku: 'Pitta 6pk', price: '£0.95', tone: 'i' }
  ],
  // shelf 2 — morning goods
  [
    { sku: 'Croissants 4pk', price: '£1.50', tone: 'j' },
    { sku: 'Croissants 4pk', price: '£1.50', tone: 'j' },
    { sku: 'Pain au Choc 4pk', price: '£1.80', tone: 'k' },
    { empty: true },
    { sku: 'English Muffins 6pk', price: '£1.20', tone: 'l' },
    { sku: 'English Muffins 6pk', price: '£1.20', tone: 'l', priceError: true, shownPrice: '£1.40' },
    { sku: 'Crumpets 6pk', price: '£0.85', tone: 'm' },
    { sku: 'Crumpets 6pk', price: '£0.85', tone: 'm' }
  ]
];

// Issues detected (positions reference shelf/col)
const ISSUES = [
  { id: 'oos-1', kind: 'OOS',       shelf: 0, col: 3, sku: 'Hovis Soft White',    sla: '15 min', impact: '£64/day', severity: 'high', conf: 0.93,
    attribution: '18 units/day × £3.55 avg price · 30d velocity',
    slaWhy: 'OOS on A-class bread — 15-min SLA per store policy for top-decile velocity lines.' },
  { id: 'oos-2', kind: 'OOS',       shelf: 0, col: 6, sku: 'Kingsmill 50/50',     sla: '15 min', impact: '£48/day', severity: 'high', conf: 0.91,
    attribution: '14 units/day × £3.43 avg price · 30d velocity',
    slaWhy: 'OOS on A-class bread — 15-min SLA.' },
  { id: 'mis-1', kind: 'MISFACING', shelf: 1, col: 4, sku: 'Seeded Wraps 8pk',    sla: '30 min', impact: 'Planogram drift', severity: 'med', conf: 0.87,
    attribution: 'Planogram v2026.W15 vs observed — 1 facing off-position',
    slaWhy: 'Mis-facing — 30-min SLA; low near-term £ loss, higher risk of spreading drift.' },
  { id: 'oos-3', kind: 'OOS',       shelf: 2, col: 3, sku: 'Pain au Choc 4pk',    sla: '15 min', impact: '£52/day', severity: 'high', conf: 0.89,
    attribution: '12 units/day × £4.33 avg price · 30d velocity',
    slaWhy: 'OOS on B-class morning goods — 15-min SLA.' },
  { id: 'prc-1', kind: 'PRICE',     shelf: 2, col: 5, sku: 'English Muffins 6pk', sla: '5 min',  impact: 'Price integrity', severity: 'crit', conf: 0.95,
    attribution: 'ESL £1.40 vs master £1.20 · customer-facing discrepancy',
    slaWhy: 'Price-integrity — CRITICAL + 5-min SLA: consumer-rights exposure, Trading Standards / CTSI (Pricing Practices Guide, CPRs) risk, fastest trust signal.' }
];

// Severity policy — shown as an explainer panel so buyers see the rules behind the SLAs
const SEVERITY_POLICY = [
  { kind: 'PRICE',     sla: '5 min',  severity: 'Critical', why: 'Consumer-rights & Trading Standards / CTSI (Pricing Practices Guide, CPRs) exposure · fastest-measurable trust metric · public-perception risk' },
  { kind: 'OOS',       sla: '15 min', severity: 'High',     why: 'Weighted by £/day from 30-day velocity. A-class SKUs get top SLA to protect revenue and availability trust.' },
  { kind: 'MISFACING', sla: '30 min', severity: 'Medium',   why: 'Low immediate £ impact. 30-min SLA keeps planogram drift in check without over-tasking aisle teams.' },
  { kind: 'DAMAGE',    sla: '15 min', severity: 'High',     why: 'Food-safety risk + customer experience. Never delayed beyond 15 minutes.' },
  { kind: 'EXPIRY',    sla: '10 min', severity: 'High',     why: 'Compliance-critical; pulled immediately. Informs markdown agent on adjacent lines.' }
];

const TRACE_STEPS = [
  { type: 'vision', label: 'Frame captured from CCTV-14 (aisle B3).', body: '1080p frame · 14:32 peak trading · planogram version v2026.W15 loaded.' },
  { type: 'think', label: 'Segment shelf rows & run SKU recognition.' },
  { type: 'tool',  label: 'detect_products(frame, planogram)', code: '{\n  "rows": 3, "slots": 24,\n  "correct": 19, "gaps": 3, "anomalies": 2\n}' },
  { type: 'think', label: 'Reconcile detections against planogram & price file.' },
  { type: 'tool',  label: 'crosscheck_price_labels(ESL)', body: 'English Muffins 6pk: ESL shows £1.40, master price £1.20. Discrepancy.' },
  { type: 'tool',  label: 'check_stock_on_hand(SKUs)', body: 'Hovis Soft White: 0 units on shelf, 14 in back. Refill available.' },
  { type: 'think', label: 'Score severity — OOS weighted by £/day sales velocity; price error is critical (consumer trust + legal).' },
  { type: 'tool',  label: 'open_tickets(items, store=LDS-014)', body: '5 tickets raised, SLAs attached, photo evidence pinned.' },
  { type: 'result', label: 'Dispatched to Store Copilot and Aisle Team app.', body: 'Estimated recovered sales over next 8h of trade: ~£55. Price-integrity risk closed in <5 min.' }
];

// 8-week OSA trend — agent goes live at W-5, closes the ~4.2pp gap by W-1
const OSA_TREND = [
  { w: 'W-8', baseline: 95.1, agent: 95.1 },
  { w: 'W-7', baseline: 94.8, agent: 94.8 },
  { w: 'W-6', baseline: 95.4, agent: 95.4 },
  { w: 'W-5', baseline: 94.9, agent: 96.1 },
  { w: 'W-4', baseline: 95.3, agent: 97.0 },
  { w: 'W-3', baseline: 95.0, agent: 98.1 },
  { w: 'W-2', baseline: 95.2, agent: 99.0 },
  { w: 'W-1', baseline: 95.1, agent: 99.3 }
];

// =============================================================
// Main component
// =============================================================
export default function ShelfIntel({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Shelf Intelligence"
          signals={[
            { id: 'cctv', label: 'Existing CCTV (RTSP)', icon: 'Video', detail: 'The agent taps into cameras already installed — no new hardware. Frames are sampled every 60-90s.' },
            { id: 'plan', label: 'Planogram', icon: 'Grid3x3', detail: 'Weekly planograms from the merchandising system — the source of truth for what should be where.' },
            { id: 'prc',  label: 'Price master', icon: 'Tag', detail: 'SKU price file and ESL telemetry. Mismatches trigger a critical-severity ticket.' },
            { id: 'soh',  label: 'Stock on hand', icon: 'Package', detail: 'Back-of-store stock — so the agent knows if a gap can actually be filled before it writes a ticket.' }
          ]}
          tools={[
            { id: 'vision',  label: 'Vision model', icon: 'Eye', detail: 'Fine-tuned product detector + planogram reconciler.' },
            { id: 'policy',  label: 'Severity policy', icon: 'Shield', detail: 'Weights gaps by lost-sales velocity; price-integrity errors always escalate.' },
            { id: 'ticket',  label: 'Ticket writer', icon: 'PenLine', detail: 'Writes a structured ticket with photo crop, SKU, SLA and suggested action.' },
            { id: 'router',  label: 'Routing', icon: 'Waypoints', detail: 'Dispatches to the right colleague per store zone and shift.' }
          ]}
          actions={[
            { id: 'ticket', label: 'Store-ops tickets', icon: 'Ticket', detail: 'Tickets appear in the aisle-team app with SLA countdowns.' },
            { id: 'copilot', label: 'Manager Copilot brief', icon: 'ClipboardCheck', detail: 'Daily gap-report + price-integrity log rolled up for the store manager.' },
            { id: 'merch', label: 'Merch feedback', icon: 'SendHorizontal', detail: 'Persistent gaps fed back to range review — root-cause fixes, not firefighting.' }
          ]}
        />
      }
      demo={
        <DemoShell
          title="Bread & Morning Goods — aisle B3, Leeds City store (LDS-014)"
          subtitle="One CCTV frame. Five SLA-bound tickets — from three out-of-stocks, one mis-facing and a critical price-integrity error — written in under 30 seconds."
        >
          {({ playing, runKey }) => <ShelfDemo playing={playing} runKey={runKey} />}
        </DemoShell>
      }
      kpiChart={
        <div className="si-chart">
          <div className="si-chart-head">
            <span className="eyebrow">On-shelf availability · 8-week trend</span>
            <div className="si-chart-legend">
              <span><i style={{ background: 'var(--text-dim)' }} />Baseline</span>
              <span><i style={{ background: 'var(--accent)' }} />With agent</span>
            </div>
          </div>
          <div className="si-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={OSA_TREND} margin={{ top: 12, right: 16, bottom: 8, left: -4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="w" stroke="#6B6B85" fontSize={12} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <YAxis domain={[93, 100]} stroke="#6B6B85" fontSize={12} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#11111C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, '']}
                  cursor={{ stroke: 'rgba(38, 234, 159, 0.2)' }}
                />
                <ReferenceLine x="W-5" stroke="#E82AAE" strokeDasharray="3 3" label={{ value: 'Agent live', fill: '#E82AAE', fontSize: 11, position: 'top' }} />
                <Line type="monotone" dataKey="baseline" stroke="#6B6B85" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="agent" stroke="#26EA9F" strokeWidth={2.5} dot={{ r: 3, fill: '#26EA9F' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
      technicalDetail={<ShelfTechnical />}
      extraSections={<ShelfExtras />}
    />
  );
}

// =============================================================
// The main demo: shelf scene + detections + reasoning trace + tickets
// =============================================================
function ShelfDemo({ playing, runKey }) {
  const [scanPhase, setScanPhase] = useState(0); // 0 idle, 1 scanning, 2 detected
  const [revealedIssues, setRevealedIssues] = useState(0);
  const [revealedTickets, setRevealedTickets] = useState(0);

  // Reset on replay
  useEffect(() => {
    setScanPhase(0);
    setRevealedIssues(0);
    setRevealedTickets(0);
  }, [runKey]);

  useEffect(() => {
    if (!playing) return;
    const timers = [];
    // Phase 1: scan begins
    timers.push(setTimeout(() => setScanPhase(1), 400));
    // Phase 2: detected, reveal issue boxes one by one
    timers.push(setTimeout(() => setScanPhase(2), 2400));
    ISSUES.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedIssues(i + 1), 2600 + i * 500));
    });
    // Tickets stream in as the trace reaches "open_tickets"
    ISSUES.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedTickets(i + 1), 7800 + i * 320));
    });
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey]);

  return (
    <div className="si-demo-grid">
      {/* LEFT: shelf scene */}
      <div className="si-shelf-stage">
        <div className="si-stage-head">
          <span className="si-cam">
            <Icons.Video size={13} /> CCTV-14 · Bakery Aisle B3
          </span>
          <span className="si-time">14:32:07 · live</span>
        </div>

        <div className="si-shelf-frame">
          <div className={`si-shelf ${scanPhase >= 1 ? 'is-scanning' : ''} ${scanPhase >= 2 ? 'is-detected' : ''}`}>
            {SHELF.map((row, sIdx) => (
              <div className="si-row" key={sIdx}>
                <div className="si-row-back" />
                {row.map((cell, cIdx) => (
                  <Slot key={`${sIdx}-${cIdx}`} cell={cell} />
                ))}
                <div className="si-row-edge" />
              </div>
            ))}

            {/* Scan line */}
            {scanPhase === 1 && <div className="si-scan-line" />}

            {/* Detection boxes */}
            <div className="si-detections">
              {ISSUES.slice(0, revealedIssues).map((iss) => (
                <DetectionBox key={iss.id} issue={iss} />
              ))}
            </div>
          </div>

          <div className="si-shelf-caption">
            <span>Shelf · 3 rows × 8 slots</span>
            <span>Planogram v2026.W15 loaded</span>
          </div>
        </div>

        {/* Summary bar */}
        <div className="si-summary">
          <SummaryStat icon="AlertOctagon" label="Critical" value={ISSUES.slice(0, revealedIssues).filter(i => i.severity === 'crit').length} tone="pink" />
          <SummaryStat icon="AlertTriangle" label="High" value={ISSUES.slice(0, revealedIssues).filter(i => i.severity === 'high').length} tone="turquoise" />
          <SummaryStat icon="AlertCircle" label="Medium" value={ISSUES.slice(0, revealedIssues).filter(i => i.severity === 'med').length} tone="muted" />
          <SummaryStat icon="Ticket" label="Tickets raised" value={revealedTickets} tone="turquoise" />
        </div>
      </div>

      {/* RIGHT: trace + tickets */}
      <div className="si-side">
        <ReasoningTrace steps={TRACE_STEPS} playing={playing} speed={1.1} />

        <div className="si-tickets">
          <div className="si-tickets-head">
            <span className="eyebrow">Tickets dispatched</span>
            <span className="tag">{revealedTickets} / {ISSUES.length}</span>
          </div>
          <div className="si-tickets-list">
            <AnimatePresence initial={false}>
              {ISSUES.slice(0, revealedTickets).map((iss) => (
                <motion.div
                  key={iss.id}
                  className={`si-ticket si-ticket-${iss.severity}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="si-ticket-head">
                    <span className={`si-ticket-kind si-ticket-kind-${iss.kind.toLowerCase()}`}>{iss.kind}</span>
                    <Confidence value={iss.conf} compact />
                    <span className="si-ticket-sla" title={iss.slaWhy}><Icons.Timer size={12} /> {iss.sla}</span>
                  </div>
                  <div className="si-ticket-sku">{iss.sku}</div>
                  <div className="si-ticket-attr" title={iss.attribution}>
                    <Icons.Calculator size={10} /> {iss.attribution}
                  </div>
                  <div className="si-ticket-meta">
                    <span>{iss.impact}</span>
                    <span className="si-ticket-ref">#LDS-014-{iss.id.toUpperCase()}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!revealedTickets && (
              <div className="si-tickets-empty">
                <Icons.Inbox size={22} />
                <span>Tickets appear here as the agent writes them.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------
function Slot({ cell }) {
  if (cell.empty) return <div className="si-slot si-slot-empty" />;
  return (
    <div className={`si-slot ${cell.misfaced ? 'si-slot-misfaced' : ''}`} data-tone={cell.tone}>
      <div className="si-product">
        <span className="si-product-sku">{cell.sku.split(' ').slice(0, 2).join(' ')}</span>
      </div>
      <div className={`si-price ${cell.priceError ? 'si-price-wrong' : ''}`}>
        {cell.priceError ? cell.shownPrice : cell.price}
      </div>
    </div>
  );
}

function DetectionBox({ issue }) {
  const slotWidth = 100 / 8; // % per column
  const rowHeight = 100 / 3; // % per shelf row
  const style = {
    left: `${issue.col * slotWidth}%`,
    top: `${issue.shelf * rowHeight}%`,
    width: `${slotWidth}%`,
    height: `${rowHeight}%`
  };
  const kindClass = `si-det-${issue.kind.toLowerCase()}`;
  return (
    <motion.div
      className={`si-det ${kindClass}`}
      style={style}
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="si-det-label">
        {issue.kind} <span className="si-det-conf">· {issue.conf.toFixed(2)}</span>
      </span>
    </motion.div>
  );
}

function SummaryStat({ icon, label, value, tone }) {
  const Icon = Icons[icon] || Icons.Circle;
  return (
    <div className={`si-sum si-sum-${tone}`}>
      <Icon size={15} strokeWidth={2} />
      <span className="si-sum-value">{value}</span>
      <span className="si-sum-label">{label}</span>
    </div>
  );
}

// Technical deep-dive section
function ShelfTechnical() {
  return (
    <div className="si-tech">
      <ModelCard
        architecture="Fine-tuned YOLO-v8 detector + planogram reconciler (structured-output LLM)"
        trainingWindow="~40k shelf frames · 12 store formats · rolling 90-day refresh"
        lastRetrain="2026-03-22 (4 weeks ago)"
        accuracy="mAP@0.5 · 0.91"
        accuracyLabel="vision accuracy"
        features={68}
        driftStatus="stable"
        notes="Every model update is regression-tested on labelled golden-path and adversarial sets before promotion. Edge-aware pipeline: vision runs centrally, policy and ticketing near-edge for <30s ticket-to-app."
      />

      <div className="si-tech-grid si-tech-grid-compact">
        <div className="si-tech-card">
          <Icons.Cpu size={20} />
          <h4>Vision stack</h4>
          <p>Fine-tuned detector on ~40k in-store shelf frames per retailer. Planogram reconciler runs as a structured-output LLM call with the detection JSON + planogram JSON as context.</p>
        </div>
        <div className="si-tech-card">
          <Icons.GitBranch size={20} />
          <h4>Edge-aware pipeline</h4>
          <p>Heavy vision runs centrally. Policy and ticketing run near-edge so tickets arrive in &lt;30s from capture, even over intermittent WAN.</p>
        </div>
        <div className="si-tech-card">
          <Icons.Gauge size={20} />
          <h4>Eval harness</h4>
          <p>Every model update is regression-tested on labelled shelf frames per store format. Golden-path and adversarial sets gate promotion to production.</p>
        </div>
        <div className="si-tech-card">
          <Icons.Lock size={20} />
          <h4>Privacy &amp; consent</h4>
          <p>Faces blurred at capture. No customer identification. All processing on-prem or in your tenancy — model outputs only leave the frame. Colleague-incidental capture handled via DPIA; retention 31 days per DPA2018 Sch.2 Pt.2; no colleague features fed into shelf-vision scores.</p>
        </div>
      </div>
      <details className="si-tech-details">
        <summary>See a fragment of the ticketing tool schema</summary>
        <pre className="si-code">{`tool: open_ticket
input_schema:
  store_id: string
  issue_kind: ["OOS", "MISFACING", "PRICE", "DAMAGE", "EXPIRY"]
  sku: string
  shelf_position: { row: int, slot: int }
  evidence_frame: url
  severity: ["crit", "high", "med", "low"]
  sla_minutes: int
  suggested_action: string   // one of: refill | re-face | relabel | escalate
  rationale: string          // free-text, shown in the aisle-team app`}</pre>
      </details>
    </div>
  );
}

// Extra sections — severity policy, edge cases
function ShelfExtras() {
  return (
    <>
      <section className="ap-section">
        <div className="container">
          <div className="ap-section-head">
            <span className="eyebrow">Catalogue ROI · measured outcomes</span>
            <h2 className="ap-section-title">Shelf Intelligence · headline numbers.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
            <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>OSA</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>+4.2pp</div>
            </div>
            <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Gap-to-resolution</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>3h → 22min</div>
            </div>
            <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Price-integrity errors</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>-71%</div>
            </div>
            <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Time-to-value</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>12 weeks</div>
            </div>
          </div>
        </div>
      </section>
      <section className="ap-section">
        <div className="container">
          <div className="ap-section-head">
            <span className="eyebrow eyebrow-pink">Severity policy — why each issue gets the SLA it does</span>
            <h2 className="ap-section-title">Auditable rules behind every ticket.</h2>
            <p className="ap-section-sub">Buyers always ask: <em>why is a price error critical but a mis-facing only medium?</em> Here's the policy the agent applies — human-readable, version-controlled, editable.</p>
          </div>
          <div className="si-policy">
            {SEVERITY_POLICY.map((p) => (
              <div key={p.kind} className={`si-policy-row si-policy-${p.severity.toLowerCase()}`}>
                <span className="si-policy-kind">{p.kind}</span>
                <span className="si-policy-sev">{p.severity}</span>
                <span className="si-policy-sla"><Icons.Timer size={12} /> {p.sla}</span>
                <span className="si-policy-why">{p.why}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="ap-section">
        <div className="container">
          <div className="ap-section-head">
            <span className="eyebrow">Edge cases the agent handles</span>
            <h2 className="ap-section-title">What makes it production-grade.</h2>
          </div>
        <div className="si-edge-grid">
          {[
            { t: 'Customer occlusion', d: 'If a shopper is blocking a slot, the agent defers — it waits for a clean frame rather than raising a false OOS.' },
            { t: 'Promo disruption', d: 'During promo cut-ins, planogram variants are cross-checked against the in-flight activity so the agent doesn\'t chase the buyer.' },
            { t: 'Seasonal resets', d: 'Planogram versioning means the agent respects the overnight reset window instead of logging every move as a mis-facing.' },
            { t: 'Cosmetic damage', d: 'Crushed packs, leaks and split seals are detected with a dedicated head and flagged as DAMAGE tickets distinct from OOS.' }
          ].map((e) => (
            <div key={e.t} className="si-edge-card">
              <Icons.CheckCircle2 size={18} />
              <div>
                <h4>{e.t}</h4>
                <p>{e.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
