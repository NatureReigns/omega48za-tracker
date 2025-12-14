import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [fullName, setFullName] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [amount, setAmount] = useState('');
  const [bottles, setBottles] = useState('');
  const [sales, setSales] = useState([]);
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
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data, error }) => {
        if (data) {
          setProfile(data);
        } else if (error && error.code === 'PGRST116') {
          setShowSignup(true);
        }
      });

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

  const signInWithPhone = () => {
    setUser({ id: 'demo', phone: phoneInput || '0727088491', role: 'admin' });
  };

  const saveProfile = async () => {
    if (!fullName || !areaCode) return alert('Please enter your name and area');
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: fullName,
      area_code: areaCode,
      stock_balance: 50, // Initial stock for new agents
    });
    if (error) {
      alert('Error saving profile: ' + error.message);
    } else {
      setProfile({ full_name: fullName, area_code: areaCode, stock_balance: 50 });
      setShowSignup(false);
      alert('Profile saved!');
    }
  };

  const addSale = async () => {
    if (!amount || !bottles) return alert('Enter amount and bottles');
    const bottlesNum = Number(bottles);
    if ((profile?.stock_balance || 0) < bottlesNum) {
      return alert('Insufficient stock! Please restock.');
    }

    const { error } = await supabase.from('sales').insert({
      agent_id: user.id,
      amount_zar: Number(amount),
      bottles_sold: bottlesNum,
    });
    if (error) {
      alert('Error saving sale: ' + error.message);
    } else {
      const newBalance = (profile.stock_balance || 0) - bottlesNum;
      await supabase.from('profiles').update({ stock_balance: newBalance }).eq('id', user.id);
      setProfile({ ...profile, stock_balance: newBalance });
      setAmount('');
      setBottles('');
      alert('Sale saved! Stock updated.');
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
      alert('Rules saved!');
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
          Continue (Demo Mode)
        </button>
        <br /><br />
        <button
          onClick={() => setUser({ id: 'demo-admin', phone: '0727088491', role: 'admin' })}
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

  if (showSignup) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ color: '#1B4D3E' }}>Complete Your Profile</h1>
        <p>Please enter your details to continue</p>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{
            padding: '14px',
            fontSize: '18px',
            width: '240px',
            borderRadius: '8px',
            border: '2px solid #D4AF37',
            marginBottom: '10px',
          }}
        />
        <br />
        <input
          type="text"
          placeholder="Area (e.g., Johannesburg)"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
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
          onClick={saveProfile}
          style={{
            padding: '14px 32px',
            fontSize: '18px',
            background: '#1B4D3E',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
          }}
        >
          Save Profile
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
<strong>1. {profile?.full_name || (user.phone ?? 'You')} (You)</strong>
      {profile && <p style={{ color: '#555' }}>From {profile.area_code}</p>}
      <p style={{ fontWeight: 'bold', color: (profile?.stock_balance || 0) < 10 ? 'red' : 'green' }}>
        Current Stock: {profile?.stock_balance || 0} bottles {(profile?.stock_balance || 0) < 10 ? '(Low stock - restock needed)' : ''}
      </p>
      <img src="https://raw.githubusercontent.com/NatureReigns/omega48za-tracker/main/public/logo.png" alt="Nature Reigns Logo" style={{ maxWidth: '300px', margin: '20px auto', display: 'block' }} />
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2>Add Sale</h2>
        <input placeholder="Amount (ZAR)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '10px', margin: '5px' }} />
        <input placeholder="Bottles" value={bottles} onChange={(e) => setBottles(e.target.value)} style={{ padding: '10px', margin: '5px' }} />
        <button onClick={addSale} style={{ padding: '10px 20px', background: '#D4AF37', border: 'none', borderRadius: '6px' }}>
          Add Sale
        </button>
        <div style={{ marginTop: '20px' }}>
          <p><strong>Total Sales:</strong> R{totalSales.toFixed(2)}</p>
          <p><strong>Commission ({commissionRate}%):</strong> R{commission.toFixed(2)}</p>
          <p><strong>Stock Allocation ({stockRate}%):</strong> R{stockAlloc.toFixed(2)}</p>
          <p><strong>Bonus Pool ({bonusRate}%):</strong> R{bonusAlloc.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1B4D3E' }}>Weekly Leaderboard (Top 10)</h2>
        <ol style={{ paddingLeft: '20px' }}>
          <li style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
            <strong>1. {profile?.full_name || user.phone ?? 'You'} (You)</strong> - R{totalSales.toFixed(2)}
          </li>
          <li style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>2. Agent 0821234567 - R4,800.00</li>
          <li style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>3. Agent 0839876543 - R3,900.00</li>
          <li style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>4. Agent 0765554444 - R3,200.00</li>
          <li style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>5. Agent 0612345678 - R2,700.00</li>
        </ol>
        <p style={{ fontStyle: 'italic', color: '#555', marginTop: '10px' }}>Updates live with every sale!</p>
      </div>

      {user.role === 'admin' && (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '12px' }}>
          <h3>Admin Panel - Edit Rules</h3>
          <label>
            Commission %:
            <input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value) || 30)}
              style={{ padding: '10px', margin: '10px', width: '100px' }}
            />
          </label>
          <br />
          <label>
            Stock Allocation %:
            <input
              type="number"
              value={stockRate}
              onChange={(e) => setStockRate(Number(e.target.value) || 50)}
              style={{ padding: '10px', margin: '10px', width: '100px' }}
            />
          </label>
          <br />
          <label>
            Bonus Pool %:
            <input
              type="number"
              value={bonusRate}
              onChange={(e) => setBonusRate(Number(e.target.value) || 20)}
              style={{ padding: '10px', margin: '10px', width: '100px' }}
            />
          </label>
          <br />
          <label>
            Weekly Bonus Pool Prize (ZAR):
            <input
              type="number"
              value={bonusPoolAmount}
              onChange={(e) => setBonusPoolAmount(Number(e.target.value) || 5000)}
              style={{ padding: '10px', margin: '10px', width: '150px' }}
            />
          </label>
          <br />
          <button
            onClick={saveRules}
            style={{ padding: '10px 20px', background: '#1B4D3E', color: 'white', border: 'none', borderRadius: '6px', marginTop: '20px' }}
          >
            Save Rules
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
