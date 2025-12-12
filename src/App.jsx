import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './main.jsx'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState([])
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
    const { data } = await supabase.from('sales').select('*').eq('agent_id', user.id)
    setSales(data || [])
  }

  const totalSales = sales.reduce((sum, s) => sum + Number(s.amount_zar || 0), 0)
  const commission = totalSales * 0.3 // 30% example
  const stockAlloc = totalSales * 0.5 // 50% example

  if (loading) return <div>Loading...</div>

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Omega48ZA Tracker</h1>
        <input type="tel" placeholder="+27XXXXXXXXX" id="phone" />
        <button onClick={async () => {
          const phone = document.getElementById('phone').value
          await supabase.auth.signInWithOtp({ phone, options: { channel: 'sms' } })
          alert('OTP sent! Use 000000 for demo.')
        }}>Send OTP</button>
        {/* Demo: Hardcode for now */}
        <button onClick={() => setUser({ id: 'demo', phone: '+27821231234', role: 'admin' })}>Demo Login (Admin)</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome, {user.phone} ({user.role})</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h2>Sales Tracker</h2>
          <input placeholder="Amount (ZAR)" onChange={(e) => {/* Add sale logic */}} />
          <input type="number" placeholder="Bottles Sold" />
          <button>Add Sale</button>
          <ul>{sales.map(s => <li key={s.id}>R{s.amount_zar} - {s.bottles_sold} bottles</li>)}</ul>
          <p>Commission: R{commission.toFixed(2)} | Stock: R{stockAlloc.toFixed(2)}</p>
        </div>
        <div style={{ flex: 1 }}>
          <h2>Leaderboards (Top Agents)</h2>
          <ul><li>Agent 1: R5000</li><li>Agent 2: R3000</li></ul> {/* Fetch from Supabase */}
          <h2>Wallet: R{commission.toFixed(2)} (Payout Friday)</h2>
        </div>
      </div>
      {user.role === 'admin' && <button>Admin Panel (Edit Rules)</button>}
    </div>
  )
}

export default App
