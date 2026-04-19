import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Layers, BrainCircuit, Waypoints, ShieldCheck, Factory, MapPin, FileCheck2, TrendingUp } from 'lucide-react';
import GlassHero from '../components/brand/GlassHero.jsx';
import AgentCard from '../components/agent/AgentCard.jsx';
import { AGENTS, PILLARS, getAgentsByPillar } from '../data/agents.js';
import './Landing.css';

const PILLAR_ORDER = ['cx', 'ops', 'merch'];
const PILLAR_ANCHORS = {
  cx: 'customer-experience',
  ops: 'store-operations',
  merch: 'merchandising-supply'
};
const PILLAR_ICONS = { cx: BrainCircuit, ops: Layers, merch: Waypoints };

// Outcome metrics — each deep-links to the agent that owns the number.
const HERO_METRICS = [
  { prefix: '+', value: 4.2, suffix: 'pp',  label: 'On-shelf availability',    decimals: 1, slug: 'shelf-intel' },
  { prefix: '-', value: 23,  suffix: '%',   label: 'Fresh write-off',           decimals: 0, slug: 'dynamic-pricing' },
  { prefix: '-', value: 18,  suffix: 'pp',  label: 'Lapsing-customer churn',    decimals: 0, slug: 'customer-lifecycle' },
  { prefix: '+', value: 0.6, suffix: ' CSAT', label: 'Customer satisfaction (4.1 → 4.7)', decimals: 1, slug: 'concierge' }
];

// "Agents in the wild" — synthetic live events that rotate through the ticker
const TICKER_EVENTS = [
  { t: '14:32', store: 'Leeds DC',       what: 'pick path 267m · −22m',           color: '#26EA9F' },
  { t: '14:32', store: 'Store LDS-014',  what: 'price-integrity ticket raised',   color: '#E82AAE' },
  { t: '14:31', store: 'CX · Sarah M.',  what: 'next-best-action composed · SMS', color: '#8A7DF7' },
  { t: '14:31', store: 'Yorkshire Tea',  what: 'forecast +1,290 units for W+3',   color: '#26EA9F' },
  { t: '14:30', store: 'SCO-4',          what: 'ticket-switch detected · risk 86', color: '#E82AAE' },
  { t: '14:30', store: 'Bakery range',   what: '3 SKUs shortlisted to delist',    color: '#F7B84A' },
  { t: '14:29', store: 'Store LDS-014',  what: '6 overnight signals triaged',     color: '#26EA9F' },
  { t: '14:28', store: 'DC LDS-3',       what: '4 mis-slotted SKUs detected',     color: '#26EA9F' },
  { t: '14:27', store: 'Strawberries',   what: 'warm-week uplift +22%',           color: '#F7B84A' },
  { t: '14:26', store: 'Loyalty',        what: '£5 offer · uplift 6.2pp',         color: '#8A7DF7' }
];

