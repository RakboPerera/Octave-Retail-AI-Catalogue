import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, ReferenceLine, ComposedChart, Line, Area, ReferenceArea, ReferenceDot } from 'recharts';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import Explain from '../../components/ui/Explain.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './DynamicPricing.css';

// SKUs carry: base price, price bounds, COGS ratio, elasticity (absolute), competitor snapshot, baseline daily units.
const SKUS = [
  {
    id: 'straw', name: 'British Strawberries 400g', base: 3.00, min: 0.80, max: 4.50, unit: '£',
    perish: true, category: 'Fresh produce', elasticity: 1.4, cogsPct: 0.62, dailyUnits: 420, priceTests: 22,
    competitors: [
      { name: 'Tesco', price: 3.00 },
      { name: 'Sainsbury\'s', price: 3.25 },
      { name: 'Aldi', price: 2.50 },
      { name: 'Morrisons', price: 3.10 }
    ]
  },
  {
    id: 'crois', name: 'Butter Croissants 4-pack', base: 2.20, min: 0.60, max: 2.80, unit: '£',
    perish: true, category: 'In-store bakery', elasticity: 1.0, cogsPct: 0.48, dailyUnits: 190, priceTests: 14,
    competitors: [
      { name: 'Tesco', price: 2.15 },
      { name: 'Sainsbury\'s', price: 2.30 },
      { name: 'Waitrose', price: 2.75 },
      { name: 'M&S', price: 2.80 }
    ]
  },
  {
    id: 'lager', name: 'Craft Lager 4×440ml', base: 5.40, min: 3.80, max: 6.50, unit: '£',
    perish: false, category: 'Beers & wines', elasticity: 1.6, cogsPct: 0.55, dailyUnits: 310, priceTests: 9,
    competitors: [
      { name: 'Tesco', price: 5.50 },
      { name: 'Sainsbury\'s', price: 5.75 },
      { name: 'Aldi', price: 4.95 },
      { name: 'Majestic', price: 5.40 }
    ]
  }
];

