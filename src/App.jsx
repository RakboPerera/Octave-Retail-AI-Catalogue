import { Routes, Route } from 'react-router-dom';
import Nav from './components/layout/Nav.jsx';
import Footer from './components/layout/Footer.jsx';
import Landing from './pages/Landing.jsx';
import AgentRouter from './pages/AgentRouter.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/agent/:slug" element={<AgentRouter />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