export default function Landing() {
  const location = useLocation();

  // If navigated from another route with { state: { scrollTo: 'anchor-id' } },
  // scroll to that section after the Landing mounts.
  useEffect(() => {
    const anchor = location.state?.scrollTo;
    if (!anchor) return;
    const t = setTimeout(() => {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(t);
  }, [location.state]);

  return (
    <>
      <GlassHero>
        <div className="container hero-grid">
          <motion.span
            className="eyebrow hero-eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Agents for the shelf, the buyer and the shopper
          </motion.span>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <span>Ten agents.</span>
            <span>One loop.</span>
            <span className="hero-title-accent">From signal to action<span className="hero-title-dot">.</span></span>
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.22 }}
          >
            Production-grade agentic AI for the grocery floor, the buyer's desk and the customer's screen. Designed for UK estates. Eight weeks from brief to live.
          </motion.p>

          <motion.div
            className="hero-ctas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32 }}
          >
            <a href="#catalogue" className="btn btn-primary">
              See the agents in action <ArrowRight size={18} />
            </a>
          </motion.div>

          <motion.div
            className="hero-chips"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.44 }}
          >
            <span className="hero-chip hero-chip-proof"><TrendingUp size={12} /> Proven at grocery scale · up to +10% EBIT</span>
            <span className="hero-chip"><Factory size={12} /> Retail-native</span>
            <span className="hero-chip"><ShieldCheck size={12} /> Production-grade</span>
            <span className="hero-chip"><MapPin size={12} /> UK-first · estate-ready</span>
            <span className="hero-chip"><FileCheck2 size={12} /> Fully auditable</span>
          </motion.div>

          <motion.div
            className="hero-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.56 }}
          >
            {HERO_METRICS.map((m, i) => (
              <HeroMetric key={m.label} metric={m} delay={0.7 + i * 0.12} />
            ))}
          </motion.div>

          <motion.div
            className="hero-ticker-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.0 }}
          >
            <AgentTicker />
          </motion.div>
        </div>
      </GlassHero>

      {/* Proof strip — anonymised Sri Lankan grocery deployment */}
      <section className="proof" id="track-record">
        <div className="container proof-inner">
          <span className="eyebrow proof-eyebrow">Track record</span>
          <h2 className="proof-title">
            This catalogue is a <span className="proof-hl">curated re-frame</span> of a live production deployment — not a greenfield pitch.
          </h2>
          <p className="proof-lede">
            Every agent on this site distils lessons from a multi-year end-to-end advanced-analytics and agentic-AI programme at one of Sri Lanka's largest grocery retailers — a full-estate, multi-format grocer where our delivered solutions have driven <b>up to 10% incremental EBIT</b> across the use cases deployed to date.
          </p>
          <div className="proof-stats">
            <div className="proof-stat">
              <span className="proof-stat-num">18</span>
              <span className="proof-stat-lbl">production use-cases delivered</span>
              <span className="proof-stat-sub">this catalogue curates the 10 with the cleanest UK-grocery analogues</span>
            </div>
            <div className="proof-stat">
              <span className="proof-stat-num">+10<span className="proof-stat-unit">%</span></span>
              <span className="proof-stat-lbl">incremental EBIT (peak)</span>
              <span className="proof-stat-sub">attributed to deployed advanced-analytics &amp; agentic-AI scope</span>
            </div>
            <div className="proof-stat">
              <span className="proof-stat-num">Full<span className="proof-stat-unit">-estate</span></span>
              <span className="proof-stat-lbl">live in stores, DCs, online &amp; buying desks</span>
              <span className="proof-stat-sub">not a lab — running against real shoppers, SKUs and suppliers</span>
            </div>
          </div>
          <p className="proof-footnote">
            Re-framed for the UK trading context — £, BRC &amp; CTSI exposure, GSCOP, UK consumer-data law, UK supplier norms, ESL / WMS / OMS integration patterns common to Tesco, Sainsbury's, Asda and Ocado stacks. The retailer name is withheld for commercial reasons; references available under NDA on shortlist.
          </p>
        </div>
      </section>

      {/* Why Octave */}
      <section className="manifesto" id="how-it-works">
        <div className="container manifesto-inner">
          <span className="eyebrow">Why Octave</span>
          <h2 className="manifesto-title">
            Not another AI vendor with a retail demo. An operating system for retail decisions — designed for the operators running them.
          </h2>
          <div className="manifesto-pillars">
            {[
              { t: 'Already proved out',      d: '18 use-cases in production at a top-tier Sri Lankan grocer, with up to 10% incremental EBIT across deployed scope. Every design decision on this site was pressure-tested by a category buyer, a store manager or a loss-prevention lead before it ever became a page.' },
              { t: 'Retail-native',           d: 'Built by retail operators. Every agent is designed for shelves, pickers, buyers and shoppers — not a general NLP playground re-skinned for grocery.' },
              { t: 'Production-grade, day one', d: 'Every agent ships with SLAs, confidence scores, a SHAP-style audit trail and policy guardrails. No demos dressed up as pilots.' },
              { t: 'Weeks, not quarters',     d: '8-week discovery-to-pilot. 12-16 weeks to scale across an estate. Because your next category review is already on the calendar.' }
            ].map((p) => (
              <div className="manifesto-pillar" key={p.t}>
                <span className="manifesto-pillar-t">{p.t}.</span>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars + agents */}
      <section className="catalogue" id="catalogue">
        <div className="container">
          <div className="catalogue-head">
            <span className="eyebrow">The Catalogue</span>
            <h2 className="catalogue-title">Ten agents across three pillars.</h2>
            <p className="catalogue-sub">Each agent is a production blueprint — architecture, integrations, live demo, business case and rollout timeline.</p>
          </div>

          {PILLAR_ORDER.map((pid) => {
            const pillar = PILLARS[pid];
            const Icon = PILLAR_ICONS[pid];
            const agents = getAgentsByPillar(pid);
            return (
              <div className="pillar-block" key={pid} id={PILLAR_ANCHORS[pid]}>
                <div className="pillar-header">
                  <div className="pillar-badge">
                    <Icon size={18} strokeWidth={1.6} />
                    <span>Pillar 0{PILLAR_ORDER.indexOf(pid) + 1}</span>
                  </div>
                  <h3 className="pillar-name">{pillar.name}</h3>
                  <p className="pillar-tagline">{pillar.tagline}</p>
                  <p className="pillar-desc">{pillar.description}</p>
                </div>

                <div className="agent-grid">
                  {agents.map((agent, i) => (
                    <AgentCard key={agent.slug} agent={agent} index={i} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing */}
      <section className="closing">
        <div className="container closing-inner">
          <span className="eyebrow">Start with one.</span>
          <h2 className="closing-title">We've already proved agentic AI moves grocery EBIT. Your job is to pick where it moves yours first.</h2>
          <p className="closing-sub">Every engagement runs the same playbook we've run 18 times in production — assessment, design, build, guarded pilot, managed run. The first agent teaches your team. The next three compound the gains. Eight weeks to your first loop.</p>
        </div>
      </section>
    </>
  );
}

// Animated counting metric — deep-links to the owning agent
function HeroMetric({ metric, delay }) {
  const prefersReduced = useReducedMotion();
  const [n, setN] = useState(prefersReduced ? metric.value : 0);
  useEffect(() => {
    if (prefersReduced) { setN(metric.value); return; }
    let raf;
    const start = performance.now() + delay * 1000;
    const dur = 1100;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(eased * metric.value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [metric.value, delay, prefersReduced]);
  const display = metric.decimals === 0
    ? Math.round(n).toString()
    : n.toFixed(metric.decimals);
  const Inner = (
    <>
      <span className="hero-stat-num">
        <span className="hero-stat-pfx">{metric.prefix}</span>
        {display}
        <span className="hero-stat-sfx">{metric.suffix}</span>
      </span>
      <span className="hero-stat-label">{metric.label}</span>
      {metric.slug && <span className="hero-stat-link" aria-hidden="true">See the agent →</span>}
    </>
  );
  return metric.slug ? (
    <Link to={`/agent/${metric.slug}`} className="hero-stat hero-stat--link">{Inner}</Link>
  ) : (
    <div className="hero-stat">{Inner}</div>
  );
}

// Live-ticker strip — events loop horizontally
function AgentTicker() {
  // Duplicate the events so the marquee is seamless
  const loop = useMemo(() => [...TICKER_EVENTS, ...TICKER_EVENTS], []);
  return (
    <div className="ht" aria-label="Live agent activity">
      <span className="ht-live"><i /> LIVE · agents in the wild</span>
      <div className="ht-track">
        <div className="ht-row">
          {loop.map((e, i) => (
            <span className="ht-item" key={i}>
              <span className="ht-dot" style={{ background: e.color }} />
              <span className="ht-time">{e.t}</span>
              <span className="ht-store">{e.store}</span>
              <span className="ht-sep">·</span>
              <span className="ht-what">{e.what}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