export default function DynamicPricing({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Dynamic Pricing & Markdown"
          signals={[
            { id: 'velocity', label: 'Sell-through & velocity', icon: 'Activity', detail: 'Hourly sales rate, basket attachment, price elasticity curve from price tests.' },
            { id: 'stock',    label: 'Stock cover',             icon: 'Package', detail: 'Days-of-cover, back-of-store, DC in-transit, shelf-life remaining.' },
            { id: 'comp',     label: 'Competitor price',        icon: 'Scale', detail: 'Third-party pricing intelligence feed (Assosia-equivalent); refreshed hourly.' },
            { id: 'weather',  label: 'Weather / events',        icon: 'CloudSun', detail: '14-day forecast by region, plus local events (fixtures, festivals).' },
            { id: 'policy',   label: 'Brand & legal policy',    icon: 'Shield', detail: 'Minimum margin, price-match promise, promotional cadence and Unit pricing (PMO 2004) rules.' }
          ]}
          tools={[
            { id: 'elast', label: 'Elasticity model',   icon: 'LineChart', detail: 'Per-SKU elasticity learned from A/B tests and quasi-experiments.' },
            { id: 'rec',   label: 'Recommender',        icon: 'Wand2', detail: 'Proposes a price + rationale + expected velocity shift.' },
            { id: 'guard', label: 'Policy guardrails',  icon: 'Shield', detail: 'Checks proposal vs margin, legal and brand rules; explains any overrides.' },
            { id: 'esl',   label: 'ESL executor',       icon: 'Tag', detail: 'Pushes approved prices to electronic shelf labels and e-commerce.' }
          ]}
          actions={[
            { id: 'price', label: 'Price move',        icon: 'Tag', detail: 'Approved change pushed to ESL + online + app within 90 seconds. Batched to respect ESL battery budget (max 8 refreshes/SKU/day).' },
            { id: 'mark',  label: 'Markdown schedule', icon: 'Percent', detail: 'Stepped perish-aware markdown plan, 2/3/full off.' },
            { id: 'brief', label: 'Buyer brief',       icon: 'FileText', detail: 'Written rationale attached to every change for buyer review.' }
          ]}
          guardrails={[
            'Auto-exec only within ±3% of base · ≤2 moves/SKU/day · no HFSS · no KVI',
            'ESL battery budget · ≤8 refreshes/SKU/day · batched overnight where possible',
            'Minimum margin · Unit pricing (PMO 2004) · MUP · KVI list of 327 SKUs',
            'ESL offline failover: hold shelf price, cascade online/app only, auto-reconcile on recovery',
            '1-click rollback to prior price file · kill-switch: merchandise director'
          ]}
        />
      }
      demo={
        <DemoShell
          title="Try the dials. Watch the agent think."
          subtitle="Four levers · one recommendation. Every signal the agent sees, in your hands. Written rationale regenerates as you drag."
          initialPlaying={true}
        >
          {() => <DynamicPricingDemo />}
        </DemoShell>
      }
      technicalDetail={
        <>
          <ModelCard
            architecture="Per-SKU elasticity regression + guardrail policy engine + margin-aware optimiser"
            trainingWindow="Weekly retrain · 6 months of price-test data · per-SKU βs"
            lastRetrain="2026-04-16 (3 days ago)"
            accuracy="Mean absolute error on predicted volume · 6.2%"
            accuracyLabel="volume prediction"
            features={22}
            driftStatus="stable"
            notes={`The agent never ships a price change without passing every policy guardrail (minimum margin, Redwell Rewards member differential, Unit pricing (PMO 2004), MUP, HFSS, KVI, brand band). Changes inside the autonomous-threshold band auto-execute (±3% of base, ≤2 changes/SKU/day, no HFSS moves, no KVI); anything outside routes to buyer for sign-off. Kill-switch: merchandise director; 1-click rollback to prior price file. Price-test design: quasi-experimental with matched-store controls; promo and weather confounds demeaned. KVI list respected (327 SKUs). Supplier-funded markdowns: promo allowance and MDF netted before margin check. Own-label vs branded: tier-equivalent competitor match, not SKU-for-SKU. Price families preserved (Taste-the-Difference endorsement, own-brand consistency). Catalogue ROI: Gross margin +1.6pp · Fresh write-off -23% · Pricing cycle 7d → 1h · TTV 12 weeks.`}
          />
          <div style={{ marginTop: '24px', padding: '18px 20px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', background: 'rgba(247, 184, 74, 0.04)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F7B84A', marginBottom: '10px' }}>
              ESL failure modes · how the agent degrades gracefully
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>
              SES-imagotag / Pricer ESL estates fail every week — tags lose WiFi, drain batteries, miss a sync. The agent is designed around this, not around perfect infrastructure:
            </p>
            <ul style={{ marginTop: '12px', paddingLeft: '18px', color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.7 }}>
              <li><b style={{ color: 'var(--text)' }}>Tag-level sync monitor.</b> Every price push is acknowledged per tag. If a tag misses ACK for 20 min, it's flagged. If &gt;5% of a store's tags are out of sync, the agent freezes all non-critical moves for that store.</li>
              <li><b style={{ color: 'var(--text)' }}>Battery budget.</b> Max 8 refreshes/SKU/day. The agent batches overnight where possible and defers cosmetic moves (e.g. ±0.5%) so battery life stays above 80% over the SLA window.</li>
              <li><b style={{ color: 'var(--text)' }}>ESL offline → hold, don't lie.</b> If the shelf price can't be updated, the online and app price <i>also</i> hold. The agent will never price-mismatch between channels, because that breaks our price-match promise and fails CTSI scrutiny.</li>
              <li><b style={{ color: 'var(--text)' }}>Auto-reconcile on recovery.</b> When the tag rejoins, it receives the current-approved price, not the stale queue. An audit entry records the outage window for the store's price-integrity log.</li>
              <li><b style={{ color: 'var(--text)' }}>Manual override.</b> Store manager can force-post a paper price card and the agent suppresses automated moves on the SKU for 24h.</li>
            </ul>
            <p style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.55 }}>
              Pricing errors are a CTSI and Consumer Protection from Unfair Trading Regulations (CPRs) exposure, not just a customer annoyance. The agent's default on ambiguity is to <i>not change the price</i> — silence beats a wrong price.
            </p>
          </div>
        </>
      }
    />
  );
}

