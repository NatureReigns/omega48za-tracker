import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [amount, setAmount] = useState('');
  const [bottles, setBottles] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [commissionRate, setCommissionRate] = useState(30);
  const [stockRate, setStockRate] = useState(50);
  const [bonusRate, setBonusRate] = useState(20);
  const [bonusPoolAmount, setBonusPoolAmount] = useState(5000);

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
    if (user) {
      supabase.from('rules').select('*').single().then(({ data }) => {
        if (data) {
          setCommissionRate(data.commission_rate || 30);
          setStockRate(data.stock_rate || 50);
          setBonusRate(data.bonus_rate || 20);
          setBonusPoolAmount(data.bonus_pool_amount || 5000);
        }
      });
    }
  }, [user]);

  const signInWithPhone = async () => {
    if (phoneInput.length < 10) return alert('Enter full SA number');
    const fullPhone = '+27' + phoneInput.slice(1);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) alert(error.message);
    else alert('OTP sent – use 000000 for testing');
  };

  const addSale = async () => {
    if (!amount || !bottles) return alert('Enter amount and bottles');
    const { error } = await supabase.from('sales').insert({
      agent_id: user.id,
      amount_zar: Number(amount),
      bottles_sold: Number(bottles),
    });
    if (error) {
      alert('Error saving sale: ' + error.message);
    } else {
      setAmount('');
      setBottles('');
      alert('Sale saved successfully!');
    }
  };

  const saveRules = async () => {
    const { error } = await supabase.from('rules').upsert({
      id: 1,
      commission_rate: Number(commissionRate),
      stock_rate: Number(stockRate),
      bonus_rate: Number(bonusRate),
      bonus_pool_amount: Number(bonusPoolAmount),
    });
    if (error) {
      alert('Error saving rules: ' + error.message);
    } else {
      alert('Rules saved successfully!');
    }
  };

  const totalSales = sales.reduce((sum, s) => sum + (s.amount_zar || 0), 0);
  const commission = totalSales * (commissionRate / 100);
  const stockAlloc = totalSales * (stockRate / 100);
  const bonusAlloc = totalSales * (bonusRate / 100);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (user === null) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ color: '#1B4D3E' }}>Nature Reigns Omega48</h1>
        <img src="https://raw.githubusercontent.com/NatureReigns/omega48za-tracker/main/public/logo.png" alt="Nature Reigns Logo" style={{ maxWidth: '300px', margin: '20px auto', display: 'block' }} />
        <p style={{ color: '#555' }}>Enter your SA number</p>
        <input
          type="text"
          inputMode="numeric"
          placeholder="082 123 4567"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
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
        <br /><br />
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1B4D3E' }}>Welcome {user.phone ?? 'Agent'}</h1>
      <img src="https://raw.githubusercontent.com/NatureReigns/omega48za-tracker/main/public/logo.png" alt="Nature Reigns Logo" style={{ maxWidth: '300px', margin: '20px auto', display: 'block' }} />
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2>Add Sale</h2>
        <input placeholder="Amount (ZAR)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '10px', margin: '5px' }} />
        <input placeholder="Bottles" value={bottles} onChange={(e) => setBottles(e.target.value)} style={{ padding: '10px', margin: '5px' }} />
        <button onClick={addSale} style={{ padding: '10px 20px', background: '#D4AF37', border: 'none', borderRadius: '6px' }}>
          Add Sale
        </button>
