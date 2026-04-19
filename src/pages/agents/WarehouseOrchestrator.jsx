import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import Explain from '../../components/ui/Explain.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './WarehouseOrchestrator.css';

// ============================================================================
// Warehouse zones, SKU positions and pick batches (SVG grid)
// ============================================================================
const ZONES = [
  { id: 'A', name: 'Zone A · Ambient fast',    x: 60,  y: 80,  w: 280, h: 220, heat: 0.95, skuCount: 412, vClass: 'A-class' },
  { id: 'B', name: 'Zone B · Ambient core',    x: 360, y: 80,  w: 280, h: 220, heat: 0.70, skuCount: 698, vClass: 'B-class' },
  { id: 'C', name: 'Zone C · Ambient slow',    x: 660, y: 80,  w: 280, h: 220, heat: 0.28, skuCount: 214, vClass: 'C-class' },
  { id: 'D', name: 'Zone D · Chilled',         x: 60,  y: 320, w: 280, h: 220, heat: 0.82, skuCount: 186, vClass: 'A-class' },
  { id: 'E', name: 'Zone E · Frozen',          x: 360, y: 320, w: 280, h: 220, heat: 0.55, skuCount: 142, vClass: 'B-class' },
  { id: 'F', name: 'Zone F · Bulky / returns', x: 660, y: 320, w: 280, h: 220, heat: 0.18, skuCount: 160, vClass: 'C-class' }
];

// Representative SKUs per zone — small unlabelled dots so paths have anchor points
const ZONE_SKUS = {
  A: [ { x: 120, y: 140 }, { x: 180, y: 150 }, { x: 240, y: 150 }, { x: 300, y: 150 }, { x: 130, y: 200 }, { x: 200, y: 220 }, { x: 280, y: 220 }, { x: 150, y: 260 }, { x: 240, y: 270 }, { x: 310, y: 265 } ],
  B: [ { x: 420, y: 140 }, { x: 480, y: 140 }, { x: 560, y: 140 }, { x: 610, y: 155 }, { x: 430, y: 200 }, { x: 500, y: 210 }, { x: 580, y: 215 }, { x: 440, y: 260 }, { x: 520, y: 265 }, { x: 600, y: 270 } ],
  C: [ { x: 720, y: 145 }, { x: 780, y: 150 }, { x: 840, y: 150 }, { x: 900, y: 160 }, { x: 730, y: 210 }, { x: 800, y: 215 }, { x: 870, y: 220 }, { x: 740, y: 270 }, { x: 820, y: 275 }, { x: 900, y: 270 } ],
  D: [ { x: 130, y: 380 }, { x: 200, y: 385 }, { x: 280, y: 390 }, { x: 140, y: 440 }, { x: 220, y: 445 }, { x: 300, y: 450 }, { x: 160, y: 500 }, { x: 250, y: 505 }, { x: 320, y: 500 } ],
  E: [ { x: 430, y: 385 }, { x: 500, y: 390 }, { x: 570, y: 395 }, { x: 620, y: 400 }, { x: 440, y: 450 }, { x: 520, y: 455 }, { x: 600, y: 460 }, { x: 450, y: 505 }, { x: 540, y: 510 } ],
  F: [ { x: 740, y: 400 }, { x: 820, y: 395 }, { x: 890, y: 400 }, { x: 750, y: 460 }, { x: 830, y: 465 }, { x: 900, y: 465 }, { x: 760, y: 510 }, { x: 850, y: 510 } ]
};

const DOCK = { x: 100, y: 600 };

// Mis-slotted SKUs (before optimisation) and where they should go (after)
// All originate in slow zones (C / D), all move into fast / core.
// SHAP factors explain WHY the slot optimiser picked this move; sum ≈ net score.
const SLOT_MOVES = [
  { sku: 'Yorkshire Tea 240-bag',  from: { x: 870, y: 155, zone: 'C' }, to: { x: 180, y: 150, zone: 'A' }, velocity: '280 picks/wk', save: '-22m',
    reason: 'A-class velocity (280× last week). Moving near-dock saves 22m per pick.',
    factors: [
      { label: 'Velocity vs zone',     weight: +0.46 },
      { label: 'Distance to dock',     weight: -0.22 },
      { label: 'Co-pick correlation',  weight: +0.08 },
      { label: 'Weight class',         weight: +0.02 }
    ] },
  { sku: 'Kingsmill 50/50 800g',   from: { x: 300, y: 390, zone: 'D' }, to: { x: 420, y: 140, zone: 'B' }, velocity: '190 picks/wk', save: '-14m',
    reason: 'Zone D→B reslot (ambient optimisation). Consolidates with Hovis & Warburtons in Zone B.',
    factors: [
      { label: 'Zone reslot (D→B)',    weight: +0.38 },
      { label: 'Category adjacency',   weight: +0.18 },
      { label: 'Distance to dock',     weight: -0.14 },
      { label: 'Velocity vs zone',     weight: +0.12 }
    ] },
  { sku: 'Hovis Wholemeal',        from: { x: 900, y: 160, zone: 'C' }, to: { x: 480, y: 140, zone: 'B' }, velocity: '160 picks/wk', save: '-18m',
    reason: 'Picker travel -18m per pick; co-pick with Warburtons 62% of the time.',
    factors: [
      { label: 'Co-pick with Warburtons', weight: +0.42 },
      { label: 'Distance to dock',        weight: -0.18 },
      { label: 'Velocity vs zone',        weight: +0.14 },
      { label: 'Brand-block rule',        weight: +0.08 }
    ] },
  { sku: 'Walkers Crisps 6pk',     from: { x: 820, y: 275, zone: 'C' }, to: { x: 240, y: 150, zone: 'A' }, velocity: '210 picks/wk', save: '-20m',
    reason: 'Co-pick with Coke 6pk 71% of the time — cluster them in Zone A.',
    factors: [
      { label: 'Co-pick with Coke 6pk', weight: +0.51 },
      { label: 'Velocity vs zone',     weight: +0.22 },
      { label: 'Distance to dock',     weight: -0.20 },
      { label: 'Category adjacency',   weight: +0.05 }
    ] }
];

// Carbon calc breakdown — shown as a sub-explainer on the CO₂e metric
const CARBON_BREAKDOWN = [
  { label: 'Miles saved · 184mi',                    value: '184 × 0.210 kg/mi', result: 38.6, unit: 'kg' },
  { label: 'Idle-time saved · 47min',                value: '47 × 0.044 kg/min',  result: 2.1,  unit: 'kg' },
  { label: 'Cube utilisation · fewer return trips',  value: '12 trips × 11.3 kg', result: 135,  unit: 'kg' },
  { label: 'Refrigerated duty cycle · shorter run',  value: '4h × 2.1 kg/h',      result: 8.4,  unit: 'kg' }
];

