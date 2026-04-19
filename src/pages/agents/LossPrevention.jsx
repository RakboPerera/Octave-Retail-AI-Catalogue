import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './LossPrevention.css';

function GovPanel({ icon, title, body }) {
  const Icon = Icons[icon] || Icons.Shield;
  return (
    <div style={{ padding: '16px 18px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', background: 'rgba(232, 42, 174, 0.035)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Icon size={16} strokeWidth={1.8} style={{ color: 'var(--octave-pink)' }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>{title}</div>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>{body}</p>
    </div>
  );
}

const INCIDENTS = [
  {
    id: 'SCO-71221',
    kind: 'Ticket switch',
    location: 'SCO 4',
    t: '14:32',
    risk: 86,
    status: 'Open case',
    signals: [
      { k: 'POS', v: '1× "Organic Cox Apples 500g" @ £1.20' },
      { k: 'Scale', v: 'Weight 1.42kg — inconsistent' },
      { k: 'CCTV-7', v: 'Beef topside visible on scanner bed' },
      { k: 'SKU DB', v: 'Beef topside 1.42kg list price £18.64' }
    ],
    // SHAP-style feature contributions to the risk score
    shap: [
      { f: 'Baseline', v: 12,  explain: 'Population-level false-positive rate for SCO events.' },
      { f: 'Scale vs barcode weight', v: +28, explain: 'Scanned barcode = apples (~0.5kg), measured weight 1.42kg — 2.8σ above expected.' },
      { f: 'Vision match', v: +22, explain: 'Scanner-bed CCTV detected beef-joint packaging (conf 0.91).' },
      { f: '£/kg anomaly', v: +14, explain: '£1.20 rung for 1.42kg scanned = £0.85/kg — 4.1σ below catalogue median for fresh beef.' },
      { f: 'Prior-shift same till', v: +10, explain: 'Identical weight/vision mismatch logged 09:47 same SCO.' }
    ],
    loss: '£17.44',
    narrative: 'Label from apples printed and affixed to a topside beef joint. Scale weight matches beef; vision confirms packaging cues. Repeat pattern observed on prior shift same till.'
  },
  {
    id: 'DOOR-33190',
    kind: 'Cart walk-out',
    location: 'East exit',
    t: '16:48',
    risk: 93,
    status: 'Open case',
    signals: [
      { k: 'Door', v: 'EAS unmuted · loud alert at 16:48:12' },
      { k: 'POS', v: 'No matching completed transaction within 90s window' },
      { k: 'CCTV-12', v: 'Full cart, customer did not pause at tills' },
      { k: 'Cart-vision re-ID', v: 'Exit-gate vision · unscanned-item count 40' }
    ],
    shap: [
      { f: 'Baseline', v: 10, explain: 'Population-level false-positive rate for door events.' },
      { f: 'EAS tag alert', v: +25, explain: 'Active tag detected at exit; tag ID not matched to any paid basket.' },
      { f: 'No POS match (±90s)', v: +24, explain: 'Zero completed transactions in the 3-minute window around the exit.' },
      { f: 'Full cart at exit', v: +18, explain: 'Cart-vision re-ID at exit gate · 40 items unscanned — consistent with a full cart walk-out.' },
      { f: 'No till pause', v: +16, explain: 'CCTV-12: customer bypassed all 18 tills without slowing.' }
    ],
    loss: '£184.20',
    narrative: 'Full-cart exit without any matching POS transaction. Door EAS alerted, CCTV confirms unobstructed walk-out. No staff on door at the time.'
  },
  {
    id: 'REFND-22894',
    kind: 'Refund pattern',
    location: 'CS desk',
    t: 'Last 30d',
    risk: 78,
    status: 'Pattern watch',
    signals: [
      { k: 'Refunds', v: '17 refunds in 30 days, all cash, same colleague' },
      { k: 'Customer match', v: '0 loyalty match across refunds' },
      { k: 'Basket overlap', v: '14 of 17 refund SKUs match nightly stock variance' },
      { k: 'Schedule', v: 'All refunds during 2-hour colleague overlap' }
    ],
    shap: [
      { f: 'Baseline', v: 8,  explain: 'Population-level false-positive for refund-pattern detection.' },
      { f: 'Cash-only concentration', v: +22, explain: '17 of 17 refunds processed in cash — estate average 8%.' },
      { f: 'Zero loyalty match', v: +18, explain: 'No Redwell Rewards / app account linked to any refund — estate average 74%.' },
      { f: 'Stock-variance overlap', v: +18, explain: '14 of 17 refund SKUs appear in overnight stock-variance logs.' },
      { f: 'Schedule correlation', v: +12, explain: 'All refunds within a 2-hour shift-overlap window involving same colleague.' }
    ],
    loss: '£642.10',
    narrative: 'Suspicious refund pattern: same colleague, cash-only, no matching customer, strong overlap with nightly stock variance. Requires HR-led investigation.'
  },
  {
    id: 'SCO-71418',
    kind: 'Sweethearting',
    location: 'SCO 2',
    t: '17:04',
    risk: 64,
    status: 'Open case',
    signals: [
      { k: 'POS', v: '14 items scanned, 11 items successfully rung' },
      { k: 'CCTV-4', v: '3 items passed over scanner without beep' },
      { k: 'Colleague', v: 'Assisting colleague hovering next to SCO throughout' },
      { k: 'Customer', v: 'Known profile · prior flagged SCO events' }
    ],
    shap: [
      { f: 'Baseline', v: 12, explain: 'Population-level false-positive for SCO events.' },
      { f: 'Scan/beep gap', v: +20, explain: 'Vision saw 14 items cross the scanner, POS rung 11.' },
      { f: 'Colleague proximity (pseudonymised)', v: +8, explain: 'Assisting colleague within 1m of SCO for 94% of session — above 40% norm. Colleague identity pseudonymised; only revealed if HR opens a case.' },
      { f: 'Incident-list match (subject-rights route published)', v: +10, explain: 'Match against published incident list; lawful basis = LIA with balancing test. Subject-rights route documented and accessible.' },
      { f: 'Low basket depth', v: +6,  explain: 'Pattern of low-value bypass; less likely accidental on high-price items.' }
    ],
    loss: '£12.60',
    narrative: 'Low-value but high-frequency pattern. Three items bypassed scanner at SCO with an assisting colleague hovering nearby. Same customer flagged previously. Escalate for HITL review → HR (subject to case-management workflow).'
  }
];

const TRACE_STEPS = [
  { type: 'tool', label: 'correlate_feeds(pos, cctv, scale, door, scheduling)', body: 'Joined signals on timestamp + till + basket over a 6-minute window.' },
  { type: 'plan', label: 'Distinguish mistake from malice: weight, scan gap, known patterns, colleague-overlap.' },
  { type: 'tool', label: 'score_risk(features)', body: 'Feature vector scored vs retailer-calibrated GBDT. Threshold = 60 (precision 94%).', confidence: 0.87 },
  { type: 'guardrail', label: 'Fairness gate · monthly disparity test across protected characteristics.', gateStatus: 'pass', body: 'No statistically significant deviation in alert rate across protected groups (monthly χ² test, α = 0.01).' },
  { type: 'guardrail', label: 'Colleague-implicated case · locked-down evidence chain.', gateStatus: 'review', body: 'Named-colleague features pseudonymised. LP desk sees the pattern, not the identity, until HR opens the case.' },
  { type: 'tool', label: 'assemble_case_file(evidence, narrative)', body: 'Multi-source case file written with evidence pinned to the timeline; SHAP contributions attached.' },
  { type: 'plan', label: 'Route: below threshold → watch; HR-sensitive → HR-led investigation; customer-facing → LP desk.' },
  { type: 'hitl', label: 'Article 22 gate · no disciplinary action triggered by model alone.', body: 'Agent drafts the recommendation. A named human always opens the case and authorises any action affecting a person.' },
  { type: 'result', label: 'Dispatched with recommended action.', body: 'Case preparation time collapses from 45 minutes to 4 minutes. Full audit trail retained 7 years on prosecuted cases.' }
];

export default function LossPrevention({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Loss Prevention Agent"
          signals={[
            { id: 'pos',   label: 'POS & SCO',        icon: 'CreditCard', detail: 'Transaction-level events including voids, refunds, scan gaps and weight errors.' },
            { id: 'cctv',  label: 'CCTV',             icon: 'Video',      detail: 'Multi-camera vision — scanner bed, exit, counter, high-risk aisles.' },
            { id: 'door',  label: 'EAS & door',       icon: 'DoorOpen',   detail: 'Tag alerts, heavy exit events, unmanned-door windows.' },
            { id: 'wfm',   label: 'Scheduling',       icon: 'Users',      detail: 'Colleague rosters + overlaps — used for pattern detection, not surveillance.' },
            { id: 'stock', label: 'Stock variance',   icon: 'PackageOpen', detail: 'Nightly variance to triangulate refund-pattern fraud.' }
          ]}
          tools={[
            { id: 'corr',  label: 'Feed correlator',  icon: 'GitMerge',   detail: 'Joins events on time, till and basket to form a single story.' },
            { id: 'score', label: 'Risk model',       icon: 'Gauge',      detail: 'Retailer-calibrated classifier with explainability per feature.' },
            { id: 'case',  label: 'Case writer',      icon: 'FileText',   detail: 'Writes a case file with pinned evidence and a narrative LP can verify in seconds.' },
            { id: 'route', label: 'Router',           icon: 'Waypoints',  detail: 'Dispatches to LP, HR or CS based on case type and store policy.' }
          ]}
          actions={[
            { id: 'lp',    label: 'LP desk case',     icon: 'ShieldAlert', detail: 'Open case with evidence, ready for floor-walk or intercept.' },
            { id: 'hr',    label: 'HR-led case',      icon: 'UserSearch',  detail: 'Colleague-implicated events routed to HR with locked-down evidence chain.' },
            { id: 'brief', label: 'Exec brief',       icon: 'FileBarChart', detail: 'Roll-up to RLPM with shrink trend and hot-spot map.' }
          ]}
          guardrails={[
            'Article 22 HITL — no disciplinary or customer-facing action triggered by model alone',
            'DPIA + Legitimate Interests Assessment with works-council / USDAW consultation',
            'Pseudonymised colleague features until HR opens a case',
            'Monthly disparity testing across protected characteristics',
            'Retention: 31d CCTV · 90d alerts · 7y prosecuted cases'
          ]}
        />
      }
      demo={
        <DemoShell
          title="Same shift. Four signals. Four cases — with recommended action."
          subtitle="Click any incident card on the left. Watch the agent correlate feeds, score risk and write the case."
        >
          {({ playing, runKey, onDone }) => <LossPreventionDemo playing={playing} runKey={runKey} onDone={onDone} />}
        </DemoShell>
      }
      technicalDetail={
        <ModelCard
          architecture="Multi-feed correlator + gradient-boosted risk classifier (SHAP-explainable) + routing policy engine"
          trainingWindow="Retailer-calibrated · 2 years of labelled incidents · monthly drift check"
          lastRetrain="2026-04-01 (18 days ago)"
          accuracy="Precision 94% at threshold 60 · Alert FP rate 5.8% (1 − precision)"
          accuracyLabel="classifier quality"
          features={48}
          driftStatus="stable"
          notes="Every risk score carries a full feature-contribution breakdown (SHAP). Policy engine routes HR-sensitive cases (colleague-implicated) through a locked-down evidence chain — the LP team never sees raw colleague identity until HR opens the case."
        />
      }
      extraSections={
        <>
        <section className="ap-section">
          <div className="container">
            <div className="ap-section-head">
              <span className="eyebrow eyebrow-pink">Governance · headline</span>
              <h2 className="ap-section-title">A model that accuses no-one.</h2>
              <p className="ap-section-sub">
                Every alert is a <i>recommendation</i>. A named human opens every case. At threshold 60 the classifier precision is 94% — meaning of every 100 raised alerts, 6 are false. The agent is designed so those 6 never cause harm: no colleague is ever identified to the LP team without HR opening the case; no customer is ever approached on a model signal alone.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '20px' }}>
              <GovPanel icon="ShieldCheck" title="Article 22 HITL" body="No disciplinary or customer-facing action is triggered by the model alone. Agent drafts; a named human opens the case." />
              <GovPanel icon="Scale" title="DPIA + LIA" body="DPIA completed. Lawful basis = Legitimate Interests with balancing test. Works-council / USDAW consulted on colleague-implicated flows." />
              <GovPanel icon="UserX" title="Pseudonymised colleague IDs" body="LP desk sees the pattern, not the identity. Colleague name revealed only when HR opens a formal case." />
              <GovPanel icon="Gauge" title="Monthly fairness audit" body="Disparity testing across protected characteristics on alert rate, precision and escalation rate. Failing months block model promotion." />
              <GovPanel icon="Archive" title="Retention policy" body="31 days CCTV · 90 days alerts · 7 years for prosecuted cases. Immutable evidence chain with cryptographic hashing." />
              <GovPanel icon="FileSearch" title="Subject-rights route" body="Published at colleague and customer level. GDPR access / erasure handled by DPO via a dedicated portal." />
            </div>
          </div>
        </section>

        <section className="ap-section">
          <div className="container">
            <div className="ap-section-head">
              <span className="eyebrow">Catalogue ROI · measured outcomes</span>
              <h2 className="ap-section-title">Loss Prevention · headline numbers.</h2>
              <p className="ap-section-sub">Benchmark baseline: UK retail shrink runs at 1.42% of turnover (BRC Crime Survey 2024).</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Case prep</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>45m → 4m</div>
              </div>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Malicious shrink</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>-0.38pp</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', lineHeight: 1.4 }}>Ticket-switch, sweethearting, SCO fraud. <Link to="/agent/store-copilot" style={{ color: 'var(--accent)' }}>Process shrink</Link> owned separately.</div>
              </div>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Precision @ threshold</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>94%</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', lineHeight: 1.4 }}>Threshold is tunable per store: the LP desk sets the precision / recall trade-off.</div>
              </div>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Time-to-value</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>14 weeks</div>
              </div>
            </div>
          </div>
        </section>
        </>
      }
    />
  );
}

