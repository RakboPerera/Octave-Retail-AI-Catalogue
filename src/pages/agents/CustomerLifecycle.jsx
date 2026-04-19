import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area } from 'recharts';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import Gloss from '../../components/ui/Gloss.jsx';
import Explain from '../../components/ui/Explain.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './CustomerLifecycle.css';

const LIFECYCLE_STAGES = [
  { id: 'new',       label: 'New' },
  { id: 'growing',   label: 'Growing' },
  { id: 'peak',      label: 'Peak' },
  { id: 'lapsing',   label: 'Lapsing' },
  { id: 'lost',      label: 'Lost' }
];

// Offer templates (used across customers; agent picks the right one)
const OFFERS = [
  { id: 'fiver',   name: '£5 off next £40 shop',          category: 'Value'      },
  { id: 'free_del',name: 'Free delivery for a month',      category: 'Service'    },
  { id: 'pts_2x',  name: '2× member points this week',     category: 'Rewards'    },
  { id: 'unlock',  name: 'Unlock premium wine range',      category: 'Discovery'  },
  { id: 'early',   name: 'Early-access: summer launch',    category: 'Status'     },
  { id: 'bounce',  name: '£10 bounce-back coupon on next 2 shops', category: 'Win-back' }
];

const CUSTOMERS = [
  {
    id: 'sarah', name: 'Sarah M.', age: 34, clv: '£4,820',
    summary: 'Family of 4 · Leeds · 3yr Redwell Rewards · weekly shop',
    lifecycle: 'lapsing', lifecycleIdx: 3, previousIdx: 2,
    rfm: { r: 4, f: 3, m: 5 },
    churnRisk: 0.47, churnRiskLabel: 'P(lost | no action) · 30d',
    signal: { label: 'Visit-frequency drop · sustained 4w', z: -2.3, week: 'W-4' },
    // 12-week weekly behaviour: basket £ and visit count
    behaviour: [
      { w: 'W-12', basket: 78, visits: 4 },
      { w: 'W-11', basket: 82, visits: 4 },
      { w: 'W-10', basket: 75, visits: 4 },
      { w: 'W-9',  basket: 80, visits: 5 },
      { w: 'W-8',  basket: 77, visits: 4 },
      { w: 'W-7',  basket: 79, visits: 4 },
      { w: 'W-6',  basket: 74, visits: 4 },
      { w: 'W-5',  basket: 76, visits: 3 },
      { w: 'W-4',  basket: 78, visits: 2 },
      { w: 'W-3',  basket: 80, visits: 2 },
      { w: 'W-2',  basket: 72, visits: 3 },
      { w: 'W-1',  basket: 74, visits: 2 }
    ],
    propensity: [
      { id: 'fiver',    uplift: 6.2, respRate: 0.24, incRev: 48, note: 'High fit: value-sensitive household, basket size >£40 regularly.' },
      { id: 'free_del', uplift: 3.4, respRate: 0.18, incRev: 28, note: 'Moderate fit: already pays for delivery occasionally.' },
      { id: 'pts_2x',   uplift: 0.8, respRate: 0.06, incRev: 7,  note: 'Weak fit: past 2× point offers poorly engaged.' },
      { id: 'unlock',   uplift: 1.2, respRate: 0.05, incRev: 18, note: 'Weak fit: low premium-category propensity.' },
      { id: 'early',    uplift: 0.4, respRate: 0.03, incRev: 5,  note: 'Poor fit: no status-seeking behaviour.' },
      { id: 'bounce',   uplift: 4.1, respRate: 0.19, incRev: 32, note: 'Reasonable: works if she skips next shop too.' }
    ],
    pickedOffer: 'fiver',
    offerCompose: {
      channel: 'SMS',
      sendTime: 'Thu 18:04',
      sendWhy: 'She opens 73% of SMS between 17:00–19:00 on weekdays.',
      copy: 'Hi Sarah — we\'ve missed seeing you! Here\'s £5 off your next £40 shop at Redwell, valid until Sunday. Show this code at the till: SRH-5O40',
      abArm: 'Treatment (vs generic-voucher control)',
      expectedRevenue: 48
    }
  },
  {
    id: 'james', name: 'James T.', age: 27, clv: '£340',
    summary: 'New member · 8 weeks in · basket climbing · breadth expanding',
    lifecycle: 'growing', lifecycleIdx: 1, previousIdx: 0,
    rfm: { r: 5, f: 3, m: 2 },
    churnRisk: 0.08, churnRiskLabel: 'P(peak | intervene) · 60d',
    signal: { label: 'Category breadth expanding · wine + bakery added', z: +1.9, week: 'W-3' },
    behaviour: [
      { w: 'W-8',  basket: 38, visits: 1 },
      { w: 'W-7',  basket: 22, visits: 1 },
      { w: 'W-6',  basket: 42, visits: 1 },
      { w: 'W-5',  basket: 28, visits: 1 },
      { w: 'W-4',  basket: 32, visits: 1 },
      { w: 'W-3',  basket: 41, visits: 1 },
      { w: 'W-2',  basket: 38, visits: 1 },
      { w: 'W-1',  basket: 52, visits: 1 }
    ],
    propensity: [
      { id: 'fiver',    uplift: 1.6, respRate: 0.12, incRev: 9,  note: 'Low: not price-driven at this stage.' },
      { id: 'free_del', uplift: 5.8, respRate: 0.26, incRev: 22, note: 'High: clear "convenience-seeking" signal.' },
      { id: 'pts_2x',   uplift: 2.4, respRate: 0.14, incRev: 11, note: 'Medium: new member, rewards activate loyalty.' },
      { id: 'unlock',   uplift: 7.4, respRate: 0.31, incRev: 38, note: 'Strong fit: just started buying wine — expand breadth.' },
      { id: 'early',    uplift: 4.2, respRate: 0.22, incRev: 21, note: 'Works: status appeal for new cohort.' },
      { id: 'bounce',   uplift: 0.6, respRate: 0.04, incRev: 3,  note: 'Poor fit: not lapsing.' }
    ],
    pickedOffer: 'unlock',
    offerCompose: {
      channel: 'App push',
      sendTime: 'Sat 09:12',
      sendWhy: 'Saturday morning is his peak grocery-planning window (app opens).',
      copy: 'You\'re in. A curated case of 6 English wines is unlocked in your app — hand-picked by our buying team based on what you\'ve been enjoying. Tap to explore.',
      abArm: 'Treatment (vs no-intervention control)',
      expectedRevenue: 38
    }
  },
  {
    id: 'priya', name: 'Priya R.', age: 52, clv: '£42,680',
    summary: '12yr member · weekly shop · top-decile CLV · premium-own-brand loyal',
    lifecycle: 'peak', lifecycleIdx: 2, previousIdx: 2,
    rfm: { r: 5, f: 5, m: 5 },
    churnRisk: 0.04, churnRiskLabel: 'P(lost | no action) · 90d',
    signal: { label: 'Stable · no behavioural change detected', z: 0.2, week: '—' },
    behaviour: [
      { w: 'W-12', basket: 142, visits: 4 },
      { w: 'W-11', basket: 138, visits: 4 },
      { w: 'W-10', basket: 144, visits: 4 },
      { w: 'W-9',  basket: 140, visits: 4 },
      { w: 'W-8',  basket: 135, visits: 4 },
      { w: 'W-7',  basket: 148, visits: 5 },
      { w: 'W-6',  basket: 142, visits: 4 },
      { w: 'W-5',  basket: 139, visits: 4 },
      { w: 'W-4',  basket: 145, visits: 4 },
      { w: 'W-3',  basket: 141, visits: 4 },
      { w: 'W-2',  basket: 143, visits: 4 },
      { w: 'W-1',  basket: 146, visits: 4 }
    ],
    propensity: [
      { id: 'fiver',    uplift: -0.4, respRate: 0.11, incRev: -3,  note: 'Avoid: £5 off cheapens a customer who doesn\'t need it.' },
      { id: 'free_del', uplift: 0.6,  respRate: 0.08, incRev: 4,   note: 'Neutral: already pays for it happily.' },
      { id: 'pts_2x',   uplift: -0.2, respRate: 0.12, incRev: -1,  note: 'Negligible: protects budget without lifting loyalty.' },
      { id: 'unlock',   uplift: 1.8,  respRate: 0.14, incRev: 28,  note: 'Moderate: she appreciates curation.' },
      { id: 'early',    uplift: 4.6,  respRate: 0.38, incRev: 62,  note: 'Best fit: status + curation play to her profile.' },
      { id: 'bounce',   uplift: -1.2, respRate: 0.05, incRev: -8,  note: 'Avoid: implies she was lapsing — off-brand.' }
    ],
    pickedOffer: 'early',
    offerCompose: {
      channel: 'Email',
      sendTime: 'Tue 07:42',
      sendWhy: 'Opens email at breakfast — 72% open-rate for 07:00–08:00 Tue/Wed (vs 22% member avg).',
      copy: 'Priya — as one of our longest-standing members, you\'re among the first to preview our summer collection. Early access opens Friday, a week before general release. No code needed.',
      abArm: 'Treatment · preserve-and-deepen',
      expectedRevenue: 62
    }
  },
  {
    id: 'tom', name: 'Tom W.', age: 41, clv: '£2,110',
    summary: 'Lapsed 6 months after Jan service incident · first shop back last Saturday',
    lifecycle: 'growing', lifecycleIdx: 1, previousIdx: 4, lifecycleLabel: 're-activated',
    rfm: { r: 5, f: 1, m: 3 },
    churnRisk: 0.62, churnRiskLabel: 'P(re-lapse | no action) · 60d',
    signal: { label: 'Return detected · first shop since Oct', z: +3.1, week: 'W-1' },
    behaviour: [
      { w: 'W-12', basket: 0,  visits: 0 },
      { w: 'W-11', basket: 0,  visits: 0 },
      { w: 'W-10', basket: 0,  visits: 0 },
      { w: 'W-9',  basket: 0,  visits: 0 },
      { w: 'W-8',  basket: 0,  visits: 0 },
      { w: 'W-7',  basket: 0,  visits: 0 },
      { w: 'W-6',  basket: 0,  visits: 0 },
      { w: 'W-5',  basket: 0,  visits: 0 },
      { w: 'W-4',  basket: 0,  visits: 0 },
      { w: 'W-3',  basket: 0,  visits: 0 },
      { w: 'W-2',  basket: 0,  visits: 0 },
      { w: 'W-1',  basket: 64, visits: 1 }
    ],
    propensity: [
      { id: 'fiver',    uplift: 5.4, respRate: 0.22, incRev: 34, note: 'Solid: price nudge supports return.' },
      { id: 'free_del', uplift: 3.8, respRate: 0.18, incRev: 24, note: 'Useful: lower friction early.' },
      { id: 'pts_2x',   uplift: 1.4, respRate: 0.09, incRev: 8,  note: 'Okay: rewards re-engage long members.' },
      { id: 'unlock',   uplift: 0.9, respRate: 0.06, incRev: 7,  note: 'Poor fit: wrong moment for breadth.' },
      { id: 'early',    uplift: 0.2, respRate: 0.03, incRev: 2,  note: 'Off-timing for status play.' },
      { id: 'bounce',   uplift: 8.4, respRate: 0.34, incRev: 58, note: 'Best fit: covers next 2 shops — re-habituates.' }
    ],
    pickedOffer: 'bounce',
    offerCompose: {
      channel: 'Email + SMS reminder',
      sendTime: 'Mon 10:18',
      sendWhy: 'Plans weekly shop Mon morning — past 3 returns happened within 48h of Mon-morning touchpoint.',
      copy: 'Welcome back, Tom. To smooth the road home, here\'s £10 off each of your next two £50+ shops. Codes in your app. We\'ll SMS a reminder on Saturday.',
      abArm: 'Treatment · win-back ladder',
      expectedRevenue: 58
    }
  }
];

