import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import Explain from '../../components/ui/Explain.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './VoC.css';

// Fictional UK grocery reviews drawn from a mix of Trustpilot / app store tone.
const REVIEWS = [
  { id: 'r1',  theme: 'delivery',  sentiment: -1, source: 'Trustpilot', stars: 2, text: 'Driver turned up 45 min late, no call, no apology. Bread squashed.' },
  { id: 'r2',  theme: 'freshness', sentiment: -1, source: 'App',        stars: 1, text: 'Strawberries already mouldy out of the punnet. Had to bin them.' },
  { id: 'r3',  theme: 'staff',     sentiment: +1, source: 'Google',     stars: 5, text: 'Sadie on the deli counter was lovely — took time to help Mum pick.' },
  { id: 'r4',  theme: 'checkout',  sentiment: -1, source: 'Trustpilot', stars: 2, text: 'Self-checkout asking for age-check on a kid\'s yoghurt. Bizarre.' },
  { id: 'r5',  theme: 'price',     sentiment: -1, source: 'X / Twitter',    stars: 2, text: 'Shelf said £1.20, till charged £1.40 on the muffins. Sharp practice.' },
  { id: 'r6',  theme: 'delivery',  sentiment: +1, source: 'App',        stars: 5, text: 'Slot was bang on, driver was kind, substitutions sensible. Thank you.' },
  { id: 'r7',  theme: 'freshness', sentiment: -1, source: 'Google',     stars: 2, text: 'Chicken two days off its date. Will check labels next time.' },
  { id: 'r8',  theme: 'price',     sentiment: -1, source: 'App',        stars: 3, text: 'Multi-buy didn\'t apply at till. Third time this month.' },
  { id: 'r9',  theme: 'staff',     sentiment: -1, source: 'Trustpilot', stars: 2, text: 'Nobody on the fresh meat counter at 11am on Saturday. Dead trade.' },
  { id: 'r10', theme: 'checkout',  sentiment: -1, source: 'Google',     stars: 1, text: 'Card reader down on 6 out of 10 tills. Queue chaos.' },
  { id: 'r11', theme: 'freshness', sentiment: -1, source: 'App',        stars: 2, text: 'Milk sour on delivery, a day before the date.' },
  { id: 'r12', theme: 'delivery',  sentiment: -1, source: 'Trustpilot', stars: 1, text: 'Missed the slot entirely. Rescheduled without asking me.' },
  { id: 'r13', theme: 'staff',     sentiment: +1, source: 'Google',     stars: 5, text: 'The bakery team set aside a loaf for me when I called. Good people.' },
  { id: 'r14', theme: 'price',     sentiment: -1, source: 'App',        stars: 3, text: 'Redwell Rewards price and normal price swapped on shelf edge label.' },
  { id: 'r15', theme: 'freshness', sentiment: -1, source: 'Trustpilot', stars: 2, text: 'Bag of salad brown inside within 24h. Not great.' },
  { id: 'r16', theme: 'checkout',  sentiment: +1, source: 'App',        stars: 4, text: 'Scan-as-you-shop is smoother than the big competitor. Keep it.' },
  { id: 'r17', theme: 'delivery',  sentiment: -1, source: 'X / Twitter',    stars: 2, text: 'Three subs I didn\'t want, none of them labelled at the door.' },
  { id: 'r18', theme: 'staff',     sentiment: -1, source: 'Trustpilot', stars: 1, text: 'Manager refused a clear price error, was rude with it.' },
  { id: 'r19', theme: 'price',     sentiment: -1, source: 'App',        stars: 2, text: 'Promo ended yesterday but still on the shelf edge today.' },
  { id: 'r20', theme: 'freshness', sentiment: -1, source: 'Google',     stars: 2, text: 'Cod smelled off on the day of delivery. Refunded without fuss to be fair.' },
  { id: 'r21', theme: 'checkout',  sentiment: -1, source: 'Trustpilot', stars: 2, text: 'SCO weight error kept flagging my coffee. 6 minutes of life back please.' },
  { id: 'r22', theme: 'delivery',  sentiment: +1, source: 'App',        stars: 5, text: 'Driver waited while I ran down. Proper service.' },
  { id: 'r23', theme: 'staff',     sentiment: -1, source: 'Google',     stars: 3, text: 'Two staff chatting, none restocking the rolls. Busy Saturday.' },
  { id: 'r24', theme: 'price',     sentiment: -1, source: 'App',        stars: 2, text: 'Meal deal price mismatch twice this fortnight. Trust is eroding.' }
];

