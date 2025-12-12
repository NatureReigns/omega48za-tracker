import { useState, useEffect } from 'react';
import { supabase } from './main.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [amount, setAmount] = useState('');
  const [bottles, setBottles] = useState('');
  const [phoneInput, setPhone] = useState('');

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithPhone = async () => {
    if (phone.length < 10) return alert('Enter full SA number');
    const fullPhone = '+27' + phone.slice(1);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) alert(error.message);
    else alert('OTP sent – use 000000 for testing');
  };

  const addSale = () => {
    if (!amount || !bottles) return;
    const newSale = {
      id: Date.now(),
      amount: Number(amount),
      bottles: Number(bottles),
    };
    setSales([...sales, newSale]);
    setAmount('');
    setBottles('');
  };

  const total = sales.reduce((sum, s) => sum + s.amount, 0);
  const commission = total * 0.3;
  const stock = total * 0.5;

  if (loading) return <div>Loading…</div>;

  // ================= LOGIN SCREEN =================
  if (!user === null) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ color: '#1B4D3E' }}>Nature Reigns Omega48</h1>
        <p style={{ color: '#555' }}>Enter your SA number</p>
        <input
          type="text"
          inputMode="numeric"
          placeholder="082 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          style={{
            padding: '14px',
            fontSize: '18px',
            width: '240px',
            borderRadius: '8px',
            border: '2px solid #D4AF37',
            marginBottom: '20px',
          }}
        />
        <br />
        <button
          onClick={signInWithPhone}
          style={{
            padding: '14px 32px',
            fontSize: '18px',
            background: '#1B4D3E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          Send OTP
        </button>
        <br />
        <button
          onClick={() => setUser({ phone: '0727088491', role: 'admin' })}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#D4AF37',
            color: 'black',
            border: 'none',
            borderRadius: '8px',
          }}
        >
          Demo Login (Admin)
        </button>
      </div>
    );
  }

  // ================= MAIN DASHBOARD =================
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1B4D3E' }}>Welcome {user.phone}</h1>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2>Add Sale</h2>
        <input placeholder="Amount (ZAR)" value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: '10px', margin: '5px' }} />
        <input placeholder="Bottles" value={bottles} onChange={e => setBottles(e.target.value)} style={{ padding: '10px', margin: '5px' }} />
        <button onClick={addSale} style={{ padding: '10px 20px', background: '#D4AF37', border: 'none', borderRadius: '6px' }}>
          Add Sale
        </button>

        <div style={{ marginTop: '20px' }}>
          <p><strong>Total Sales:</strong> R{total.toFixed(2)}</p>
          <p><strong>Commission (30%):</strong> R{commission.toFixed(2)}</p>
          <p><strong>Stock Allocation (50%):</strong> R{stock.toFixed(2)}</p>
        </div>
      </div>

      {user.role === 'admin' && (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '12px' }}>
          <h3>Admin Quick Actions</h3>
          <button style={{ padding: '10px', background: '#1B4D3E', color: 'white', border: 'none', borderRadius: '6px' }}>
            Edit Commission Rules (coming in 2 minutes if you want it now)
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
