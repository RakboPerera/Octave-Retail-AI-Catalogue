import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import AgentPageShell from '../../components/agent/AgentPageShell.jsx';
import ArchitectureDiagram from '../../components/agent/ArchitectureDiagram.jsx';
import DemoShell from '../../components/agent/DemoShell.jsx';
import ReasoningTrace from '../../components/agent/ReasoningTrace.jsx';
import Explain from '../../components/ui/Explain.jsx';
import Confidence from '../../components/ui/Confidence.jsx';
import ModelCard from '../../components/ui/ModelCard.jsx';
import './Concierge.css';

const USER_PROMPT = "Plan me 3 gluten-free weeknight dinners for a family of 4 under £15 each, delivered Thursday.";

const TRACE_STEPS = [
  { type: 'think', label: 'Parse intent: meal planning, dietary constraint, budget, delivery window.' },
  { type: 'tool',  label: 'search_products(tags=["gluten-free"], category="dinner-kit")', body: '12 matching SKUs in catalogue.' },
  { type: 'tool',  label: 'get_customer_profile("loyalty_id")', body: 'Household of 4 · previous: Mediterranean, mild spice · dislikes: mushrooms.' },
  { type: 'tool',  label: 'check_delivery_slots("Thursday")', body: '4–6pm available · 6–8pm available.' },
  { type: 'think', label: 'Score candidates against budget, variety and prep-time. Substitute sauce for gluten-free equivalent in Option 2.' },
  { type: 'tool',  label: 'check_stock(SKUs, slot="Thu 6-8pm")', body: 'All 19 line-items across the 3 plans (21 units after quantities) in stock at Leeds Beeston store pick.' },
  { type: 'tool',  label: 'apply_loyalty_offer("DINE-GF-20")', body: '-£2.40 on Option 1 applied (member offer).' },
  { type: 'result', label: '3 meal plans composed with itemised basket + swap suggestions.', body: 'Ready for one-tap confirm. Ticket remains open for 24h for buyer review.' }
];

// Each meal carries a 5-axis fit score so the customer sees WHY it was ranked this way.
const MEALS = [
  {
    title: 'Chicken Piri-Piri Tray Bake',
    minutes: 25, price: '£12.60', saving: '£2.40',
    fit: { budget: 0.92, time: 0.82, dietary: 1.00, variety: 0.70, novelty: 0.55 },
    fitScore: 0.86,
    items: [
      { name: 'British Chicken Thighs 1kg', qty: 1, price: '£4.80' },
      { name: 'Maris Piper Potatoes 2kg', qty: 1, price: '£1.90' },
      { name: 'Tenderstem Broccoli 200g', qty: 1, price: '£1.50' },
      { name: 'Piri-Piri Sauce (GF) 250ml', qty: 1, price: '£1.80' },
      { name: 'Long Grain Rice 500g', qty: 1, price: '£1.20' },
      { name: 'Lemon ×2', qty: 2, price: '£0.80' },
      { name: 'Garlic bulb', qty: 1, price: '£0.60' }
    ]
  },
  {
    title: 'Thai Red Beef Curry',
    minutes: 30, price: '£14.40',
    swap: 'Gluten-free soy & red curry paste auto-substituted.',
    fit: { budget: 0.72, time: 0.68, dietary: 1.00, variety: 0.85, novelty: 0.78 },
    fitScore: 0.81,
    items: [
      { name: 'British Beef Strips 400g', qty: 1, price: '£5.60' },
      { name: 'Thai Red Curry Paste (GF) 100g', qty: 1, price: '£1.50' },
      { name: 'Coconut Milk 400ml', qty: 1, price: '£1.30' },
      { name: 'Jasmine Rice 500g', qty: 1, price: '£1.40' },
      { name: 'Mangetout 200g', qty: 1, price: '£1.80' },
      { name: 'Lime ×2', qty: 2, price: '£0.60' },
      { name: 'Thai Basil 25g', qty: 1, price: '£2.20' }
    ]
  },
  {
    title: 'Baked Salmon & Pesto Orzo',
    minutes: 22, price: '£13.95',
    fit: { budget: 0.78, time: 0.92, dietary: 1.00, variety: 0.75, novelty: 0.62 },
    fitScore: 0.81,
    items: [
      { name: 'Scottish Salmon Fillets 4×120g', qty: 1, price: '£8.00' },
      { name: 'GF Orzo 500g', qty: 1, price: '£2.10' },
      { name: 'Fresh Basil Pesto (GF) 190g', qty: 1, price: '£1.95' },
      { name: 'Cherry Tomatoes 250g', qty: 1, price: '£1.10' },
      { name: 'Rocket 80g', qty: 1, price: '£0.80' }
    ]
  }
];

