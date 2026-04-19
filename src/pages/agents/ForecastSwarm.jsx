import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart, ReferenceLine } from 'recharts';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import Explain from '../../components/ui/Explain.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './ForecastSwarm.css';

const SKUS = [
  { id: 'tea',   name: 'Yorkshire Tea 240-bag',      cluster: 'Ambient · Leeds cluster (18 stores)',  baseline: 4200, promo: true,  weatherNote: 'Mild outlook — hot-drink demand dampens ~4%' },
  { id: 'straw', name: 'British Strawberries 400g',  cluster: 'Fresh · pilot cluster (54 stores)',    baseline: 18600, baselineNote: '18,600 punnets/wk (pilot cluster · 54 stores)', promo: false, weatherNote: 'Warm week — demand surges ~22%' },
  { id: 'mince', name: 'Mince Pies 6-pack',          cluster: 'Seasonal · Nationwide (380 stores)',   baseline: 9400, promo: true,  weatherNote: 'Cold snap — seasonal boost ~5%' }
];

const SWARM = [
  { id: 'base',    label: 'Base Forecaster',     icon: 'TrendingUp',   tint: 'turquoise', job: 'Pulls 52w history + regional signal to set a baseline curve.' },
  { id: 'weather', label: 'Weather Adjuster',    icon: 'CloudSun',     tint: 'turquoise', job: 'Applies regional temperature and event weight to the baseline.' },
  { id: 'promo',   label: 'Promo Modeller',      icon: 'Percent',      tint: 'pink',      job: 'Reads promo calendar and models uplift by week, respecting cannibalisation.' },
  { id: 'replen',  label: 'Replenishment Planner', icon: 'Workflow',   tint: 'turquoise', job: 'Converts demand into a store-level PO plan respecting MOQ and trailer cube.' },
  { id: 'supp',    label: 'Supplier Negotiator', icon: 'Handshake',    tint: 'pink',      job: 'Drafts a supplier message that frames context, asks and fallback.' }
];

// Per-SKU history windows — used by the Base Forecaster sparkline
const HISTORY = {
  tea:   [3900, 4050, 4100, 3950, 4180, 4020, 4150, 4250, 4200, 4100, 4080, 4220, 4180, 4300, 4250, 4150, 4200, 4100, 4350, 4280, 4200, 4100, 4180, 4220],
  straw: [8200, 9100, 10800, 12400, 14500, 16800, 18600, 19200, 20100, 19800, 18400, 16200, 14100, 12400, 10200, 8600, 7400, 6800, 7200, 8400, 10200, 13400, 16800, 18600],
  mince: [2100, 2200, 2150, 2400, 2600, 2800, 3200, 3600, 4200, 5800, 7400, 8200, 8600, 9200, 10400, 11200, 8600, 4400, 2200, 2000, 2100, 2300, 2600, 9400]
};

// Weather scenarios — daily temp / 14-day forecast driving multiplier
const WEATHER = {
  tea:   { days: [9, 8, 10, 11, 12, 14, 15, 16, 14, 13, 12, 11, 10, 9],  multiplier: 0.96, note: 'mild → base -4%' },
  straw: { days: [14,16,18,20,22,24,26,27,28,26,23,21,19,17], multiplier: 1.22, note: 'warm week → +22%' },
  mince: { days: [12,10,8,6,4,2,1,0,-1,-2,0,2,4,6], multiplier: 1.05, note: 'cold snap → +5%' }
};

// Promo weeks + cannibalisation
const PROMOS = {
  tea:   { uplift: [ { wk: 3, lift: 20, mechanic: '20% off 240-bag' }, { wk: 4, lift: 18, mechanic: 'Round 2' } ], cannibal: [ { cat: 'Coffee (adjacent)', dampen: -4 } ] },
  straw: { uplift: [ ], cannibal: [] },
  mince: { uplift: [ { wk: 5, lift: 19, mechanic: 'Multi-buy bundle (mince + wine)' } ], cannibal: [ { cat: 'Brandy butter (halo)', dampen: +11 } ] }
};

// Replenishment plan — allocation across stores
const ALLOCATION = {
  tea:   { stores: [ { s: 'LDS-014', u: 720 }, { s: 'LDS-002', u: 640 }, { s: 'WKF-006', u: 540 }, { s: 'BRD-009', u: 420 }, { s: 'SHF-011', u: 380 }, { s: '…13 more', u: 1300 } ], cube: 74, units: 4000 },
  straw: { stores: [ { s: 'LDN-C01', u: 1400 }, { s: 'MAN-002', u: 1150 }, { s: 'BHM-003', u: 980 }, { s: 'GLA-004', u: 740 }, { s: '…376 more', u: 53730 } ], cube: 92, units: 57000 },
  mince: { stores: [ { s: 'LDN-C01', u: 680 }, { s: 'MAN-002', u: 610 }, { s: 'BHM-003', u: 510 }, { s: 'GLA-004', u: 460 }, { s: '…376 more', u: 11740 } ], cube: 68, units: 14000 }
};