const THEMES = [
  { id: 'delivery',  label: 'Delivery reliability', color: '#26EA9F', cx: 22, cy: 28, severity: { volume: 70, recency: 82, sentiment: 64, risk: 54 } },
  { id: 'freshness', label: 'Fresh quality',        color: '#E82AAE', cx: 75, cy: 22, severity: { volume: 86, recency: 78, sentiment: 80, risk: 76 } },
  { id: 'staff',     label: 'Staff & service',      color: '#8A7DF7', cx: 18, cy: 72, severity: { volume: 55, recency: 60, sentiment: 50, risk: 38 } },
  { id: 'checkout',  label: 'Checkout friction',    color: '#F7B84A', cx: 50, cy: 60, severity: { volume: 62, recency: 68, sentiment: 58, risk: 42 } },
  { id: 'price',     label: 'Price integrity',      color: '#F74A7D', cx: 78, cy: 72, severity: { volume: 80, recency: 94, sentiment: 86, risk: 92 } }
];

const ACTIONS = [
  { id: 'a1', theme: 'price',     priority: 'Critical', owner: 'Pricing Ops', sla: '48h', title: 'Reconcile ESL→POS price sync across Leeds City cluster',
    detail: '7 stores showing persistent shelf vs till mismatches. Muffins, multi-buys and Redwell Rewards all implicated. Root cause: ESL refresh window.',
    evidence: ['r5', 'r8', 'r14', 'r19', 'r24'],
    rootCause: 'PIM→POS price-push cycle (2 min) outrunning ESL gateway refresh (18 min) — ESLs showing stale price during the gap.' },
  { id: 'a2', theme: 'freshness', priority: 'High',     owner: 'Fresh Buying', sla: '7d', title: 'Shorten berry shelf-life contract with N-Kent supplier',
    detail: '6 complaints in 48h on punnet mould. Cross-ref POS shows chilled-chain breach · 8.4°C for 47 min (FSA threshold 8°C) at 02:40 on Thu. Renegotiate tolerance.',
    evidence: ['r2', 'r11', 'r15', 'r20'],
    rootCause: 'Cold-chain telemetry flagged 8.4°C excursion (40 min window) at Distribution Centre 02:40 Thu — timing aligns with 6 of 10 fresh-quality complaints.' },
  { id: 'a3', theme: 'delivery',  priority: 'High',     owner: 'Last-mile',    sla: '7d', title: 'Revise substitution consent flow in app',
    detail: 'Most "bad sub" complaints stem from no pre-delivery confirmation. Push UX test for explicit opt-in per category.',
    evidence: ['r1', 'r12', 'r17'],
    opsSignal: 'App telemetry · sub-consent toggle = global · no category-level toggle event since v4.12',
    rootCause: 'App sub-consent is a global toggle · subs is the top-3 theme this week across the 2,117-item pool (n=186 mentions); only 3 in the 24 shown here.' }
];

const TRACE_STEPS = [
  { type: 'tool', label: 'ingest_feedback(sources=4, window=48h)', body: '2,117 raw items from Trustpilot, Google, App stores, and X / Twitter · 24 representative shown.' },
  { type: 'think', label: 'De-duplicate near-identical complaints, strip PII.' },
  { type: 'tool', label: 'embed_and_cluster(semantic, k=auto)', body: '5 dominant themes · 2 weak signals noted for next pass.' },
  { type: 'think', label: 'Score severity: volume × recency × sentiment × monetary-risk weighting.' },
  { type: 'tool', label: 'link_to_ops_signals(price_errors, cold_chain, SCO_events)', body: 'Cross-referenced with live ops data — 2 clusters have a named root cause.' },
  { type: 'tool', label: 'compose_actions(owners, SLAs)', body: '3 action tickets drafted. Assigned to Pricing Ops, Fresh Buying, Last-mile.' },
  { type: 'result', label: 'Summary + 3 tickets pushed to the exec brief and Jira.', body: 'Complaint-to-action cycle closed in under 30 minutes.' }
];

