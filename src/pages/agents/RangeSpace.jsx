import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import Explain from '../../components/ui/Explain.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './RangeSpace.css';

// ============================================================================
// SKU universe — 142 synthetic SKUs for the scatter plot.
// Named SKUs appear as delist/list candidates. The rest are background noise
// so the scatter *feels* like a real category scan.
// ============================================================================
function hash(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (h & 0xffff) / 0xffff;
}

// Named SKUs — the agent's specific recommendations
const NAMED = [
  // Champions — top-right
  { id: 's-war',  name: 'Warburtons Toastie 800g', incr: 82, margin: 22, vol: 680, tenure: 'core' },
  { id: 's-hov',  name: 'Hovis Soft White 800g',   incr: 76, margin: 20, vol: 610, tenure: 'core' },
  { id: 's-king', name: 'Kingsmill 50/50 800g',    incr: 71, margin: 19, vol: 540, tenure: 'core' },
  { id: 's-bri',  name: 'Redwell Brioche Rolls 6pk',  incr: 68, margin: 34, vol: 420, tenure: 'core' },
  { id: 's-crm',  name: 'Redwell Croissants 4pk',     incr: 64, margin: 32, vol: 380, tenure: 'core' },

  // Protected own-label (not delisted — high margin, defensive)
  { id: 'p-own-wh', name: 'Redwell Wholemeal 400g', incr: 58, margin: 28, vol: 260, tenure: 'core' },

  // Delist candidates — credible tail SKUs
  { id: 'd-hbob',   name: 'Hovis Best of Both 750g',   incr: 21, margin: 17, vol: 110, tenure: 'tail',
    zone: 'delist', cannibal: 78, subSku: 'Warburtons Toastie 800g', rationale: 'Low incrementality; 78% of demand substitutes to Warburtons Toastie (higher velocity, better margin).' },
  { id: 'd-tiger',  name: 'Tiger Bloomer 400g',        incr: 14, margin: 15, vol: 62,  tenure: 'long',
    zone: 'delist', cannibal: 64, subSku: 'Redwell Rustic Sourdough 800g (new)', rationale: 'Flat sales for 18 months; already delisted in 40% of estate. New sourdough predicted to capture same occasion at higher margin.' },
  { id: 'd-plain',  name: 'Plain White Rolls 6pk (branded)', incr: 26, margin: 16, vol: 140, tenure: 'long',
    zone: 'delist', cannibal: 68, subSku: 'Redwell Wholemeal 400g', rationale: 'Redundant vs own-label; cannibalises Redwell Wholemeal 68% substitution (own-brand protected).' },

  // List candidates — from competitor scan
  { id: 'n-sour',   name: 'Redwell Rustic Sourdough 800g', incr: 71, margin: 36, vol: 0,   tenure: 'new',
    zone: 'list', source: 'In-store theatre own-brand · seen at 3 competitors · rising Google search +34% MoM', predicted: '+£340/wk incremental', halo: '+4% on butter, preserves' },
  { id: 'n-gf',     name: 'Gluten-free Brown 500g',     incr: 68, margin: 33, vol: 0,   tenure: 'new',
    zone: 'list', source: 'Gap in range vs 4 competitors · GF category +22% YoY', predicted: '+£260/wk incremental', halo: 'Brings GF shoppers across categories' }
];

// Generate 130 background SKUs with deterministic positions
const BACKGROUND = Array.from({ length: 130 }, (_, i) => {
  const id = `bg-${i}`;
  const rx = hash(id + 'x');
  const ry = hash(id + 'y');
  const rv = hash(id + 'v');
  // Spread most across mid zones, with clusters around champion and delist
  const sector = hash(id + 's');
  let incr, margin;
  if (sector < 0.22) {
    // delist region
    incr = 8 + rx * 25;
    margin = 6 + ry * 14;
  } else if (sector < 0.35) {
    // champion region
    incr = 60 + rx * 32;
    margin = 22 + ry * 16;
  } else {
    // review region — big middle
    incr = 25 + rx * 50;
    margin = 14 + ry * 18;
  }
  return { id, name: `SKU ${1000 + i}`, incr: +incr.toFixed(1), margin: +margin.toFixed(1), vol: +(80 + rv * 420).toFixed(0), tenure: 'bg' };
});

