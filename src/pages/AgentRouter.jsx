import { lazy, Suspense, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getAgent } from '../data/agents.js';

const Concierge              = lazy(() => import('./agents/Concierge.jsx'));
const CustomerLifecycle      = lazy(() => import('./agents/CustomerLifecycle.jsx'));
const VoC                    = lazy(() => import('./agents/VoC.jsx'));
const ShelfIntel             = lazy(() => import('./agents/ShelfIntel.jsx'));
const StoreCopilot           = lazy(() => import('./agents/StoreCopilot.jsx'));
const LossPrevention         = lazy(() => import('./agents/LossPrevention.jsx'));
const WarehouseOrchestrator  = lazy(() => import('./agents/WarehouseOrchestrator.jsx'));
const ForecastSwarm          = lazy(() => import('./agents/ForecastSwarm.jsx'));
const DynamicPricing         = lazy(() => import('./agents/DynamicPricing.jsx'));
const RangeSpace             = lazy(() => import('./agents/RangeSpace.jsx'));

const AGENT_PAGES = {
  'concierge':               Concierge,
  'customer-lifecycle':      CustomerLifecycle,
  'voc':                     VoC,
  'shelf-intel':             ShelfIntel,
  'store-copilot':           StoreCopilot,
  'loss-prevention':         LossPrevention,
  'warehouse-orchestrator':  WarehouseOrchestrator,
  'forecast-swarm':          ForecastSwarm,
  'dynamic-pricing':         DynamicPricing,
  'range-space':             RangeSpace
};

const DEFAULT_TITLE = 'Octave — Agentic AI for Retail';
const DEFAULT_DESC  = 'Ten production-grade AI agents for UK grocery. From signal to action in one loop.';

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function AgentRouter() {
  const { slug } = useParams();
  const agent = getAgent(slug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  useEffect(() => {
    if (!agent) {
      document.title = DEFAULT_TITLE;
      setMeta('description', DEFAULT_DESC);
      return;
    }
    const title = `${agent.name} · Octave`;
    const desc  = agent.oneLiner;
    document.title = title;
    setMeta('description', desc);
    setMeta('og:title', title, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('twitter:title', title);
    setMeta('twitter:description', desc);
    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('description', DEFAULT_DESC);
      setMeta('og:title', DEFAULT_TITLE, 'property');
      setMeta('og:description', DEFAULT_DESC, 'property');
      setMeta('twitter:title', DEFAULT_TITLE);
      setMeta('twitter:description', DEFAULT_DESC);
    };
  }, [agent]);

  if (!agent) return <Navigate to="/" replace />;

  const Component = AGENT_PAGES[slug];
  if (!Component) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<AgentLoadingFallback />}>
      <Component agent={agent} />
    </Suspense>
  );
}

function AgentLoadingFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
      <div style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.14em', fontSize: '0.8rem', textTransform: 'uppercase' }}>
        Loading agent…
      </div>
    </div>
  );
}
