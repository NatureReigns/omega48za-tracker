if (!user) {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Omega48ZA Tracker</h1>
      <input
        type="tel"
        id="phone"
        placeholder="Enter number (e.g., 082 123 4567)"
        value=""
        onFocus={(e) => e.target.value = ''}  // Clears any residual text
        style={{ padding: '10px', fontSize: '16px', width: '200px' }}
      />
      <br />
      <button onClick={async () => {
        const phone = document.getElementById('phone').value.replace(/\s/g, '');  // Remove spaces
        if (!phone || phone.length < 9) { alert('Please enter a valid SA phone number.'); return; }
        const fullPhone = phone.startsWith('0') ? '+27' + phone.slice(1) : '+27' + phone;
        await supabase.auth.signInWithOtp({ phone: fullPhone, options: { channel: 'sms' } });
        alert('OTP sent! Use 000000 for demo or check your SMS.');
      }}>Send OTP</button>
      <br /><br />
      <button onClick={() => setUser({ id: 'demo', phone: '0727088491', role: 'admin' })}>Demo Login (Admin)</button>
    </div>
  )
}