const ALL_SKUS = [...NAMED, ...BACKGROUND];

// ============================================================================
// Planogram — Bakery bay. Before (current) and After (agent-rebuilt).
// Each slot: sku, facings (width units), or empty.
// Bay width = 12 facing units, 3 shelves.
// ============================================================================
const PLAN_BEFORE = [
  // Shelf 0 — Core breads
  [
    { sku: 'Warburtons Toastie 800g',     color: '#D9944F', facings: 2 },
    { sku: 'Hovis Soft White 800g',       color: '#F5D08A', facings: 2 },
    { sku: 'Kingsmill 50/50 800g',        color: '#B07338', facings: 2 },
    { sku: 'Hovis Best of Both 750g',     color: '#7B5B35', facings: 2 },
    { sku: 'Tiger Bloomer 400g',          color: '#C47236', facings: 2 },
    { sku: 'Redwell Wholemeal 400g',      color: '#5E4221', facings: 2 }
  ],
  // Shelf 1 — Rolls
  [
    { sku: 'Redwell Brioche Rolls 6pk',      color: '#EFC061', facings: 3 },
    { sku: 'Plain White Rolls 6pk (branded)', color: '#D4B27A', facings: 3 },
    { sku: 'Wholemeal Rolls 6pk',            color: '#7B5934', facings: 3 },
    { sku: 'Seeded Wraps 8pk',               color: '#3E7A3A', facings: 3 }
  ],
  // Shelf 2 — Morning goods
  [
    { sku: 'Redwell Croissants 4pk',   color: '#E8B25B', facings: 3 },
    { sku: 'Pain au Chocolat 4pk',     color: '#6E3A1C', facings: 3 },
    { sku: 'English Muffins 6pk',      color: '#C09565', facings: 3 },
    { sku: 'Crumpets 6pk',             color: '#E1C28A', facings: 3 }
  ]
];

const PLAN_AFTER = [
  // Shelf 0 — Core breads (3 delists: Hovis Best-of-Both, Tiger, branded rolls; 2 listings: Sourdough, GF; Warburtons expanded)
  [
    { sku: 'Warburtons Toastie 800g',    color: '#D9944F', facings: 3, change: 'expand', reason: '+1 facing · space elasticity 0.24 · expected +£180/wk' },
    { sku: 'Hovis Soft White 800g',      color: '#F5D08A', facings: 2, change: null },
    { sku: 'Kingsmill 50/50 800g',       color: '#B07338', facings: 2, change: null },
    { sku: 'Redwell Wholemeal 400g',     color: '#5E4221', facings: 3, change: 'expand', reason: '+1 facing · own-brand protected (28% margin vs branded 17-20%)' },
    { sku: 'Redwell Rustic Sourdough 800g', color: '#A36B2E', facings: 2, change: 'new', reason: 'NEW · in-store theatre own-brand · competitor gap · +£340/wk predicted' }
  ],
  // Shelf 1 — Rolls (branded Plain out, Brioche expanded)
  [
    { sku: 'Redwell Brioche Rolls 6pk', color: '#EFC061', facings: 4, change: 'expand', reason: '+1 facing · 3× basket-share growth' },
    { sku: 'Wholemeal Rolls 6pk',       color: '#7B5934', facings: 3, change: null },
    { sku: 'Seeded Wraps 8pk',          color: '#3E7A3A', facings: 3, change: null },
    { sku: 'Gluten-free Brown 500g',    color: '#8A6B3F', facings: 2, change: 'new', reason: 'NEW · GF category +22% YoY' }
  ],
  // Shelf 2 — Morning goods (unchanged)
  [
    { sku: 'Redwell Croissants 4pk',   color: '#E8B25B', facings: 3, change: null },
    { sku: 'Pain au Chocolat 4pk',     color: '#6E3A1C', facings: 3, change: null },
    { sku: 'English Muffins 6pk',      color: '#C09565', facings: 3, change: null },
    { sku: 'Crumpets 6pk',             color: '#E1C28A', facings: 3, change: null }
  ]
];