function DynamicPricingDemo() {
  const [sku, setSku] = useState(SKUS[0]);
  // Competitor the agent is anchoring to. Click the ladder to switch.
  const [trackedCompetitor, setTrackedCompetitor] = useState('Tesco');
  const [days, setDays] = useState(4);        // days of stock
  const [temp, setTemp] = useState(22);       // temp °C (weather sensitivity)
  const [expiry, setExpiry] = useState(2);    // days to expiry (perish only)

  // Reset controls when switching SKU
  useEffect(() => {
    setTrackedCompetitor(sku.competitors[0].name);
    setDays(4);
    setTemp(22);
    setExpiry(2);
  }, [sku.id]);

  const anchor = sku.competitors.find((c) => c.name === trackedCompetitor) || sku.competitors[0];
  const comp = anchor.price;

  // Pricing logic — purely illustrative; mirrors what a live elasticity model would output
  const recommendation = useMemo(() => {
    let move = 0; // delta in £
    const notes = [];
    const guardrails = [];
    // competitor anchor
    const compDelta = comp - sku.base;
    if (compDelta < -0.05) { move -= 0.10; notes.push(`${anchor.name} is ${fmt(Math.abs(compDelta))} lower than our £${sku.base.toFixed(2)} — defend price in category.`); }
    else if (compDelta > 0.15) { move += 0.05; notes.push(`${anchor.name} ${fmt(compDelta)} higher — carefully lift to protect margin without losing perception.`); }
    // stock pressure — less stock, hold or lift; more stock, push velocity
    if (days <= 2)  { move += 0.05; notes.push(`Stock tight (${days.toFixed(1)} days) — hold or modestly lift to protect availability.`); }
    if (days >= 6)  { move -= 0.10; notes.push(`Stock long (${days.toFixed(1)} days) — pull price to shift units.`); }
    // weather
    if (sku.id === 'straw' && temp >= 24) { move += 0.15; notes.push(`Warm week (${temp}°C) — demand surge for berries; hold/raise.`); }
    if (sku.id === 'straw' && temp <= 14) { move -= 0.10; notes.push(`Cool week (${temp}°C) — demand dampens, pull price.`); }
    if (sku.id === 'crois' && temp <= 12) { move += 0.05; notes.push(`Cool morning (${temp}°C) — bakery demand lifts; hold.`); }
    if (sku.id === 'lager' && temp >= 24) { move += 0.10; notes.push(`Warm day (${temp}°C) + fixtures → lager spike; defend margin.`); }
    // expiry — big downward force
    if (sku.perish) {
      if (expiry <= 1) { move -= Math.max(0.60, (sku.base - sku.min)); notes.push(`1 day to expiry — Reduced-to-clear (same-day · EOD) to avoid write-off.`); }
      else if (expiry <= 2) { move -= 0.40; notes.push(`Short-dated markdown (day-2) — step-1 markdown (≈1/3 off).`); }
      else if (expiry <= 3) { move -= 0.15; notes.push(`Short-dated trim (day-3) — small step-down to accelerate sell-through.`); }
    }
    let price = Math.min(sku.max, Math.max(sku.min, sku.base + move));
    price = Math.round(price * 20) / 20;

    // Elasticity-driven volume projection (constant-elasticity form):
    //   Q = Q0 × (P/P0)^(-e)
    const volumeIndex = Math.pow(price / sku.base, -sku.elasticity) * 100;
    const dailyUnits = Math.round(sku.dailyUnits * volumeIndex / 100);

    const deltaPct = ((price - sku.base) / sku.base) * 100;
    const velocityChange = volumeIndex - 100;
    const cogs = sku.base * sku.cogsPct;
    const marginImpact = ((price - cogs) / price) * 100;
    const dailyRevenue = dailyUnits * price;
    const dailyProfit = dailyUnits * (price - cogs);
    const baseDailyProfit = sku.dailyUnits * (sku.base - cogs);
    const profitDelta = dailyProfit - baseDailyProfit;

    // Guardrails
    const minMargin = 18;
    guardrails.push({ id: 'margin', label: `Minimum margin ${minMargin}%`,  pass: marginImpact >= minMargin });
    guardrails.push({ id: 'band',   label: `Brand band (${fmt(sku.min)}–${fmt(sku.max)})`, pass: price >= sku.min && price <= sku.max });
    guardrails.push({ id: 'mup',    label: 'MUP (Scotland/Wales alcohol)', detail: 'Floor 65p/unit; Craft Lager 4×440ml @ 5% ABV → min £5.72', pass: true });
    guardrails.push({ id: 'hfss',   label: 'HFSS volume-price restriction', detail: 'No multi-buy or "3 for 2" on qualifying HFSS SKUs', pass: true });
    guardrails.push({ id: 'pmo',    label: 'Unit pricing (PMO 2004)', detail: '£/kg or £/100g visible with every price change', pass: true });
    guardrails.push({ id: 'kvi',    label: 'KVI protection', detail: 'Not in KVI list · move permitted', pass: true });
    guardrails.push({ id: 'cbd',    label: 'Member price differential ≥ 5% (Redwell Rewards)', pass: true });
    const allPass = guardrails.every((g) => g.pass);

    if (notes.length === 0) notes.push('Conditions within normal band — hold the line. Monitor for the next cycle.');

    return { price, move, notes, deltaPct, velocityChange, marginImpact, dailyUnits, dailyRevenue, dailyProfit, profitDelta, guardrails, allPass };
  }, [sku, comp, days, temp, expiry, anchor.name]);

  // Elasticity curve points across the full valid price band
  const elasticity = sku.elasticity;
  const curve = useMemo(() => {
    const points = [];
    const steps = 44;
    for (let i = 0; i <= steps; i++) {
      const p = sku.min + (i / steps) * (sku.max - sku.min);
      const q = Math.pow(p / sku.base, -elasticity) * 100;
      const cogs = sku.base * sku.cogsPct;
      const profit = q * (p - cogs);
      points.push({ p: parseFloat(p.toFixed(2)), q: parseFloat(q.toFixed(1)), profit: parseFloat(profit.toFixed(1)) });
    }
    return points;
  }, [sku, elasticity]);
  const curvePeak = useMemo(() => curve.reduce((m, x) => (x.profit > m.profit ? x : m), curve[0]), [curve]);

  // 30-day profit projection (if we hold base vs this recommendation)
  const projection = useMemo(() => {
    const out = [];
    const cogs = sku.base * sku.cogsPct;
    for (let d = 1; d <= 30; d++) {
      const base  = sku.dailyUnits * (sku.base - cogs);
      const rec   = recommendation.dailyUnits * (recommendation.price - cogs);
      out.push({ d, base: Math.round(base * d), rec: Math.round(rec * d) });
    }
    return out;
  }, [recommendation, sku]);

  return (
    <div className="dp-wrap">
      {/* SKU row */}
      <div className="dp-skus">
        {SKUS.map((s) => (
          <button key={s.id} className={`dp-sku ${sku.id === s.id ? 'dp-sku-on' : ''}`} onClick={() => setSku(s)}>
            <div className="dp-sku-name">{s.name}</div>
            <div className="dp-sku-cat">{s.category}</div>
            <div className="dp-sku-base">Base · £{s.base.toFixed(2)}</div>
          </button>
        ))}
      </div>

      <div className="dp-grid">
        {/* Controls */}
        <div className="dp-controls">
          <div className="dp-anchor">
            <div className="dp-anchor-head">
              <div className="dp-slider-label"><Icons.Scale size={13} /> <span>Competitor to anchor on</span></div>
              <span className="dp-slider-value">£{anchor.price.toFixed(2)}</span>
            </div>
            <div className="dp-anchor-chips">
              {sku.competitors.map((c) => (
                <button
                  key={c.name}
                  className={`dp-anchor-chip ${trackedCompetitor === c.name ? 'is-on' : ''}`}
                  onClick={() => setTrackedCompetitor(c.name)}
                >
                  <span className="dp-anchor-name">{c.name}</span>
                  <span className="dp-anchor-price">£{c.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Days of stock cover"
            icon="Package"
            value={days}
            min={0.5}
            max={10}
            step={0.5}
            format={(v) => `${v.toFixed(1)} d`}
            onChange={setDays}
          />
          <Slider
            label="Weather · expected temp"
            icon="Thermometer"
            value={temp}
            min={2}
            max={32}
            step={1}
            format={(v) => `${Math.round(v)}°C`}
            onChange={setTemp}
          />
          <Slider
            label={sku.perish ? 'Days to expiry' : 'Days to end-of-life (not applicable)'}
            icon="CalendarClock"
            value={expiry}
            min={0.5}
            max={7}
            step={0.5}
            format={(v) => `${v.toFixed(1)} d`}
            onChange={setExpiry}
            disabled={!sku.perish}
          />
        </div>

        {/* Recommendation */}
        <div className="dp-reco">
          <span className="eyebrow">Agent recommendation</span>
          <div className="dp-price-row">
            <div className="dp-price-base">
              <span className="dp-price-label">Was</span>
              <span className="dp-price-val dp-price-was">£{sku.base.toFixed(2)}</span>
            </div>
            <Icons.ArrowRight size={18} className="dp-price-arrow" />
            <div className="dp-price-new">
              <span className="dp-price-label">Recommended</span>
              <motion.span
                key={recommendation.price}
                className="dp-price-val dp-price-now"
                initial={{ scale: 1.12, color: '#5CFFB8' }}
                animate={{ scale: 1, color: '#26EA9F' }}
                transition={{ duration: 0.4 }}
              >£{recommendation.price.toFixed(2)}</motion.span>
              <span className={`dp-price-delta ${recommendation.deltaPct >= 0 ? 'dp-price-delta-up' : 'dp-price-delta-down'}`}>
                {recommendation.deltaPct >= 0 ? '+' : ''}{recommendation.deltaPct.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="dp-mini">
            <div className="dp-mini-stat">
              <span>Expected velocity</span>
              <span className={`dp-mini-val ${recommendation.velocityChange >= 0 ? 'pos' : 'neg'}`}>{recommendation.velocityChange >= 0 ? '+' : ''}{recommendation.velocityChange.toFixed(0)}%</span>
            </div>
            <div className="dp-mini-stat">
              <span>Margin on price</span>
              <span className="dp-mini-val">{recommendation.marginImpact.toFixed(0)}%</span>
            </div>
            <div className="dp-mini-stat">
              <span>Guardrails</span>
              <span className="dp-mini-val dp-mini-ok"><Icons.ShieldCheck size={13} /> Pass</span>
            </div>
          </div>

          <div className="dp-rationale">
            <div className="dp-rationale-head">
              <Icons.Brain size={13} />
              <span>Written rationale</span>
            </div>
            <ul>
              {recommendation.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>

          {/* ===== Elasticity curve (the model itself) ===== */}
          <ElasticityPanel sku={sku} curve={curve} curvePeak={curvePeak} recommendation={recommendation} />

          {/* ===== Competitor ladder ===== */}
          <CompetitorLadder sku={sku} yourPrice={recommendation.price} tracked={trackedCompetitor} />

          {/* ===== 30-day profit projection ===== */}
          <ProfitProjection projection={projection} recommendation={recommendation} sku={sku} />

          {/* ===== Guardrails trace ===== */}
          <GuardrailTrace guardrails={recommendation.guardrails} allPass={recommendation.allPass} />

          <div className="dp-actions">
            <button className="btn btn-primary dp-act"><Icons.CheckCircle2 size={14} /> Approve · push to ESL</button>
            <button className="btn btn-ghost dp-act"><Icons.Edit3 size={14} /> Edit &amp; log override</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Elasticity curve panel =====
function ElasticityPanel({ sku, curve, curvePeak, recommendation }) {
  const currentPoint = curve.reduce((best, pt) => (Math.abs(pt.p - recommendation.price) < Math.abs(best.p - recommendation.price) ? pt : best), curve[0]);
  return (
    <div className="dp-elast">
      <div className="dp-elast-head">
        <span className="eyebrow">Demand elasticity curve</span>
        <Explain
          title={`ε = -${sku.elasticity.toFixed(1)} · learned`}
          factors={[
            { label: 'Price tests (n)',        weight: sku.priceTests / 22 },
            { label: 'R² on test data',        weight: 0.81 },
            { label: '95% CI half-width',      weight: -0.18 }
          ]}
          dataSource={`${sku.priceTests} price-tests · observational + quasi-experimental · R² 0.81 · 95% CI [-${(sku.elasticity + 0.25).toFixed(2)}, -${(sku.elasticity - 0.28).toFixed(2)}] (n=22 weekly observations; see notes on confound control)`}
          counterfactual={`At ε = -1 (unit-elastic), a 10% price drop would add 10% volume. This SKU's ε = -${sku.elasticity.toFixed(1)} means a 10% drop adds ${Math.round(sku.elasticity * 10)}% volume.`}
          wide inline
        >
          <span className="dp-elast-e">ε = -{sku.elasticity.toFixed(1)} · learned from {sku.priceTests} price tests</span>
        </Explain>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <ComposedChart data={curve} margin={{ top: 12, right: 16, bottom: 4, left: -4 }}>
          <defs>
            <linearGradient id="dp-elast-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26EA9F" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#26EA9F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="p" type="number" domain={[sku.min, sku.max]} stroke="#6B6B85" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `£${v.toFixed(2)}`} />
          <YAxis stroke="#6B6B85" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `${Math.round(v)}`} />
          <Tooltip
            contentStyle={{ background: '#11111C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
            formatter={(v, k) => [k === 'q' ? `${Math.round(v)} units index` : `£${v.toFixed(2)} daily profit`, k === 'q' ? 'Volume' : 'Profit']}
            labelFormatter={(v) => `Price £${parseFloat(v).toFixed(2)}`}
          />
          <Area type="monotone" dataKey="q" stroke="#26EA9F" strokeWidth={2.2} fill="url(#dp-elast-g)" />
          <ReferenceLine x={sku.base} stroke="#6B6B85" strokeDasharray="3 3" label={{ value: 'Base', position: 'top', fill: '#6B6B85', fontSize: 10 }} />
          <ReferenceLine x={curvePeak.p} stroke="#E82AAE" strokeDasharray="3 3" label={{ value: `Profit peak £${curvePeak.p.toFixed(2)}`, position: 'top', fill: '#E82AAE', fontSize: 10 }} />
          <ReferenceDot x={currentPoint.p} y={currentPoint.q} r={6} fill="#5CFFB8" stroke="#0A0A12" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="dp-elast-axes">
        <span>x · price (£)</span>
        <span>y · volume index (base 100)</span>
      </div>
    </div>
  );
}

// ===== Competitor price ladder =====
function CompetitorLadder({ sku, yourPrice, tracked }) {
  const all = [...sku.competitors, { name: 'You', price: yourPrice, you: true }].sort((a, b) => a.price - b.price);
  const lo = Math.min(...all.map(x => x.price));
  const hi = Math.max(...all.map(x => x.price));
  const range = Math.max(0.2, hi - lo);
  return (
    <div className="dp-ladder">
      <div className="dp-ladder-head">
        <span className="eyebrow">Competitor ladder · live scrape · anchored to {tracked}</span>
        <span className="dp-ladder-range">£{lo.toFixed(2)} – £{hi.toFixed(2)}</span>
      </div>
      <div className="dp-ladder-track">
        {all.map((c) => {
          const left = ((c.price - lo) / range) * 100;
          const isAnchor = c.name === tracked;
          return (
            <div key={c.name} className={`dp-ladder-pin ${c.you ? 'dp-ladder-pin-you' : ''} ${isAnchor ? 'dp-ladder-pin-anchor' : ''}`} style={{ left: `${left}%` }}>
              <div className="dp-ladder-dot" />
              <div className="dp-ladder-label">
                <span>{c.name}</span>
                <span>£{c.price.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== 30-day profit projection =====
function ProfitProjection({ projection, recommendation, sku }) {
  const endBase = projection[projection.length - 1].base;
  const endRec  = projection[projection.length - 1].rec;
  const uplift = endRec - endBase;
  const upliftPct = (uplift / endBase) * 100;
  return (
    <div className="dp-proj">
      <div className="dp-proj-head">
        <span className="eyebrow">30-day profit projection · hold base vs act now</span>
        <span className={`dp-proj-uplift ${uplift >= 0 ? 'pos' : 'neg'}`}>{uplift >= 0 ? '+' : ''}£{Math.round(uplift).toLocaleString('en-GB')} <span>({upliftPct >= 0 ? '+' : ''}{upliftPct.toFixed(1)}%)</span></span>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={projection} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="d" stroke="#6B6B85" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `D${v}`} interval={4} />
          <YAxis stroke="#6B6B85" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `£${Math.round(v/1000)}k`} />
          <Tooltip
            contentStyle={{ background: '#11111C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`£${Math.round(v).toLocaleString('en-GB')}`, '']}
            labelFormatter={(v) => `Day ${v}`}
          />
          <Line type="monotone" dataKey="base" stroke="#6B6B85" strokeWidth={1.8} strokeDasharray="4 4" dot={false} />
          <Line type="monotone" dataKey="rec"  stroke="#26EA9F" strokeWidth={2.4} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="dp-proj-legend">
        <span><i style={{ background: '#6B6B85' }} /> Hold base</span>
        <span><i style={{ background: '#26EA9F' }} /> Recommended</span>
      </div>
    </div>
  );
}

// ===== Guardrails trace =====
function GuardrailTrace({ guardrails, allPass }) {
  return (
    <details className="dp-guard" open={!allPass}>
      <summary>
        <Icons.ShieldCheck size={13} />
        <span>Policy guardrails</span>
        <span className={`dp-guard-state ${allPass ? 'pass' : 'fail'}`}>{allPass ? 'All pass' : 'Review'}</span>
      </summary>
      <ul className="dp-guard-list">
        {guardrails.map((g) => (
          <li key={g.id} className={g.pass ? 'pass' : 'fail'}>
            {g.pass ? <Icons.Check size={12} /> : <Icons.AlertTriangle size={12} />}
            <span>{g.label}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Slider({ label, icon, value, min, max, step, format, onChange, anchor, anchorLabel, disabled }) {
  const Icon = Icons[icon] || Icons.Circle;
  const pct = ((value - min) / (max - min)) * 100;
  const anchorPct = anchor != null ? ((anchor - min) / (max - min)) * 100 : null;
  return (
    <div className={`dp-slider ${disabled ? 'dp-slider-disabled' : ''}`}>
      <div className="dp-slider-head">
        <div className="dp-slider-label"><Icon size={13} /> <span>{label}</span></div>
        <span className="dp-slider-value">{format(value)}</span>
      </div>
      <div className="dp-slider-track" style={{ '--_pct': `${pct}%` }}>
        <div className="dp-slider-fill" style={{ width: `${pct}%` }} />
        {anchorPct != null && (
          <div className="dp-slider-anchor" style={{ left: `${anchorPct}%` }}>
            <span>{anchorLabel}</span>
          </div>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}

function fmt(v) { return `£${Math.abs(v).toFixed(2)}`; }