export default function VoC({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="VoC Analyst"
          signals={[
            { id: 'reviews', label: 'Reviews & ratings', icon: 'Star', detail: 'Trustpilot, Google, App Store, Play Store — refreshed every 15 minutes.' },
            { id: 'social',  label: 'Social & DMs',      icon: 'Hash', detail: 'X / Twitter, Facebook and Instagram mentions — filtered to branded surface.' },
            { id: 'csat',    label: 'Contact centre',    icon: 'Phone', detail: 'Call transcripts, chat and email tickets — PII scrubbed at ingestion.' },
            { id: 'ops',     label: 'Ops telemetry',     icon: 'Activity', detail: 'Price sync, cold-chain, SCO event streams — used to find root causes, not just themes.' }
          ]}
          tools={[
            { id: 'dedup',   label: 'Dedup & PII strip', icon: 'Filter', detail: 'Near-duplicate detection + regex + ML redaction for names, addresses, card numbers.' },
            { id: 'cluster', label: 'Theme clustering',  icon: 'Group', detail: 'Hybrid embedding + density-based clustering (HDBSCAN) with manual theme guardrails.' },
            { id: 'score',   label: 'Severity scoring',  icon: 'Gauge', detail: 'Weights: volume, recency, sentiment, monetary risk.' },
            { id: 'ticket',  label: 'Action writer',     icon: 'PenLine', detail: 'Drafts the action ticket with owner, SLA, root cause and exit criteria.' }
          ]}
          actions={[
            { id: 'brief',  label: 'Daily exec brief',   icon: 'FileBarChart', detail: '1-page summary into the COO and CMO inbox by 07:00.' },
            { id: 'jira',   label: 'Jira / ServiceNow',  icon: 'Ticket', detail: 'Tickets routed to the right team with root-cause evidence attached.' },
            { id: 'cx',     label: 'Customer loop',      icon: 'Reply', detail: 'Template-assisted responses back to affected customers when resolved.' }
          ]}
        />
      }
      demo={
        <DemoShell
          title="2,117 pieces of feedback, 5 themes, 3 action tickets — in 26 minutes."
          subtitle="Watch representative reviews shuffle into themes, then see the agent compose and route the action tickets."
        >
          {({ playing, runKey }) => <VoCDemo playing={playing} runKey={runKey} />}
        </DemoShell>
      }
      technicalDetail={
        <ModelCard
          architecture="Sentence-embedding (BGE-large) + HDBSCAN clustering + LLM ticket composer"
          trainingWindow="Weekly theme re-fit on last 90 days · model frozen per retailer"
          lastRetrain="2026-04-14 (5 days ago)"
          accuracy="Purity vs human-labelled gold set · 0.88"
          accuracyLabel="cluster purity"
          features={18}
          driftStatus="stable"
          notes="Every action ticket cites its evidence reviews AND a cross-referenced operational signal — so the root cause, not just the symptom, is actionable. Multi-language support (EN/CY/PL/UR); Trustpilot bot-filter via origin-domain and review-velocity heuristics. Repeat-complaints measurement: -38% is the 12-week post-launch reduction vs a matched-store control arm (16 intervention stores, 16 controls, matched on size, format, catchment and baseline complaint volume). Baseline = 2.4 repeat complaints per 1,000 weekly shoppers (pre-launch 12-week average). TTV 6 weeks."
        />
      }
    />
  );
}

// Deterministic pseudo-random in [-1, 1] from a seed string — keeps positions
// stable across renders while feeling organic.
function hashJitter(seed, salt = 0) {
  let h = 0;
  const str = seed + ':' + salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return ((h & 0xffff) / 0xffff) * 2 - 1;
}

// Precompute review layout positions (initial scatter, final cluster with jitter).
const LAYOUT = REVIEWS.map((r) => {
  const theme = THEMES.find((t) => t.id === r.theme);
  const initX = 50 + hashJitter(r.id, 0) * 42;
  const initY = 50 + hashJitter(r.id, 1) * 42;
  const finalX = theme.cx + hashJitter(r.id, 2) * 7;
  const finalY = theme.cy + hashJitter(r.id, 3) * 9;
  return { ...r, initX, initY, finalX, finalY, color: theme.color };
});