// Per-SKU forecast adjustments layered week-by-week (weeks +1 to +8)
const CURVES = {
  tea: [
    { w: 'W+1', base: 4200, weather: 4050, promo: 4050, final: 4050, actual: 4280 },
    { w: 'W+2', base: 4250, weather: 4080, promo: 4080, final: 4080, actual: 4120 },
    { w: 'W+3', base: 4300, weather: 4120, promo: 4920, final: 4920, actual: null },
    { w: 'W+4', base: 4350, weather: 4160, promo: 5020, final: 5020, actual: null },
    { w: 'W+5', base: 4400, weather: 4190, promo: 4190, final: 4190, actual: null },
    { w: 'W+6', base: 4450, weather: 4230, promo: 4230, final: 4230, actual: null },
    { w: 'W+7', base: 4500, weather: 4260, promo: 4260, final: 4260, actual: null },
    { w: 'W+8', base: 4550, weather: 4290, promo: 4290, final: 4290, actual: null }
  ],
  straw: [
    { w: 'W+1', base: 18600, weather: 22300, promo: 22300, final: 22300, actual: 21980 },
    { w: 'W+2', base: 19200, weather: 25400, promo: 25400, final: 25400, actual: null },
    { w: 'W+3', base: 20100, weather: 29300, promo: 29300, final: 29300, actual: null },
    { w: 'W+4', base: 21000, weather: 30600, promo: 30600, final: 30600, actual: null },
    { w: 'W+5', base: 21800, weather: 29400, promo: 29400, final: 29400, actual: null },
    { w: 'W+6', base: 22200, weather: 26000, promo: 26000, final: 26000, actual: null },
    { w: 'W+7', base: 21500, weather: 23800, promo: 23800, final: 23800, actual: null },
    { w: 'W+8', base: 20300, weather: 21000, promo: 21000, final: 21000, actual: null }
  ],
  mince: [
    { w: 'W+1', base: 9400, weather: 9870, promo: 9870, final: 9870, actual: 9910 },
    { w: 'W+2', base: 11200, weather: 12000, promo: 12000, final: 12000, actual: null },
    { w: 'W+3', base: 15500, weather: 16300, promo: 20300, final: 20300, actual: null },
    { w: 'W+4', base: 22400, weather: 23500, promo: 28200, final: 28200, actual: null },
    { w: 'W+5', base: 28100, weather: 29100, promo: 34700, final: 34700, actual: null },
    { w: 'W+6', base: 26300, weather: 27200, promo: 32000, final: 32000, actual: null },
    { w: 'W+7', base: 16400, weather: 16900, promo: 16900, final: 16900, actual: null },
    { w: 'W+8', base: 5200, weather: 5400, promo: 5400, final: 5400, actual: null }
  ]
};

const SUPPLIER_MSG = {
  tea: `DRAFT · prepared by agent · awaiting buyer approval (no send)

Hi Simon,

Looking at Leeds-cluster forecast for W+1 to W+8. 20%-off promo running in W+3 and W+4 will pull an uplift of ~1,290 units above baseline (W+3: +620, W+4: +670).

**Ask:** Additional 1,290 units on top of standing order, split across W+2 and W+3 for a clean shelf.
**Constraints:** Existing case-pack (12) and trailer cube in place. Service level 98.5%.
**Fallback:** [DRAFT — requires commercial review] If W+3 upside is short, we can accept a 40% W+2 front-load in return for £0.04 / unit logistics share.

Pricing and case-pack unchanged. Happy to jump on a quick call to confirm.

Best,
Replenishment Agent · buying@redwell.co.uk`,
  straw: `DRAFT · prepared by agent · awaiting buyer approval (no send)

Hi Rachel,

Our forecast for British strawberries across the pilot cluster is +26% above baseline W+3-W+5 driven by the warm-week outlook.

**Ask:** Additional ~16,600 punnets above base across W+3 to W+5 (W+3 +6.0k, W+4 +6.3k, W+5 +4.3k), biasing to W+3.
**Constraints:** Max 4-day shelf life expected on chilled chain. [DRAFT — requires commercial review] Any punnets showing <3 days remaining at DC to be diverted to clearance.
**Fallback:** [DRAFT — requires commercial review] Short-date surplus to charity partner in Sheffield.

Would you confirm your North Kent and North Norfolk allocations by EOD Thursday?

— buying@redwell.co.uk`,
  mince: `DRAFT · prepared by agent · awaiting buyer approval (no send)

Hi Mark,

Mince pie season is building. Modelled peak is W+5 at ~34.7k units · overall 8-week programme +19% vs weekly base, in line with last year's peak.

**Ask:** Please confirm availability of an additional 6,600 6-packs for W+5 on top of standing allocation.
**Constraints:** We need a 5-day shelf-life minimum on receipt. [DRAFT — requires commercial review] Any short-date to be agreed at standard terms + 6%.
**Fallback:** W+4 front-load if W+5 is constrained.

Also flagging: mince-pie / brandy-butter halo — expect +11% uplift on butter line (complement) if the promo hits.

— buying@redwell.co.uk`
};

