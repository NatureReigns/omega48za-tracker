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

  // Load profile, rules, and referral rules when user is authenticated
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
      // Load personal sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('amount_zar, bottles_sold, created_at')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      setSales(salesData || []);

      // Load downline (agents who have this user as referrer)
      const { data: downlineData } = await supabase
        .from('profiles')
        .select('id, full_name, area_code, phone')
        .eq('referrer_id', user.id);

      setDownline(downlineData || []);

      // Calculate override earnings from downline sales
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

  // Calculate weekly payout (personal sales only + override)
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

  // Load uploaded deposit photos
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

  // Load notifications with real-time subscription
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

  // Demo sign-in functions
  const signInWithPhone = () => {
    setUser({ id: 'demo', phone: phoneInput || '0727088491', role: 'agent' });
  };

  // Profile saving
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
      phone: user.phone,
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

  // Sale recording
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

  // Deposit photo upload
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

      // Refresh photo list
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

  // Admin: Save commission and override rules
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

  // Derived calculations for display
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
        <h2 style={{ color: '#1B4D3
