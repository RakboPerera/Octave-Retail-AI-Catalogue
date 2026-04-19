import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import Explain from '../../components/ui/Explain.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './StoreCopilot.css';

// A fictional Monday 07:45 at store LDS-014 (Leeds City).
// Each item carries a priority decomposition so buyers see WHY it ranked where it did.
// Weighted priority = 0.40·safety + 0.30·revenue + 0.20·compliance + 0.10·customer
// 12 signals shown · 43 triaged since 06:00
const INBOX = [
  { id: 'i1',  t: '07:14', icon: 'Thermometer',          source: 'Temp monitor', severity: 'crit', title: 'Chilled fridge 3B · excursion to 8.2°C for 46 min',  detail: 'Target range 1–5°C. Threshold breached overnight. Potentially affecting 2 aisles of chilled dairy.',
    prio: { safety: 95, revenue: 82, compliance: 90, customer: 40, total: 85 } },
  { id: 'i2',  t: '06:52', icon: 'Truck',                 source: 'Delivery mgr', severity: 'high', title: 'Frozen trailer late by 90 min',       detail: 'Driver ETA 09:00. Impact on frozen replen before open.',
    prio: { safety: 20, revenue: 78, compliance: 30, customer: 55, total: 43 } },
  { id: 'i3',  t: '07:02', icon: 'UserX',                 source: 'WFM',           severity: 'high', title: '2 absences on fresh counter shift',   detail: 'Mia + Dan called in. Fresh counter coverage below minimum until 14:00.',
    prio: { safety: 30, revenue: 66, compliance: 45, customer: 72, total: 48 } },
  { id: 'i4',  t: '05:40', icon: 'AlertTriangle',         source: 'SCO event',     severity: 'med',  title: 'SCO 4 weight-error rate spiked 18%', detail: 'Sustained across Sun PM. Loss Prevention agent watching — likely scale calibration or specific SKU issue.', linked: 'loss-prevention',
    prio: { safety: 10, revenue: 42, compliance: 35, customer: 30, total: 27 } },
  { id: 'i5',  t: '07:21', icon: 'ClipboardCheck',        source: 'Compliance',    severity: 'high', title: 'Allergen audit due by 17:00',        detail: 'Weekly (PPDS lines, Natasha\'s Law) allergen label audit overdue. Must be signed off today.',
    prio: { safety: 55, revenue: 25, compliance: 98, customer: 35, total: 53 } },
  { id: 'i6',  t: '06:11', icon: 'PackageX',              source: 'Stock file',    severity: 'med',  title: '12 SKUs OOS over weekend',            detail: '£420 est. lost sales. Bread, ready meals, crisps. 4 in back-stock.',
    prio: { safety: 5, revenue: 62, compliance: 15, customer: 48, total: 28 } },
  { id: 'i7',  t: '06:58', icon: 'MessageSquareWarning',  source: 'Customer',      severity: 'med',  title: 'Viral TikTok re: price integrity', detail: 'Customer filmed promo label vs till error on Sat. 240k views. PR flagged.',
    prio: { safety: 5, revenue: 45, compliance: 40, customer: 92, total: 33 } },
  { id: 'i8',  t: '07:35', icon: 'Sparkles',              source: 'Cleaning',      severity: 'low',  title: 'Aisle 7 spill reported',              detail: 'Reported by opening team. Low traffic until 10:00.',
    prio: { safety: 35, revenue: 5, compliance: 20, customer: 22, total: 22 } },
  { id: 'i9',  t: '07:05', icon: 'ShieldAlert',            source: 'Loss prev',    severity: 'high', title: 'Repeat offender alert',               detail: 'Known shoplifter on premise. Matched on in-store coffee concession camera at 07:03.',
    prio: { safety: 70, revenue: 45, compliance: 30, customer: 10, total: 49 },
    notes: 'Biometric flag based on prior-incident list, not face-match; lawful basis = LIA; subject-rights route published. Do not approach. Observe-and-record policy; escalate via LP desk.' },
  { id: 'i10', t: '06:40', icon: 'Megaphone',              source: 'Promo',         severity: 'low',  title: 'Wk-15 promo launch — meal deal £4',   detail: 'POS, signage and app banners go live 10:00. Confirm POS uploaded.',
    prio: { safety: 2, revenue: 35, compliance: 12, customer: 35, total: 17 } },
  { id: 'i11', t: '07:40', icon: 'ScrollText',             source: 'Exec brief',   severity: 'low',  title: 'COO visit Thursday 10:00',            detail: 'Region pre-brief template shared. Needs your signed photos + KPI note.',
    prio: { safety: 2, revenue: 8, compliance: 25, customer: 12, total: 9 } },
  { id: 'i12', t: '06:22', icon: 'CheckCircle2',           source: 'WFM',           severity: 'low',  title: '6 colleagues clocked in early',       detail: 'Good news — above plan. Reallocate to fresh counter cover?',
    prio: { safety: 0, revenue: 28, compliance: 5, customer: 15, total: 11 } }
];