const TRACE_STEPS = (sku) => [
  { type: 'tool', label: 'pull_sku_history(52_weeks, demand, promos, weather)', body: `${sku.name}: 52 weeks of history loaded.`, confidence: 0.98 },
  { type: 'tool', label: 'base_forecast(ensemble=[arima, gbm, tft])',              body: 'Baseline curve committed · W+1 band ±8%, W+8 band ±48% (fresh).', confidence: 0.83 },
  { type: 'tool', label: 'apply_weather_model(regions, 14d_forecast)',            body: 'Temperature-sensitive uplift applied per region.', confidence: 0.79 },
  { type: 'tool', label: 'apply_promo_calendar(week, mechanic, depth)',           body: 'Promo uplift modelled with cannibalisation across substitute SKUs.', confidence: 0.76 },
  { type: 'guardrail', label: 'GSCOP compliance check on supplier asks.', gateStatus: 'pass', body: 'Proposed change respects Groceries Supply Code of Practice — no retrospective variation, reasonable notice on volume shift, no demand for marketing contribution outside contract.' },
  { type: 'tool', label: 'plan_replenishment(service_level=98.5, case=12)',        body: 'Store-level PO plan built against MOQ, case-pack and shelf-life.', confidence: 0.88 },
  { type: 'guardrail', label: 'Auto-exec threshold · variance ≤ 10% vs approved plan.', gateStatus: 'warn', body: 'PO variance 14.2% (above 10% auto-exec threshold). Routing to buyer for explicit approval.' },
  { type: 'negotiate', label: 'draft_supplier_message(tone, context, asks, fallback)', body: 'Supplier message drafted in buyer voice. DRAFT only — nothing sent.', confidence: 0.74 },
  { type: 'hitl', label: 'Buyer approval gate · 4-hour SLA.', body: 'Buyer can approve, edit or reject. Edits are fed back into the negotiator\'s training signal. No PO or supplier message is sent without a named buyer signing off.' },
  { type: 'result', label: 'Buyer review ready.', body: 'Forecast + PO + supplier message posted to buyer\'s inbox with editable drafts and full audit lineage.' }
];

