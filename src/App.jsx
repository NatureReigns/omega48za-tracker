import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.jsx';

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
  const [weeklyPayout, setWeeklyPayout] = useState(0);
  const [depositPhoto, setDepositPhoto] = useState(null);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Authentication handling
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

  // Load profile and rules when user is authenticated
  useEffect(() => {
    if (!user) return;

    const loadProfileAndRules = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      } else {
        setShowSignup(true);
      }

      const { data: rulesData } = await supabase.from('rules').select('*').single();
      if (rulesData) {
        setCommissionRate(rulesData.commission_rate || 30);
        setStockRate(rulesData.stock_rate || 50);
        setBonusRate(rulesData.bonus_rate || 20);
        setBonusPoolAmount(rulesData.bonus_pool_amount || 5000);
      }

      const { data: referralData } = await supabase.from('referral_rules').select('*').single();
      if (referralData) {
        setOverrideRate(referralData.override_rate || 10);
      }
    };

    loadProfileAndRules();
  }, [user]);

  // Load sales and downline
  useEffect(() => {
    if (!user) return;

    const loadSalesAndDownline = async () => {
      // Personal sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('amount_zar, bottles_sold, created_at')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      setSales(salesData || []);

      // Downline
      const { data: downlineData } = await supabase
        .from('profiles')
        .select('id, full_name, area_code, phone')
        .eq('referrer_id', user.id);

      setDownline(downlineData || []);

      // Override earnings from downline sales
      if (downlineData && downlineData.length > 0) {
        const downlineIds = downlineData.map(d => d.id);
        const { data: downlineSales } = await supabase
          .from('sales')
          .select('amount_zar')
          .in('agent_id', downlineIds);

        const totalDownlineSales = (downlineSales || []).reduce((sum, s) => sum + s.amount_zar, 0);
        setOverrideEarnings(totalDownlineSales * (overrideRate / 100));
      } else {
        setOverrideEarnings(0);
      }
    };

    loadSalesAndDownline();
  }, [user, overrideRate]);

  // Weekly payout calculation
  useEffect(() => {
    if (!user || sales.length === 0) {
      setWeeklyPayout(overrideEarnings);
      return;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weekTotal = sales
      .filter(s => new Date(s.created_at) >= oneWeekAgo)
      .reduce((sum, s) => sum + s.amount_zar, 0);

    const personalPayout = weekTotal * ((commissionRate + bonusRate) / 100);
    setWeeklyPayout(personalPayout + overrideEarnings);
  }, [sales, commissionRate, bonusRate, overrideEarnings, user]);

  // Load deposit photos
  useEffect(() => {
    if (!user) return;

    const loadUploadedPhotos = async () => {
      const { data, error } = await supabase.storage
        .from('deposit-photos')
        .list(`${user.id}/`);

      if (error) {
        console.error('Error loading photos:', error);
      } else if (data) {
        const urls = data.map(file => {
          const { data: urlData } = supabase.storage
            .from('deposit-photos')
            .getPublicUrl(`${user.id}/${file.name}`);
          return urlData.publicUrl;
        });
        setUploadedPhotos(urls);
      }
    };

    loadUploadedPhotos();
  }, [user]);

  // Notifications with real-time
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('message, created_at')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setNotifications(data || []);
    };

    loadNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `agent_id=eq.${user.id}`
        },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signInWithPhone = () => {
    setUser({ id: 'demo', phone: phoneInput || '0727088491', role: 'agent' });
  };

  const saveProfile = async () => {
    if (!fullName || !areaCode) return alert('Please enter your name and area');

    let referrerId = null;
    if (referrerPhone) {
      const normalized = referrerPhone.replace(/\D/g, '');
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalized)
        .single();
      referrerId = data?.id || null;
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
      alert('Profile saved successfully!');
    }
  };

  const addSale = async () => {
    if (!amount || !bottles) return alert('Please enter amount and bottles');

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
      alert('Sale recorded successfully!');
    }
  };

  const uploadDepositPhoto = async () => {
    if (!depositPhoto) return alert('Please select a photo');

    const fileExt = depositPhoto.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('deposit-photos')
      .upload(fileName, depositPhoto);

    if (error) {
      alert('Error uploading photo: ' + error.message);
    } else {
      alert('Deposit photo uploaded successfully!');
      setDepositPhoto(null);

      const { data } = await supabase.storage
        .from('deposit-photos')
        .list(`${user.id}/`);

      if (data) {
        const urls = data.map(file => {
          const { data: urlData } = supabase.storage
            .from('deposit-photos')
            .getPublicUrl(`${user.id}/${file.name}`);
          return urlData.publicUrl;
        });
        setUploadedPhotos(urls);
      }
    }
  };

  const saveRules = async () => {
    const { error: err1 } = await supabase.from('rules').upsert({
      id: 1,
      commission_rate: Number(commissionRate),
      stock_rate: Number(stockRate),
      bonus_rate: Number(bonusRate),
      bonus_pool_amount: Number(bonusPoolAmount),
    });

    const { error: err2 } = await supabase.from('referral_rules').upsert({
      id: 1,
      override_rate: Number(overrideRate),
    });

    if (err1 || err2) {
      alert('Error saving rules');
    } else {
      alert('Rules updated successfully!');
    }
  };

  const totalSales = sales.reduce((sum, s) => sum + s.amount_zar, 0);
  const commission = totalSales * (commissionRate / 100);
  const stockAlloc = totalSales * (stockRate / 100);
  const bonusAlloc = totalSales * (bonusRate / 100);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
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
          style={{ padding: '14px', fontSize: '18px', width: '240px', borderRadius: '8px', border: '2px solid #D4AF37', marginBottom: '20px' }}
        />
        <br />
        <button
          onClick={signInWithPhone}
          style={{ padding: '14px 32px', fontSize: '18px', background: '#1B4D3E', color: 'white', border: 'none', borderRadius: '8px', marginBottom: '20px' }}
        >
          Continue (Demo Mode)
        </button>
        <br /><br />
        <button
          onClick={() => setUser({ id: 'demo-admin', phone: '0727088491', role: 'admin' })}
          style={{ padding: '12px 24px', fontSize: '16px', background: '#D4AF37', color: 'black', border: 'none', borderRadius: '8px' }}
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
          style={{ padding: '14px', fontSize: '18px', width: '240px', borderRadius: '8px', border: '2px solid #D4AF37', marginBottom: '10px' }}
        />
        <br />
        <input
          type="text"
          placeholder="Area (e.g., Johannesburg)"
          value={areaCode}
          onChange={(e) => setAreaCode(e.target.value)}
          style={{ padding: '14px', fontSize: '18px', width: '240px', borderRadius: '8px', border: '2px solid #D4AF37', marginBottom: '10px' }}
        />
        <br />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Referrer Phone (optional)"
          value={referrerPhone}
          onChange={(e) => setReferrerPhone(e.target.value.replace(/\D/g, ''))}
          style={{ padding: '14px', fontSize: '18px', width: '240px', borderRadius: '8px', border: '2px solid #D4AF37', marginBottom: '20px' }}
        />
        <br />
        <button
          onClick={saveProfile}
          style={{ padding: '14px 32px', fontSize: '18px', background: '#1B4D3E', color: 'white', border: 'none', borderRadius: '8px' }}
        >
          Save Profile
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1B4D3E' }}>Welcome, {profile?.full_name || user.phone}</h1>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '12px' }}>
        <h2 style={{ color: '#1B4D3E' }}>Notifications</h2>
        {notifications.length === 0 ? (
          <p>No notifications yet</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {notifications.map((note, index) => (
              <li key={index} style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                {note.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {profile && <p style={{ color: '#555' }}>From {profile.area_code}</p>}
      <p style={{ fontWeight: 'bold', fontSize: '18px' }}>
        Weekly Payout: R{weeklyPayout.toFixed(2)} (Paid every Friday via PayShap)
      </p>
      <p><strong>Your Referral Code: {user.phone}</strong> (Share with new recruits)</p>

      <img src="https://raw.githubusercontent.com/NatureReigns/omega48za-tracker/main/public/logo.png" alt="Nature Reigns Logo" style={{ maxWidth: '300px', margin: '20px auto', display: 'block' }} />

      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2>Add Sale</h2>
        <input placeholder="Amount (ZAR)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '10px', margin: '5px' }} />
        <input placeholder="Bottles Sold" value={bottles} onChange={(e) => setBottles(e.target.value)} style={{ padding: '10px', margin: '5px' }} />
        <button onClick={addSale} style={{ padding: '10px 20px', background: '#D4AF37', border: 'none', borderRadius: '6px', color: 'black' }}>
          Add Sale
        </button>

        <div style={{ marginTop: '20px' }}>
          <p><strong>Total Personal Sales:</strong> R{totalSales.toFixed(2)}</p>
          <p><strong>Commission ({commissionRate}%):</strong> R{commission.toFixed(2)}</p>
          <p><strong>Stock Allocation ({stockRate}%):</strong> R{stockAlloc.toFixed(2)}</p>
          <p><strong>Bonus Allocation ({bonusRate}%):</strong> R{bonusAlloc.toFixed(2)}</p>
          <p><strong>Referral Override Earnings ({overrideRate}% on downline):</strong> R{overrideEarnings.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1B4D3E' }}>Deposit Proof Upload</h2>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setDepositPhoto(e.target.files[0])}
          style={{ marginBottom: '10px' }}
        />
        <button onClick={uploadDepositPhoto} style={{ padding: '10px 20px', background: '#1B4D3E', color: 'white', border: 'none', borderRadius: '6px' }}>
          Upload Photo
        </button>

        {uploadedPhotos.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>Your Uploaded Deposits</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {uploadedPhotos.map((url, index) => (
                <img key={index} src={url} alt={`Deposit proof ${index + 1}`} style={{ maxWidth: '200px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1B4D3E' }}>Your Downline ({downline.length} recruits)</h2>
        {downline.length === 0 ? (
          <p>No recruits yet. Share your referral code: <strong>{user.phone}</strong></p>
        ) : (
          <ul style={{ paddingLeft: '20px' }}>
            {downline.map((recruit) => (
              <li key={recruit.id} style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                <strong>{recruit.full_name}</strong> from {recruit.area_code} ({recruit.phone})
              </li>
            ))}
          </ul>
        )}
      </div>

      {user.role === 'admin' && (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '12px' }}>
          <h3>Admin Panel - Commission Rules</h3>
          <label style={{ display: 'block', margin: '10px 0' }}>
            Commission Rate (%):
            <input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value) || 30)}
              style={{ padding: '10px', marginLeft: '10px', width: '100px' }}
            />
          </label>
          <label style={{ display: 'block', margin: '10px 0' }}>
            Stock Allocation Rate (%):
            <input
              type="number"
              value={stockRate}
              onChange={(e) => setStockRate(Number(e.target.value) || 50)}
              style={{ padding: '10px', marginLeft: '10px', width: '100px' }}
            />
          </label>
          <label style={{ display: 'block', margin: '10px 0' }}>
            Bonus Rate (%):
            <input
              type="number"
              value={bonusRate}
              onChange={(e) => setBonusRate(Number(e.target.value) || 20)}
              style={{ padding: '10px', marginLeft: '10px', width: '100px' }}
            />
          </label>
          <label style={{ display: 'block', margin: '10px 0' }}>
            Referral Override Rate (%):
            <input
              type="number"
              value={overrideRate}
              onChange={(e) => setOverrideRate(Number(e.target.value) || 10)}
              style={{ padding: '10px', marginLeft: '10px', width: '100px' }}
            />
          </label>
          <button
            onClick={saveRules}
            style={{ padding: '12px 24px', background: '#1B4D3E', color: 'white', border: 'none', borderRadius: '6px', marginTop: '20px' }}
          >
            Save All Rules
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
