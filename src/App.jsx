import { useState, useEffect } from 'react';
import { supabase } from './main.jsx';

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

  const signInWithPhone = async () => {
    if (phoneInput.length < 10) return alert('Enter full SA number');
    const fullPhone = '+27' + phoneInput.slice(1);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    if (error) alert(error.message);
    else alert('OTP sent – use 000000 for testing');
  };

  const addSale = () => {
    if (!amount || !bottles) return alert('Enter amount and bottles');
    const newSale = {
      id: Date.now(),
      amount_zar: Number(amount),
      bottles_sold: Number(bottles),
    };
    setSales([...sales, newSale]);
    setAmount('');
    setBottles('');
  };

  const saveRules = () => {
    alert(`Rules saved successfully!\nCommission: ${commissionRate}%\nStock Allocation: ${stockRate}%\nBonus Pool: ${bonusRate}%\nWeekly Prize: R${bonusPoolAmount}`);
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
            borderRadius: '8px