export default function ForecastSwarm({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Replenishment Swarm"
          signals={[
            { id: 'hist',    label: '52w history',      icon: 'History', detail: 'Demand, returns, waste, price elasticity, promo response.' },
            { id: 'weather', label: 'Weather & events', icon: 'CloudSun', detail: '14-day forecast by region plus event calendar (bank holidays, half-terms, local events).' },
            { id: 'promo',   label: 'Promo calendar',   icon: 'Percent', detail: 'Planned mechanics, depths and media with cannibalisation vectors.' },
            { id: 'stock',   label: 'DC & store stock', icon: 'Package', detail: 'On-hand across DCs and stores, back-of-store, in-transit.' },
            { id: 'supp',    label: 'Supplier contracts', icon: 'FileText', detail: 'MOQ, lead times, case-pack, service level, penalty clauses.' }
          ]}
          tools={[
            { id: 'base',  label: 'Ensemble forecaster', icon: 'TrendingUp', detail: 'ARIMA + GBM + temporal-fusion model, weighted by per-category back-test.' },
            { id: 'plan',  label: 'Replenishment planner', icon: 'Workflow', detail: 'Respects case-pack, trailer cube, shelf-life, store format, service level.' },
            { id: 'comms', label: 'Negotiator drafter',  icon: 'Handshake', detail: 'Writes the supplier message in buyer voice, with asks and fallback.' },
            { id: 'audit', label: 'Audit writer',        icon: 'FileCheck', detail: 'Every decision + override logged for buyer and finance.' }
          ]}
          actions={[
            { id: 'po',   label: 'Draft PO',         icon: 'FilePlus', detail: 'Store-level PO draft awaiting buyer approval.' },
            { id: 'msg',  label: 'Supplier message', icon: 'Send',     detail: 'Drafted in buyer\'s voice, ready to be sent on approval.' },
            { id: 'bf',   label: 'Buyer brief',      icon: 'ClipboardList', detail: 'One-page narrative explaining why the forecast moved.' }
          ]}
          guardrails={[
            'Auto-exec only within ±10% of approved plan — everything else routes to buyer',
            'GSCOP compliance check on every supplier ask (no retrospective variation)',
            'Buyer approval SLA 4h — buyer edits flow back into the negotiator\'s training signal',
            'Nothing is sent to a supplier without a named human sign-off'
          ]}
        />
      }
      demo={
        <DemoShell
          title="Five specialist agents. One handoff chain. A draft PO and supplier message in under 90 seconds."
          subtitle="Pick an SKU. Hit Run. Watch the swarm light up in sequence — each agent's contribution visible on the forecast curve. Pipeline of specialist models with agent-level HITL gates between stages (not a live multi-agent debate)."
        >
          {({ playing, runKey, onDone }) => <ForecastSwarmDemo playing={playing} runKey={runKey} onDone={onDone} />}
        </DemoShell>
      }
      technicalDetail={
        <ModelCard
          architecture="Ensemble: ARIMA + gradient-boosted residuals + temporal-fusion transformer · weighted by per-category back-test"
          trainingWindow="52-week rolling window · retailer-specific · per-SKU fine-tune for A/B SKUs"
          lastRetrain="2026-04-12 (7 days ago) · nightly light refit"
          accuracy="Fresh MAPE 18.2% (store-SKU-week) (vs incumbent 27.4%); ambient 3.1% (chain-SKU-week)"
          accuracyLabel="forecast accuracy · 12-week rolling holdout"
          features={62}
          driftStatus="stable"
          notes="Evaluation harness: 12-week rolling holdout, weekly retrain, reported per lead-week W+1 through W+8 · stratified by category × region × promo arm. Baseline = retailer's incumbent planner (exponential smoothing + rule-based promo lift) over the same holdout. Confidence bands (P10/P90) widen with horizon — 8% at W+1 to 48% at W+8 (fresh) · 4% to 18% (ambient). Every agent in the swarm is independently auditable: overrides at any hand-off are logged with buyer + reason. New-line cold-start via analogue-matching (style+price+seasonality); 6-week stabilisation window."
        />
      }
    />
  );
}

