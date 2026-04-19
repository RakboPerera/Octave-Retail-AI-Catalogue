// Inline hover-tooltip for retail acronyms. Usage: <Gloss term="SCO">SCO</Gloss>
// The tooltip is portalled to <body> and positioned with fixed coordinates so
// it can never be clipped by an ancestor's `overflow: auto` (e.g. the trace list).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Gloss.css';

const GLOSSARY = {
  SCO: 'Self-Checkout — customer-operated till',
  POS: 'Point-of-Sale — the till system',
  OMS: 'Order Management System',
  WMS: 'Warehouse Management System',
  TMS: 'Transport Management System',
  PIM: 'Product Information Management',
  DAM: 'Digital Asset Management',
  WFM: 'Workforce Management — shift & labour scheduling',
  ERP: 'Enterprise Resource Planning',
  EDI: 'Electronic Data Interchange — B2B messaging',
  ESL: 'Electronic Shelf Label',
  EAS: 'Electronic Article Surveillance — anti-theft tags',
  CCTV: 'Closed-Circuit Television',
  OSA: 'On-Shelf Availability',
  OOS: 'Out of Stock',
  SKU: 'Stock Keeping Unit',
  RTSP: 'Real-Time Streaming Protocol — CCTV feed format',
  MOQ: 'Minimum Order Quantity',
  DC: 'Distribution Centre',
  CS: 'Customer Service',
  LP: 'Loss Prevention',
  HR: 'Human Resources',
  PR: 'Public Relations',
  COO: 'Chief Operating Officer',
  CMO: 'Chief Marketing Officer',
  CLV: 'Customer Lifetime Value',
  RFM: 'Recency, Frequency, Monetary — classic segmentation',
  NBA: 'Next-Best-Action',
  VRP: 'Vehicle Routing Problem — route optimisation',
  MAPE: 'Mean Absolute Percentage Error — forecast accuracy',
  UPW: 'Unit Price Weighting — the shelf-edge unit-price law',
  CSAT: 'Customer Satisfaction',
  RLPM: 'Regional Loss Prevention Manager',
  TFT: 'Temporal Fusion Transformer — a forecasting model',
  GBM: 'Gradient Boosting Machine — a regression model',
  ARIMA: 'AutoRegressive Integrated Moving Average — classic time series',
  SLA: 'Service-Level Agreement',
  SHAP: 'SHapley Additive exPlanations — per-feature model attribution',
  ABV: 'Alcohol by Volume',
  RRP: 'Recommended Retail Price',
  GF: 'Gluten-Free'
};

export default function Gloss({ term, children, className = '' }) {
  const def = GLOSSARY[term] || term;
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, placement: 'top' });

  const measure = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const popWidth = 260;
    const popHeightEstimate = 56;
    const spaceAbove = r.top;
    const placement = spaceAbove < popHeightEstimate + 12 ? 'bottom' : 'top';
    const cx = r.left + r.width / 2;
    const left = Math.min(
      window.innerWidth - popWidth / 2 - 8,
      Math.max(popWidth / 2 + 8, cx)
    );
    const top = placement === 'top' ? r.top - 8 : r.bottom + 8;
    setPos({ left, top, placement });
  };

  useLayoutEffect(() => { if (open) measure(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onScroll = () => measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={triggerRef}
      className={`gloss ${className}`}
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? `gloss-${term}` : undefined}
    >
      {children || term}
      {open && typeof document !== 'undefined' && createPortal(
        <span
          id={`gloss-${term}`}
          className={`gloss-pop gloss-pop--${pos.placement}`}
          role="tooltip"
          style={{ left: pos.left, top: pos.top }}
        >
          {def}
        </span>,
        document.body
      )}
    </span>
  );
}
