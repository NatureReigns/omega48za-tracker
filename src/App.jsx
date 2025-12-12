if (!user) {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Omega48ZA Tracker</h1>
      <input
        type="text"
        id="phone"
        placeholder="Enter SA number (e.g., 082 123 4567)"
        defaultValue=""
        onLoad={(e) => e.target.value = ''}
        style={{ padding: '10px', fontSize: '16px', width: '200px' }}
      />
      <br />
      <button onClick={async () => {
        let phone = document.getElementById('phone').value.replace(/\s/g, '').replace(/^\+27/, '0');
        if (phone.startsWith('27')) phone = '0' + phone.slice(2);
        if (!phone || phone.length < 10 || !phone.startsWith('0')) { 
          alert('Please enter a valid SA phone number (e.g., 0821234567).'); 
          return; 
        }
        const fullPhone = '+27' + phone.slice(1);
        await supabase.auth.signInWithOtp({ phone: fullPhone, options: { channel: 'sms' } });
        alert('OTP sent! Use 000000 for demo or check your SMS.');
      }}>Send OTP</button>
      <br /><br />
      <button onClick={() => setUser({ id: 'demo', phone: '0727088491', role: 'admin' })}>Demo Login (Admin)</button>
    </div>
  )
}