export default function Concierge({ agent }) {
  return (
    <AgentPageShell
      agent={agent}
      architecture={
        <ArchitectureDiagram
          agentName="Conversational Concierge"
          signals={[
            { id: 'profile', label: 'Customer profile',    icon: 'UserCircle', detail: 'Loyalty membership, dietary preferences, past baskets and delivery patterns.' },
            { id: 'cat',     label: 'Catalogue & inventory', icon: 'Package', detail: 'Live SKU metadata — allergens, provenance, promotions and real-time fulfilment-centre stock.' },
            { id: 'policy',  label: 'Offers & policy',      icon: 'Percent', detail: 'Active promotions, price-match policy, delivery and substitution rules.' },
            { id: 'session', label: 'Conversation state',   icon: 'History', detail: 'Multi-turn context, cart snapshots, previous recommendations and explicit rejections.' }
          ]}
          tools={[
            { id: 'search', label: 'Catalogue search',   icon: 'Search', detail: 'Hybrid semantic + attribute search over 40k+ SKUs with dietary filters.' },
            { id: 'basket', label: 'Basket composer',    icon: 'ShoppingCart', detail: 'Assembles a valid basket with substitutes, quantities and fulfilment flags.' },
            { id: 'slots',  label: 'Delivery scheduler', icon: 'CalendarClock', detail: 'Reserves and releases delivery slots against the DC capacity model.' },
            { id: 'pay',    label: 'Checkout',           icon: 'CreditCard', detail: 'Invokes the payment gateway after explicit customer confirmation.' },
            { id: 'age',    label: 'Age-restricted SKU gate', icon: 'ShieldAlert', detail: 'Age-restricted SKU gate (alcohol, knives, paracetamol) — blocks checkout without ID verification.' }
          ]}
          actions={[
            { id: 'cart',   label: 'One-tap basket', icon: 'CheckCircle2', detail: 'Ready-to-checkout basket returned in-chat, editable before confirm.' },
            { id: 'order',  label: 'Order placed',   icon: 'Truck', detail: 'Order written to OMS with full provenance log for CX and fraud teams.' },
            { id: 'learn',  label: 'Preference update', icon: 'BrainCircuit', detail: 'Acceptance / rejection feeds the customer profile model.' }
          ]}
        />
      }
      demo={
        <DemoShell
          title="A Thursday-night meal plan, composed in chat"
          subtitle="One request. Five tool calls. A £40.95 basket — £38.55 after £2.40 Redwell Rewards saving, slotted for delivery — all without a single menu tap."
        >
          {({ playing, runKey }) => <ConciergeDemo playing={playing} runKey={runKey} />}
        </DemoShell>
      }
      technicalDetail={
        <ModelCard
          architecture="Tool-using LLM (Claude / Llama) + learned offer-ranker + causal uplift model"
          trainingWindow="14k offer sends · 480k chat sessions · rolling 90 days + 18-month seasonality backbone"
          lastRetrain="2026-04-08 (11 days ago)"
          accuracy="Basket conversion · +24% vs control (relative lift, 4-week holdout, n=12k)"
          accuracyLabel="live A/B lift"
          features={42}
          driftStatus="stable"
          notes="Safety: agent never invents products or prices — every SKU reference and offer code is retrieved from the live catalogue. PII-stripped logs feed back into ranker retraining weekly. PCI-DSS scope: tokenised; UK-hosted PII. Seasonality handling: the 90-day ranker window captures near-term preference drift, but a second 18-month seasonality backbone demeans known peaks (Black Friday, Christmas, Easter, half-terms, summer BBQ season) before the ranker fits — so a shopper who only bought chocolate eggs in April doesn't look like a chocolate loyalist in July. Promo-calendar events are also excluded from the uplift-model control arm so causal lift isn't confounded by seasonal demand."
        />
      }
    />
  );
}