// 3 batched orders — "after" uses moved SKU destinations.
// Each stop carries the SKU name so the numbered pick-path tells a story.
const PICK_BATCHES = [
  {
    id: 'o-4812', label: 'Batch 4812 · ambient + chilled last-on', orders: 3, items: 18, color: '#26EA9F',
    stops: [
      // AFTER state (post-slotting)
      { n: 1, label: 'Yorkshire Tea 240',   at: { x: 180, y: 150 }, compartment: 'ambient' },
      { n: 2, label: 'Walkers Crisps 6pk',  at: { x: 240, y: 150 }, compartment: 'ambient' },
      { n: 3, label: 'Hovis Wholemeal',     at: { x: 480, y: 140 }, compartment: 'ambient' },
      { n: 4, label: 'Semi-skimmed Milk',   at: { x: 200, y: 385 }, compartment: 'chilled-last-on' },
      { n: 5, label: 'Frozen Peas',         at: { x: 430, y: 385 }, compartment: 'frozen-tote' }
    ],
    // BEFORE state — same items, but several are in Zone C
    stopsBefore: [
      { n: 1, label: 'Yorkshire Tea 240',   at: { x: 870, y: 155 }, compartment: 'ambient' },
      { n: 2, label: 'Walkers Crisps 6pk',  at: { x: 820, y: 275 }, compartment: 'ambient' },
      { n: 3, label: 'Hovis Wholemeal',     at: { x: 900, y: 160 }, compartment: 'ambient' },
      { n: 4, label: 'Semi-skimmed Milk',   at: { x: 200, y: 385 }, compartment: 'chilled-last-on' },
      { n: 5, label: 'Frozen Peas',         at: { x: 430, y: 385 }, compartment: 'frozen-tote' }
    ]
  },
  {
    id: 'o-4815', label: 'Batch 4815', orders: 3, items: 22, color: '#F7B84A',
    stops: [
      { n: 1, label: 'Coke 6pk',            at: { x: 120, y: 140 } },
      { n: 2, label: 'Kingsmill 50/50',     at: { x: 420, y: 140 } },
      { n: 3, label: 'Olive Oil',           at: { x: 560, y: 140 } },
      { n: 4, label: 'Cheddar 400g',        at: { x: 140, y: 440 } },
      { n: 5, label: 'Ice Cream 1L',        at: { x: 500, y: 390 } }
    ],
    stopsBefore: [
      { n: 1, label: 'Coke 6pk',            at: { x: 120, y: 140 } },
      { n: 2, label: 'Kingsmill 50/50',     at: { x: 300, y: 390 } },
      { n: 3, label: 'Olive Oil',           at: { x: 560, y: 140 } },
      { n: 4, label: 'Cheddar 400g',        at: { x: 140, y: 440 } },
      { n: 5, label: 'Ice Cream 1L',        at: { x: 500, y: 390 } }
    ]
  },
  {
    id: 'o-4817', label: 'Batch 4817', orders: 2, items: 11, color: '#8A7DF7',
    stops: [
      { n: 1, label: 'Heinz Beans',         at: { x: 200, y: 220 } },
      { n: 2, label: 'Hovis Wholemeal',     at: { x: 480, y: 140 } },
      { n: 3, label: 'Tinned Tomatoes',     at: { x: 580, y: 215 } },
      { n: 4, label: 'Greek Yoghurt',       at: { x: 280, y: 390 } }
    ],
    stopsBefore: [
      { n: 1, label: 'Heinz Beans',         at: { x: 200, y: 220 } },
      { n: 2, label: 'Hovis Wholemeal',     at: { x: 900, y: 160 } },
      { n: 3, label: 'Tinned Tomatoes',     at: { x: 580, y: 215 } },
      { n: 4, label: 'Greek Yoghurt',       at: { x: 280, y: 390 } }
    ]
  }
];

// ============================================================================
// Last-mile: Leeds-area delivery drops + routes (real coordinates)
// ============================================================================
const DC_COORD = [53.7430, -1.5989]; // Morley — Leeds DC
const LEEDS_CENTER = [53.815, -1.553];

// 36 fictional drops around Leeds, assigned to one of 6 vans in the optimised plan.
// Before-plan assignment is deliberately scattered; after-plan assignment is geographically clean.
const DROPS = [
  // North Leeds (Moortown / Alwoodley) — van 1
  { id: 1,  lat: 53.853, lng: -1.516, before: 3, after: 1 },
  { id: 2,  lat: 53.855, lng: -1.528, before: 4, after: 1 },
  { id: 3,  lat: 53.848, lng: -1.519, before: 2, after: 1 },
  { id: 4,  lat: 53.861, lng: -1.532, before: 5, after: 1 },
  { id: 5,  lat: 53.844, lng: -1.508, before: 1, after: 1 },
  { id: 6,  lat: 53.852, lng: -1.540, before: 6, after: 1 },
  // Chapel Allerton / Roundhay — van 2
  { id: 7,  lat: 53.833, lng: -1.527, before: 5, after: 2 },
  { id: 8,  lat: 53.828, lng: -1.513, before: 3, after: 2 },
  { id: 9,  lat: 53.830, lng: -1.502, before: 2, after: 2 },
  { id: 10, lat: 53.838, lng: -1.523, before: 6, after: 2 },
  { id: 11, lat: 53.825, lng: -1.504, before: 4, after: 2 },
  { id: 12, lat: 53.834, lng: -1.494, before: 1, after: 2 },
  // Leeds city + Woodhouse — van 3
  { id: 13, lat: 53.803, lng: -1.548, before: 1, after: 3 },
  { id: 14, lat: 53.800, lng: -1.562, before: 4, after: 3 },
  { id: 15, lat: 53.810, lng: -1.558, before: 6, after: 3 },
  { id: 16, lat: 53.798, lng: -1.540, before: 2, after: 3 },
  { id: 17, lat: 53.807, lng: -1.545, before: 5, after: 3 },
  { id: 18, lat: 53.795, lng: -1.552, before: 3, after: 3 },
  // Headingley / Hyde Park — van 4
  { id: 19, lat: 53.820, lng: -1.577, before: 2, after: 4 },
  { id: 20, lat: 53.823, lng: -1.586, before: 5, after: 4 },
  { id: 21, lat: 53.815, lng: -1.583, before: 1, after: 4 },
  { id: 22, lat: 53.819, lng: -1.570, before: 6, after: 4 },
  { id: 23, lat: 53.826, lng: -1.593, before: 3, after: 4 },
  { id: 24, lat: 53.813, lng: -1.574, before: 4, after: 4 },
  // Horsforth / Pudsey — van 5
  { id: 25, lat: 53.846, lng: -1.635, before: 6, after: 5 },
  { id: 26, lat: 53.845, lng: -1.651, before: 2, after: 5 },
  { id: 27, lat: 53.840, lng: -1.617, before: 5, after: 5 },
  { id: 28, lat: 53.805, lng: -1.660, before: 3, after: 5 },
  { id: 29, lat: 53.800, lng: -1.678, before: 1, after: 5 },
  { id: 30, lat: 53.810, lng: -1.648, before: 4, after: 5 },
  // South Leeds (Beeston / Hunslet) — van 6
  { id: 31, lat: 53.778, lng: -1.563, before: 2, after: 6 },
  { id: 32, lat: 53.773, lng: -1.545, before: 6, after: 6 },
  { id: 33, lat: 53.776, lng: -1.578, before: 1, after: 6 },
  { id: 34, lat: 53.770, lng: -1.532, before: 4, after: 6 },
  { id: 35, lat: 53.765, lng: -1.560, before: 3, after: 6 },
  { id: 36, lat: 53.782, lng: -1.549, before: 5, after: 6 }
];