// ============================================================================
// UK store clusters — 10 geographic clusters with cluster-local deltas
// ============================================================================
const CLUSTERS = [
  { id: 'lds', name: 'Leeds metro',       center: [53.80, -1.55], stores: 22, delta: '+1 facing on Redwell Rustic Sourdough', uplift: 3.8, profile: 'urban · mixed demographics · large-format superstore' },
  { id: 'man', name: 'Manchester',        center: [53.48, -2.25], stores: 36, delta: '+1 facing on Brioche (vs Seeded)', uplift: 4.1, profile: 'urban · student-heavy · convenience format' },
  { id: 'lv',  name: 'Liverpool',         center: [53.41, -2.99], stores: 18, delta: 'Hold baseline · GF range minimal', uplift: 1.8, profile: 'urban · value-led · high frequency small baskets' },
  { id: 'bir', name: 'Birmingham',        center: [52.48, -1.90], stores: 32, delta: '+1 facing on Naan & Flatbread (localised)', uplift: 4.4, profile: 'multicultural · world-foods skew · large families' },
  { id: 'not', name: 'Nottingham & E-Mid', center: [52.95, -1.16], stores: 24, delta: 'Expand GF range (+2 SKUs)', uplift: 3.2, profile: 'suburban · mid-market · health-aware' },
  { id: 'bri', name: 'Bristol & SW',      center: [51.46, -2.60], stores: 28, delta: 'Premium bakery lift (+2 SKUs)', uplift: 4.6, profile: 'affluent · premium & organic skew · artisanal demand' },
  { id: 'lsw', name: 'London SW',         center: [51.45, -0.17], stores: 48, delta: '+2 facings on GF range + premium SKUs', uplift: 4.6, profile: 'high-affluence · premium own-label skew · small baskets' },
  { id: 'ln',  name: 'London N + E',      center: [51.56, -0.10], stores: 54, delta: '+1 facing on Brioche · reduce wholemeal by 1', uplift: 3.9, profile: 'dense urban · young professional · top-up shopping' },
  { id: 'ncl', name: 'Newcastle & NE',    center: [54.97, -1.60], stores: 22, delta: '+1 facing on Stottie / regional', uplift: 2.6, profile: 'regional-loyal · value-led · weekly big-shop' },
  { id: 'gsw', name: 'Glasgow',           center: [55.86, -4.25], stores: 38, delta: '+1 facing on Morning Rolls (local favourite)', uplift: 2.9, profile: 'urban Scottish · regional bakery loyal · MUP-aware' },
  { id: 'cen', name: 'Central Scotland',  center: [56.00, -3.78], stores: 32, delta: '+1 facing on Morning Rolls · GF expand', uplift: 2.8, profile: 'commuter-belt · mid-affluence · mixed format' },
  { id: 'nw',  name: 'North West',        center: [54.00, -2.78], stores: 26, delta: 'Hold baseline · Stottie lift', uplift: 2.5, profile: 'semi-rural · value-led · large weekly shop' }
];
const UK_CENTER = [54.5, -2.9];

// ============================================================================
// Reasoning trace
// ============================================================================
const TRACE_STEPS = [
  { type: 'tool',  label: 'pull_category_performance(cat=bakery, window=52w)', body: '142 SKUs loaded · 11.4M units · £38.7M gross sales.' },
  { type: 'tool',  label: 'compute_incrementality(basket_analysis, n=840k)',   body: '840k-basket sample (8-week window, 40-store panel) · per-SKU incrementality score · cannibalisation matrix · halo effects.' },
  { type: 'tool',  label: 'score_space_elasticity(sales_vs_facings)',          body: 'Per-SKU space-elasticity curves from 6 months of facing trials.' },
  { type: 'think', label: 'Cluster SKUs into Delist / Review / Champion based on (incrementality × margin × trajectory).' },
  { type: 'tool',  label: 'detect_delist_candidates(threshold=incr<30, margin<18)', body: '3 SKUs flagged for delist · £5.2k/wk reclaimable space. (category-specific; bakery own-label cut-off = 45%)' },
  { type: 'tool',  label: 'scan_competitor_range(weekly_pull)',                 body: 'Weekly third-party range intelligence (supplier-declared + store-visit audits) · 2 list candidates identified — gaps in own range.' },
  { type: 'tool',  label: 'generate_planogram(shelf_geo, business_rules)',       body: 'Planogram v2026-W16 drafted · 5 SKUs re-faced. HFSS placement rules respected: no end-cap or checkout-adjacent for qualifying SKUs.' },
  { type: 'tool',  label: 'localise_by_cluster(12_clusters)',                    body: '12 cluster variants generated — regional taste deltas applied.' },
  { type: 'tool',  label: 'simulate_category_uplift(before_vs_after)',           body: 'Weighted estimated uplift: +3.4% category revenue · +£1.32M/yr.' },
  { type: 'result', label: 'Range review bundle posted to buyer.',              body: 'Lists, delists, planograms and cluster map — all with evidence, ready for buyer sign-off. Delist recommendations respect GSCOP: reasonable notice, no retrospective changes, supplier JBP impact modelled.' }
];