const TRACE_STEPS = (c) => [
  { type: 'tool',  label: `detect_behaviour_change(customer=${c.id}, window=12w)`, body: `${c.signal.label} · z-score ${c.signal.z > 0 ? '+' : ''}${c.signal.z}` },
  { type: 'tool',  label: 'compute_rfm(transactions)', body: `R=${c.rfm.r} · F=${c.rfm.f} · M=${c.rfm.m}` },
  { type: 'think', label: `Classify lifecycle stage. Previous: ${LIFECYCLE_STAGES[c.previousIdx].label}. Current: ${LIFECYCLE_STAGES[c.lifecycleIdx].label}.` },
  { type: 'tool',  label: 'predict_churn_risk(features)', body: `${c.churnRiskLabel} = ${(c.churnRisk * 100).toFixed(0)}%` },
  { type: 'tool',  label: 'check_consent', body: 'PECR soft opt-in verified · SMS channel allowed · frequency cap 2/week' },
  { type: 'tool',  label: 'score_offer_propensity(catalogue=28_offers)', body: `6 shortlisted, best = "${OFFERS.find(o => o.id === c.pickedOffer).name}" · uplift ${c.propensity.find(p => p.id === c.pickedOffer).uplift}pp` },
  { type: 'tool',  label: 'apply_channel_preference(consent, history)', body: `${c.offerCompose.channel} at ${c.offerCompose.sendTime}` },
  { type: 'tool',  label: 'compose_offer(brand_voice, legal_checks)', body: 'Copy drafted, brand-voice ✓, legal ✓, A/B arm assigned.' },
  { type: 'result', label: 'Offer dispatched.', body: `Expected incremental revenue £${c.offerCompose.expectedRevenue} over 30 days.` }
];

