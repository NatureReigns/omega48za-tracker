import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './main.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState([])
  const [amount, setAmount] = useState('')
  const [bottles, setBottles] = useState(0)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) fetchSales()
  }, [user])

  const fetchSales = async () => {
    // Placeholder: Fetch from Supabase once integrated
    // const { data } = await supabase.from('sales').select('*').eq('agent_id', user.id)
    setSales([])  // Start with empty for demo
  }

  const addSale = async () => {
    if (!amount || bottles <= 0 || isNaN(amount)) {
      alert('Please enter a valid amount (ZAR) and number of bottles (>0).')
      return
    }

    const newSale = {
      id: Date.now(),  // Temporary ID; use Supabase-generated in production
      agent_id: user.id,
      amount_zar: parseFloat(amount),
      bottles_sold: parseInt(bottles),
      sale_date: new Date().toISOString().split('T')[0],
      deposit_confirmed: false
    }

    // Simulate Supabase insert (replace with actual insert once service_role is set)
    // const { error } = await supabase.from('sales').insert([newSale])
    // if (error) { alert('Error adding sale: ' + error.message); return; }

    setSales(prev => [...prev, newSale])
    setAmount('')
    setBottles(0)
    alert(`Sale added successfully: R${amount} for ${bottles} bottles. (Pending deposit confirmation)`)
  }

  const totalSales = sales.reduce((sum, s) => sum + Number(s.amount_zar || 0), 0)
  const commission = totalSales * 0.3  // 30% example; editable via admin panel
  const stockAlloc = totalSales * 0.5  // 50% example

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Omega48ZA Tracker</h1>
        <input type="tel" placeholder="+27XXXXXXXXX" id="phone" />
        <button onClick={async () => {
          const phone = document.getElementById('phone').value
          if (!phone) { alert('Please enter a phone number.'); return; }
          await supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } })
          alert('OTP sent! Use 000000 for demo.')
        }}>Send OTP</button>
        <br /><br />
        <button onClick={() => setUser({ id: 'demo', phone: '+27821231234', role: 'admin' })}>Demo Login (Admin)</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome, {user.phone} ({user.role})</h1>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2>Sales Tracker</h2>
          <input
            type="number"
            placeholder="Amount (ZAR)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%', marginBottom: '10px' }}
          />
          <input
            type="number"
            placeholder="Bottles Sold"
            value={bottles}
            onChange={(e) => setBottles(e.target.value)}
            style={{ width: '100%', marginBottom: '10px' }}
          />
          <button onClick={addSale} style={{ width: '100%' }}>Add Sale</button>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sales.map(s => (
              <li key={s.id} style={{ padding: '5px', borderBottom: '1px solid #ddd' }}>
                R{s.amount_zar} - {s.bottles_sold} bottles {s.deposit_confirmed ? '(Confirmed)' : '(Pending)'}
              </li>
            ))}
          </ul>
          <p><strong>Total Sales:</strong> R{totalSales.toFixed(2)}</p>
          <p><strong>Commission (30%):</strong> R{commission.toFixed(2)}</p>
          <p><strong>Stock Allocation (50%):</strong> R{stockAlloc.toFixed(2)}</p>
        </div>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h2>Weekly Leaderboards (Top Agents)</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '5px' }}>Agent 1: R5,000</li>
            <li style={{ padding: '5px' }}>Agent 2: R3,000</li>
            <li style={{ padding: '5px' }}>You: R{totalSales.toFixed(2)}</li>
          </ul>
          <h2>Agent Wallet</h2>
          <p>Pending Payout: <strong>R{commission.toFixed(2)}</strong> (Sends via PayShap every Friday)</p>
          {user.role === 'admin' && (
            <div>
              <h3>Admin Panel</h3>
              <button>Edit Commission Rules</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