// ============================================================================
// Main
// ============================================================================
export default function RangeSpace({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Range & Space Optimiser"
          signals={[
            { id: 'hist',  label: '52w category sales',      icon: 'History',    detail: 'Every basket, every SKU, every store — the truth-set behind incrementality.' },
            { id: 'bask',  label: 'Basket co-purchase',      icon: 'ShoppingBasket', detail: '840k-basket sample (8-week window, 40-store panel) used to learn cannibalisation and halo effects.' },
            { id: 'comp',  label: 'Competitor range scan',   icon: 'Scan',       detail: 'Weekly third-party range intelligence (supplier-declared + store-visit audits) — surfaces gaps.' },
            { id: 'geo',   label: 'Shelf geometry',          icon: 'Ruler',      detail: 'Per-store bay width, shelf count, facing depth — hard constraints on planograms.' },
            { id: 'clust', label: 'Cluster definitions',     icon: 'MapPinned',  detail: '12 geographic clusters with taste profiles (regional staples, demographic bias — urban/suburban/semi-rural, affluence tiers, world-foods skew).' },
            { id: 'supp',  label: 'Supplier terms',          icon: 'FileText',   detail: 'MOQ, margin, listing-fee terms — respected in list/delist proposals.' }
          ]}
          tools={[
            { id: 'incr',  label: 'Incrementality model',    icon: 'GitCompare', detail: 'Causal model: "If this SKU were OOS, how much demand shifts vs disappears?"' },
            { id: 'elast', label: 'Space elasticity',        icon: 'Sliders',    detail: 'Per-SKU curve of sales vs facings — finds the optimal facing count.' },
            { id: 'halo',  label: 'Halo modeller',           icon: 'Sparkles',   detail: 'Detects SKUs that lift their neighbours (e.g. sourdough → butter uplift).' },
            { id: 'plan',  label: 'Planogram generator',     icon: 'LayoutGrid', detail: 'Respects bay width, category adjacencies and brand-block rules.' },
            { id: 'local', label: 'Cluster engine',          icon: 'Globe',      detail: 'Generates cluster-local range variants with per-region KPIs.' }
          ]}
          actions={[
            { id: 'rec',    label: 'List / delist shortlist', icon: 'ClipboardList', detail: 'Evidence-backed buyer brief with expected uplift per line.' },
            { id: 'pog',    label: 'Planogram version',       icon: 'Layout',        detail: 'New planogram version pushed to merch system, with change-log.' },
            { id: 'cluster', label: 'Cluster-local variants', icon: 'Map',           detail: '12 variants — one per cluster — ready for format-specific rollout.' },
            { id: 'sim',    label: 'Category simulation',     icon: 'LineChart',     detail: 'Before/after category revenue, margin and waste simulated for the buyer.' }
          ]}
        />
      }
      demo={
        <DemoShell
          title="Bakery & Morning Goods · 142 SKUs · 10 store clusters · 1 cycle"
          subtitle="Watch the agent score every SKU, flag the tail, surface competitor-range gaps, rebuild the shelf, and localise cluster by cluster."
        >
          {({ playing, runKey }) => <RangeSpaceDemo playing={playing} runKey={runKey} />}
        </DemoShell>
      }
      technicalDetail={
        <ModelCard
          architecture="Causal incrementality (substitute-based) + space-elasticity regression + LLM planogram generator"
          trainingWindow="52-week sales × 840k-basket sample · weekly refresh"
          lastRetrain="2026-04-15 (4 days ago)"
          accuracy="Delist recall on non-obvious candidates 76% (vs naive-tail 41%) · precision 91%"
          accuracyLabel="delist precision (holdout)"
          features={46}
          driftStatus="stable"
          notes={`"Non-obvious" delist candidates are defined as SKUs that are NOT in the bottom-decile of weekly sales-rank — i.e. the ones a naive tail-chop would miss. These are typically mid-volume SKUs that cannibalise a better-margin neighbour (high sales, low incrementality), or SKUs with a declining 12-week trend hidden inside a strong annual total. Evaluation: buyer-labelled gold set of 180 SKUs across bakery, dairy and snacks (90 true-delist, 90 true-keep) where the ground truth came from a 3-month controlled pull-and-replace experiment. Precision 91% / recall 76% reported on that gold set; the naive tail-chop baseline (bottom-decile by sales) scores precision 62% / recall 41% on the same set. Every delist carries a causal incrementality score — not just sales rank. Delist recommendations respect GSCOP: reasonable notice, no retrospective changes, supplier JBP impact modelled. HFSS placement rules respected: no end-cap or checkout-adjacent for qualifying SKUs. Integrates with JDA/Blue Yonder and Relex space-planning exports (POG XML / PAC). Catalogue ROI: Space productivity +11% · Fresh bakery waste -19% · Range review 6w → 2d · TTV 12 weeks.`}
        />
      }
    />
  );
}