export default function CustomerLifecycle({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Customer Lifecycle Agent"
          signals={[
            { id: 'loyalty', label: 'Loyalty & transactions',  icon: 'CreditCard', detail: 'Every basket, every channel, every store. The truth-set for behaviour scoring.' },
            { id: 'visits',  label: 'Visit & basket telemetry', icon: 'Activity',  detail: 'App opens, web sessions, SCO taps, store entries (WiFi) — frequency signal.' },
            { id: 'engage',  label: 'Channel engagement',      icon: 'Mail',       detail: 'Email opens, SMS replies, push interactions — tells the agent what channels work per member.' },
            { id: 'affinity',label: 'Category affinity',       icon: 'Heart',      detail: 'Breadth and depth of categories bought — core indicator of life-stage.' },
            { id: 'consent', label: 'Consent & preferences',   icon: 'ShieldCheck',detail: 'Opt-in status per channel + frequency cap — hard constraints.' }
          ]}
          tools={[
            { id: 'rfm',     label: 'RFM segmenter',           icon: 'Layers',     detail: 'Recency × Frequency × Monetary — the classic 125-cell grid, updated daily.' },
            { id: 'cp',      label: 'Change-point detector',   icon: 'TrendingDown',detail: 'Bayesian change-point on weekly rollups — flags z ≥ |2| sustained ≥3 weeks.' },
            { id: 'churn',   label: 'Churn classifier',        icon: 'AlertTriangle',detail: 'Gradient-boosted model with time-aware features; SHAP output per prediction.' },
            { id: 'uplift',  label: 'Uplift model',            icon: 'Gauge',      detail: 'Causal uplift — predicts *incremental* response vs the control-group counterfactual.' },
            { id: 'catalog', label: 'Offer catalogue + rules', icon: 'BookOpen',   detail: '28 offers with margin, brand and legal rules. Agent picks from this, never invents.' },
            { id: 'chan',    label: 'Channel orchestrator',    icon: 'SendHorizontal', detail: 'Sends via email / SMS / app push with send-time optimisation and frequency capping.' }
          ]}
          actions={[
            { id: 'offer',   label: 'Personalised offer',       icon: 'Sparkles',   detail: 'Copy + code + channel + send-time, with A/B arm.' },
            { id: 'ab',      label: 'A/B arm assignment',       icon: 'GitCompareArrows', detail: 'Every send has a control counterpart — lifts measured weekly.' },
            { id: 'journey', label: 'Journey trigger',          icon: 'Workflow',   detail: 'Cascades into a multi-touch sequence if the first touch doesn\'t fire.' },
            { id: 'alert',   label: 'CX-team alert',            icon: 'UserCheck',  detail: 'VIP customers flagged to the care team for a human touch — not an auto-email.' }
          ]}
        />
      }
      demo={
        <DemoShell
          title="Four shoppers. Four lifecycles. Four very different next-best actions."
          subtitle="Pick a customer. Watch the agent read the behavioural signal, classify lifecycle, score offers by uplift (not just response rate) and compose the message."
        >
          {({ playing, runKey, onDone }) => <CustomerLifecycleDemo playing={playing} runKey={runKey} onDone={onDone} />}
        </DemoShell>
      }
      kpiChart={<CohortRetentionChart />}
      technicalDetail={
        <ModelCard
          architecture="Bayesian change-point detector + churn classifier (GBM) + causal uplift model · policy-guarded offer composer"
          trainingWindow="18 months of member behaviour · 14k prior offer sends for uplift calibration"
          lastRetrain="2026-04-17 (2 days ago)"
          accuracy="Lapse-prediction F1 · 0.83 · Offer-lift AUUC · 0.71"
          accuracyLabel="model quality"
          features={58}
          driftStatus="stable"
          notes="Uplift-scored — not response-scored. The agent picks offers by incremental lift vs a propensity-matched control, so budget goes to the customer who wouldn't buy anyway. Frequency caps and consent state are hard constraints. ROI: Incremental revenue / member +£42/yr · Offer redemption 24% · Campaign ROI 4.3× lift · TTV 10 weeks."
        />
      }
    />
  );
}