const VEHICLES = [
  { id: 1, name: 'Van · LDS-01', driver: 'Amir H.', cubePctBefore: 62, cubePctAfter: 84, stopsBefore: 6, stopsAfter: 6, milesBefore: 74, milesAfter: 54, color: '#26EA9F' },
  { id: 2, name: 'Van · LDS-02', driver: 'Niamh F.', cubePctBefore: 48, cubePctAfter: 78, stopsBefore: 6, stopsAfter: 6, milesBefore: 81, milesAfter: 58, color: '#F7B84A' },
  { id: 3, name: 'Van · LDS-03', driver: 'Tom W.',   cubePctBefore: 71, cubePctAfter: 88, stopsBefore: 6, stopsAfter: 6, milesBefore: 62, milesAfter: 46, color: '#8A7DF7' },
  { id: 4, name: 'Van · LDS-04', driver: 'Sara O.',  cubePctBefore: 55, cubePctAfter: 80, stopsBefore: 6, stopsAfter: 6, milesBefore: 69, milesAfter: 48, color: '#E82AAE' },
  { id: 5, name: 'Van · LDS-05', driver: 'Ben K.',   cubePctBefore: 40, cubePctAfter: 76, stopsBefore: 6, stopsAfter: 6, milesBefore: 92, milesAfter: 64, color: '#5CFFB8' },
  { id: 6, name: 'Van · LDS-06', driver: 'Ellie P.', cubePctBefore: 58, cubePctAfter: 82, stopsBefore: 6, stopsAfter: 6, milesBefore: 72, milesAfter: 52, color: '#FF69C8' }
];

// Warehouse-view trace — focused on the DC floor
const WAREHOUSE_TRACE = [
  { type: 'tool',   label: 'pull_wave_orders(DC=LDS-3, window=24h)',     body: '2,413 orders · 18 pickers · wave window 05:00–19:00.' },
  { type: 'tool',   label: 'classify_sku_velocity(30d)',                  body: '1,812 SKUs classified · 412 A-class · 698 B · 702 C.' },
  { type: 'think',  label: 'Detect 3 mis-slotted SKUs in Zone C (+1 in Zone D) with A-class velocity — recommend relocation to A / B.' },
  { type: 'tool',   label: 'optimize_slotting(velocity × distance × co-pick)', body: '4 slot moves generated · expected −14% travel per pick (312m → 267m).' },
  { type: 'tool',   label: 'batch_orders(co_pick, cube, weight)',         body: '2,413 orders → 806 batches · avg 3.0 orders / batch.' },
  { type: 'tool',   label: 'plan_pick_paths(TSP-style, single picker)',    body: 'Per-batch path optimised under MOQ + cube + weight.' },
  { type: 'think',  label: 'Detect 2-picker shortfall in peak hour (05:00–07:00). Offer overtime to 2 flex pickers; redistribute 40 orders to afternoon wave.' },
  { type: 'result', label: 'Wave plan dispatched to WMS.',                 body: 'Slot-move tickets to the yard team; pick paths to the RF handhelds.' }
];

// Last-mile trace — focused on the fleet and the map
const LASTMILE_TRACE = [
  { type: 'tool',   label: 'pull_wave_orders(DC=LDS-3, window=24h)',       body: '2,413 orders · 14 vans · 36 drops shown across 6 vans.' },
  { type: 'tool',   label: 'build_loads(bin_packing, RF_split)',           body: 'Cube utilisation: 62% → 82% mean · 14 vans · 9 with chilled compartments.' },
  { type: 'tool',   label: 'optimize_routes(VRP + time_windows + traffic)', body: 'Mean route length 34 min (vs 48 min pre-opt). M1 roadworks factored.' },
  { type: 'tool',   label: 'allocate_drivers(skills, shift_length)',        body: '14 drivers assigned · refrigerated-van certified preserved · 2 flex slots for surge.' },
  { type: 'tool',   label: 'calc_carbon(routes, fleet_profile)',            body: 'Estimated −184 kg CO₂e vs baseline · DEFRA 2024 factors applied.' },
  { type: 'result', label: 'Route sheets dispatched to TMS and driver app.', body: 'Live ETAs surfaced to customers. 0 orders forecast beyond SLA.' }
];