function LossPreventionDemo({ playing, runKey, onDone }) {
  const [selected, setSelected] = useState(INCIDENTS[0]);
  const [revealedSignals, setRevealedSignals] = useState(0);
  const [revealedShap, setRevealedShap] = useState(0);
  const [showNarrative, setShowNarrative] = useState(false);
  const [hoverShap, setHoverShap] = useState(null);

  // Running SHAP cumulative as bars reveal
  const cumRisk = selected.shap.slice(0, revealedShap).reduce((s, x) => s + x.v, 0);

  useEffect(() => {
    setRevealedSignals(0);
    setRevealedShap(0);
    setShowNarrative(false);
    setHoverShap(null);
  }, [runKey, selected.id]);

  useEffect(() => {
    if (!playing) return;
    // Reset first so mid-play scenario switches restart cleanly
    setRevealedSignals(0);
    setRevealedShap(0);
    setShowNarrative(false);
    const timers = [];
    selected.signals.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedSignals(i + 1), 400 + i * 450));
    });
    const after = 400 + selected.signals.length * 450 + 200;
    // SHAP contributions reveal one by one
    selected.shap.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedShap(i + 1), after + i * 550));
    });
    const afterShap = after + selected.shap.length * 550 + 300;
    timers.push(setTimeout(() => setShowNarrative(true), afterShap));
    timers.push(setTimeout(() => onDone && onDone(), afterShap + 600));
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey, selected, onDone]);

  return (
    <div className="lp-grid">
      <div className="lp-left">
        <span className="eyebrow">Open incidents · today</span>
        <div className="lp-list">
          {INCIDENTS.map((inc) => (
            <button
              key={inc.id}
              className={`lp-card ${selected.id === inc.id ? 'lp-card-on' : ''}`}
              onClick={() => setSelected(inc)}
            >
              <div className="lp-card-head">
                <span className="lp-card-kind">{inc.kind}</span>
                <span className={`lp-card-risk ${riskClass(inc.risk)}`}>{inc.risk}</span>
              </div>
              <div className="lp-card-meta">
                <span>#{inc.id}</span>
                <span>·</span>
                <span>{inc.location}</span>
                <span>·</span>
                <span>{inc.t}</span>
              </div>
              <div className="lp-card-loss"><Icons.PoundSterling size={11} /> {inc.loss} exposure</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lp-centre">
        <div className="lp-head">
          <div>
            <span className="eyebrow">Case file · #{selected.id}</span>
            <h3 className="lp-title">{selected.kind} · {selected.location}</h3>
            <div className="lp-route">
              <Icons.GitMerge size={11} />
              <span>{routeFor(selected)}</span>
            </div>
          </div>
          <div className={`lp-status lp-status-${selected.status.split(' ')[0].toLowerCase()}`}>
            <Icons.Circle size={8} fill="currentColor" />
            {selected.status}
          </div>
        </div>

        {/* Risk gauge */}
        <div className="lp-risk">
          <div className="lp-risk-head">
            <span>Risk score <span className="lp-risk-threshold-note">threshold = 60</span></span>
            <motion.span
              key={cumRisk}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              className={`lp-risk-num ${riskClass(cumRisk)}`}
            >{cumRisk}</motion.span>
          </div>
          <div className="lp-risk-bar">
            <motion.div
              className="lp-risk-fill"
              animate={{ width: `${Math.min(100, cumRisk)}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
            <div className="lp-risk-threshold" style={{ left: '60%' }}>
              <span>threshold</span>
            </div>
          </div>
        </div>

        {/* SHAP waterfall — feature contributions */}
        <div className="lp-shap">
          <div className="lp-shap-head">
            <span className="eyebrow eyebrow-pink">Why the agent scored it this way</span>
            <span className="voc-count">feature contributions · SHAP</span>
          </div>
          <div className="lp-shap-list">
            {selected.shap.map((s, i) => {
              const revealed = i < revealedShap;
              const running = selected.shap.slice(0, i).reduce((sum, x) => sum + x.v, 0);
              const isBaseline = i === 0;
              const widthPct = Math.min(100, Math.abs(s.v));
              return (
                <div
                  key={i}
                  className={`lp-shap-row ${revealed ? 'is-on' : ''} ${hoverShap === i ? 'is-hover' : ''} ${isBaseline ? 'lp-shap-base' : ''}`}
                  onMouseEnter={() => setHoverShap(i)}
                  onMouseLeave={() => setHoverShap(null)}
                >
                  <span className="lp-shap-label">{s.f}</span>
                  <div className="lp-shap-track">
                    {/* cumulative ghost (previous total) */}
                    {!isBaseline && (
                      <div className="lp-shap-ghost" style={{ width: `${Math.min(100, running)}%` }} />
                    )}
                    <motion.div
                      className={`lp-shap-bar ${isBaseline ? 'lp-shap-bar-base' : 'lp-shap-bar-delta'}`}
                      initial={{ width: 0 }}
                      animate={{ width: revealed ? `${isBaseline ? widthPct : widthPct}%` : 0, marginLeft: isBaseline ? 0 : `${Math.min(100, running)}%` }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className={`lp-shap-val ${isBaseline ? 'lp-shap-val-base' : 'lp-shap-val-delta'}`}>
                    {revealed ? `${isBaseline ? '' : '+'}${s.v}` : '—'}
                  </span>
                </div>
              );
            })}
            {/* Final line */}
            <div className={`lp-shap-row lp-shap-total ${revealedShap >= selected.shap.length ? 'is-on' : ''}`}>
              <span className="lp-shap-label">Predicted risk</span>
              <div className="lp-shap-track">
                <motion.div
                  className="lp-shap-bar lp-shap-bar-total"
                  initial={{ width: 0 }}
                  animate={{ width: revealedShap >= selected.shap.length ? `${Math.min(100, cumRisk)}%` : 0 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className={`lp-shap-val lp-shap-val-total ${riskClass(cumRisk)}`}>= {cumRisk}</span>
            </div>
          </div>
          <div className="lp-shap-explain">
            {hoverShap != null && selected.shap[hoverShap]
              ? <><span className="lp-shap-explain-label">{selected.shap[hoverShap].f}</span><p>{selected.shap[hoverShap].explain}</p></>
              : <p className="lp-shap-explain-hint">Hover any row to see the underlying evidence for that contribution.</p>}
          </div>
        </div>

        {/* Correlated evidence */}
        <div className="lp-evidence">
          <div className="lp-evidence-head">
            <span className="eyebrow">Correlated evidence</span>
            <span className="voc-count">{revealedSignals} / {selected.signals.length}</span>
          </div>
          <div className="lp-evidence-list">
            <AnimatePresence>
              {selected.signals.slice(0, revealedSignals).map((s, i) => (
                <motion.div
                  key={i}
                  className="lp-evidence-row"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="lp-evidence-k">{s.k}</span>
                  <span className="lp-evidence-v">{s.v}</span>
                  <span className="lp-evidence-check"><Icons.CheckCircle2 size={13} /></span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* CCTV scene — bespoke per incident */}
        <div className="lp-cctv">
          <div className="lp-cctv-head">
            <Icons.Video size={12} />
            <span>{cameraLabelFor(selected)} · {selected.t} · frame-pinned to case</span>
            <span className="lp-cctv-head-spacer" />
            <span className="lp-cctv-conf">confidence {Math.min(0.99, 0.5 + selected.shap.filter(s => s.f !== 'Baseline').reduce((a, s) => a + Math.max(0, s.v) / 100, 0)).toFixed(2)}</span>
          </div>
          <div className="lp-cctv-pane">
            <div className="lp-cctv-grid" />
            <div className="lp-cctv-scanline" />
            <div className="lp-cctv-time"><LiveClock t={selected.t} /></div>
            <div className="lp-cctv-live">●  LIVE</div>
            <CCTVScene incident={selected} />
          </div>
          {selected.kind === 'Refund pattern' && <RefundHeatmap />}
        </div>

        {/* Governance strip — colleague signals (Sweethearting + Refund-pattern both implicate colleagues) */}
        {(selected.kind === 'Sweethearting' || selected.kind === 'Refund pattern') && (
          <div
            className="lp-gov-strip"
            style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', marginTop: '12px', fontSize: '13px', lineHeight: '1.5' }}
          >
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>Governance — colleague signals</div>
            <div>• DPIA completed · lawful basis = LIA with balancing test</div>
            <div>• Works-council / USDAW consulted; automated-decision gate is advisory only</div>
            <div>• Named-colleague features pseudonymised until HR opens case</div>
            <div>• Article 22 HITL: no disciplinary action triggered by model alone</div>
          </div>
        )}

        {/* Data-retention & audit strip */}
        <div
          style={{ padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', marginTop: '12px', fontSize: '12px', lineHeight: '1.5', color: 'var(--text-dim)' }}
        >
          Retention 31d (CCTV), 90d (alerts), 7y (prosecuted cases) · Immutable evidence chain · Monthly disparity testing across protected characteristics
        </div>

        {/* Narrative */}
        {showNarrative && (
          <motion.div
            className="lp-narrative"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="eyebrow eyebrow-pink">Agent narrative</span>
            <p>{selected.narrative}</p>
            <div className="lp-narrative-actions">
              <button className="btn btn-primary lp-narrative-btn"><Icons.ShieldAlert size={14} /> Escalate to LP floor</button>
              <button className="btn btn-ghost lp-narrative-btn"><Icons.Archive size={14} /> Archive evidence</button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="lp-right">
        <ReasoningTrace steps={TRACE_STEPS} playing={playing} speed={1.2} />
      </div>
    </div>
  );
}

function riskClass(v) {
  if (v >= 85) return 'lp-risk-crit';
  if (v >= 60) return 'lp-risk-high';
  if (v >= 35) return 'lp-risk-med';
  return 'lp-risk-low';
}

// Policy routing — which desk handles which kind of case + why
function routeFor(inc) {
  if (inc.kind === 'Refund pattern') return 'Routed to HR-led investigation · colleague-implicated pattern';
  if (inc.kind === 'Cart walk-out')  return 'Routed to LP floor desk · immediate-response eligible';
  if (inc.kind === 'Sweethearting')  return 'Routed to HR + LP joint review · colleague-proximity signal';
  if (inc.kind === 'Ticket switch')  return 'Routed to LP floor desk · customer-facing intercept';
  return 'Routed to LP';
}

function cameraLabelFor(inc) {
  if (inc.kind === 'Ticket switch')  return 'Event fusion · POS + scale + CCTV-7';
  if (inc.kind === 'Cart walk-out')  return 'CCTV-12 · East exit';
  if (inc.kind === 'Refund pattern') return 'CS-desk · 30-day pattern view';
  if (inc.kind === 'Sweethearting')  return 'CCTV-4 · SCO-2 scanner + colleague bay';
  return 'CCTV';
}

// Live-ticking clock for the scene corner
function LiveClock({ t }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // Append tick seconds onto the base hh:mm (keep mm static, spin ss visually)
  const ss = String((parseInt(t.split(':').slice(-1)[0] || '0', 10) + tick) % 60).padStart(2, '0');
  const hm = t.split(':').slice(0, 2).join(':');
  return <>{hm}:{ss}</>;
}

// ============================================================================
// Bespoke CCTV scenes per incident — stylised, not photographic. Each scene
// gives the bounding box something meaningful to frame.
// ============================================================================
function CCTVScene({ incident }) {
  if (incident.kind === 'Ticket switch')  return <SceneTicketSwitch />;
  if (incident.kind === 'Cart walk-out')  return <SceneCartWalkout />;
  if (incident.kind === 'Sweethearting')  return <SceneSweethearting />;
  if (incident.kind === 'Refund pattern') return <SceneRefundPattern />;
  return null;
}

function SceneTicketSwitch() {
  // Evidence reconciliation view — 3 independent event streams converging.
  // This replaces the photographic attempt; the agent's actual signal is a
  // multi-feed mismatch, not a single frame.
  return (
    <svg className="lp-cctv-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="ts-row" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"  stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
        </linearGradient>
        <linearGradient id="ts-row-bad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"  stopColor="rgba(232,42,174,0.15)" />
          <stop offset="100%" stopColor="rgba(232,42,174,0.03)" />
        </linearGradient>
      </defs>

      {/* Title bar */}
      <text x="40" y="38" fontSize="11" fontFamily="var(--font-display)" fontWeight="700" fill="rgba(228,228,238,0.55)" letterSpacing="0.18em">EVENT RECONCILIATION · 3 INDEPENDENT FEEDS · 14:32:07</text>

      {/* ── Row 1: POS ── */}
      <g transform="translate(40, 70)">
        <rect x="0" y="0" width="720" height="86" rx="4" fill="url(#ts-row)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <rect x="0" y="0" width="4"  height="86" fill="#26EA9F" />
        <text x="18" y="22" fontSize="10.5" fontFamily="var(--font-display)" fontWeight="700" letterSpacing="0.18em" fill="#26EA9F">POS EVENT</text>
        <text x="700" y="22" textAnchor="end" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="rgba(228,228,238,0.5)">till-4 · t=14:32:07.412</text>
        <text x="18" y="50" fontSize="13" fontFamily="JetBrains Mono, monospace" fill="#E4E4EE">scan  →  "Organic Cox Apples 500g"</text>
        <text x="18" y="72" fontSize="12" fontFamily="JetBrains Mono, monospace" fill="rgba(228,228,238,0.6)">price  =  £1.20  ·  barcode 5010251112345</text>
        <g transform="translate(600, 46)">
          <rect x="0" y="0" width="100" height="30" rx="3" fill="rgba(38,234,159,0.1)" stroke="rgba(38,234,159,0.4)" strokeWidth="1" />
          <text x="50" y="19" textAnchor="middle" fontSize="10" fontFamily="var(--font-display)" fontWeight="700" fill="#26EA9F" letterSpacing="0.1em">ACCEPTED</text>
        </g>
      </g>

      {/* ── Row 2: Scale (mismatch) ── */}
      <g transform="translate(40, 168)">
        <rect x="0" y="0" width="720" height="86" rx="4" fill="url(#ts-row-bad)" stroke="rgba(232,42,174,0.45)" strokeWidth="1.5">
          <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
        </rect>
        <rect x="0" y="0" width="4"  height="86" fill="#E82AAE" />
        <text x="18" y="22" fontSize="10.5" fontFamily="var(--font-display)" fontWeight="700" letterSpacing="0.18em" fill="#E82AAE">SCALE READING</text>
        <text x="700" y="22" textAnchor="end" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="rgba(228,228,238,0.5)">scanner-bed  · t=14:32:07.456</text>
        <text x="18" y="50" fontSize="13" fontFamily="JetBrains Mono, monospace" fill="#E4E4EE">weight  =  1.42 kg</text>
        <text x="18" y="72" fontSize="12" fontFamily="JetBrains Mono, monospace" fill="rgba(228,228,238,0.6)">expected for SKU  =  0.50 ± 0.05 kg  ·  deviation +184%</text>
        <g transform="translate(580, 46)">
          <rect x="0" y="0" width="120" height="30" rx="3" fill="rgba(232,42,174,0.15)" stroke="#E82AAE" strokeWidth="1" />
          <text x="60" y="19" textAnchor="middle" fontSize="10" fontFamily="var(--font-display)" fontWeight="700" fill="#FFF" letterSpacing="0.1em">WEIGHT MISMATCH</text>
        </g>
      </g>

      {/* ── Row 3: Vision (mismatch) ── */}
      <g transform="translate(40, 266)">
        <rect x="0" y="0" width="720" height="86" rx="4" fill="url(#ts-row-bad)" stroke="rgba(232,42,174,0.45)" strokeWidth="1.5">
          <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" begin="0.4s" />
        </rect>
        <rect x="0" y="0" width="4"  height="86" fill="#E82AAE" />
        <text x="18" y="22" fontSize="10.5" fontFamily="var(--font-display)" fontWeight="700" letterSpacing="0.18em" fill="#E82AAE">VISION ID</text>
        <text x="700" y="22" textAnchor="end" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="rgba(228,228,238,0.5)">cctv-7  · t=14:32:07.488  · conf 0.91</text>
        <text x="18" y="50" fontSize="13" fontFamily="JetBrains Mono, monospace" fill="#E4E4EE">detected  →  "beef joint (fresh meat)"</text>
        <text x="18" y="72" fontSize="12" fontFamily="JetBrains Mono, monospace" fill="rgba(228,228,238,0.6)">expected category  =  "fresh produce"  ·  category mismatch</text>
        <g transform="translate(580, 46)">
          <rect x="0" y="0" width="120" height="30" rx="3" fill="rgba(232,42,174,0.15)" stroke="#E82AAE" strokeWidth="1" />
          <text x="60" y="19" textAnchor="middle" fontSize="10" fontFamily="var(--font-display)" fontWeight="700" fill="#FFF" letterSpacing="0.1em">CATEGORY MISMATCH</text>
        </g>
      </g>

      {/* ── Fusion verdict ── */}
      <g transform="translate(40, 376)">
        <rect x="0" y="0" width="720" height="48" rx="4" fill="rgba(232,42,174,0.08)" stroke="#E82AAE" strokeWidth="1.5" strokeDasharray="6 4" />
        <g transform="translate(14, 14)">
          <path d="M 10 0 L 20 20 L 0 20 Z" fill="#E82AAE" />
          <text x="10" y="16" textAnchor="middle" fontSize="13" fontFamily="var(--font-display)" fontWeight="700" fill="#0A0A12">!</text>
        </g>
        <text x="52" y="21" fontSize="11" fontFamily="var(--font-display)" fontWeight="700" letterSpacing="0.12em" fill="#E82AAE">FUSION  ·  TICKET-SWITCH PATTERN  ·  2 OF 3 FEEDS MISMATCH</text>
        <text x="52" y="38" fontSize="11" fontFamily="JetBrains Mono, monospace" fill="rgba(228,228,238,0.75)">POS says £1.20 apples   ·   scale says 1.42 kg   ·   vision says beef joint</text>
        <text x="706" y="30" textAnchor="end" fontSize="13" fontFamily="var(--font-display)" fontWeight="700" fill="#E82AAE">risk 86</text>
      </g>
    </svg>
  );
}

function SceneCartWalkout() {
  return (
    <svg className="lp-cctv-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="wo-floor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1A1A28" />
          <stop offset="100%" stopColor="#0A0A12" />
        </linearGradient>
      </defs>
      {/* Floor */}
      <rect x="0" y="300" width="800" height="150" fill="url(#wo-floor)" />
      {/* Exit doorway frame */}
      <rect x="250" y="50"  width="12"  height="340" fill="#2A2A3E" />
      <rect x="538" y="50"  width="12"  height="340" fill="#2A2A3E" />
      <rect x="250" y="50"  width="300" height="14"  fill="#2A2A3E" />
      {/* Door panels — open */}
      <rect x="262" y="64"  width="130" height="326" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <rect x="408" y="64"  width="130" height="326" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* EAS antennae with pulsing alert rings */}
      <g transform="translate(256,80)">
        <rect width="4" height="250" fill="#E82AAE" />
        <circle cx="2" cy="0" r="12" fill="none" stroke="#E82AAE" strokeWidth="2">
          <animate attributeName="r" values="8;18;8" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>
      <g transform="translate(544,80)">
        <rect width="4" height="250" fill="#E82AAE" />
        <circle cx="2" cy="0" r="12" fill="none" stroke="#E82AAE" strokeWidth="2">
          <animate attributeName="r" values="8;18;8" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>
      {/* Cart silhouette mid-walkout */}
      <g transform="translate(360,210)">
        <rect x="10" y="0" width="100" height="70" fill="rgba(200,200,220,0.1)" stroke="rgba(255,255,255,0.35)" strokeWidth="2" rx="3" />
        {/* Cart wire lines */}
        <line x1="10" y1="18" x2="110" y2="18" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="10" y1="36" x2="110" y2="36" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <line x1="10" y1="54" x2="110" y2="54" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {/* Contents — vague shapes */}
        <rect x="18" y="-20" width="24" height="22" fill="rgba(200,120,90,0.6)" />
        <rect x="48" y="-28" width="28" height="30" fill="rgba(90,140,180,0.5)" />
        <rect x="82" y="-14" width="22" height="16" fill="rgba(180,160,90,0.6)" />
        {/* Handle */}
        <line x1="108" y1="0" x2="130" y2="-10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" />
        {/* Wheels */}
        <circle cx="30"  cy="75" r="6" fill="#111" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <circle cx="100" cy="75" r="6" fill="#111" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      </g>
      {/* Customer silhouette pushing */}
      <g fill="rgba(40,40,55,0.85)">
        <circle cx="510" cy="180" r="22" />
        <path d="M 490 202 L 530 202 L 550 320 L 470 320 Z" />
        <rect x="500" y="240" width="18" height="60" fill="rgba(255,255,255,0.08)" />
      </g>
      {/* Bounding box around cart */}
      <g>
        <rect x="355" y="175" width="180" height="145" fill="none" stroke="#E82AAE" strokeWidth="2.5" rx="3">
          <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite" />
        </rect>
        <rect x="355" y="153" width="195" height="20" fill="rgba(10,10,18,0.92)" stroke="#E82AAE" strokeWidth="1" rx="2" />
        <text x="363" y="167" fontSize="11" fontFamily="var(--font-display)" fontWeight="500" fill="#FFF7FB">full cart · no POS match · 0.94</text>
      </g>
    </svg>
  );
}

function SceneSweethearting() {
  return (
    <svg className="lp-cctv-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sw-counter" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2A2A3A" />
          <stop offset="100%" stopColor="#12121C" />
        </linearGradient>
      </defs>
      {/* SCO machine body */}
      <rect x="240" y="240" width="320" height="180" fill="url(#sw-counter)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" rx="4" />
      {/* SCO screen */}
      <rect x="260" y="258" width="180" height="90" fill="#0E0E18" stroke="rgba(38,234,159,0.2)" strokeWidth="1" rx="2" />
      <rect x="266" y="264" width="110" height="6" fill="rgba(38,234,159,0.55)" />
      <rect x="266" y="276" width="150" height="4" fill="rgba(255,255,255,0.1)" />
      <rect x="266" y="284" width="120" height="4" fill="rgba(255,255,255,0.1)" />
      <rect x="266" y="292" width="90"  height="4" fill="rgba(255,255,255,0.1)" />
      {/* Scanner glass */}
      <rect x="460" y="258" width="85" height="90" fill="#1a1a2a" stroke="rgba(255,255,255,0.1)" strokeWidth="1" rx="2" />
      <path d="M 475 300 L 525 300" stroke="rgba(232,42,174,0.6)" strokeWidth="1.5" strokeDasharray="2 2">
        <animate attributeName="stroke-opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
      </path>
      {/* Ghost item crossing the scanner (the bypass) */}
      <g>
        <rect x="475" y="230" width="60" height="50" fill="rgba(200,200,220,0.2)" stroke="rgba(232,42,174,0.8)" strokeWidth="1.5" strokeDasharray="4 3" rx="3">
          <animate attributeName="x" values="480;520;480" dur="2.5s" repeatCount="indefinite" />
        </rect>
      </g>
      {/* Customer silhouette (left of machine) */}
      <g fill="rgba(40,40,55,0.9)">
        <circle cx="160" cy="200" r="25" />
        <path d="M 135 225 L 185 225 L 210 370 L 110 370 Z" />
      </g>
      {/* Colleague silhouette (right of machine, close) */}
      <g fill="rgba(60,60,80,0.85)">
        <circle cx="620" cy="210" r="22" />
        <path d="M 598 232 L 642 232 L 660 370 L 580 370 Z" />
        {/* Uniform hi-vis accent */}
        <rect x="596" y="248" width="48" height="14" fill="rgba(247,184,74,0.4)" />
      </g>
      {/* Bounding box around scanner + ghost item */}
      <g>
        <rect x="455" y="220" width="100" height="145" fill="none" stroke="#E82AAE" strokeWidth="2.5" rx="3">
          <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite" />
        </rect>
        <rect x="455" y="198" width="170" height="20" fill="rgba(10,10,18,0.92)" stroke="#E82AAE" strokeWidth="1" rx="2" />
        <text x="463" y="212" fontSize="11" fontFamily="var(--font-display)" fontWeight="500" fill="#FFF7FB">item bypass · no beep · 0.87</text>
      </g>
      {/* Secondary annotation for colleague proximity */}
      <g>
        <rect x="585" y="180" width="70" height="18" fill="rgba(10,10,18,0.9)" stroke="#F7B84A" strokeWidth="1" rx="2" />
        <text x="620" y="193" textAnchor="middle" fontSize="9.5" fontFamily="var(--font-display)" fill="#F7B84A">colleague &lt; 1m</text>
      </g>
    </svg>
  );
}

function SceneRefundPattern() {
  // For refund pattern we show a 30-day calendar of refund events (the frame concept doesn't apply)
  // 30 day cells · filled cells are refund events · colleague-shift-overlap zone highlighted
  const cells = Array.from({ length: 30 }, (_, i) => i);
  // Deterministic refund pattern — 17 refunds skewed to weekdays + specific shift overlap
  const refundDays = new Set([2, 3, 5, 7, 8, 9, 11, 13, 15, 16, 17, 19, 22, 23, 24, 26, 28]);
  return (
    <svg className="lp-cctv-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <text x="400" y="42" textAnchor="middle" fontSize="13" fontFamily="var(--font-display)" fontWeight="500" fill="rgba(228,228,238,0.65)" letterSpacing="0.14em">30-DAY REFUND PATTERN · CS DESK</text>
      {/* Day grid 6 × 5 */}
      {cells.map((d) => {
        const col = d % 6;
        const row = Math.floor(d / 6);
        const x = 150 + col * 85;
        const y = 80 + row * 65;
        const isRefund = refundDays.has(d);
        return (
          <g key={d}>
            <rect x={x} y={y} width={70} height={50} rx="3"
              fill={isRefund ? 'rgba(232,42,174,0.45)' : 'rgba(255,255,255,0.04)'}
              stroke={isRefund ? '#E82AAE' : 'rgba(255,255,255,0.08)'}
              strokeWidth="1" />
            <text x={x + 6} y={y + 13} fontSize="9" fontFamily="var(--font-display)" fill="rgba(228,228,238,0.5)">D{d + 1}</text>
            {isRefund && <text x={x + 35} y={y + 34} textAnchor="middle" fontSize="14" fontFamily="var(--font-display)" fontWeight="700" fill="#FFF">£</text>}
          </g>
        );
      })}
      {/* Colleague-shift overlap annotation */}
      <rect x="135" y="70" width="605" height="340" fill="none" stroke="#F7B84A" strokeWidth="1.5" strokeDasharray="5 4" rx="4" opacity="0.7" />
      <text x="148" y="60" fontSize="10" fontFamily="var(--font-display)" fontWeight="700" fill="#F7B84A" letterSpacing="0.1em">ALL WITHIN 2H SHIFT OVERLAP · SAME COLLEAGUE</text>
      {/* Count annotation */}
      <g transform="translate(620,410)">
        <rect x="0" y="-14" width="170" height="20" fill="rgba(232,42,174,0.16)" stroke="#E82AAE" strokeWidth="1" rx="3" />
        <text x="85" y="0" textAnchor="middle" fontSize="11" fontFamily="var(--font-display)" fontWeight="700" fill="#FFF">17 refunds · £642 exposure</text>
      </g>
    </svg>
  );
}

function RefundHeatmap() {
  // Extra detail panel under the scene for refund pattern
  return null; // annotation already in the scene
}
