// Inline "why?" popover — renders through a portal so it never gets clipped
// by scroll containers / overflow boundaries. Auto-flips above/below based on
// available viewport space.
import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Brain, Info } from 'lucide-react';
import './Explain.css';

const POP_WIDTH_NORMAL = 260;
const POP_WIDTH_WIDE   = 360;
const POP_GAP = 10;

export default function Explain({ children, title, factors = [], confidence, dataSource, counterfactual, inline = false, wide = false }) {
  const [open, setOpen]   = useState(false);
  const [coords, setCoords] = useState(null); // { top, left, flip }
  const triggerRef = useRef(null);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = wide ? POP_WIDTH_WIDE : POP_WIDTH_NORMAL;
    // Estimate height — factor rows + header + meta. Generous upper bound.
    const estH = 56 + (factors.length * 20) + (dataSource ? 44 : 0) + (counterfactual ? 44 : 0);
    // Decide flip: prefer above; if not enough room, flip below
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const flip = spaceAbove < estH + POP_GAP + 8 && spaceBelow > spaceAbove;

    // Horizontal clamp — keep popover fully in viewport
    const triggerCx = rect.left + rect.width / 2;
    let left = triggerCx - w / 2;
    const margin = 10;
    if (left < margin) left = margin;
    if (left + w > vw - margin) left = vw - w - margin;

    const top = flip
      ? rect.bottom + POP_GAP
      : rect.top - POP_GAP; // popover positions itself with translateY(-100%) when above

    setCoords({ top, left, flip, anchorCx: triggerCx, width: w });
  }, [wide, factors.length, dataSource, counterfactual]);

  const show = () => { measure(); setOpen(true); };
  const hide = () => setOpen(false);

  // Close on scroll / resize / escape — tooltip position would go stale otherwise.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`ex ${inline ? 'ex-inline' : ''}`}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
        <span className="ex-hint" aria-hidden="true"><Info size={11} /></span>
      </span>
      {open && coords && createPortal(
        <div
          className={`ex-pop ${coords.flip ? 'ex-pop-below' : 'ex-pop-above'} ${wide ? 'ex-pop-wide' : ''}`}
          role="tooltip"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            '--ex-arrow-left': `${coords.anchorCx - coords.left}px`
          }}
        >
          <div className="ex-pop-head">
            <Brain size={12} />
            <span>{title || 'Why this decision?'}</span>
            {confidence != null && (
              <span className={`ex-pop-conf ${confidence >= 0.8 ? 'hi' : confidence >= 0.55 ? 'md' : 'lo'}`}>
                conf {confidence.toFixed(2)}
              </span>
            )}
          </div>
          {factors.length > 0 && (
            <div className="ex-factors">
              {factors.map((f, i) => (
                <div key={i} className="ex-factor">
                  <span className="ex-factor-label">{f.label}</span>
                  <span className={`ex-factor-bar ${f.weight < 0 ? 'is-neg' : 'is-pos'}`}>
                    <span className="ex-factor-fill" style={{ width: `${Math.min(100, Math.abs(f.weight) * 100)}%` }} />
                  </span>
                  <span className={`ex-factor-w ${f.weight < 0 ? 'is-neg' : 'is-pos'}`}>{f.weight >= 0 ? '+' : ''}{f.weight.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          {dataSource && (
            <div className="ex-meta"><span>Data</span>{dataSource}</div>
          )}
          {counterfactual && (
            <div className="ex-meta ex-cf"><span>Counterfactual</span>{counterfactual}</div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