// ============================================================================
// Main
// ============================================================================
export default function WarehouseOrchestrator({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Warehouse & Last-Mile Orchestrator"
          signals={[
            { id: 'wms',   label: 'WMS (stock, locations)', icon: 'Warehouse',  detail: 'Live inventory by slot + picking history for velocity scoring.' },
            { id: 'oms',   label: 'OMS (order pipeline)',   icon: 'PackageOpen',detail: 'Every confirmed online basket, with time-window promises and weight/cube.' },
            { id: 'tel',   label: 'Vehicle telemetry (GPS)', icon: 'Navigation', detail: 'Live positions, speed, dwell — used for re-planning mid-route.' },
            { id: 'rost',  label: 'Driver & picker roster',  icon: 'Users',     detail: 'Shift patterns, skills (RF, chilled, bulky), hours and overtime flex.' },
            { id: 'ext',   label: 'Traffic + weather',       icon: 'CloudRain', detail: 'Live traffic (incl. M1 roadworks), 24h weather — factored into ETA and cube.' }
          ]}
          tools={[
            { id: 'slot',   label: 'Slotting optimiser',       icon: 'LayoutGrid', detail: 'Scores velocity × distance-to-dock × co-pick correlation × weight class.' },
            { id: 'path',   label: 'Pick-batching + path planner', icon: 'Route',    detail: 'Clusters orders into batches, solves a TSP-style path per batch under MOQ + cube.' },
            { id: 'load',   label: 'Load builder (bin-pack)',   icon: 'Box',         detail: 'Packs vans respecting weight, cube, chilled-compartment/ambient separation and fragile rules.' },
            { id: 'vrp',    label: 'Route optimiser (VRP)',     icon: 'MapPinned',   detail: 'Vehicle-routing solver with time windows, traffic and driver skill as constraints.' },
            { id: 'carbon', label: 'Carbon + cost calculator',  icon: 'Leaf',        detail: 'Reports kg CO₂e per plan so carbon is a first-class optimisation input, not an afterthought.' }
          ]}
          actions={[
            { id: 'wave',  label: 'Wave plan → WMS',       icon: 'Send',        detail: 'Slot moves, batch list, pick paths pushed to the WMS / RF terminal.' },
            { id: 'route', label: 'Route sheets → TMS',    icon: 'SendHorizontal', detail: 'Routes published to the driver app with live ETA and stop order.' },
            { id: 'alert', label: 'Labour gap alert',      icon: 'AlertTriangle', detail: 'Detected shortfall escalated to the DC manager with a recommended response.' }
          ]}
        />
      }
      demo={
        <DemoShell
          title="Thursday 18:45 at the Leeds DC — tomorrow's wave in one plan"
          subtitle="Toggle between the warehouse floor and the delivery map. Same agent, same run, two views of the same plan."
        >
          {({ playing, runKey }) => <OrchestratorDemo playing={playing} runKey={runKey} />}
        </DemoShell>
      }
      technicalDetail={
        <div className="wo-tech">
          <ModelCard
            architecture="Two-stage solver: OR-Tools VRP (routing) + custom bin-pack (loading) + gradient-boosted slotting scorer"
            trainingWindow="Rolling 90 days of pick + route telemetry · 2.1M order-lines"
            lastRetrain="2026-04-02 (2 weeks ago)"
            accuracy="Route gap to solver optimum · 2.4%"
            accuracyLabel="VRP quality"
            features={54}
            driftStatus="stable"
            notes="The agent runs the whole wave re-plan in ~14s warm solver (OR-Tools, 8 vCPU, cold-start 48s). Every decision carries a feature-level contribution log so buyers can audit or override any single move. DVSA drivers' hours, tachograph and WTD enforced pre-dispatch · no reassignment that breaches hours cap. Labour reassignment proposals require manager HITL approval; works-council agreement respected (Unite/USDAW terms). Co-pick signals derived from anonymised basket data; no supplier-specific optimisation without commercial approval."
          />
        </div>
      }
    />
  );
}