function CustomerLifecycleDemo({ playing, runKey, onDone }) {
  const [selected, setSelected] = useState(CUSTOMERS[0]);
  const [phase, setPhase] = useState('idle'); // idle, analysing, scored, composed

  // Stable steps identity per scenario — stops ReasoningTrace from restarting
  // on every parent re-render (phase transitions caused a visible flicker loop).
  const traceSteps = useMemo(() => TRACE_STEPS(selected), [selected.id]);

  useEffect(() => {
    setPhase('idle');
  }, [runKey, selected.id]);

  useEffect(() => {
    if (!playing) return;
    // Reset first so mid-play scenario switches restart cleanly from the beginning
    setPhase('idle');
    const timers = [];
    timers.push(setTimeout(() => setPhase('analysing'), 400));
    timers.push(setTimeout(() => setPhase('scored'), 2800));
    timers.push(setTimeout(() => setPhase('composed'), 5200));
    timers.push(setTimeout(() => onDone && onDone(), 6000));
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey, selected.id, onDone]);

  const showAnalysis = phase !== 'idle';
  const showScoring = phase === 'scored' || phase === 'composed';
  const showCompose = phase === 'composed';

  return (
    <div className="cl-grid">
      {/* Customer picker row */}
      <div className="cl-pick-row">
        {CUSTOMERS.map((c) => (
          <button
            key={c.id}
            className={`cl-pick ${selected.id === c.id ? 'cl-pick-on' : ''} cl-pick-${c.lifecycle}`}
            onClick={() => setSelected(c)}
          >
            <div className="cl-pick-top">
              <div className="cl-avatar">{c.name.split(' ').map(s => s[0]).join('')}</div>
              <div className="cl-pick-meta">
                <div className="cl-pick-name">{c.name} · {c.age}</div>
                <div className="cl-pick-sum">{c.summary}</div>
              </div>
            </div>
            <div className="cl-pick-tags">
              <span className={`cl-stage-tag cl-stage-${c.lifecycle}`}>{c.lifecycleLabel || LIFECYCLE_STAGES[c.lifecycleIdx].label}</span>
              <span className="cl-clv">CLV {c.clv}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="cl-body">
        <div className="cl-main">
          {/* Behaviour timeline */}
          <div className="cl-panel">
            <div className="cl-panel-head">
              <div>
                <span className="eyebrow">Behaviour · last 12 weeks</span>
                <div className="cl-panel-sub">Basket £ and visit count · change-points flagged</div>
              </div>
              <div className="cl-rfm">
                <span className="cl-rfm-label">
                  <Gloss term="RFM">RFM</Gloss>
                </span>
                <span className="cl-rfm-digits"><b>R</b>{selected.rfm.r}</span>
                <span className="cl-rfm-digits"><b>F</b>{selected.rfm.f}</span>
                <span className="cl-rfm-digits"><b>M</b>{selected.rfm.m}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={selected.behaviour} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="cl-basket-g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#26EA9F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#26EA9F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="w" stroke="#6B6B85" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <YAxis yAxisId="basket" stroke="#6B6B85" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `£${v}`} />
                <YAxis yAxisId="visits" orientation="right" stroke="#6B6B85" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                <Tooltip contentStyle={{ background: '#11111C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                {selected.signal.week !== '—' && (
                  <ReferenceLine yAxisId="visits" x={selected.signal.week} stroke="#E82AAE" strokeDasharray="3 3"
                    label={{ value: `change-point in visit frequency (z = ${selected.signal.z > 0 ? '+' : ''}${selected.signal.z})`, position: 'top', fill: '#E82AAE', fontSize: 10 }} />
                )}
                <Area  yAxisId="basket" type="monotone" dataKey="basket" stroke="#26EA9F" strokeWidth={2}   fill="url(#cl-basket-g)" name="Basket £" />
                <Bar   yAxisId="visits" dataKey="visits" fill="rgba(138,125,247,0.55)" radius={[2,2,0,0]} name="Visits" />
              </ComposedChart>
            </ResponsiveContainer>
            <Explain
              title={`Change-point · z = ${selected.signal.z > 0 ? '+' : ''}${selected.signal.z}`}
              factors={[
                { label: 'Signal strength (|z|)',      weight: Math.min(1, Math.abs(selected.signal.z) / 3) },
                { label: 'Sustained weeks (required ≥3)', weight: 0.75 },
                { label: 'Posterior (change vs noise)',   weight: 0.91 }
              ]}
              dataSource="Bayesian change-point on weekly visit-count rollups · detects z ≥ |2| sustained ≥ 3 weeks"
              counterfactual={`Modelled retention uplift if agent intervenes this week — based on the customer's current lifecycle risk. P(retained) = ${((1 - selected.churnRisk * 0.52) * 100).toFixed(0)}%.`}
              wide inline
            >
              <div className="cl-signal">
                <Icons.Activity size={13} />
                <span>{selected.signal.label}</span>
              </div>
            </Explain>
          </div>

          {/* Lifecycle ladder */}
          <div className="cl-panel">
            <div className="cl-panel-head">
              <div>
                <span className="eyebrow">Lifecycle ladder</span>
                <div className="cl-panel-sub">Predicted trajectory · next 30–60 days</div>
              </div>
              <div className="cl-risk">
                <span className="cl-risk-label">{selected.churnRiskLabel}</span>
                <span className={`cl-risk-num ${selected.churnRisk > 0.3 ? 'cl-risk-high' : selected.churnRisk > 0.1 ? 'cl-risk-med' : 'cl-risk-low'}`}>
                  {(selected.churnRisk * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="cl-ladder">
              {LIFECYCLE_STAGES.map((s, i) => {
                const isCurrent = i === selected.lifecycleIdx;
                const isPrevious = i === selected.previousIdx && selected.previousIdx !== selected.lifecycleIdx;
                return (
                  <div key={s.id} className={`cl-ladder-step ${isCurrent ? 'cl-ladder-current' : ''} ${isPrevious ? 'cl-ladder-previous' : ''}`}>
                    <div className="cl-ladder-dot" />
                    <div className="cl-ladder-label">{s.label}</div>
                    {isCurrent && (
                      <motion.div
                        className={`cl-ladder-avatar cl-ladder-avatar-${selected.lifecycle}`}
                        layoutId={`avatar-${selected.id}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        {selected.name.split(' ').map(s => s[0]).join('')}
                      </motion.div>
                    )}
                  </div>
                );
              })}
              {/* Predicted trajectory arrow */}
              {showAnalysis && (
                <PredictionArrow customer={selected} />
              )}
            </div>
          </div>

          {/* Propensity grid + Compose */}
          <div className="cl-two">
            <div className="cl-panel">
              <div className="cl-panel-head">
                <div>
                  <span className="eyebrow">Offer propensity · incremental uplift</span>
                  <div className="cl-panel-sub">Uplift (not response rate) — predicts *incremental* lift vs control</div>
                </div>
              </div>
              <div className="cl-propensity">
                {selected.propensity.map((p, i) => {
                  const offer = OFFERS.find((o) => o.id === p.id);
                  const isBest = p.id === selected.pickedOffer;
                  const pct = Math.max(0, (p.uplift + 2) / 12); // map roughly -2..+10 to 0..1
                  return (
                    <motion.div
                      key={p.id}
                      className={`cl-prop-row ${isBest ? 'cl-prop-best' : ''}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: showScoring ? 1 : 0.25, x: 0 }}
                      transition={{ duration: 0.35, delay: showScoring ? i * 0.08 : 0 }}
                      title={p.note}
                    >
                      <div className="cl-prop-label">
                        <span className="cl-prop-cat">{offer.category}</span>
                        <span className="cl-prop-name">{offer.name}</span>
                      </div>
                      <div className="cl-prop-track">
                        <motion.div
                          className={`cl-prop-fill ${p.uplift < 0 ? 'is-neg' : ''}`}
                          initial={{ width: 0 }}
                          animate={{ width: showScoring ? `${Math.min(100, pct * 100)}%` : 0 }}
                          transition={{ duration: 0.6, delay: showScoring ? i * 0.08 : 0 }}
                        />
                      </div>
                      <span className={`cl-prop-uplift ${p.uplift < 0 ? 'is-neg' : 'is-pos'}`}>
                        {p.uplift > 0 ? '+' : ''}{p.uplift.toFixed(1)}pp
                      </span>
                      {isBest && showScoring && <Icons.Check size={14} className="cl-prop-check" />}
                    </motion.div>
                  );
                })}
              </div>
              {showScoring && (
                <div className="cl-prop-expl">
                  <Icons.Info size={11} />
                  <span>{selected.propensity.find((p) => p.id === selected.pickedOffer).note}</span>
                </div>
              )}
            </div>

            {/* Composed offer — phone-like preview */}
            <div className="cl-panel cl-compose-panel">
              <div className="cl-panel-head">
                <div>
                  <span className="eyebrow">Composed offer</span>
                  <div className="cl-panel-sub">Channel · copy · send time · A/B arm</div>
                </div>
              </div>
              {!showCompose && (
                <div className="cl-compose-empty">
                  <Icons.MessageSquare size={24} />
                  <span>The agent writes the offer once it's scored the catalogue.</span>
                </div>
              )}
              {showCompose && (
                <motion.div
                  className="cl-compose"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="cl-compose-chans">
                    <span className="cl-compose-chan"><Icons.Smartphone size={12} /> {selected.offerCompose.channel}</span>
                    <span className="cl-compose-send"><Icons.Clock size={12} /> {selected.offerCompose.sendTime}</span>
                  </div>
                  <div className="cl-compose-bubble">{selected.offerCompose.copy}</div>
                  <div className="cl-compose-why">
                    <Icons.Brain size={11} /> {selected.offerCompose.sendWhy}
                  </div>
                  <div className="cl-compose-arm">
                    <span><Icons.GitCompareArrows size={11} /> {selected.offerCompose.abArm}</span>
                    <span className="cl-compose-rev">+£{selected.offerCompose.expectedRevenue} incremental / 30d</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Reasoning trace */}
        <div className="cl-side">
          <ReasoningTrace steps={traceSteps} playing={playing} speed={1.25} />
        </div>
      </div>
    </div>
  );
}

// Arrow from current stage to predicted next — direction and probability depend on customer
function PredictionArrow({ customer }) {
  // Always from current stage to the predicted "next" (lapsing moves to lost, growing to peak, etc.)
  const predictions = {
    lapsing: { toIdx: 4, p: customer.churnRisk, label: '→ Lost', colour: '#E82AAE' },
    growing: { toIdx: 2, p: 0.74,               label: '→ Peak', colour: '#26EA9F' },
    peak:    { toIdx: 2, p: 0.92,               label: '→ Hold', colour: '#26EA9F' },
    new:     { toIdx: 1, p: 0.68,               label: '→ Growing', colour: '#26EA9F' }
  };
  const pred = predictions[customer.lifecycle] || predictions.peak;
  const fromX = (customer.lifecycleIdx + 0.5) / 5 * 100;
  const toX   = (pred.toIdx + 0.5) / 5 * 100;
  const sameStage = customer.lifecycleIdx === pred.toIdx;
  return (
    <motion.div
      className="cl-ladder-pred"
      style={{
        left: `${Math.min(fromX, toX)}%`,
        width: `${Math.max(6, Math.abs(toX - fromX))}%`,
        '--pred-color': pred.colour
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="cl-ladder-pred-line" />
      <div className="cl-ladder-pred-label">
        {sameStage ? 'hold · ' : pred.label + ' · '}P = {pred.p.toFixed(2)}
      </div>
    </motion.div>
  );
}

// KPI chart: 90-day cohort retention — agent-treated vs control
function CohortRetentionChart() {
  const data = Array.from({ length: 13 }, (_, i) => {
    const w = i; // 0..12 weeks from cohort start
    // decay curves: control decays faster, treatment holds
    const control   = 100 * Math.exp(-w * 0.058);
    const treatment = 100 * Math.exp(-w * 0.028);
    return { w: `W${w}`, control: +control.toFixed(1), treatment: +treatment.toFixed(1) };
  });
  return (
    <div className="cl-kpi">
      <div className="cl-kpi-head">
        <span className="eyebrow">Lapsing-customer cohort retention · 90d</span>
        <div className="cl-kpi-legend">
          <span><i style={{ background: '#6B6B85' }} /> Control</span>
          <span><i style={{ background: '#26EA9F' }} /> Treated by agent</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -4 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="w" stroke="#6B6B85" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
          <YAxis domain={[40, 100]} stroke="#6B6B85" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `${v}%`} />
          <Tooltip contentStyle={{ background: '#11111C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}%`, '']} />
          <Line type="monotone" dataKey="control"   stroke="#6B6B85" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          <Line type="monotone" dataKey="treatment" stroke="#26EA9F" strokeWidth={2.5} dot={{ r: 3, fill: '#26EA9F' }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="cl-kpi-note">Gap at W12 = <b>+18pp retention</b> for the agent-treated cohort.</div>
    </div>
  );
}
