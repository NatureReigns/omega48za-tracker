import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './main.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [amount, setAmount] = useState('');
  const [bottles, setBottles] = useState(0);
  const [phoneInput, setPhoneInput] = useState(''); // Controlled state for phone sanitization
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchSales();
  }, [user]);

  const fetchSales = async () => {
    // Placeholder for Supabase fetch; currently uses local state for demo
    setSales([]);
  };

  const addSale = async () => {
    if (!amount || bottles <= 0 || isNaN(amount)) {
      alert('Please enter a valid amount (ZAR) and number of bottles (>0).');
      return;
    }

    const newSale = {
      id: Date.now(),
      agent_id: user.id,
      amount_zar: parseFloat(amount),
      bottles_sold: parseInt(bottles),
      sale_date: new Date().toISOString().split('T')[0],
      deposit_confirmed: false
    };

    // Simulate Supabase insert; replace with actual once fully integrated
    setSales(prev => [...prev, newSale]);
    setAmount('');
    setBottles(0);
    alert(`Sale added successfully: R${amount} for ${bottles} bottles. (Pending deposit confirmation)`);
  };

  const totalSales = sales.reduce((sum, s) => sum + Number(s.amount_zar || 0), 0);
  const commission = totalSales * 0.3;
  const stockAlloc = totalSales * 0.5;

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Omega48ZA Tracker</h1>
        <input
          type="text"
          id="phone"
          name="phone-input"
          autocomplete="off"
          inputMode="numeric"
          placeholder="Enter SA number (e.g., 082 123 4567)"
          value={phoneInput}
          onChange={(e) => {
            // Sanitize: Strip non-digits, spaces, and any +27 prefix
            let sanitized = e.target.value.replace(/\D/g, '');
            if (sanitized.startsWith('27')) sanitized = '0' + sanitized.slice(2);
            setPhoneInput(sanitized);
          }}
          style={{ padding: '10px', fontSize: '16px', width: '200px' }}
        />
        <br />
        <button
          onClick={async () => {
            let phone = phoneInput.replace(/\s/g, '');
            if (!phone || phone.length < 10 || !phone.startsWith('0')) {
              alert('Please enter a valid SA phone number (e.g., 0821234567).');
              return;
            }
            const fullPhone = '+27' + phone.slice(1);
            await supabase.auth.signInWithOtp({ phone: fullPhone, options: { channel: 'sms' } });
            alert('OTP sent! Use 000000 for demo or check your SMS.');
          }}
          style={{ padding: '10px 20px', margin: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Send OTP
        </button>
        <br /><br />
        <button
          onClick={() => setUser({ id: 'demo', phone: '0727088491', role: 'admin' })}
          style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Demo Login (Admin)
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome, {user.phone} ({user.role})</h1>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2>Sales Tracker</h2>
          <input
            type="number"
            placeholder="Amount (ZAR)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
          />
          <input
            type="number"
            placeholder="Bottles Sold"
            value={bottles}
            onChange={(e) => setBottles(e.target.value)}
            style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
          />
          <button
            onClick={addSale}
            style={{ width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Add Sale
          </button>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sales.map(s => (
              <li key={s.id} style={{ padding: '5px', borderBottom: '1px solid #ddd' }}>
                R{s.amount_zar} - {s.bottles_sold} bottles {s.deposit_confirmed ? '(Confirmed)' : '(Pending)'}
              </li>
            ))}
          </ul>
          <p><strong>Total Sales:</strong> R{totalSales.toFixed(2)}</p>
          <p><strong>Commission (30%):</strong> R{commission.toFixed(2)}</p>
          <p><strong>Stock Allocation (50%):</strong> R{stockAlloc.toFixed(2)}</p>
        </div>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2>Weekly Leaderboards (Top Agents)</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '5px' }}>Agent 1: R5,000</li>
            <li style={{ padding: '5px' }}>Agent 2: R3,000</li>
            <li style={{ padding: '5px' }}>You: R{totalSales.toFixed(2)}</li>
          </ul>
          <h2>Agent Wallet</h2>
          <p>Pending Payout: <strong>R{commission.toFixed(2)}</strong> (Sends via PayShap every Friday)</p>
          {user.role === 'admin' && (
            <div>
              <h3>Admin Panel</h3>
              <button onClick={() => alert('Admin panel: Edit commission rules here (full implementation next).')}>
                Edit Dashboard Rules
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