// 12 signals arriving from 11 distinct source systems (Temp monitor, Delivery mgr,
// WFM [×2], SCO event, Compliance, Stock file, Customer, Cleaning, Loss prev, Promo, Exec brief).

const SEV_RANK = { crit: 0, high: 1, med: 2, low: 3 };

const ACTION_LIST = [
  { t: '07:45', who: 'You',              what: 'Shut & isolate fridge 3B. Move dairy to 2A. Call engineer.',                 signal: 'i1', window: 'Now · 15 min' },
  { t: '07:50', who: 'Asst. Mgr · Dan',  what: 'Move Priya from front-of-store to fresh counter. Rope Mia replacement by 09:30.', signal: 'i3', window: '07:50 · 30 min' },
  { t: '08:15', who: 'Loss Prev · Tom',  what: 'Brief team on repeat-offender. Issue a soft-floor-walk pattern.',             signal: 'i9', window: '08:15 · 10 min' },
  { t: '09:00', who: 'Receiving · Lee',  what: 'Hold frozen replen on arrival. Agent prepared delivery variance form.',       signal: 'i2', window: '09:00 · 20 min' },
  { t: '10:00', who: 'Compliance · You', what: 'Sign off allergen audit. Agent prepared the form with evidence pinned.',      signal: 'i5', window: '10:00 · 25 min' },
  { t: '14:00', who: 'CX · Sofia',       what: 'Reply to viral TikTok with brand-approved tone + refund process link.',        signal: 'i7', window: '14:00 · 10 min' }
];

const HUDDLE = `**Good morning team. Three things.**

1. **Chilled fridge 3B is isolated** — please do not restock from it. Dairy has been moved to 2A. Engineer ETA 10:30.
2. **Fresh counter is short** — Priya moves across from front at 08:00. Dan, please chase agency for Mia cover by 09:30.
3. **Repeat offender on-floor** — Tom is briefing the LP team at 08:15. Floor-walk pattern Aisle 4 → 7 → 12. Be alert, don't approach.

**Win of the morning:** 6 colleagues clocked in early — let's put them to good use on the fresh counter and aisle 7 spill.

Safety first. Each other second. Customers third — because one and two are the fuel.`;

const TRACE_STEPS = [
  { type: 'tool', label: 'pull_signals(store=LDS-014, window=12h)', body: '43 signals triaged since 06:00 from 11 source systems; 12 highest-priority surfaced.', confidence: 0.98 },
  { type: 'plan', label: 'Rank by safety / compliance / revenue exposure; respect store policy hierarchy.', body: 'Weights: 0.40 safety · 0.30 revenue · 0.20 compliance · 0.10 customer (editable in store-ops config).' },
  { type: 'guardrail', label: 'Policy gate · chilled excursion must surface as safety-critical regardless of model score.', gateStatus: 'pass', body: 'Fridge 3B (8.2°C for 46 min) bypasses ranker; auto-pinned to top of inbox per store food-safety policy.' },
  { type: 'tool', label: 'build_day_plan(labour, tasks, SLAs)',    body: 'Day-plan drafted with 6 time-boxed actions against available colleagues.', confidence: 0.86 },
  { type: 'tool', label: 'draft_huddle_script(tone="calm, direct")', body: 'Morning huddle script ready in brand voice.', confidence: 0.82 },
  { type: 'tool', label: 'prefill_forms(compliance, variance)',      body: 'Allergen audit form and delivery variance pre-populated with evidence links.' },
  { type: 'guardrail', label: 'Repeat-offender alert · LIA check.', gateStatus: 'review', body: 'Biometric flag uses prior-incident list, not face-match; lawful basis = Legitimate Interests Assessment. Brief prompts LP, not customer approach.' },
  { type: 'hitl', label: 'Awaiting store manager sign-off on compliance submission.', body: 'Allergen audit (PPDS / Natasha\'s Law) cannot auto-submit — requires named signatory.' },
  { type: 'result', label: 'Store manager brief delivered to tablet.',    body: 'Actions assigned, forms ready, huddle ready to read. 2.1h of admin saved before open.' }
];