// ============================================================================
// Demo component
// ============================================================================
function RangeSpaceDemo({ playing, runKey }) {
  const [phase, setPhase] = useState('idle'); // idle, scored, shortlisted, planogram, clustered
  const [selectedCluster, setSelectedCluster] = useState(null);

  useEffect(() => {
    setPhase('idle');
    setSelectedCluster(null);
  }, [runKey]);

  useEffect(() => {
    if (!playing) return;
    const timers = [];
    timers.push(setTimeout(() => setPhase('scored'), 400));
    timers.push(setTimeout(() => setPhase('shortlisted'), 2600));
    timers.push(setTimeout(() => setPhase('planogram'), 4800));
    timers.push(setTimeout(() => setPhase('clustered'), 7200));
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey]);

  const showScoring = phase !== 'idle';
  const showShortlist = phase === 'shortlisted' || phase === 'planogram' || phase === 'clustered';
  const showPlanogram = phase === 'planogram' || phase === 'clustered';
  const showClusters = phase === 'clustered';

  return (
    <div className="rs-wrap">
      {/* Scatter + trace */}
      <div className="rs-scatter-row">
        <div className="rs-scatter-panel">
          <div className="rs-panel-head">
            <div>
              <span className="eyebrow">SKU decision scatter · incrementality × margin</span>
              <div className="rs-panel-sub">142 SKUs · dot size = weekly volume · zones auto-drawn by policy thresholds. Zones shown at indicative thresholds; production uses per-category thresholds derived from margin distribution and incrementality distribution.</div>
            </div>
            <div className="rs-legend">
              <span className="rs-leg"><i className="rs-dot-champion" /> Champion</span>
              <span className="rs-leg"><i className="rs-dot-review" /> Review</span>
              <span className="rs-leg"><i className="rs-dot-delist" /> Delist</span>
              <span className="rs-leg"><i className="rs-dot-list" /> List (new)</span>
            </div>
          </div>
          <Scatter2D showScoring={showScoring} showShortlist={showShortlist} />
        </div>
        <div className="rs-trace">
          <ReasoningTrace steps={TRACE_STEPS} playing={playing} speed={1.25} />
        </div>
      </div>

      {/* Delist / List shortlist */}
      <div className="rs-shortlist">
        <div className="rs-card-col">
          <div className="rs-col-head">
            <span className="eyebrow eyebrow-pink">Recommended delist · 3 SKUs</span>
            <span className="rs-col-meta">Reclaimable space: 6 facings · £5.2k/wk</span>
          </div>
          {NAMED.filter((s) => s.zone === 'delist').map((s, i) => (
            <motion.div
              key={s.id}
              className="rs-card rs-card-delist"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: showShortlist ? 1 : 0.2, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <div className="rs-card-head">
                <span className="rs-card-name">{s.name}</span>
                <span className="rs-card-kind">DELIST</span>
              </div>
              <div className="rs-card-stats">
                <Explain
                  title={`Incrementality · ${s.incr}%`}
                  factors={[
                    { label: 'Net new demand',    weight: s.incr / 100 },
                    { label: 'Cannibalises sub',  weight: -s.cannibal / 100 },
                    { label: 'Margin contribution', weight: s.margin / 100 * 0.4 }
                  ]}
                  dataSource={`840k basket analysis · 52w window · when OOS, ${s.cannibal}% of baskets still include ${s.subSku}`}
                  counterfactual={`Keep listed: £${Math.round(s.vol * 0.6)}/wk sales, mostly cannibalising ${s.subSku}. Delist: -${s.cannibal}% overlap, +£${Math.round(s.vol * s.margin / 100 * 4)}/wk reclaimed.`}
                  wide inline
                >
                  <div><span>Incrementality</span><b>{s.incr}%</b></div>
                </Explain>
                <div><span>Margin</span><b>{s.margin}%</b></div>
                <div><span>Cannibalises</span><b className="is-pink">{s.cannibal}%</b></div>
              </div>
              <div className="rs-card-sub">Substitutes to: <b>{s.subSku}</b></div>
              <div className="rs-card-why">{s.rationale}</div>
            </motion.div>
          ))}
        </div>
        <div className="rs-card-col">
          <div className="rs-col-head">
            <span className="eyebrow">Recommended list · 2 SKUs</span>
            <span className="rs-col-meta">New demand from competitor gap + search trend</span>
          </div>
          {NAMED.filter((s) => s.zone === 'list').map((s, i) => (
            <motion.div
              key={s.id}
              className="rs-card rs-card-list"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: showShortlist ? 1 : 0.2, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.12 }}
            >
              <div className="rs-card-head">
                <span className="rs-card-name">{s.name}</span>
                <span className="rs-card-kind rs-kind-list">LIST</span>
              </div>
              <div className="rs-card-stats">
                <div><span>Incrementality</span><b>{s.incr}%</b></div>
                <div><span>Margin</span><b>{s.margin}%</b></div>
                <div><span>Predicted</span><b className="is-accent">{s.predicted}</b></div>
              </div>
              <div className="rs-card-sub">Source: {s.source}</div>
              <div className="rs-card-why"><Icons.Sparkles size={11} /> Halo: {s.halo}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Planogram rebuild */}
      <div className="rs-pog">
        <div className="rs-pog-head">
          <div>
            <span className="eyebrow">Planogram rebuild · before → after</span>
            <div className="rs-panel-sub">Bay width · 12 facings · 3 shelves · bakery & morning goods</div>
          </div>
          <div className="rs-pog-stats">
            <span className="rs-pog-stat">Delisted <b>3</b></span>
            <span className="rs-pog-stat">Listed <b>2</b></span>
            <span className="rs-pog-stat">Re-faced <b>3</b></span>
            <span className="rs-pog-stat">Category uplift <b className="is-accent">+3.4%</b></span>
          </div>
        </div>
        <div className="rs-pog-row">
          <Bay label="BEFORE" subLabel="Current planogram v2026-W15" plan={PLAN_BEFORE} dim={!showPlanogram} />
          <div className="rs-pog-arrow"><Icons.ArrowRight size={20} /></div>
          <Bay label="AFTER" subLabel="Agent-rebuilt v2026-W16" plan={PLAN_AFTER} highlight animate={showPlanogram} />
        </div>
      </div>

      {/* UK cluster map */}
      <div className="rs-clusters">
        <div className="rs-pog-head">
          <div>
            <span className="eyebrow">Cluster-local range · 12 variants</span>
            <div className="rs-panel-sub">Click a cluster to see its local delta · uplift simulated per region</div>
          </div>
          <div className="rs-pog-stats">
            <span className="rs-pog-stat">Clusters <b>12</b></span>
            <span className="rs-pog-stat">Stores <b>380</b></span>
            <span className="rs-pog-stat">Weighted uplift <b className="is-accent">+3.4%</b></span>
          </div>
        </div>
        <div style={{ padding: '8px 12px', margin: '0 0 12px', background: 'rgba(247, 184, 74, 0.06)', border: '1px solid rgba(247, 184, 74, 0.2)', borderRadius: '8px', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <b style={{ color: '#F7B84A' }}>Illustrative demo.</b> Cluster geometry is based on real UK regions, but SKU list, uplift figures, store counts and planogram layouts are <i>synthetic</i> — a worked example of the agent's output shape, not a production result. In a live engagement each cluster is rebuilt from your 52-week sales history, basket co-purchase and supplier contract terms.
        </div>
        <div className="rs-clusters-row">
          <div className="rs-cluster-map">
            <MapContainer center={UK_CENTER} zoom={6} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} attributionControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={19}
              />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={19}
                opacity={0.6}
              />
              {CLUSTERS.map((c) => {
                const isSel = selectedCluster?.id === c.id;
                const radius = Math.max(10, Math.sqrt(c.stores) * 2.2);
                return (
                  <CircleMarker
                    key={c.id}
                    center={c.center}
                    radius={radius}
                    pathOptions={{
                      color: isSel ? '#26EA9F' : '#E82AAE',
                      fillColor: isSel ? '#26EA9F' : '#E82AAE',
                      fillOpacity: showClusters ? (isSel ? 0.6 : 0.25) : 0.05,
                      weight: isSel ? 3 : 1.5
                    }}
                    eventHandlers={{ click: () => setSelectedCluster(c) }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -8]} className="rs-cluster-tt">
                      <b>{c.name}</b> · {c.stores} stores · +{c.uplift}%
                    </LeafletTooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
          <div className="rs-cluster-detail">
            {selectedCluster ? (
              <motion.div key={selectedCluster.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="rs-cluster-head"><b>{selectedCluster.name}</b> · {selectedCluster.stores} stores</div>
                <div className="rs-cluster-delta"><Icons.Sparkles size={13} /> {selectedCluster.delta}</div>
                <div className="rs-cluster-uplift">Predicted category uplift <b>+{selectedCluster.uplift}%</b></div>
              </motion.div>
            ) : (
              <div className="rs-cluster-hint">
                <Icons.MousePointerClick size={20} />
                <span>Pick a cluster to see its local range delta.</span>
              </div>
            )}
            <div className="rs-cluster-list">
              {CLUSTERS.map((c) => (
                <button
                  key={c.id}
                  className={`rs-cluster-row ${selectedCluster?.id === c.id ? 'is-on' : ''}`}
                  onClick={() => setSelectedCluster(c)}
                >
                  <span className="rs-cluster-name">{c.name}</span>
                  <span className="rs-cluster-stores">{c.stores} stores</span>
                  <span className="rs-cluster-u">+{c.uplift}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2D scatter (recharts)
// ============================================================================
function Scatter2D({ showScoring, showShortlist }) {
  // Partition SKUs into channels
  const champions = ALL_SKUS.filter((s) => s.incr >= 60 && s.margin >= 20);
  const delists   = ALL_SKUS.filter((s) => (s.zone === 'delist') || (s.incr < 30 && s.margin < 15));
  const listers   = ALL_SKUS.filter((s) => s.zone === 'list');
  const review    = ALL_SKUS.filter((s) => !champions.includes(s) && !delists.includes(s) && !listers.includes(s));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" />
        <XAxis type="number" dataKey="incr" domain={[0, 100]} stroke="#6B6B85" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `${v}%`} label={{ value: 'Incrementality', position: 'insideBottom', offset: -5, fill: '#6B6B85', fontSize: 10 }} />
        <YAxis type="number" dataKey="margin" domain={[0, 40]} stroke="#6B6B85" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickFormatter={(v) => `${v}%`} />
        <ZAxis type="number" dataKey="vol" range={[20, 200]} />
        <Tooltip
          cursor={{ stroke: 'rgba(38, 234, 159, 0.2)' }}
          contentStyle={{ background: '#11111C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const p = payload[0].payload;
            if (!p.name || p.name.startsWith('SKU ')) return (
              <div style={{ background: '#11111C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                <div>Incr {p.incr}% · Margin {p.margin}%</div>
                <div style={{ color: '#6B6B85', fontSize: 11 }}>vol {p.vol}/wk</div>
              </div>
            );
            return (
              <div style={{ background: '#11111C', border: '1px solid rgba(38,234,159,0.4)', borderRadius: 8, padding: '8px 12px', fontSize: 12, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                <div>Incr {p.incr}% · Margin {p.margin}% · vol {p.vol}/wk</div>
                {p.rationale && <div style={{ color: '#E82AAE', fontSize: 11, marginTop: 4 }}>{p.rationale}</div>}
              </div>
            );
          }}
        />
        {/* Zone reference areas — appear after scoring */}
        {showScoring && (
          <>
            <ReferenceArea x1={0}  x2={30}  y1={0}  y2={15}  fill="#E82AAE" fillOpacity={0.08} stroke="rgba(232,42,174,0.3)" strokeDasharray="3 3" label={{ value: 'DELIST', fill: '#E82AAE', fontSize: 10, position: 'insideTopLeft' }} />
            <ReferenceArea x1={60} x2={100} y1={20} y2={40}  fill="#26EA9F" fillOpacity={0.08} stroke="rgba(38,234,159,0.3)" strokeDasharray="3 3" label={{ value: 'CHAMPION', fill: '#26EA9F', fontSize: 10, position: 'insideTopRight' }} />
          </>
        )}
        {/* Background review dots */}
        <Scatter data={review} fill="#6B6B85" fillOpacity={0.55} />
        {/* Champion dots */}
        <Scatter data={champions} fill="#26EA9F" fillOpacity={0.85} />
        {/* Delist dots */}
        <Scatter data={delists} fill="#E82AAE" fillOpacity={0.9} />
        {/* List candidates — pulse */}
        {showShortlist && <Scatter data={listers} fill="#F7B84A" fillOpacity={1} />}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Bay — planogram rendering. Facings resize when the "after" plan animates in.
// ============================================================================
function Bay({ label, subLabel, plan, dim = false, highlight = false, animate = false }) {
  return (
    <div className={`rs-bay ${dim ? 'rs-bay-dim' : ''} ${highlight ? 'rs-bay-highlight' : ''}`}>
      <div className="rs-bay-head">
        <span className="rs-bay-label">{label}</span>
        <span className="rs-bay-sub">{subLabel}</span>
      </div>
      <div className="rs-bay-shelves">
        {plan.map((shelf, sIdx) => {
          const totalFacings = shelf.reduce((sum, s) => sum + s.facings, 0);
          return (
            <div key={sIdx} className="rs-bay-shelf">
              {shelf.map((slot, i) => (
                <motion.div
                  key={slot.sku + i}
                  className={`rs-bay-slot ${slot.change ? `rs-bay-slot-${slot.change}` : ''}`}
                  style={{ '--slot-color': slot.color }}
                  initial={animate ? { flex: slot.change === 'new' ? 0 : slot.facings, opacity: slot.change === 'new' ? 0 : 1 } : false}
                  animate={{ flex: slot.facings, opacity: 1 }}
                  transition={{ duration: 0.8, delay: animate ? sIdx * 0.2 + i * 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="rs-bay-sku">{slot.sku}</div>
                  <div className="rs-bay-facings">{slot.facings} × facing{slot.facings !== 1 ? 's' : ''}</div>
                  {slot.change === 'new' && <div className="rs-bay-badge rs-bay-badge-new">NEW</div>}
                  {slot.change === 'expand' && <div className="rs-bay-badge rs-bay-badge-expand">+1</div>}
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
      {highlight && (
        <div className="rs-bay-reasons">
          {plan.flat().filter((s) => s.reason).map((s, i) => (
            <div key={i} className={`rs-bay-reason rs-bay-reason-${s.change}`}>
              <b>{s.sku}</b> · {s.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