function VoCDemo({ playing, runKey }) {
  const [phase, setPhase] = useState('idle'); // idle -> ingest -> cluster -> score -> actions
  const [revealedActions, setRevealedActions] = useState(0);
  const [hoverTheme, setHoverTheme] = useState(null);

  useEffect(() => {
    setPhase('idle');
    setRevealedActions(0);
  }, [runKey]);

  useEffect(() => {
    if (!playing) return;
    const timers = [];
    timers.push(setTimeout(() => setPhase('ingest'), 300));
    timers.push(setTimeout(() => setPhase('cluster'), 2000));
    timers.push(setTimeout(() => setPhase('score'), 4600));
    timers.push(setTimeout(() => setPhase('actions'), 6200));
    ACTIONS.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedActions(i + 1), 6600 + i * 500));
    });
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey]);

  const themeCounts = THEMES.reduce((acc, t) => {
    acc[t.id] = REVIEWS.filter((r) => r.theme === t.id).length;
    return acc;
  }, {});

  const clustered = phase === 'cluster' || phase === 'score' || phase === 'actions';
  const scored = phase === 'score' || phase === 'actions';

  return (
    <div className="voc-grid">
      <div className="voc-main">
        {/* ===== 2D Embedding canvas — reviews migrate into theme clusters ===== */}
        <div className="voc-canvas-wrap">
          <div className="voc-canvas-head">
            <div>
              <span className="eyebrow">2D semantic embedding · 2,117 items projected · 24 shown</span>
              <div className="voc-canvas-sub">Each dot is a review. Position = semantic similarity. Colour = cluster the agent assigned.</div>
            </div>
            <div className="voc-phase">
              <span className={`voc-phase-chip ${phase === 'idle' ? 'is-on' : ''}`}>Idle</span>
              <span className={`voc-phase-chip ${phase === 'ingest' ? 'is-on' : ''}`}>Ingesting</span>
              <span className={`voc-phase-chip ${phase === 'cluster' ? 'is-on' : ''}`}>Clustering</span>
              <span className={`voc-phase-chip ${phase === 'score' || phase === 'actions' ? 'is-on' : ''}`}>Scoring</span>
            </div>
          </div>

          <div className="voc-canvas">
            <div className="voc-canvas-grid" aria-hidden="true" />

            {/* Theme cluster halos — fade in when clustered */}
            {THEMES.map((t) => (
              <motion.div
                key={t.id}
                className="voc-halo"
                style={{ left: `${t.cx}%`, top: `${t.cy}%`, '--c': t.color }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: clustered ? (hoverTheme && hoverTheme !== t.id ? 0.15 : 0.5) : 0, scale: clustered ? 1 : 0.6 }}
                transition={{ duration: 0.7, delay: clustered ? 0.2 : 0 }}
                onMouseEnter={() => setHoverTheme(t.id)}
                onMouseLeave={() => setHoverTheme(null)}
              />
            ))}

            {/* Review dots */}
            {LAYOUT.map((r, i) => {
              const dim = hoverTheme && hoverTheme !== r.theme;
              return (
                <motion.div
                  key={r.id}
                  className="voc-dot"
                  animate={{
                    left: `${clustered ? r.finalX : r.initX}%`,
                    top:  `${clustered ? r.finalY : r.initY}%`,
                    opacity: phase === 'idle' ? 0 : dim ? 0.15 : 1,
                    scale: phase === 'idle' ? 0.2 : 1,
                    backgroundColor: clustered ? r.color : '#6B6B85'
                  }}
                  transition={{
                    duration: 0.9,
                    delay: phase === 'ingest' ? (i % 24) * 0.02 : phase === 'cluster' ? (i % 24) * 0.015 : 0,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  title={`${r.source} · ${r.stars}★ · "${r.text.slice(0, 40)}..."`}
                />
              );
            })}

            {/* Theme labels — appear when clustered */}
            {THEMES.map((t) => {
              const count = themeCounts[t.id];
              return (
                <motion.div
                  key={t.id}
                  className="voc-theme-label"
                  style={{ left: `${t.cx}%`, top: `${t.cy}%`, '--c': t.color }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: clustered ? 1 : 0, y: clustered ? 0 : 6 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  onMouseEnter={() => setHoverTheme(t.id)}
                  onMouseLeave={() => setHoverTheme(null)}
                >
                  <span className="voc-theme-dot" />
                  <span>{t.label}</span>
                  <span className="voc-theme-count">{count}</span>
                </motion.div>
              );
            })}

            {/* Emerging signal callout */}
            {scored && (
              <motion.div
                className="voc-emerging"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Icons.TrendingUp size={12} />
                <span><b>Emerging</b> · Price-integrity cluster growing <b>+34% DoD</b> (48h ingestion window)</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* ===== Theme severity decomposition ===== */}
        <div className="voc-sev">
          <div className="voc-sev-head">
            <span className="eyebrow">Severity decomposition</span>
            <span className="voc-count">volume × recency × sentiment × £-risk</span>
          </div>
          <div className="voc-sev-grid">
            {THEMES.map((t) => (
              <motion.div
                key={t.id}
                className="voc-sev-row"
                style={{ '--theme-color': t.color }}
                animate={{ opacity: scored ? 1 : 0.2 }}
                transition={{ duration: 0.4 }}
                onMouseEnter={() => setHoverTheme(t.id)}
                onMouseLeave={() => setHoverTheme(null)}
              >
                <div className="voc-sev-label">
                  <span className="voc-sev-dot" />
                  <span>{t.label}</span>
                </div>
                <div className="voc-sev-stack">
                  {[
                    { k: 'volume',    v: t.severity.volume,    c: 'rgba(38, 234, 159, 0.8)' },
                    { k: 'recency',   v: t.severity.recency,   c: 'rgba(138, 125, 247, 0.8)' },
                    { k: 'sentiment', v: t.severity.sentiment, c: 'rgba(247, 184, 74, 0.8)' },
                    { k: 'risk',      v: t.severity.risk,      c: 'rgba(232, 42, 174, 0.9)' }
                  ].map((s) => (
                    <motion.div
                      key={s.k}
                      className="voc-sev-seg"
                      style={{ background: s.c }}
                      initial={{ width: 0 }}
                      animate={{ width: scored ? `${s.v / 4}%` : 0 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      title={`${s.k}: ${s.v}`}
                    />
                  ))}
                </div>
                <span className="voc-sev-total">{scored ? Math.round((t.severity.volume + t.severity.recency + t.severity.sentiment + t.severity.risk) / 4) : '—'}</span>
              </motion.div>
            ))}
          </div>
          <div className="voc-sev-legend">
            <span><i style={{ background: 'rgba(38, 234, 159, 0.8)' }} /> Volume</span>
            <span><i style={{ background: 'rgba(138, 125, 247, 0.8)' }} /> Recency</span>
            <span><i style={{ background: 'rgba(247, 184, 74, 0.8)' }} /> Sentiment</span>
            <span><i style={{ background: 'rgba(232, 42, 174, 0.9)' }} /> £-risk</span>
          </div>
        </div>

        {/* Actions */}
        <div className="voc-actions">
          <div className="voc-actions-head">
            <span className="eyebrow">Action tickets</span>
            <span className="voc-count">{revealedActions} / {ACTIONS.length} drafted</span>
          </div>
          <div className="voc-actions-grid">
            <AnimatePresence>
              {ACTIONS.slice(0, revealedActions).map((a, i) => (
                <motion.div
                  key={a.id}
                  className="voc-action"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <div className="voc-action-head">
                    <span className={`voc-action-pri voc-action-pri-${a.priority.toLowerCase()}`}>{a.priority}</span>
                    <span className="voc-action-sla"><Icons.Timer size={12} /> {a.sla}</span>
                  </div>
                  <h4 className="voc-action-title">{a.title}</h4>
                  <p className="voc-action-detail">{a.detail}</p>
                  <div className="voc-action-provenance">
                    <div className="voc-prov-head">
                      <Icons.Fingerprint size={11} />
                      <span>Grounded in {a.evidence.length} reviews · root cause linked</span>
                    </div>
                    <div className="voc-prov-list">
                      {a.evidence.map((rid) => {
                        const r = REVIEWS.find((x) => x.id === rid);
                        if (!r) return null;
                        return (
                          <div key={rid} className="voc-prov-item" title={r.text}>
                            <span className="voc-prov-src">{r.source}</span>
                            <span className="voc-prov-text">"{r.text.slice(0, 60)}{r.text.length > 60 ? '…' : ''}"</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="voc-prov-root"><Icons.Zap size={11} /> Root cause: {a.rootCause}</div>
                  </div>
                  <div className="voc-action-foot">
                    <span><Icons.User size={11} /> {a.owner}</span>
                    <span><Icons.GitBranch size={11} /> Routed to Jira</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {!revealedActions && <div className="voc-actions-empty">Tickets appear once themes are scored.</div>}
          </div>
        </div>
      </div>

      <div className="voc-side">
        <ReasoningTrace steps={TRACE_STEPS} playing={playing} speed={1.2} />
      </div>
    </div>
  );
}

