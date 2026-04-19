import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { PILLARS, AGENTS } from '../../data/agents.js';
import './AgentPageShell.css';

export default function AgentPageShell({ agent, demo, architecture, technicalDetail, kpiChart, extraSections }) {
  const Icon = Icons[agent.icon] || Icons.Sparkles;
  const pillar = PILLARS[agent.pillar];

  return (
    <div className="ap">
      {/* Hero */}
      <section className="ap-hero">
        <div className="container ap-hero-inner">
          <motion.div
            className="ap-hero-meta"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="ap-crumb">{pillar.name}</Link>
            <span className="ap-crumb-sep">·</span>
            <span className="ap-crumb-num">Agent {agent.number}</span>
          </motion.div>

          <motion.div className="ap-hero-title-row"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            <div className="ap-hero-icon"><Icon size={32} strokeWidth={1.4} /></div>
            <h1 className="ap-title">{agent.name}</h1>
          </motion.div>

          <motion.p
            className="ap-one"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14 }}
          >
            {agent.oneLiner}
          </motion.p>

          <motion.div
            className="ap-tags"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {agent.tags.map((t) => <span key={t} className="tag tag-muted">{t}</span>)}
            <span className="tag">{agent.ttv} to value</span>
          </motion.div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="ap-section">
        <div className="container ap-two-col">
          <div className="ap-two-col-block">
            <span className="eyebrow">The problem</span>
            <p className="ap-block-body">{agent.problem}</p>
          </div>
          <div className="ap-two-col-block">
            <span className="eyebrow eyebrow-pink">The Octave agent</span>
            <p className="ap-block-body">{agent.solution}</p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="ap-section">
        <div className="container">
          <span className="eyebrow">Measured impact</span>
          <div className="ap-kpis">
            {agent.roi.map((k) => (
              <div key={k.label} className="ap-kpi">
                <span className="ap-kpi-value">{k.value}</span>
                <span className="ap-kpi-label">{k.label}</span>
              </div>
            ))}
          </div>
          {kpiChart && <div className="ap-kpi-chart">{kpiChart}</div>}
        </div>
      </section>

      {/* Architecture */}
      <section className="ap-section">
        <div className="container">
          <div className="ap-section-head">
            <span className="eyebrow">Architecture</span>
            <h2 className="ap-section-title">How the agent is wired.</h2>
            <p className="ap-section-sub">A single core with tool-use, guarded by your business rules. Inputs on the left, actions on the right — every edge is an audit line.</p>
          </div>
          {architecture}
        </div>
      </section>

      {/* Demo */}
      <section className="ap-section">
        <div className="container">
          <div className="ap-section-head">
            <span className="eyebrow">Try it</span>
            <h2 className="ap-section-title">See the agent think, call tools and act.</h2>
            <p className="ap-section-sub">This is a pre-recorded run against a fictional UK grocery dataset. The reasoning trace on the right is what the production agent actually produces — inspectable, replayable, auditable.</p>
          </div>
          {demo}
        </div>
      </section>

      {/* How it works */}
      {technicalDetail && (
        <section className="ap-section">
          <div className="container">
            <div className="ap-section-head">
              <span className="eyebrow">How it works</span>
              <h2 className="ap-section-title">Under the hood.</h2>
            </div>
            {technicalDetail}
          </div>
        </section>
      )}

      {/* Integrations & TTV */}
      <section className="ap-section">
        <div className="container ap-two-col">
          <div className="ap-two-col-block">
            <span className="eyebrow">Integrations</span>
            <ul className="ap-int-list">
              {agent.integrations.map((i) => (
                <li key={i}>
                  <Icons.Plug size={14} strokeWidth={2} />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ap-two-col-block">
            <span className="eyebrow">Rollout</span>
            <div className="ap-rollout">
              {computeRolloutPhases(agent.ttv).map((r) => (
                <div key={r.w} className="ap-rollout-row">
                  <span className="ap-rollout-w">{r.w}</span>
                  <span className="ap-rollout-t">{r.t}</span>
                </div>
              ))}
              <div className="ap-rollout-total">
                <Icons.Timer size={16} />
                <span>Typical go-live: <b>{agent.ttv}</b></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {extraSections}

      {/* Footer CTA */}
      <section className="ap-cta-section">
        <div className="container ap-cta-inner">
          <h2 className="ap-cta-title">Ready to deploy <span className="ap-cta-hl">{agent.name}</span>?</h2>
          <p className="ap-cta-sub">Every Octave engagement begins with a 2-week value-mapping sprint to validate the highest-leverage surface for this agent in your estate.</p>
          <div className="ap-cta-actions">
            <Link to="/" className="btn btn-ghost">← All agents</Link>
            <AdjacentAgents currentSlug={agent.slug} />
          </div>
        </div>
      </section>
    </div>
  );
}

function AdjacentAgents({ currentSlug }) {
  const i = AGENTS.findIndex((a) => a.slug === currentSlug);
  const isLast = i === AGENTS.length - 1;
  if (isLast) {
    return (
      <Link to="/#catalogue" className="btn btn-primary">
        Back to the catalogue <Icons.LayoutGrid size={18} />
      </Link>
    );
  }
  const next = AGENTS[i + 1];
  return (
    <Link to={`/agent/${next.slug}`} className="btn btn-primary">
      Next: {next.name} <Icons.ArrowRight size={18} />
    </Link>
  );
}

// Builds 3 rollout phases proportional to the agent's TTV.
// e.g. 6w → [W1, W2–W3, W4+]; 16w → [W1–W3, W4–W10, W11+].
function computeRolloutPhases(ttvStr) {
  const weeks = parseInt(String(ttvStr).match(/\d+/)?.[0] || '10', 10);
  const p1 = Math.max(1, Math.round(weeks * 0.15));           // discovery (~15%)
  const p2 = Math.max(p1 + 1, Math.round(weeks * 0.65));      // build (~50%)
  const fmt = (a, b) => (a === b ? `W${a}` : `W${a}–W${b}`);
  return [
    { w: p1 === 1 ? 'W1'           : `W1–W${p1}`,            t: 'Discovery, signal mapping, eval harness'      },
    { w: fmt(p1 + 1, p2),                                    t: 'Data plumbing, model training, golden path'    },
    { w: `W${p2 + 1}–W${weeks}`,                             t: 'Guarded pilot, feedback loop, scale-out'       }
  ];
}