export default function StoreCopilot({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Store Copilot"
          signals={[
            { id: 'wfm',    label: 'Workforce mgmt',  icon: 'Users', detail: 'Shift patterns, absences, early clock-ins — pulled from Kronos / Quinyx.' },
            { id: 'temp',   label: 'Temperature logs', icon: 'Thermometer', detail: 'Fridge / freezer telemetry with excursion windows.' },
            { id: 'ops',    label: 'Ops telemetry',    icon: 'Activity', detail: 'SCO events, POS health, delivery manifests, cleaning reports.' },
            { id: 'cust',   label: 'Customer & PR',    icon: 'MessageSquareWarning', detail: 'Social + complaints feed filtered to this store.' },
            { id: 'comp',   label: 'Compliance',       icon: 'ClipboardCheck', detail: 'Audits, allergen records, due dates and sign-offs.' }
          ]}
          tools={[
            { id: 'plan',   label: 'Day planner',      icon: 'ListTodo', detail: 'Time-boxes actions against labour availability and SLAs.' },
            { id: 'huddle', label: 'Huddle writer',    icon: 'Megaphone', detail: 'Drafts the morning script in your brand\'s tone.' },
            { id: 'forms',  label: 'Form prefill',     icon: 'FileSignature', detail: 'Pre-populates compliance + variance forms with context and evidence.' },
            { id: 'comms',  label: 'Comms drafter',    icon: 'Send', detail: 'Drafts Teams / WhatsApp messages to the right colleague, in brand voice.' }
          ]}
          actions={[
            { id: 'brief',   label: 'Manager tablet brief', icon: 'Tablet', detail: 'One screen, prioritised, with one-tap delegation.' },
            { id: 'slack',   label: 'Team messages',        icon: 'MessageCircle', detail: 'Delegations pushed with context to the right person.' },
            { id: 'comp',    label: 'Compliance sign-off',  icon: 'CheckCircle2', detail: 'Evidence-backed forms ready for approval in one tap.' }
          ]}
        />
      }
      demo={
        <DemoShell
          title="Monday 07:45 · Leeds City (LDS-014)"
          subtitle="The 12 highest-priority of 43 overnight signals, ordered by composite score. The Copilot triages, plans the day, pre-writes the huddle and prefills compliance — before the manager\'s second coffee."
        >
          {({ playing, runKey }) => <StoreCopilotDemo playing={playing} runKey={runKey} />}
        </DemoShell>
      }
      technicalDetail={
        <ModelCard
          architecture="Signal ingestion + rule-weighted priority scorer + structured LLM for huddle script generation"
          trainingWindow="18 months of triage decisions across pilot cluster · 140k signals"
          lastRetrain="2026-04-05 (2 weeks ago)"
          accuracy="Priority-ranking alignment with senior managers · 87%"
          accuracyLabel="manager agreement"
          features={28}
          driftStatus="stable"
          notes="Policy weights (0.4 safety / 0.3 revenue / 0.2 compliance / 0.1 customer) are editable in the store-ops config — not hardcoded. Any override logs into the audit trail with reasons."
        />
      }
      extraSections={
        <section className="ap-section">
          <div className="container">
            <div className="ap-section-head">
              <span className="eyebrow">Catalogue ROI · measured outcomes</span>
              <h2 className="ap-section-title">Store Copilot · headline numbers.</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Manager admin</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>-2.1h/day</div>
              </div>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Compliance</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>+18pp</div>
              </div>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Process shrink</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>-22%</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', lineHeight: 1.4 }}>Date-code misses, rotation errors, mis-scans. <Link to="/agent/loss-prevention" style={{ color: 'var(--accent)' }}>Malicious shrink</Link> owned separately.</div>
              </div>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Time-to-value</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>10 weeks</div>
              </div>
            </div>
            <p style={{ marginTop: '18px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55, borderLeft: '2px solid var(--border-strong)', paddingLeft: '14px' }}>
              <b style={{ color: 'var(--text)' }}>Shrink attribution.</b> Store Copilot owns <i>process shrink</i> — waste driven by date-code misses, rotation failures, mis-scans at manned till, and wrong-SKU replenishment. Malicious shrink (ticket-switch, SCO fraud, sweethearting) is owned by the <Link to="/agent/loss-prevention" style={{ color: 'var(--accent)' }}>Loss Prevention agent</Link>. The two do not double-count: pilot P&L attribution runs off a shared shrink ledger with event-level lineage.
            </p>
          </div>
        </section>
      }
    />
  );
}

function StoreCopilotDemo({ playing, runKey }) {
  const [phase, setPhase] = useState('idle'); // idle, ingest, triage, plan
  const [planRevealed, setPlanRevealed] = useState(0);
  const [showHuddle, setShowHuddle] = useState(false);

  useEffect(() => {
    setPhase('idle');
    setPlanRevealed(0);
    setShowHuddle(false);
  }, [runKey]);

  useEffect(() => {
    if (!playing) return;
    const timers = [];
    timers.push(setTimeout(() => setPhase('ingest'), 300));
    timers.push(setTimeout(() => setPhase('triage'), 2200));
    timers.push(setTimeout(() => setPhase('plan'), 4400));
    ACTION_LIST.forEach((_, i) => {
      timers.push(setTimeout(() => setPlanRevealed(i + 1), 4800 + i * 400));
    });
    timers.push(setTimeout(() => setShowHuddle(true), 4800 + ACTION_LIST.length * 400 + 300));
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey]);

  const ordered = [...INBOX].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);

  return (
    <div className="sc-grid">
      <div className="sc-main">
        {/* Inbox */}
        <div className="sc-inbox">
          <div className="sc-inbox-head">
            <div>
              <span className="eyebrow">Overnight inbox</span>
              <div className="sc-inbox-sub">12 signals shown · 43 triaged since 06:00 · window 19:00 → 07:45</div>
            </div>
            <div className="sc-triage-state">
              {phase === 'idle' && <span className="tag tag-muted">Waiting</span>}
              {phase === 'ingest' && <span className="tag">Ingesting</span>}
              {(phase === 'triage' || phase === 'plan') && <span className="tag">Triaged</span>}
            </div>
          </div>

          <div className="sc-inbox-list">
            {(phase === 'triage' || phase === 'plan' ? ordered : INBOX).map((m) => {
              const Icon = Icons[m.icon] || Icons.Circle;
              return (
                <motion.div
                  key={m.id}
                  className={`sc-item sc-item-${m.severity}`}
                  layout
                  transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 28 }}
                >
                  <div className="sc-item-icon"><Icon size={15} /></div>
                  <div className="sc-item-body">
                    <div className="sc-item-head">
                      <span className="sc-item-time">{m.t}</span>
                      <span className="sc-item-src">{m.source}</span>
                      <Explain
                        title={`Priority ${m.prio.total} · decomposition`}
                        factors={[
                          { label: 'Safety',     weight: m.prio.safety / 100 * 0.4 },
                          { label: 'Revenue',    weight: m.prio.revenue / 100 * 0.3 },
                          { label: 'Compliance', weight: m.prio.compliance / 100 * 0.2 },
                          { label: 'Customer',   weight: m.prio.customer / 100 * 0.1 }
                        ]}
                        dataSource="Store policy weights · 0.4 safety + 0.3 revenue + 0.2 compliance + 0.1 customer"
                        wide
                        inline
                      >
                        <span className={`sc-item-sev sc-item-sev-${m.severity}`}>{m.severity.toUpperCase()} · {m.prio.total}</span>
                      </Explain>
                    </div>
                    <div className="sc-item-title">{m.title}</div>
                    <div className="sc-item-detail">{m.detail}</div>
                    {m.linked && (
                      <Link to={`/agent/${m.linked}`} className="sc-item-link">
                        <Icons.Link2 size={10} /> See Loss Prevention Agent for the case file
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Day plan */}
        <div className="sc-plan">
          <div className="sc-plan-head">
            <span className="eyebrow">Your day · Monday</span>
            <span className="voc-count">{planRevealed} of {ACTION_LIST.length} planned</span>
          </div>
          <div className="sc-plan-list">
            <AnimatePresence>
              {ACTION_LIST.slice(0, planRevealed).map((a, i) => (
                <motion.div
                  key={i}
                  className="sc-plan-row"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="sc-plan-time">{a.t}</span>
                  <div className="sc-plan-body">
                    <div className="sc-plan-what">{a.what}</div>
                    <div className="sc-plan-meta">
                      <span><Icons.User size={11} /> {a.who}</span>
                      <span><Icons.Clock size={11} /> {a.window}</span>
                      <span><Icons.Link2 size={11} /> Signal #{a.signal}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {!planRevealed && <div className="sc-plan-empty">Actions appear once the inbox is triaged.</div>}
          </div>
        </div>

        {/* Huddle */}
        <div className="sc-huddle">
          <div className="sc-huddle-head">
            <span className="eyebrow">Morning huddle script</span>
            <span className="voc-count">Read aloud · 90 seconds</span>
          </div>
          <div className="sc-huddle-body">
            {!showHuddle && <div className="sc-huddle-empty"><Icons.Megaphone size={22} /><span>Script is drafted after the plan is set.</span></div>}
            {showHuddle && (
              <motion.pre
                className="sc-huddle-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >{HUDDLE}</motion.pre>
            )}
          </div>
        </div>
      </div>

      <div className="sc-side">
        <ReasoningTrace steps={TRACE_STEPS} playing={playing} speed={1.2} />
      </div>
    </div>
  );
}