function ConciergeDemo({ playing, runKey }) {
  const [showTyping, setShowTyping] = useState(false);
  const [streamed, setStreamed] = useState('');
  const [showMeals, setShowMeals] = useState(0);
  const [showBasket, setShowBasket] = useState(false);

  const agentIntro = "Here are three family-sized, gluten-free dinners that land under budget and fit a Thursday 6–8pm delivery window. I've auto-subbed two items (curry paste and soy) to gluten-free equivalents in Option 2, and applied your loyalty offer to Option 1.";

  useEffect(() => {
    setShowTyping(false);
    setStreamed('');
    setShowMeals(0);
    setShowBasket(false);
  }, [runKey]);

  useEffect(() => {
    if (!playing) return;
    const timers = [];
    timers.push(setTimeout(() => setShowTyping(true), 400));
    // Stream agent intro
    const startStream = 7800;
    timers.push(setTimeout(() => setShowTyping(false), startStream));
    agentIntro.split('').forEach((ch, i) => {
      timers.push(setTimeout(() => setStreamed(agentIntro.slice(0, i + 1)), startStream + i * 18));
    });
    const afterStream = startStream + agentIntro.length * 18 + 200;
    MEALS.forEach((_, i) => {
      timers.push(setTimeout(() => setShowMeals(i + 1), afterStream + i * 600));
    });
    timers.push(setTimeout(() => setShowBasket(true), afterStream + MEALS.length * 600 + 400));
    return () => timers.forEach(clearTimeout);
  }, [playing, runKey]);

  const totalPrice = MEALS.slice(0, showMeals).reduce((sum, m) => sum + parseFloat(m.price.replace('£', '')), 0);
  const totalItems = MEALS.slice(0, showMeals).reduce((s, m) => s + m.items.length, 0);

  return (
    <div className="cc-grid">
      <div className="cc-chat">
        <div className="cc-chat-head">
          <div className="cc-brand">
            <div className="cc-brand-avatar"><Icons.Sparkles size={14} /></div>
            <div>
              <div className="cc-brand-name">Concierge</div>
              <div className="cc-brand-status">{playing ? 'Working · typing' : 'Ready'}</div>
            </div>
          </div>
          <span className="tag">Web · App · WhatsApp</span>
        </div>

        <div className="cc-messages">
          <div className="cc-msg cc-msg-user">
            <div className="cc-bubble cc-bubble-user">{USER_PROMPT}</div>
            <div className="cc-meta">You · 19:04</div>
          </div>

          {(showTyping || streamed) && (
            <div className="cc-msg cc-msg-agent">
              <div className="cc-avatar"><Icons.Sparkles size={12} /></div>
              <div style={{ flex: 1 }}>
                {showTyping && !streamed && (
                  <div className="cc-bubble cc-bubble-agent cc-typing">
                    <span /><span /><span />
                  </div>
                )}
                {streamed && (
                  <div className="cc-bubble cc-bubble-agent">
                    {streamed}
                    {streamed.length < agentIntro.length && <span className="cc-caret">|</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          <AnimatePresence>
            {MEALS.slice(0, showMeals).map((meal, i) => (
              <motion.div
                key={i}
                className="cc-meal"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="cc-meal-head">
                  <span className="cc-meal-num">Option {i + 1}</span>
                  <h4 className="cc-meal-title">{meal.title}</h4>
                  <span className="cc-meal-price">{meal.price}</span>
                </div>
                <div className="cc-meal-fit">
                  <FitRadar fit={meal.fit} />
                  <div className="cc-meal-fit-meta">
                    <span className="cc-meal-fit-label">Fit score</span>
                    <span className="cc-meal-fit-score">{(meal.fitScore * 100).toFixed(0)}%</span>
                    <Confidence value={meal.fitScore} compact />
                  </div>
                </div>
                <div className="cc-meal-tags">
                  <span className="cc-meal-tag"><Icons.Clock size={11} /> {meal.minutes} min</span>
                  <span className="cc-meal-tag"><Icons.Leaf size={11} /> Gluten-free</span>
                  <span className="cc-meal-tag"><Icons.Users size={11} /> Serves 4</span>
                  {meal.saving && (
                    <Explain
                      title="Why DINE-GF-20 was applied"
                      factors={[
                        { label: 'Segment fit (Family-GF)',  weight: +0.38 },
                        { label: 'Predicted acceptance',     weight: +0.73 },
                        { label: 'Margin headroom',          weight: +0.22 },
                        { label: 'Frequency cap status',     weight: +0.08 }
                      ]}
                      confidence={0.84}
                      dataSource="14k prior offer sends · causal uplift model"
                      counterfactual="Without offer: predicted acceptance 52%, expected conversion lift £0.80."
                      wide
                      inline
                    >
                      <span className="cc-meal-tag cc-meal-tag-save"><Icons.Percent size={11} /> -{meal.saving} loyalty</span>
                    </Explain>
                  )}
                </div>
                {meal.swap && (
                  <div className="cc-meal-swap"><Icons.Replace size={12} /> {meal.swap}</div>
                )}
                <div className="cc-meal-items">
                  {meal.items.slice(0, 4).map((it, j) => (
                    <div key={j} className="cc-meal-item">
                      <span>{it.name}</span>
                      <span className="cc-meal-item-price">{it.price}</span>
                    </div>
                  ))}
                  {meal.items.length > 4 && <div className="cc-meal-item cc-meal-item-more">+ {meal.items.length - 4} more items</div>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {showBasket && (
            <motion.div
              className="cc-basket"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="cc-basket-head">
                <Icons.ShoppingCart size={15} />
                <span>Ready-to-checkout basket</span>
                <span className="cc-basket-total">£{(totalPrice - 2.40).toFixed(2)} <span style={{ fontSize: '0.75em', opacity: 0.75, fontWeight: 400 }}>(- £2.40 Redwell Rewards)</span></span>
              </div>
              <div className="cc-basket-meta">
                <span>{totalItems} items · Thursday 6–8pm</span>
                <span className="cc-basket-offer"><Icons.Tag size={11} /> DINE-GF-20 applied</span>
              </div>
              <div className="cc-basket-actions">
                <button className="btn btn-primary cc-basket-btn"><Icons.CheckCircle2 size={14} /> Confirm &amp; pay</button>
                <button className="btn btn-ghost cc-basket-btn">Edit basket</button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="cc-side">
        <ReasoningTrace steps={TRACE_STEPS} playing={playing} speed={1.2} />
      </div>
    </div>
  );
}

// Mini 5-axis radar for meal-fit explainability
function FitRadar({ fit }) {
  const axes = [
    { key: 'budget',  label: 'Budget'  },
    { key: 'time',    label: 'Time'    },
    { key: 'dietary', label: 'Diet'    },
    { key: 'variety', label: 'Variety' },
    { key: 'novelty', label: 'Novelty' }
  ];
  const cx = 60, cy = 60, r = 42;
  const n = axes.length;
  const pts = axes.map((a, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    const rad = r * fit[a.key];
    return [cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad];
  });
  const axisPts = axes.map((_, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  });
  return (
    <svg viewBox="0 0 120 120" className="cc-radar" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const ringPts = axes.map((_, i) => {
          const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
          return `${cx + Math.cos(angle) * r * f},${cy + Math.sin(angle) * r * f}`;
        }).join(' ');
        return <polygon key={f} points={ringPts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" />;
      })}
      {axisPts.map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
      ))}
      <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="rgba(38,234,159,0.25)" stroke="#26EA9F" strokeWidth="1.5" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#26EA9F" />)}
      {axes.map((a, i) => {
        const [x, y] = axisPts[i];
        const dx = x - cx, dy = y - cy;
        const lx = cx + dx * 1.2;
        const ly = cy + dy * 1.2;
        return (
          <text key={a.key} x={lx} y={ly + 2} textAnchor="middle" fontSize="7" fontFamily="var(--font-display)" fill="rgba(228,228,238,0.7)" letterSpacing="0.04em">{a.label}</text>
        );
      })}
    </svg>
  );
}