// ============================================================================
// Demo
// ============================================================================
function OrchestratorDemo({ playing, runKey }) {
  const [view, setView] = useState('warehouse'); // 'warehouse' or 'lastmile'
  const [stage, setStage] = useState('slotting'); // slotting | picking | compare
  const [selectedBatch, setSelectedBatch] = useState('o-4812');
  const [revealedMoves, setRevealedMoves] = useState(0);
  const [lastMileOptimised, setLastMileOptimised] = useState(false);

  // True once the slotting moves have played through — needed for batch paths
  // to show their post-slotting positions.
  const slottingDone = revealedMoves >= SLOT_MOVES.length;

  useEffect(() => {
    setStage('slotting');
    setRevealedMoves(0);
    setLastMileOptimised(false);
  }, [runKey]);

  useEffect(() => {
    if (!playing) return;
    const timers = [];
    SLOT_MOVES.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealedMoves(i + 1), 700 + i * 650));
    });
    // After slotting, step through to picking
    timers.push(setTimeout(() => setStage('picking'), 700 + SLOT_MOVES.length * 650 + 700));
    timers.push(setTimeout(() => setLastMileOptimised(true), 800));
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey]);

  const batch = PICK_BATCHES.find((b) => b.id === selectedBatch) || PICK_BATCHES[0];

  return (
    <div className="wo-wrap">
      {/* Site header — single fulfilment model */}
      <div style={{ padding: '8px 12px', fontSize: '12px', color: '#E4E4EE', letterSpacing: '0.02em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        Leeds regional hub · 2,413 online orders · Thursday wave · Leeds regional hub · store-pick wave
      </div>
      {/* View toggle + wave header */}
      <div className="wo-header">
        <div className="wo-view-toggle">
          <button className={`wo-tab ${view === 'warehouse' ? 'wo-tab-on' : ''}`} onClick={() => setView('warehouse')}>
            <Icons.Warehouse size={14} /> Warehouse
          </button>
          <button className={`wo-tab ${view === 'lastmile' ? 'wo-tab-on' : ''}`} onClick={() => setView('lastmile')}>
            <Icons.MapPinned size={14} /> Last-mile
          </button>
        </div>
        <div className="wo-header-right">
          {view === 'lastmile' && (
            <button
              className={`wo-opt-btn ${lastMileOptimised ? 'is-on' : ''}`}
              onClick={() => setLastMileOptimised(!lastMileOptimised)}
            >
              <Icons.Wand2 size={13} /> {lastMileOptimised ? 'Optimised routes' : 'Baseline routes'}
            </button>
          )}
          <div className="wo-wave">
            <span className="wo-wave-label">Wave · Fri 05:00–19:00</span>
            <span className="wo-wave-metric"><b>2,413</b> orders</span>
            <span className="wo-wave-metric"><b>14</b> vans</span>
            <span className="wo-wave-metric"><b>18</b> pickers</span>
          </div>
        </div>
      </div>

      {/* Warehouse-only stage selector */}
      {view === 'warehouse' && (
        <div className="wo-stages">
          <StageButton
            n={1} label="Slotting" active={stage === 'slotting'}
            onClick={() => setStage('slotting')}
            desc="Move mis-slotted SKUs to high-velocity zones"
          />
          <StageButton
            n={2} label="Pick paths" active={stage === 'picking'}
            onClick={() => setStage('picking')}
            desc="Watch one batch at a time"
          />
          <StageButton
            n={3} label="Before ↔ After" active={stage === 'compare'}
            onClick={() => setStage('compare')}
            desc="Same batch, both states, one screen"
          />
        </div>
      )}

      <div className="wo-body">
        <div className="wo-stage">
          {view === 'warehouse' ? (
            <WarehouseFloor
              stage={stage}
              revealedMoves={revealedMoves}
              slottingDone={slottingDone}
              batch={batch}
              selectedBatch={selectedBatch}
              setSelectedBatch={setSelectedBatch}
            />
          ) : (
            <LastMileMap optimised={lastMileOptimised} />
          )}
        </div>

        <div className="wo-side">
          <ReasoningTrace
            key={view}
            steps={view === 'warehouse' ? WAREHOUSE_TRACE : LASTMILE_TRACE}
            playing={playing}
            speed={1.3}
          />
          <WaveMetrics optimised={view === 'warehouse' ? slottingDone : lastMileOptimised} />
        </div>
      </div>

      {/* Bottom panel: context changes with stage / view */}
      {view === 'warehouse' && stage === 'slotting' && <SlotMovesPanel revealedMoves={revealedMoves} />}
      {view === 'warehouse' && stage === 'picking'  && <BatchDetailPanel batch={batch} />}
      {view === 'warehouse' && stage === 'compare'  && <CompareDeltaPanel batch={batch} />}
      {view === 'lastmile'                          && <VehicleStrip optimised={lastMileOptimised} />}
    </div>
  );
}

function StageButton({ n, label, active, onClick, desc }) {
  return (
    <button className={`wo-stage-btn ${active ? 'is-on' : ''}`} onClick={onClick}>
      <div className="wo-stage-n">{n}</div>
      <div className="wo-stage-meta">
        <div className="wo-stage-label">{label}</div>
        <div className="wo-stage-desc">{desc}</div>
      </div>
    </button>
  );
}

// ----------------------------------------------------------------------------
// Warehouse floor SVG view — stage-aware
// ----------------------------------------------------------------------------
function heatColor(h) {
  const r = Math.round(38  * h + 50 * (1 - h));
  const g = Math.round(234 * h + 50 * (1 - h));
  const b = Math.round(159 * h + 75 * (1 - h));
  return `rgba(${r}, ${g}, ${b}, ${0.08 + 0.22 * h})`;
}

function WarehouseFloor({ stage, revealedMoves, slottingDone, batch, selectedBatch, setSelectedBatch }) {
  return (
    <div className="wo-floor">
      <div className="wo-floor-head">
        <span><Icons.Warehouse size={12} /> Leeds DC (LDS-3) · floor plan · velocity heat-map</span>
        <span className="wo-floor-meta">6 zones · 1,812 SKUs · dock at bottom-left</span>
      </div>

      {/* Batch selector — only in picking / compare */}
      {(stage === 'picking' || stage === 'compare') && (
        <div className="wo-batch-tabs">
          {PICK_BATCHES.map((b) => (
            <button
              key={b.id}
              className={`wo-batch-tab ${selectedBatch === b.id ? 'is-on' : ''}`}
              style={{ '--batch-color': b.color }}
              onClick={() => setSelectedBatch(b.id)}
            >
              <span className="wo-batch-dot" />
              {b.label} · <span className="wo-batch-meta">{b.orders} orders · {b.items} items</span>
            </button>
          ))}
        </div>
      )}

      {/* Scene */}
      {stage === 'compare' ? (
        <div className="wo-compare">
          <MiniFloor title="Before" subtitle="pre-slotting · SKUs spread into slow zones" batch={batch} beforeState />
          <div className="wo-compare-arrow"><Icons.ArrowRight size={22} /></div>
          <MiniFloor title="After" subtitle="post-slotting · fast SKUs near dock" batch={batch} />
        </div>
      ) : (
        <FloorSVG stage={stage} revealedMoves={revealedMoves} slottingDone={slottingDone} batch={batch} />
      )}

      <div className="wo-floor-legend">
        <span className="wo-leg-item"><i style={{ background: 'rgba(38,234,159,0.35)' }} /> A-class zone</span>
        <span className="wo-leg-item"><i style={{ background: 'rgba(128,128,160,0.25)' }} /> C-class zone</span>
        {stage === 'slotting' && (
          <>
            <span className="wo-leg-item"><i style={{ background: '#E82AAE' }} /> Mis-slotted origin</span>
            <span className="wo-leg-item"><i style={{ background: '#26EA9F' }} /> Suggested destination</span>
          </>
        )}
        {(stage === 'picking' || stage === 'compare') && (
          <span className="wo-leg-item"><i style={{ background: batch.color }} /> Active pick path · numbered stops</span>
        )}
      </div>
    </div>
  );
}

// Full floor SVG — renders zones, SKU dots, and stage-appropriate overlays.
function FloorSVG({ stage, revealedMoves, slottingDone, batch }) {
  const showSlotting = stage === 'slotting';
  const showPicking  = stage === 'picking';

  return (
    <svg viewBox="0 0 1000 625" preserveAspectRatio="xMidYMid meet" className="wo-floor-svg">
      {/* Outer frame */}
      <rect x="40" y="40" width="920" height="560" rx="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />

      {/* Zones */}
      {ZONES.map((z) => (
        <g key={z.id}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill={heatColor(z.heat)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <text x={z.x + 12} y={z.y + 20} className="wo-zone-label" fill="#E4E4EE">{z.id} · {z.name.split('·')[1].trim()}</text>
          <text x={z.x + z.w - 12} y={z.y + 20} textAnchor="end" className="wo-zone-class" fill="rgba(38,234,159,0.7)">{z.vClass} · {z.skuCount} SKUs</text>
        </g>
      ))}

      {/* Base SKU dots (dimmed during picking so pick path stands out) */}
      {Object.entries(ZONE_SKUS).map(([zoneId, dots]) => (
        <g key={zoneId} opacity={showPicking ? 0.35 : 0.9}>
          {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="3.5" fill="rgba(228,228,238,0.55)" />)}
        </g>
      ))}

      {/* Dock */}
      <g>
        <rect x={DOCK.x - 50} y={DOCK.y - 10} width="100" height="24" rx="3" fill="#E82AAE" opacity="0.85" />
        <text x={DOCK.x} y={DOCK.y + 6} textAnchor="middle" fill="#0A0A12" fontSize="11" fontFamily="var(--font-display)" fontWeight="700" letterSpacing="0.14em">DOCK</text>
        <line x1={DOCK.x} y1={DOCK.y - 10} x2={DOCK.x} y2={DOCK.y - 28} stroke="rgba(232,42,174,0.5)" strokeWidth="1" strokeDasharray="2 3" />
      </g>

      {/* ---------------- Stage 1 · Slotting arrows + labels ---------------- */}
      {showSlotting && SLOT_MOVES.slice(0, revealedMoves).map((m, i) => {
        const midX = (m.from.x + m.to.x) / 2;
        const midY = Math.min(m.from.y, m.to.y) - 35 - (i * 4);
        const labelX = midX;
        const labelY = midY - 6;
        return (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {/* Origin with pink ring */}
            <circle cx={m.from.x} cy={m.from.y} r="7" fill="none" stroke="#E82AAE" strokeWidth="2" />
            <circle cx={m.from.x} cy={m.from.y} r="3.5" fill="#E82AAE" />
            {/* Destination with turquoise ring */}
            <circle cx={m.to.x} cy={m.to.y} r="8" fill="none" stroke="#26EA9F" strokeWidth="2" />
            <circle cx={m.to.x} cy={m.to.y} r="4" fill="#26EA9F" stroke="#0A0A12" strokeWidth="1" />
            {/* Arrow path */}
            <motion.path
              d={`M ${m.from.x} ${m.from.y} Q ${midX} ${midY} ${m.to.x} ${m.to.y}`}
              fill="none"
              stroke="#E82AAE"
              strokeWidth="1.8"
              strokeDasharray="5 4"
              markerEnd="url(#wo-arrow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Label on the arrow */}
            <g transform={`translate(${labelX}, ${labelY})`}>
              <rect x={-Math.max(70, m.sku.length * 4.4)} y="-12" width={Math.max(140, m.sku.length * 8.8)} height="22" rx="3" fill="rgba(10,10,18,0.92)" stroke="#E82AAE" strokeWidth="1" />
              <text x="0" y="3" textAnchor="middle" fontSize="11" fontFamily="var(--font-display)" fontWeight="500" fill="#FFF7FB">{m.sku}</text>
            </g>
          </motion.g>
        );
      })}

      {/* Arrow marker */}
      <defs>
        <marker id="wo-arrow" viewBox="0 -5 10 10" refX="6" refY="0" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,-4 L8,0 L0,4" fill="#E82AAE" />
        </marker>
      </defs>

      {/* ---------------- Stage 2 · Pick path with numbered stops ---------------- */}
      {showPicking && (() => {
        const stops = slottingDone ? batch.stops : batch.stopsBefore;
        const pts = [DOCK, ...stops.map((s) => s.at), DOCK];
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
          <motion.g key={batch.id}>
            <motion.path
              d={d}
              fill="none"
              stroke={batch.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            />
            {stops.map((s, i) => (
              <motion.g
                key={i}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.6 + i * 0.18 }}
              >
                {/* Numbered circle */}
                <circle cx={s.at.x} cy={s.at.y} r="12" fill={batch.color} stroke="#0A0A12" strokeWidth="2" />
                <text x={s.at.x} y={s.at.y + 4} textAnchor="middle" fontSize="11" fontFamily="var(--font-display)" fontWeight="700" fill="#0A0A12">{s.n}</text>
                {/* SKU label beside the circle */}
                <g transform={`translate(${s.at.x + 18}, ${s.at.y - 14})`}>
                  <rect x="0" y="0" width={Math.max(100, s.label.length * 6.8)} height="18" rx="2" fill="rgba(10,10,18,0.92)" stroke={batch.color} strokeWidth="1" />
                  <text x="6" y="13" fontSize="10" fontFamily="var(--font-display)" fontWeight="500" fill="#E4E4EE">{s.label}</text>
                </g>
              </motion.g>
            ))}
          </motion.g>
        );
      })()}
    </svg>
  );
}

