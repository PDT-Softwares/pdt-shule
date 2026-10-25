import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setBusy(false)
      return
    }

    setBusy(false)
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'radial-gradient(circle at 20% 10%, var(--primary-soft) 0%, var(--bg) 45%, var(--bg) 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      {/* Login card */}
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">P</div>
          <div>
            <div className="login-brand">PDT Shule</div>
            <div className="login-brand-sub">School Management Platform</div>
          </div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Log in to continue to your dashboard.</p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%' }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="primary"
            style={{ width: '100%', position: 'relative', overflow: 'hidden' }}
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        © {new Date().getFullYear()} <strong>PDT Softwares</strong>. All rights reserved.
      </footer>
    </div>
  )
}