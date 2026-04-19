import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import OctaveLogo from '../brand/OctaveLogo.jsx';
import './Nav.css';

const PILLAR_LINKS = [
  { id: 'customer-experience',  label: 'Customer Experience' },
  { id: 'store-operations',     label: 'Store & Operations' },
  { id: 'merchandising-supply', label: 'Merchandising & Supply' }
];

export default function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const onAgent = location.pathname.startsWith('/agent/');
  const [open, setOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname, location.hash]);

  const goToAnchor = (e, anchorId) => {
    e.preventDefault();
    setOpen(false);
    if (location.pathname === '/') {
      const el = document.getElementById(anchorId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate('/', { state: { scrollTo: anchorId } });
  };

  return (
    <header className="nav">
      <a href="#main-content" className="nav-skip">Skip to main content</a>
      <div className="nav-inner container">
        <NavLink to="/" className="nav-brand">
          <OctaveLogo size={18} />
          <span className="nav-divider" aria-hidden="true" />
          <span className="nav-brand-sub">Retail · Agentic AI</span>
        </NavLink>

        <nav className="nav-links nav-links-desktop" aria-label="Primary">
          {PILLAR_LINKS.map((l) => (
            <a
              key={l.id}
              href={`/#${l.id}`}
              onClick={(e) => goToAnchor(e, l.id)}
              className="nav-link"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {onAgent && (
          <Link to="/" className="btn btn-ghost nav-back nav-back-desktop">← Catalogue</Link>
        )}

        <button
          type="button"
          className="nav-burger"
          aria-expanded={open}
          aria-controls="nav-mobile-drawer"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <Icons.X size={22} /> : <Icons.Menu size={22} />}
        </button>
      </div>

      {open && (
        <div id="nav-mobile-drawer" className="nav-drawer" role="menu">
          <div className="container nav-drawer-inner">
            {PILLAR_LINKS.map((l) => (
              <a
                key={l.id}
                href={`/#${l.id}`}
                onClick={(e) => goToAnchor(e, l.id)}
                className="nav-drawer-link"
                role="menuitem"
              >
                {l.label}
              </a>
            ))}
            {onAgent && (
              <Link to="/" className="nav-drawer-link nav-drawer-link--primary" role="menuitem">
                ← All agents
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