// Mini-floor for the compare view — stripped-down SVG showing a single batch
function MiniFloor({ title, subtitle, batch, beforeState }) {
  const stops = beforeState ? batch.stopsBefore : batch.stops;
  const pts = [DOCK, ...stops.map((s) => s.at), DOCK];
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  // Compute distance for readout
  const dist = stops.reduce((acc, s, i) => {
    const prev = i === 0 ? DOCK : stops[i - 1].at;
    return acc + Math.sqrt(Math.pow(s.at.x - prev.x, 2) + Math.pow(s.at.y - prev.y, 2));
  }, 0) + Math.sqrt(Math.pow(stops[stops.length - 1].at.x - DOCK.x, 2) + Math.pow(stops[stops.length - 1].at.y - DOCK.y, 2));
  const metres = Math.round(dist * 0.4); // scale factor for realism
  return (
    <div className={`wo-mini ${beforeState ? 'wo-mini-before' : 'wo-mini-after'}`}>
      <div className="wo-mini-head">
        <span className="wo-mini-title">{title}</span>
        <span className="wo-mini-sub">{subtitle}</span>
      </div>
      <svg viewBox="0 0 1000 625" preserveAspectRatio="xMidYMid meet" className="wo-mini-svg">
        {ZONES.map((z) => (
          <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill={heatColor(z.heat)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        ))}
        {Object.entries(ZONE_SKUS).map(([zid, dots]) => dots.map((dt, i) => (
          <circle key={zid + i} cx={dt.x} cy={dt.y} r="2.5" fill="rgba(228,228,238,0.3)" />
        )))}
        <rect x={DOCK.x - 50} y={DOCK.y - 10} width="100" height="24" rx="3" fill="#E82AAE" opacity="0.85" />
        <text x={DOCK.x} y={DOCK.y + 6} textAnchor="middle" fill="#0A0A12" fontSize="11" fontFamily="var(--font-display)" fontWeight="700">DOCK</text>
        <path d={d} fill="none" stroke={batch.color} strokeWidth="2" strokeDasharray={beforeState ? '4 3' : null} opacity={beforeState ? 0.65 : 0.95} />
        {stops.map((s, i) => (
          <g key={i}>
            <circle cx={s.at.x} cy={s.at.y} r="9" fill={batch.color} stroke="#0A0A12" strokeWidth="2" />
            <text x={s.at.x} y={s.at.y + 3} textAnchor="middle" fontSize="10" fontFamily="var(--font-display)" fontWeight="700" fill="#0A0A12">{s.n}</text>
          </g>
        ))}
      </svg>
      <div className="wo-mini-foot">
        <span>Path · <b>{metres}m</b></span>
        <span>Est. time · <b>{Math.round(metres / 35)} min</b></span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Last-mile Leaflet map
// ----------------------------------------------------------------------------
function LastMileMap({ optimised }) {
  // Compute routes per van based on before/after assignment
  const routes = useMemo(() => {
    return VEHICLES.map((v) => {
      const key = optimised ? 'after' : 'before';
      const stops = DROPS.filter((d) => d[key] === v.id);
      // Cheap ordering: nearest neighbour from DC
      const ordered = [];
      const remaining = [...stops];
      let cur = DC_COORD;
      while (remaining.length > 0) {
        let bestIdx = 0, bestDist = Infinity;
        remaining.forEach((s, i) => {
          const d = Math.pow(s.lat - cur[0], 2) + Math.pow(s.lng - cur[1], 2);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        const next = remaining.splice(bestIdx, 1)[0];
        ordered.push(next);
        cur = [next.lat, next.lng];
      }
      const path = [DC_COORD, ...ordered.map((s) => [s.lat, s.lng]), DC_COORD];
      return { ...v, stops: ordered, path };
    });
  }, [optimised]);

  return (
    <div className="wo-map-wrap">
      <div className="wo-map-head">
        <span><Icons.MapPin size={12} /> Leeds metro delivery zone · 36 drops · 6 vans · DC at Morley</span>
        <span className="wo-map-meta">{optimised ? 'Optimised · clean zones' : 'Un-optimised · routes cross'}</span>
      </div>
      <div className="wo-map">
        <MapContainer center={LEEDS_CENTER} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} attributionControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
            opacity={0.65}
          />
          {/* DC marker */}
          <CircleMarker center={DC_COORD} radius={8} pathOptions={{ color: '#E82AAE', fillColor: '#E82AAE', fillOpacity: 0.9, weight: 2 }}>
            <LeafletTooltip permanent direction="right" offset={[10, 0]} className="wo-map-tt">Leeds DC</LeafletTooltip>
          </CircleMarker>

          {/* Route polylines */}
          {routes.map((r) => (
            <Polyline
              key={r.id}
              positions={r.path}
              pathOptions={{ color: r.color, weight: optimised ? 3 : 2, opacity: optimised ? 0.85 : 0.55, dashArray: optimised ? null : '4,6' }}
            />
          ))}

          {/* Drop markers */}
          {DROPS.map((d) => {
            const v = VEHICLES[(optimised ? d.after : d.before) - 1];
            return (
              <CircleMarker
                key={d.id}
                center={[d.lat, d.lng]}
                radius={4}
                pathOptions={{ color: v.color, fillColor: v.color, fillOpacity: 0.9, weight: 1.5 }}
              />
            );
          })}
        </MapContainer>
      </div>
      <div className="wo-map-legend">
        {VEHICLES.map((v) => (
          <span key={v.id} className="wo-leg-item"><i style={{ background: v.color }} /> {v.name}</span>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Side panel: wave metrics that change pre/post optimisation
// ----------------------------------------------------------------------------
function WaveMetrics({ optimised }) {
  const before = { pickProductivity: 112, milesPerDrop: 4.1, onTime: 91.8, cube: 58, meanRoute: 48, carbon: 820 };
  const after  = { pickProductivity: 118.5, milesPerDrop: 3.5, onTime: 98.1, cube: 82, meanRoute: 34, carbon: 636 };
  const s = optimised ? after : before;
  const delta = (a, b, inv = false) => {
    const d = a - b;
    const isGood = inv ? d < 0 : d > 0;
    return { sign: d >= 0 ? '+' : '', val: d.toFixed(1), good: isGood };
  };
  return (
    <div className="wo-metrics">
      <div className="wo-metrics-head"><span className="eyebrow">Wave metrics</span><span className="wo-count">{optimised ? 'optimised' : 'baseline'}</span></div>
      <div className="wo-metrics-grid">
        <Metric icon="Gauge" label="Pick productivity" val={`${s.pickProductivity}`} unit="u/h" delta={optimised && 'Wave pick productivity +5.8% · programme target +19%'} good />
        <Metric icon="Navigation" label="Miles / drop" val={`${s.milesPerDrop}`} unit="mi" delta={optimised && delta(after.milesPerDrop, before.milesPerDrop, true).val} good />
        <Metric icon="CheckCircle2" label="On-time delivery" val={`${s.onTime}`} unit="%" delta={optimised && delta(after.onTime, before.onTime).val + 'pp'} good />
        <Metric icon="Box" label="Cube utilisation" val={`${s.cube}`} unit="%" delta={optimised && delta(after.cube, before.cube).val + 'pp'} good />
        <Metric icon="Timer" label="Mean route" val={`${s.meanRoute}`} unit="min" delta={optimised && delta(after.meanRoute, before.meanRoute, true).val + ' min'} good />
        <Metric icon="Leaf" label="CO₂e / day" val={`${s.carbon}`} unit="kg" delta={optimised && delta(after.carbon, before.carbon, true).val + ' kg'} good />
      </div>
      <div style={{ marginTop: '10px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px', color: '#E4E4EE', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <span>Miles/drop -14%</span>
        <span>On-time delivery 98.1%</span>
        <span>CO₂e -22%</span>
        <span>TTV 14 weeks</span>
      </div>
    </div>
  );
}

function Metric({ icon, label, val, unit, delta, good }) {
  const Icon = Icons[icon] || Icons.Circle;
  const isCarbon = label === 'CO₂e / day';
  const inner = (
    <div className="wo-metric">
      <div className="wo-metric-head"><Icon size={12} /> <span>{label}</span></div>
      <div className="wo-metric-val">{val}<span>{unit}</span></div>
      {delta && <div className={`wo-metric-delta ${good ? 'good' : 'bad'}`}>{delta}</div>}
    </div>
  );
  // Carbon metric gets an Explain popover with the breakdown
  if (isCarbon) {
    return (
      <Explain
        title="Carbon delta · how we compute kg CO₂e"
        factors={CARBON_BREAKDOWN.map((c) => ({ label: c.label, weight: -c.result / 184 }))}
        dataSource="DEFRA 2024 road-freight emission factors + fleet telemetry"
        counterfactual="Untouched plan = 820 kg CO₂e/day. Agent-run = 636 kg. Delta −184 kg."
        wide
      >
        {inner}
      </Explain>
    );
  }
  return inner;
}

// ----------------------------------------------------------------------------
// Slot moves panel (stage 1 bottom)
// ----------------------------------------------------------------------------
function SlotMovesPanel({ revealedMoves }) {
  return (
    <div className="wo-bottom">
      <div className="wo-bottom-head">
        <span className="eyebrow">Slotting optimisation · 4 moves</span>
        <span className="wo-count">Expected path distance per pick: <b className="good">267m</b> (−14% vs 312m)</span>
      </div>
      <div className="wo-moves">
        {SLOT_MOVES.map((m, i) => (
          <motion.div
            key={m.sku}
            className="wo-move"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: i < revealedMoves ? 1 : 0.3, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="wo-move-head">
              <Explain
                title="Why this move?"
                factors={m.factors}
                confidence={0.88}
                dataSource="52w pick history · co-pick basket analysis"
                counterfactual={`Hold in ${m.from.zone}: +${Math.round(Math.abs(parseInt(m.save, 10)) * (ZONES.find(z => z.id === m.from.zone)?.heat || 0.3) * 2)}m/pick sustained.`}
                wide
              >
                <span className="wo-move-sku">{m.sku}</span>
              </Explain>
              <span className="wo-move-move">
                <span className="wo-move-zone">{m.from.zone}</span>
                <Icons.ArrowRight size={10} />
                <span className="wo-move-zone wo-move-zone-dest">{m.to.zone}</span>
                <span className="wo-move-save">{m.save}</span>
              </span>
            </div>
            <div className="wo-move-meta">{m.velocity}</div>
            <div className="wo-move-detail">{m.reason}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Batch detail panel (stage 2 bottom) — list of items in the selected batch
// ----------------------------------------------------------------------------
function BatchDetailPanel({ batch }) {
  // Compute rough path distance for the after-state
  const dist = batch.stops.reduce((acc, s, i) => {
    const prev = i === 0 ? DOCK : batch.stops[i - 1].at;
    return acc + Math.sqrt(Math.pow(s.at.x - prev.x, 2) + Math.pow(s.at.y - prev.y, 2));
  }, 0) + Math.sqrt(Math.pow(batch.stops[batch.stops.length - 1].at.x - DOCK.x, 2) + Math.pow(batch.stops[batch.stops.length - 1].at.y - DOCK.y, 2));
  const metres = Math.round(dist * 0.4);
  return (
    <div className="wo-bottom">
      <div className="wo-bottom-head">
        <span className="eyebrow">{batch.label} · {batch.orders} orders · {batch.items} items</span>
        <span className="wo-count">Path <b className="good">{metres}m</b> · est. <b>{Math.round(metres / 35)} min</b></span>
      </div>
      <div className="wo-stops">
        {batch.stops.map((s) => (
          <div key={s.n} className="wo-stop" style={{ '--batch-color': batch.color }}>
            <div className="wo-stop-n">{s.n}</div>
            <div className="wo-stop-meta">
              <div className="wo-stop-label">
                {s.label}
                {s.compartment && s.compartment !== 'ambient' && (
                  <span className="wo-compartment" style={{ marginLeft: '8px', padding: '1px 6px', borderRadius: '3px', background: 'rgba(138,125,247,0.18)', color: '#8A7DF7', fontSize: '10px', letterSpacing: '0.04em' }}>
                    {s.compartment === 'chilled-last-on' ? 'chilled compartment' : s.compartment === 'frozen-tote' ? 'frozen tote' : s.compartment}
                  </span>
                )}
              </div>
              <div className="wo-stop-sub">picked next</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Compare delta panel (stage 3 bottom) — before/after totals
// ----------------------------------------------------------------------------
function CompareDeltaPanel({ batch }) {
  const calc = (stops) => {
    return stops.reduce((acc, s, i) => {
      const prev = i === 0 ? DOCK : stops[i - 1].at;
      return acc + Math.sqrt(Math.pow(s.at.x - prev.x, 2) + Math.pow(s.at.y - prev.y, 2));
    }, 0) + Math.sqrt(Math.pow(stops[stops.length - 1].at.x - DOCK.x, 2) + Math.pow(stops[stops.length - 1].at.y - DOCK.y, 2));
  };
  const before = Math.round(calc(batch.stopsBefore) * 0.4);
  const after  = Math.round(calc(batch.stops) * 0.4);
  const saved  = before - after;
  const pct    = Math.round((saved / before) * 100);
  return (
    <div className="wo-bottom">
      <div className="wo-bottom-head">
        <span className="eyebrow">Before → After · {batch.label}</span>
        <span className="wo-count">Same items, same dock, different slotting.</span>
      </div>
      <div className="wo-delta">
        <div className="wo-delta-box wo-delta-before">
          <span className="wo-delta-lbl">Before</span>
          <span className="wo-delta-val">{before}m</span>
          <span className="wo-delta-sub">≈ {Math.round(before / 35)} min</span>
        </div>
        <div className="wo-delta-arrow"><Icons.ArrowRight size={22} /></div>
        <div className="wo-delta-box wo-delta-after">
          <span className="wo-delta-lbl">After</span>
          <span className="wo-delta-val">{after}m</span>
          <span className="wo-delta-sub">≈ {Math.round(after / 35)} min</span>
        </div>
        <div className="wo-delta-box wo-delta-save">
          <span className="wo-delta-lbl">Saved / pick</span>
          <span className="wo-delta-val">{saved}m</span>
          <span className="wo-delta-sub">−{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Vehicle strip (last-mile tab bottom)
// ----------------------------------------------------------------------------
function VehicleStrip({ optimised }) {
  return (
    <div className="wo-bottom">
      <div className="wo-bottom-head">
        <span className="eyebrow">Fleet · 6 of 14 vans shown</span>
        <span className="wo-count">{optimised ? 'Optimised: vans zoned, cube up, miles down' : 'Baseline: vans criss-crossing, cube low'}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>DC LDS-3 · wave 14:00–22:00 · 14 vans, 327 drops</span>
      </div>
      <div className="wo-vans">
        {VEHICLES.map((v) => {
          const cube = optimised ? v.cubePctAfter : v.cubePctBefore;
          const miles = optimised ? v.milesAfter : v.milesBefore;
          return (
            <div key={v.id} className="wo-van" style={{ '--van-color': v.color }}>
              <div className="wo-van-head">
                <span className="wo-van-name">{v.name}</span>
                <span className="wo-van-driver">{v.driver}</span>
              </div>
              <div className="wo-van-stats">
                <div className="wo-van-stat"><span>Cube</span><b>{cube}%</b></div>
                <div className="wo-van-stat"><span>Drops</span><b>{v.stopsAfter}</b></div>
                <div className="wo-van-stat"><span>Miles</span><b>{miles}</b></div>
              </div>
              <div className="wo-van-bar">
                <motion.div className="wo-van-fill" animate={{ width: `${cube}%` }} transition={{ duration: 0.6 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