function ForecastSwarmDemo({ playing, runKey, onDone }) {
  const [sku, setSku] = useState(SKUS[0]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dataState, setDataState] = useState('base'); // base, weather, promo, done
  const [showPo, setShowPo] = useState(false);
  const [showMsg, setShowMsg] = useState(false);

  // Stable steps identity per SKU — stops ReasoningTrace from restarting on
  // every parent re-render (activeIdx / dataState ticks caused a flicker loop).
  const traceSteps = useMemo(() => TRACE_STEPS(sku), [sku.id]);

  useEffect(() => {
    setActiveIdx(-1);
    setDataState('base');
    setShowPo(false);
    setShowMsg(false);
  }, [runKey, sku.id]);

  useEffect(() => {
    if (!playing) return;
    // Reset first so mid-play SKU switches restart cleanly from the beginning
    setActiveIdx(-1);
    setDataState('base');
    setShowPo(false);
    setShowMsg(false);
    const timers = [];
    // Each agent 'activates' in sequence
    SWARM.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveIdx(i), 300 + i * 1400));
    });
    timers.push(setTimeout(() => setDataState('weather'), 300 + 1 * 1400 + 500));
    timers.push(setTimeout(() => setDataState('promo'), 300 + 2 * 1400 + 500));
    timers.push(setTimeout(() => setShowPo(true), 300 + 3 * 1400 + 700));
    timers.push(setTimeout(() => setShowMsg(true), 300 + 4 * 1400 + 700));
    timers.push(setTimeout(() => setActiveIdx(-1), 300 + SWARM.length * 1400 + 1200));
    timers.push(setTimeout(() => onDone && onDone(), 300 + SWARM.length * 1400 + 1600));
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey, sku.id, onDone]);

  const curve = CURVES[sku.id];
  const total = curve.reduce((s, w) => s + w.final, 0);
  const uplift = Math.round(((curve.reduce((s, w) => s + w.final, 0) - curve.reduce((s, w) => s + w.base, 0)) / curve.reduce((s, w) => s + w.base, 0)) * 100);

  return (
    <div className="fs-wrap">
      {/* SKU picker */}
      <div className="fs-picker">
        <span className="eyebrow">SKU for this run</span>
        <div className="fs-picker-row">
          {SKUS.map((s) => (
            <button
              key={s.id}
              className={`fs-picker-item ${sku.id === s.id ? 'fs-picker-item-on' : ''}`}
              onClick={() => setSku(s)}
            >
              <div className="fs-picker-name">{s.name}</div>
              <div className="fs-picker-cluster">{s.cluster}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Swarm choreography — each agent has a live micro-viz */}
      <div className="fs-swarm">
        {SWARM.map((a, i) => {
          const Icon = Icons[a.icon] || Icons.Sparkles;
          const active = activeIdx === i;
          const done = activeIdx > i || (activeIdx === -1 && showPo);
          return (
            <div key={a.id} className={`fs-agent fs-agent-${a.tint} ${active ? 'fs-agent-active' : ''} ${done ? 'fs-agent-done' : ''}`}>
              <div className="fs-agent-top">
                <div className="fs-agent-icon"><Icon size={17} strokeWidth={1.6} /></div>
                <div className="fs-agent-body">
                  <div className="fs-agent-label">{a.label}</div>
                  <div className="fs-agent-job">{a.job}</div>
                </div>
              </div>
              <div className="fs-agent-viz">
                <AgentMicroViz agentId={a.id} sku={sku} active={active} done={done} />
              </div>
              {i < SWARM.length - 1 && <div className={`fs-edge ${activeIdx > i ? 'fs-edge-done' : ''}`} />}
            </div>
          );
        })}
      </div>

      {/* Holdout / backtest evidence — MAPE by lead week, agent vs incumbent */}
      <div style={{ marginTop: '18px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', background: 'rgba(38, 234, 159, 0.035)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>
            Holdout evidence
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            12-week rolling holdout · weekly retrain · stratified by category × region × promo arm · vs retailer incumbent (exp-smoothing + rule-based promo lift)
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '6px 10px', fontWeight: 500, fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '6px 10px', fontWeight: 500, fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>W+1</th>
                <th style={{ padding: '6px 10px', fontWeight: 500, fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>W+3</th>
                <th style={{ padding: '6px 10px', fontWeight: 500, fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>W+6</th>
                <th style={{ padding: '6px 10px', fontWeight: 500, fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>W+8</th>
                <th style={{ padding: '6px 10px', fontWeight: 500, fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Incumbent W+3</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Fresh (produce, bakery, meat)',   w1: '11.4%', w3: '16.1%', w6: '21.8%', w8: '24.7%', inc: '27.4%' },
                { cat: 'Chilled dairy',                    w1: '6.2%',  w3: '8.9%',  w6: '11.4%', w8: '12.8%', inc: '14.1%' },
                { cat: 'Ambient (packaged grocery)',       w1: '2.4%',  w3: '3.1%',  w6: '4.0%',  w8: '4.6%',  inc: '6.2%'  },
                { cat: 'Frozen',                           w1: '3.1%',  w3: '3.8%',  w6: '4.9%',  w8: '5.7%',  inc: '7.3%'  },
                { cat: 'Seasonal (e.g. mince pies)',       w1: '9.8%',  w3: '12.2%', w6: '16.7%', w8: '19.1%', inc: '22.5%' }
              ].map((row) => (
                <tr key={row.cat} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{row.cat}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{row.w1}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{row.w3}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{row.w6}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{row.w8}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>{row.inc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: '10px', fontSize: '0.76rem', color: 'var(--text-dim)', lineHeight: 1.55 }}>
          Figures are pilot-cluster MAPE on held-out weeks — we expect a further 1–3pp improvement once the retailer's promo-calendar + weather feeds are wired directly into the swarm.
        </p>
      </div>

      {/* Model accuracy chip — all figures from 12-week rolling holdout vs retailer's incumbent */}
      <div className="fs-accuracy">
        <div className="fs-acc-item">
          <Icons.Target size={13} />
          <span>Fresh MAPE 18.2%</span>
          <span className="fs-acc-sub">store-SKU-week · holdout vs incumbent 27.4%</span>
        </div>
        <div className="fs-acc-item">
          <Icons.Target size={13} />
          <span>Ambient MAPE 3.1%</span>
          <span className="fs-acc-sub">chain-SKU-week · holdout</span>
        </div>
        <div className="fs-acc-item">
          <Icons.BarChart3 size={13} />
          <span>P10-P90 band captures 82% of actuals</span>
          <span className="fs-acc-sub">target 80% · calibration check</span>
        </div>
        <div className="fs-acc-item">
          <Icons.GitCompare size={13} />
          <span>+9pp MAPE reduction</span>
          <span className="fs-acc-sub">vs retailer's incumbent planner (same holdout)</span>
        </div>
        <div className="fs-acc-item">
          <Icons.ShieldCheck size={13} />
          <span>Auto-exec &lt; thresholds</span>
          <span className="fs-acc-sub">human sign-off above</span>
        </div>
        <div className="fs-acc-item">
          <Icons.Trash2 size={13} />
          <span>Waste (fresh) -17%</span>
          <span className="fs-acc-sub">catalogue</span>
        </div>
        <div className="fs-acc-item">
          <Icons.AlertTriangle size={13} />
          <span>Buyer exception rate -64%</span>
          <span className="fs-acc-sub">catalogue</span>
        </div>
        <div className="fs-acc-item">
          <Icons.Timer size={13} />
          <span>TTV 16 weeks</span>
          <span className="fs-acc-sub">catalogue</span>
        </div>
      </div>

      {/* Forecast chart + trace */}
      <div className="fs-middle">
        <div className="fs-chart">
          <div className="fs-chart-head">
            <div>
              <span className="eyebrow">8-week demand forecast</span>
              <div className="fs-chart-sub">{sku.name} · {sku.cluster}</div>
            </div>
            <div className="fs-chart-stats">
              <div className="fs-stat"><span className="fs-stat-v">{Math.round(total / 1000)}k</span><span className="fs-stat-l">Total units</span></div>
              <div className="fs-stat"><span className="fs-stat-v" style={{ color: uplift >= 0 ? 'var(--accent)' : 'var(--octave-pink)' }}>{uplift >= 0 ? '+' : ''}{uplift}%</span><span className="fs-stat-l">vs base</span></div>
            </div>
          </div>
          {(() => {
            // Enrich curve with P10/P90 confidence bands — widen further into the future
            const enriched = curve.map((w, i) => {
              const wk = i + 1;
              const spread = 0.04 + wk * 0.015; // 5.5% at W+1 → 16% at W+8
              const p10 = Math.round(w.final * (1 - spread));
              const p90 = Math.round(w.final * (1 + spread));
              return { ...w, p10, p90, band: p90 - p10 };
            });
            return (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={enriched} margin={{ top: 16, right: 16, bottom: 8, left: -4 }}>
                  <defs>
                    <linearGradient id="fs-base-g" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6B6B85" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6B6B85" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fs-final-g" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#26EA9F" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#26EA9F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="w" stroke="#6B6B85" fontSize={12} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                  <YAxis stroke="#6B6B85" fontSize={12} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#11111C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#E4E4EE' }}
                    formatter={(v, k) => {
                      const label = { base: 'Baseline', weather: '+Weather', final: 'P50 forecast', actual: 'Actual', p10: 'P10', p90: 'P90' }[k] || k;
                      return [`${Number(v).toLocaleString()}`, label];
                    }}
                  />
                  {/* Confidence band — rendered as stacked transparent + filled Areas using p10/band */}
                  {dataState === 'promo' && (
                    <>
                      <Area type="monotone" dataKey="p10" stackId="band" stroke="none" fill="transparent" />
                      <Area type="monotone" dataKey="band" stackId="band" stroke="#26EA9F" strokeOpacity={0.2} fill="#26EA9F" fillOpacity={0.08} strokeDasharray="2 3" />
                    </>
                  )}
                  <Area type="monotone" dataKey="base" stroke="#6B6B85" fill="url(#fs-base-g)" strokeDasharray="4 4" strokeWidth={1.5} />
                  {(dataState === 'weather' || dataState === 'promo') && (
                    <Area type="monotone" dataKey="weather" stroke="#8A7DF7" strokeWidth={1.8} fill="transparent" />
                  )}
                  {dataState === 'promo' && (
                    <Area type="monotone" dataKey="final" stroke="#26EA9F" strokeWidth={2.5} fill="url(#fs-final-g)" />
                  )}
                  <Line type="monotone" dataKey="actual" stroke="#E82AAE" strokeWidth={2} dot={{ r: 4, fill: '#E82AAE' }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            );
          })()}
          <div className="fs-legend">
            <span><i style={{ background: '#6B6B85' }} /> Baseline</span>
            <span><i style={{ background: '#8A7DF7' }} /> +Weather</span>
            <span><i style={{ background: '#26EA9F' }} /> P50 forecast</span>
            <span><i className="fs-band-swatch" /> P10–P90 band</span>
            <span><i style={{ background: '#E82AAE' }} /> Actual (so far)</span>
          </div>
        </div>

        <div className="fs-trace-wrap">
          <ReasoningTrace steps={traceSteps} playing={playing} speed={1.25} />
        </div>
      </div>

      {/* Outputs */}
      <div className="fs-outputs">
        <div className="fs-out">
          <div className="fs-out-head">
            <Icons.FilePlus size={14} />
            <span>Draft Purchase Order</span>
            {showPo && <span className="fs-out-ready">Ready for buyer</span>}
          </div>
          {showPo ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fs-po">
              <div className="fs-po-row">
                <span>SKU</span>
                <span>{sku.name}</span>
              </div>
              <div className="fs-po-row">
                <span>Delivery cluster</span>
                <span>{sku.cluster}</span>
              </div>
              <div className="fs-po-row">
                <span>Total units</span>
                <span>{total.toLocaleString()}</span>
              </div>
              <div className="fs-po-row">
                <span>Lift vs base</span>
                <span>{uplift}%</span>
              </div>
              <div className="fs-po-row">
                <span>Service level</span>
                <span>98.5%</span>
              </div>
              <div className="fs-po-row fs-po-row-total">
                <span>Standing + uplift</span>
                <span>Split W+2 / W+3</span>
              </div>
            </motion.div>
          ) : (
            <div className="fs-out-empty">PO draft appears after the Replenishment Planner runs.</div>
          )}
        </div>

        <div className="fs-out">
          <div className="fs-out-head">
            <Icons.Handshake size={14} />
            <span>Supplier message · drafted in buyer voice</span>
            {showMsg && <span className="fs-out-ready fs-out-ready-pink">Ready to send</span>}
          </div>
          {showMsg ? (
            <>
              <div style={{ padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', margin: '12px 0', fontSize: '12.5px', lineHeight: '1.55' }}>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>GOVERNANCE — supplier-facing actions</div>
                <div>• GSCOP-compliant: no retrospective changes, no unilateral term variation</div>
                <div>• Every message HITL-approved by named buyer before send</div>
                <div>• Commercial concessions (price, logistics share, short-date premium) flagged for legal + commercial review</div>
              </div>
              <motion.pre className="fs-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {SUPPLIER_MSG[sku.id]}
              </motion.pre>
            </>
          ) : (
            <div className="fs-out-empty">Negotiator draft appears last. Never sends without human sign-off.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Micro-visualisations — one per agent in the swarm
// ============================================================================
function AgentMicroViz({ agentId, sku, active, done }) {
  if (agentId === 'base')    return <BaseSparkViz    sku={sku} active={active} done={done} />;
  if (agentId === 'weather') return <WeatherViz      sku={sku} active={active} done={done} />;
  if (agentId === 'promo')   return <PromoViz        sku={sku} active={active} done={done} />;
  if (agentId === 'replen')  return <ReplenishmentViz sku={sku} active={active} done={done} />;
  if (agentId === 'supp')    return <NegotiatorViz   sku={sku} active={active} done={done} />;
  return null;
}

// --- Base Forecaster: 52-wk sparkline morphs into forecast ---
function BaseSparkViz({ sku, active, done }) {
  const hist = HISTORY[sku.id];
  const fut = CURVES[sku.id].map((w) => w.base);
  const combined = [...hist, ...fut];
  const max = Math.max(...combined);
  const min = Math.min(...combined);
  const width = 100, height = 46;
  const pts = combined.map((v, i) => {
    const x = (i / (combined.length - 1)) * width;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const histPts = pts.slice(0, hist.length).join(' ');
  const futPts = pts.slice(hist.length - 1).join(' '); // overlap by 1
  const divideX = ((hist.length - 1) / (combined.length - 1)) * width;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="fs-mv-svg">
      <line x1={divideX} x2={divideX} y1="0" y2={height} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 3" strokeWidth="0.4" />
      <polyline points={histPts} fill="none" stroke="rgba(107,107,133,0.85)" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
      <polyline
        points={futPts}
        fill="none"
        stroke="#26EA9F"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
        strokeDasharray={active || done ? '0 0' : '2 2'}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="1.5" y="7" fontSize="4.5" fill="rgba(228,228,238,0.5)" fontFamily="monospace">52w history</text>
      <text x={divideX + 2} y="7" fontSize="4.5" fill="#26EA9F" fontFamily="monospace">8w forecast</text>
    </svg>
  );
}

// --- Weather Adjuster: 14-day temp bars ---
function WeatherViz({ sku, active, done }) {
  const w = WEATHER[sku.id];
  const max = Math.max(...w.days);
  const min = Math.min(...w.days);
  const range = max - min || 1;
  return (
    <div className="fs-mv-weather">
      <div className="fs-mv-weather-bars">
        {w.days.map((t, i) => {
          const h = 30 + ((t - min) / range) * 60;
          const hot = t >= 22;
          const cold = t <= 5;
          return (
            <div key={i} className="fs-mv-bar-wrap">
              <div
                className="fs-mv-bar"
                style={{
                  height: `${active || done ? h : 20}%`,
                  background: hot ? '#E82AAE' : cold ? '#8A7DF7' : '#26EA9F',
                  opacity: active || done ? 0.9 : 0.3,
                  transition: `height 0.5s ease ${i * 0.04}s, opacity 0.4s ease`
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="fs-mv-weather-note">
        <span>14d · {min}° → {max}°C</span>
        <Explain
          title={`Weather multiplier · ×${w.multiplier.toFixed(2)}`}
          factors={[
            { label: 'Temp deviation vs seasonal norm', weight: (w.multiplier - 1) * 2 },
            { label: 'Category β (temp sensitivity)',   weight: (w.multiplier - 1) * 1.2 },
            { label: 'Event calendar (bank holidays)',  weight: 0.06 }
          ]}
          dataSource="8 years of weekly demand vs Met Office regional temps · category-level βs"
          counterfactual={`Neutral weather would give ×1.00. This week's outlook ${w.note}.`}
          wide inline
        >
          <span className="fs-mv-mul">×{w.multiplier.toFixed(2)}</span>
        </Explain>
      </div>
    </div>
  );
}

// --- Promo Modeller: uplift cells on a mini-calendar ---
function PromoViz({ sku, active, done }) {
  const p = PROMOS[sku.id];
  const cells = Array.from({ length: 8 }, (_, i) => i + 1);
  return (
    <div className="fs-mv-promo">
      <div className="fs-mv-promo-grid">
        {cells.map((wk) => {
          const hit = p.uplift.find((u) => u.wk === wk);
          return (
            <div
              key={wk}
              className={`fs-mv-promo-cell ${hit ? 'is-lift' : ''}`}
              style={{
                opacity: active || done ? 1 : 0.4,
                transition: `background 0.4s ease ${wk * 0.03}s, opacity 0.4s ease`
              }}
            >
              <span className="fs-mv-promo-wk">W+{wk}</span>
              {hit && <span className="fs-mv-promo-lift">+{hit.lift}%</span>}
            </div>
          );
        })}
      </div>
      {p.cannibal.length > 0 && (
        <div className="fs-mv-cannibal">
          <span>⤷</span>
          {p.cannibal.map((c, i) => (
            <span key={i}>{c.cat} {c.dampen}%</span>
          ))}
        </div>
      )}
      {p.uplift.length === 0 && <div className="fs-mv-cannibal fs-mv-cannibal-none">no promo in window</div>}
    </div>
  );
}

// --- Replenishment Planner: store allocation + trailer cube ---
function ReplenishmentViz({ sku, active, done }) {
  const a = ALLOCATION[sku.id];
  const max = Math.max(...a.stores.map((s) => s.u));
  return (
    <div className="fs-mv-replen">
      <div className="fs-mv-alloc">
        {a.stores.slice(0, 5).map((s, i) => (
          <div key={i} className="fs-mv-alloc-row">
            <span className="fs-mv-alloc-s">{s.s}</span>
            <div className="fs-mv-alloc-track">
              <div
                className="fs-mv-alloc-fill"
                style={{
                  width: `${active || done ? (s.u / max) * 100 : 0}%`,
                  transition: `width 0.5s ease ${i * 0.08}s`
                }}
              />
            </div>
            <span className="fs-mv-alloc-u">{(s.u / 1000).toFixed(1)}k</span>
          </div>
        ))}
      </div>
      <div className="fs-mv-cube" title={`Trailer cube utilisation: ${a.cube}%`}>
        <div className="fs-mv-cube-label">Trailer {a.cube}%</div>
        <div className="fs-mv-cube-box">
          <div
            className="fs-mv-cube-fill"
            style={{
              height: `${active || done ? a.cube : 0}%`,
              transition: 'height 0.8s ease'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Supplier Negotiator: typewriter of first two lines ---
function NegotiatorViz({ sku, active, done }) {
  const msg = SUPPLIER_MSG[sku.id].split('\n').slice(0, 4).join('\n');
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (!active && !done) { setTyped(''); return; }
    let i = 0;
    setTyped('');
    const id = setInterval(() => {
      i++;
      setTyped(msg.slice(0, i));
      if (i >= msg.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [active, done, sku.id, msg]);
  return (
    <div className="fs-mv-negotiator">
      <pre>{typed}<span className="fs-mv-caret">{active ? '▍' : ''}</span></pre>
    </div>
  );
}
