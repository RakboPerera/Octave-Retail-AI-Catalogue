import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';
import './AgentCard.css';

export default function AgentCard({ agent, index = 0 }) {
  const Icon = Icons[agent.icon] || Icons.Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/agent/${agent.slug}`} className="agent-card">
        <div className="agent-card-head">
          <span className="agent-card-num">{agent.number}</span>
          <div className="agent-card-icon"><Icon size={22} strokeWidth={1.6} /></div>
        </div>
        <h3 className="agent-card-name">{agent.name}</h3>
        <p className="agent-card-one">{agent.oneLiner}</p>
        <div className="agent-card-tags">
          {agent.tags.map((t) => (
            <span key={t} className="agent-card-tag">{t}</span>
          ))}
        </div>
        <div className="agent-card-foot">
          <span className="agent-card-cta">Explore the agent</span>
          <Icons.ArrowUpRight size={16} className="agent-card-arrow" />
        </div>
      </Link>
    </motion.div>
  );
}
