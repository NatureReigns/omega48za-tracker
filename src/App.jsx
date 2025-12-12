import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './main.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [amount, setAmount] = useState('');
  const [bottles, setBottles] = useState(0);
  const [phoneInput, setPhoneInput] = useState('');

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

  const addSale = () => {
    if (!amount || bottles <= 0) return alert('Enter amount and bottles');
    const newSale = {
      id: Date.now(),
      amount_zar: parseFloat(amount),
      bottles_sold: parseInt(bottles),
    };
    setSales([...sales, newSale]);
    setAmount('');
    setBottles(0);
  };

  const total = sales.reduce((sum, s) => sum + s.amount_zar, 0);
  const commission = total * 0.3;
  const stock = total * 0.5;

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'Arial' }}>
        <h1>Nature Reigns Omega48</h1>
        <input
          type="text"
          inputMode="numeric"
          placeholder="082 123 4567"
          value={phoneInput}
          onChange={(e) => {
            const nums = e.target.value.replace(/\D/g, '');
            setPhoneInput(nums);
          }}
          style={{ padding: '12px', fontSize: '18px', width: '220px', margin: '10px' }}
        />
        <br />
        <button
          onClick={async () => {
            if (phoneInput.length < 10) return alert('Valid SA number required');
            const full = '+27' + phoneInput.slice(1);
            await supabase.auth.signInWithOtp({ phone: full });
            alert('OTP sent – use 000000 for testing');
          }}
          style={{ padding: '12px 24px', background: '#1B4D3E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px' }}
        >
          Send OTP
        </button>
        <br /><br />
        <button
          onClick={() => setUser({ phone: '0727088491', role: 'admin' })}
          style={{ padding: '12px 24px', background: '#D4AF37', color: 'black', border: 'none', borderRadius: '8px' }}
        >
          Demo Login (Admin)
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Welcome {user.phone}</h1>
      <h2>Add Sale</h2>
      <input placeholder="Amount (ZAR)" value={amount} onChange={e => setAmount(e.target.value)} />
      <input type="number" placeholder="Bottles" value={bottles} onChange={e => setBottles(e.target.value)} />
      <button onClick={addSale}>Add Sale</button>

      <p>Total Sales: R{total.toFixed(2)}</p>
      <p>Commission (30%): R{commission.toFixed(2)}</p>
      <p>Stock Allocation (50%): R{stock.toFixed(2)}</p>
    </div>
  );
}

export default App;
