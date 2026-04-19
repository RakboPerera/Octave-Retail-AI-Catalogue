import OctaveLogo from '../brand/OctaveLogo.jsx';
import JKHLogo from '../brand/JKHLogo.jsx';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-mark">
          <OctaveLogo size={16} />
          <span className="footer-div" aria-hidden="true" />
          <JKHLogo size={11} />
        </div>
        <div className="footer-meta">
          <span className="eyebrow">Agentic AI for Retail</span>
          <span className="footer-copy">Find clarity in chaos.</span>
        </div>
      </div>
    </footer>
  );
}
