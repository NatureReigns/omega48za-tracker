import { useState, useEffect } from 'react';
import { supabase } from './supabaseclient.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [fullName, setFullName] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [referrerPhone, setReferrerPhone] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [amount, setAmount] = useState('');
  const [bottles, setBottles] = useState('');
  const [sales, setSales] = useState([]);
  const [commissionRate, setCommissionRate] = useState(30);
  const [stockRate, setStockRate] = useState(50);
  const [bonusRate, setBonusRate] = useState(20);
  const [bonusPoolAmount, setBonusPoolAmount] = useState(5000);
  const [overrideRate, setOverrideRate] = useState(10);
  const [downline, setDownline] = useState([]);
  const [overrideEarnings, setOverrideEarnings] = useState(0);

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
      // Load profile
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data, error }) => {
        if (data) {
          setProfile(data);
        } else if (error && error.code === 'PGRST116') {
          setShowSignup(true);
        }
      });

      // Load rules
      supabase.from('rules').select('*').single().then(({ data }) => {
        if (data) {
          setCommissionRate(data.commission_rate || 30);
          setStockRate(data.stock_rate || 50);
          setBonusRate(data.bonus_rate || 20);
          setBonusPoolAmount(data.bonus_pool_amount || 5000);
        }
      });

      // Load referral override rate
      supabase.from('referral_rules').select('*').single().then(({ data }) => {
        if (data) {
          setOverrideRate(data.override_rate || 10);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && profile) {
      // Load downline and calculate override earnings
      const loadDownline = async () => {
        const { data: downlineProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, area_code')
          .eq('referrer_id', user.id);

        if (downlineProfiles) {
          const downlineIds = downlineProfiles.map(p => p.id);

          if (downlineIds.length > 0) {
            const { data: downlineSales } = await supabase
              .from('sales')
              .select('agent_id, amount_zar')
              .in('agent_id', downlineIds);

            const earnings = downlineSales.reduce((sum, s) => sum + (s.amount_zar * (overrideRate / 100)), 0);
            setOverrideEarnings(earnings);
          }

          setDownline(downlineProfiles);
        }
      };

      loadDownline();
    }
  }, [user, profile, overrideRate]);

  const signInWithPhone = () => {
    setUser({ id: 'demo', phone: phoneInput || '0727088491', role: 'admin' });
  };

  const saveProfile = async () => {
    if (!fullName || !areaCode) return alert('Please enter your name and area');
    let referrerId = null;
    if (referrerPhone) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', referrerPhone.replace(/\D/g, ''))
        .single();
      referrerId = referrer?.id || null;
    }

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: fullName,
      area_code: areaCode,
      referrer_id: referrerId,
    });
    if (error) {
      alert('Error saving profile: ' + error.message);
    } else {
      setProfile({ full_name: fullName, area_code: areaCode });
      setShowSignup(false);
      alert('Profile saved! Welcome to Omega48ZA.');
    }
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
      alert('Sale saved!');
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
            marginBottom: '10px',
          }}
        />
        <br />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Referrer Phone (optional)"
          value={referrerPhone}
          onChange={(e) => setReferrerPhone(e.target.value.replace(/\D/g, ''))}
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
      <h1 style={{ color: '#1B4D3E' }}>Welcome {profile?.full_name || user.phone ?? 'Seller'}</h1>
      {profile && <p style={{ color: '#555' }}>From {profile.area_code}</p>}
      <p><strong>Referral Code: {user.phone}</strong> (Share this with recruits)</p>
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
          <p><strong>Referral Override Earnings ({overrideRate}%):</strong> R{overrideEarnings.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1B4D3E' }}>Your Downline ({downline.length} recruits)</h2>
        {downline.length === 0 ? (
          <p>No recruits yet. Share your referral code: {user.phone}</p>
        ) : (
          <ul style={{ paddingLeft: '20px' }}>
            {downline.map((recruit) => (
              <li key={recruit.id} style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                {recruit.full_name} from {recruit.area_code}
              </li>
            ))}
          </ul>
        )}
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
            Referral Override %:
            <input
              type="number"
              value={overrideRate}
              onChange={(e) => setOverrideRate(Number(e.target.value) || 10)}
              style={{ padding: '10px', margin: '10px', width: '100px' }}
            />
          </label>
          <br />
          <button onClick={saveRules} style={{ padding: '10px 20px', background: '#1B4D3E', color: 'white', border: 'none', borderRadius: '6px', marginTop: '20px' }}>
            Save Rules
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
