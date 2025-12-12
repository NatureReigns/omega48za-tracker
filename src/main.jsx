import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import App from './App.jsx'
import './index.css'

const supabaseUrl = 'https://ksjikdyauyyltbueymmg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzamlrZHlhdXl5bHRidWV5bW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzU2NDcsImV4cCI6MjA4MTExMTY0N30.qwZwwSKXRP7Lrs6vjAd_UtsWKO-KXxNIW4T_QPK1jnE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
      </Routes>
    </Router>
  </React.StrictMode>,
)
