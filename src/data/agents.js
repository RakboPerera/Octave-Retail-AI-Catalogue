// Octave Retail Agentic AI — agent catalogue metadata
// Context: fictional UK grocery retailer operating ~380 stores across the UK.

export const PILLARS = {
  cx: {
    id: 'cx',
    name: 'Customer Experience',
    tagline: 'Agents that turn shoppers into advocates.',
    description: 'Conversational, lifecycle and sentiment agents that sit between the customer and the catalogue — always listening, always learning.',
    accent: 'turquoise'
  },
  ops: {
    id: 'ops',
    name: 'Store & Operations',
    tagline: 'Agents on every aisle, every shift, every trailer.',
    description: 'Vision, planning and orchestration agents that give store teams a tireless deputy — and run the physical engine behind them.',
    accent: 'turquoise'
  },
  merch: {
    id: 'merch',
    name: 'Merchandising & Supply',
    tagline: 'Agents that move product and margin.',
    description: 'Forecasting, pricing and space-optimisation agents that compress cycles from weeks to minutes — with audit trails buyers trust.',
    accent: 'turquoise'
  }
};

export const AGENTS = [
  {
    slug: 'concierge',
    pillar: 'cx',
    number: '01',
    name: 'Conversational Commerce Concierge',
    oneLiner: 'A branded shopping companion that answers in seconds and checks out in one.',
    tags: ['Chat', 'Voice', 'Tool-use', 'Checkout'],
    icon: 'MessagesSquare',
    problem: 'Shoppers abandon 68% of online baskets because search and help are brittle. Call-centre unit costs are climbing 12% YoY while self-service deflection stalls.',
    solution: 'A multimodal agent trained on your product taxonomy, pricing, loyalty rules and policies. It searches, compares, substitutes out-of-stock items, and finalises checkout — all inside chat.',
    roi: [
      { label: 'Basket conversion', value: '+24%', delta: 'up' },
      { label: 'Contact deflection', value: '61%', delta: 'up' },
      { label: 'Avg. order value', value: '+£6.40', delta: 'up' },
      { label: 'CSAT', value: '4.7 / 5', delta: 'up' }
    ],
    ttv: '8 weeks',
    integrations: ['Commerce platform (Shopify / SAP / Oracle)', 'CRM & loyalty', 'Order management', 'Payment gateway', 'Dietary/allergen master data']
  },
  {
    slug: 'customer-lifecycle',
    pillar: 'cx',
    number: '02',
    name: 'Customer Lifecycle & Loyalty Agent',
    oneLiner: 'Detects the moment a shopper starts drifting — and intervenes before they lapse.',
    tags: ['Lifecycle', 'Uplift model', 'Personalisation'],
    icon: 'HeartPulse',
    problem: 'Retailers spend 5× more acquiring than retaining. Most churn is silent — by the time loyalty teams spot the drop, the customer has already switched their weekly shop. Broadcast campaigns leak budget, while the truly at-risk customer gets a generic voucher six weeks too late.',
    solution: 'The agent watches every loyalty member daily. It detects behavioural shifts (visit-frequency drops, basket narrowing, category abandonment), scores lifecycle position, and composes the next-best action — with uplift-validated offers, brand-voice copy and channel-aware send-time optimisation.',
    roi: [
      { label: 'Lapsing-customer retention', value: '+18pp', delta: 'up' },
      { label: 'Incremental revenue / member', value: '+£42 / yr', delta: 'up' },
      { label: 'Offer redemption', value: '24%', delta: 'up' },
      { label: 'Campaign ROI', value: '4.3× lift', delta: 'up' }
    ],
    ttv: '10 weeks',
    integrations: ['Loyalty / CRM', 'Transaction & basket stream', 'Channel orchestrator (email / SMS / app push)', 'Consent register', 'Offer catalogue']
  },
  {
    slug: 'voc',
    pillar: 'cx',
    number: '03',
    name: 'Voice-of-Customer Analyst',
    oneLiner: 'Every review, call and DM clustered into themes your ops team can actually fix.',
    tags: ['NLP', 'Clustering', 'Action-routing'],
    icon: 'MessageCircle',
    problem: 'Feedback sits in 7+ silos. By the time insights reach the right team, the incident is cold and the customer has churned.',
    solution: 'The agent ingests reviews, social, CSAT, call transcripts and store-level complaints. It clusters by theme, scores severity, writes the ticket, and routes it to the right function with an SLA — closing the loop back to the customer.',
    roi: [
      { label: 'Time-to-insight', value: '14d → 26min', delta: 'up' },
      { label: 'Repeat complaints', value: '-38%', delta: 'up' },
      { label: 'Theme coverage', value: '100%', delta: 'up' }
    ],
    ttv: '6 weeks',
    integrations: ['Review platforms (Trustpilot, Google, app stores)', 'Social listening', 'Contact-centre transcripts', 'Jira / ServiceNow']
  },
  {
    slug: 'shelf-intel',
    pillar: 'ops',
    number: '04',
    name: 'Shelf Intelligence Agent',
    oneLiner: 'CCTV-fed vision agent that catches out-of-stock, mis-facings and price errors minute-by-minute.',
    tags: ['Vision', 'Planogram', 'Auto-ticketing'],
    icon: 'ScanLine',
    problem: 'On-shelf availability gaps cost UK grocers an estimated £3.2bn a year. Manual gap-walks catch issues hours after they cost sales.',
    solution: 'The agent watches existing CCTV. It reconciles what it sees against the planogram and price file. Gaps, wrong facings and label mismatches generate tickets to the store-ops app with a photo and a countdown SLA.',
    roi: [
      { label: 'OSA uplift', value: '+4.2pp', delta: 'up' },
      { label: 'Gap-to-resolution', value: '3h → 22min', delta: 'up' },
      { label: 'Price-integrity errors', value: '-71%', delta: 'up' }
    ],
    ttv: '12 weeks',
    integrations: ['Existing CCTV (RTSP)', 'Planogram system', 'Price master', 'Store-ops app (tickets)']
  },
  {
    slug: 'store-copilot',
    pillar: 'ops',
    number: '05',
    name: 'Store Manager Copilot',
    oneLiner: 'Your store manager\'s tireless deputy — builds the day, triages the inbox, runs the huddle.',
    tags: ['Planning', 'Comms', 'Compliance'],
    icon: 'ClipboardCheck',
    problem: 'A UK store manager handles 40+ inbound signals before 9am. Priorities get missed, labour is mis-deployed, compliance slips.',
    solution: 'The Copilot ingests the overnight signal: KPIs, temperature logs, delivery variances, staff calls, customer complaints. It drafts a prioritised action list, allocates labour, writes the morning huddle script, and chases compliance tasks.',
    roi: [
      { label: 'Manager admin time', value: '-2.1h / day', delta: 'up' },
      { label: 'Compliance pass-rate', value: '+18pp', delta: 'up' },
      { label: 'Process shrink (date-code, rotation, mis-scan)', value: '-22%', delta: 'up' }
    ],
    ttv: '10 weeks',
    integrations: ['WFM (Kronos / Quinyx)', 'Temperature monitoring', 'Complaints DB', 'Delivery manifest', 'Comms (Teams / WhatsApp)']
  },
  {
    slug: 'loss-prevention',
    pillar: 'ops',
    number: '06',
    name: 'Loss Prevention Agent',
    oneLiner: 'Pattern-aware agent that detects ticket-switching, sweethearting and SCO fraud — and writes the case file.',
    tags: ['Vision', 'Pattern detection', 'Case mgmt'],
    icon: 'ShieldAlert',
    problem: 'UK grocery shrink hit 2.1% of turnover in recent reporting. Most LP teams are still reactive, relying on hunches and a camera review after the fact.',
    solution: 'A cross-feed agent that correlates POS, SCO, door, scale and CCTV signals. It scores anomalies in real time, pre-writes the incident case (with clip, transaction and staff context) and routes to the LP desk with SHAP-style explainability on every score.',
    roi: [
      { label: 'Malicious shrink reduction (shrink rate)', value: '-0.38pp', delta: 'up' },
      { label: 'Case prep time', value: '45m → 4m', delta: 'up' },
      { label: 'Precision @ alert threshold', value: '94%', delta: 'up' }
    ],
    ttv: '14 weeks',
    integrations: ['CCTV + POS + SCO event bus', 'Weights / scan data', 'Staff roster', 'LP case system']
  },
  {
    slug: 'warehouse-orchestrator',
    pillar: 'ops',
    number: '07',
    name: 'Warehouse & Last-Mile Orchestrator',
    oneLiner: 'One agent that runs the DC floor and the delivery fleet — from picker path to postcode.',
    tags: ['DC', 'Route optimisation', 'Carbon'],
    icon: 'Truck',
    problem: 'Picking and last-mile are the two biggest costs in online grocery — and both are governed by optimisation problems that change hourly. Today they live in separate systems with separate teams. Waves over-run, drivers criss-cross, vans run half-empty, and Sunday-night plans don\'t survive Monday morning.',
    solution: 'The agent ingests the order pipeline and orchestrates end-to-end: slotting by SKU velocity, pick-path batching, cube-aware load building, VRP-optimised routes with traffic + time windows, and driver allocation by skill and shift. The DC and last-mile become one live plan, re-planned every time a signal shifts.',
    roi: [
      { label: 'Pick productivity', value: '+19%', delta: 'up' },
      { label: 'Miles per drop', value: '-14%', delta: 'up' },
      { label: 'On-time delivery', value: '98.1%', delta: 'up' },
      { label: 'CO₂e / week', value: '-22%', delta: 'up' }
    ],
    ttv: '14 weeks',
    integrations: ['WMS', 'OMS', 'TMS', 'Vehicle telemetry (GPS)', 'Driver / picker roster', 'Traffic + weather feeds']
  },
  {
    slug: 'forecast-swarm',
    pillar: 'merch',
    number: '08',
    name: 'Demand Forecast & Replenishment Swarm',
    oneLiner: 'A team of specialist agents — forecaster, weather, promo, planner, negotiator — that closes the loop from signal to PO.',
    tags: ['Multi-agent', 'Forecasting', 'Supplier AI'],
    icon: 'Workflow',
    problem: 'Forecast error on fresh categories routinely tops 25%. Buyers chase exceptions instead of strategy; suppliers react to PDF POs that lack context.',
    solution: 'Five specialist agents hand off in sequence: base forecaster → weather-adjuster → promo modeller → replenishment planner → supplier-negotiator. Every step leaves an audit trail the buyer can inspect, override, or approve.',
    roi: [
      { label: 'Forecast error', value: '-9pp', delta: 'up' },
      { label: 'Waste (fresh)', value: '-17%', delta: 'up' },
      { label: 'Buyer exception rate', value: '-64%', delta: 'up' }
    ],
    ttv: '16 weeks',
    integrations: ['ERP (SAP / Oracle / Dynamics)', 'Weather feed', 'Promo calendar', 'Supplier EDI / APIs']
  },
  {
    slug: 'dynamic-pricing',
    pillar: 'merch',
    number: '09',
    name: 'Dynamic Pricing & Markdown Agent',
    oneLiner: 'Margin-aware agent that moves price on velocity, weather, perishability and the competitive line.',
    tags: ['Pricing', 'Markdowns', 'Competitor'],
    icon: 'TrendingUp',
    problem: 'Weekly pricing cycles leak margin and miss velocity windows. Markdowns are blunt and late — write-off is the default for fresh.',
    solution: 'The agent watches demand, stock cover, days-to-expiry, competitor feeds and weather. It proposes price moves with a written rationale and a guardrail check against brand, legal and margin policy — then executes on approval (or autonomously within thresholds).',
    roi: [
      { label: 'Gross margin', value: '+1.6pp', delta: 'up' },
      { label: 'Fresh write-off', value: '-23%', delta: 'up' },
      { label: 'Pricing cycle', value: '7d → 1h', delta: 'up' }
    ],
    ttv: '12 weeks',
    integrations: ['Price engine', 'Stock & sales telemetry', 'Competitor feed', 'ESL network']
  },
  {
    slug: 'range-space',
    pillar: 'merch',
    number: '10',
    name: 'Range & Space Optimiser',
    oneLiner: 'Continuous range review + planogram rebuild — SKU by SKU, cluster by cluster.',
    tags: ['Incrementality', 'Planogram', 'Cluster-local'],
    icon: 'LayoutGrid',
    problem: 'Range reviews are annual rituals — spreadsheets, arguments and a planogram that\'s already stale on day one. Category teams can\'t tell incremental SKUs from cannibalising ones, and every store gets the same range regardless of local demand.',
    solution: 'The agent scores every SKU on incrementality (true demand added vs. demand stolen), runs space-elasticity on facings, and rebuilds planograms — localised to each store cluster. Buyers get a list/delist shortlist with evidence, a cluster-by-cluster range plan and an animated before/after shelf.',
    roi: [
      { label: 'Category revenue', value: '+3.4%', delta: 'up' },
      { label: 'Space productivity (£ / m)', value: '+11%', delta: 'up' },
      { label: 'Fresh bakery waste', value: '-19%', delta: 'up' },
      { label: 'Range review cycle', value: '6w → 2d', delta: 'up' }
    ],
    ttv: '12 weeks',
    integrations: ['52w sales history', 'Basket co-purchase data', 'Competitor range scan', 'Planogram system', 'Store cluster definitions', 'Supplier contract terms']
  }
];

export const getAgent = (slug) => AGENTS.find((a) => a.slug === slug);
export const getAgentsByPillar = (pillarId) => AGENTS.filter((a) => a.pillar === pillarId);
