import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SCHOOL_LEVELS } from '../lib/kenyaConstants'

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [schoolSlug, setSchoolSlug] = useState('')
  const [selectedLevels, setSelectedLevels] = useState(['secondary_844'])

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  function handleSchoolNameChange(e) {
    const value = e.target.value
    setSchoolName(value)
    setSchoolSlug(slugify(value))
  }

  function toggleLevel(value) {
    if (selectedLevels.includes(value)) {
      setSelectedLevels(selectedLevels.filter(l => l !== value))
    } else {
      setSelectedLevels([...selectedLevels, value])
    }
  }

  function goNext(e) {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Please fill all fields (password ≥ 6 chars).')
      return
    }
    setError('')
    setStep(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (selectedLevels.length === 0) {
      setError('Please select at least one school level.')
      return
    }

    setError('')
    setBusy(true)

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setBusy(false)
      return
    }

    if (!authData.user) {
      setError('Signup failed. Please try again.')
      setBusy(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('create_school', {
      school_name: schoolName.trim(),
      school_slug: schoolSlug.trim(),
      school_levels: selectedLevels,
    })

    if (rpcError) {
      setError(rpcError.message)
      setBusy(false)
      return
    }

    setBusy(false)
    navigate('/app')
    window.location.reload()
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
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <div className="login-card" style={{ maxWidth: 460 }}>
        <div className="login-logo">
          <img src="/logo.png" alt="PDT" style={{ width: 44, height: 44, objectFit: "contain" }} />
          <div>
            <div className="login-brand">PDT Shule</div>
            <div className="login-brand-sub">Create your school account</div>
          </div>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <div style={{
            flex: 1, height: 6, borderRadius: 999,
            background: step >= 1 ? 'var(--primary)' : 'var(--border)',
            transition: 'background 0.3s',
          }} />
          <div style={{
            flex: 1, height: 6, borderRadius: 999,
            background: step >= 2 ? 'var(--primary)' : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        </div>

        <h1 className="login-title">{step === 1 ? 'Your details' : 'Your school'}</h1>
        <p className="login-sub">
          {step === 1
            ? 'Step 1 of 2 — create your account.'
            : 'Step 2 of 2 — set up your school.'}
        </p>

        {/* ===== STEP 1 ===== */}
        {step === 1 && (
          <form onSubmit={goNext}>
            <div className="login-field">
              <label>Full name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ width: '100%' }} placeholder="Jane Doe" />
            </div>
            <div className="login-field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="login-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ width: '100%' }} placeholder="At least 6 characters" autoComplete="new-password" />
            </div>

            {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

            <button type="submit" className="primary" style={{ width: '100%', marginTop: 8 }}>
              Continue →
            </button>

            <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}

        {/* ===== STEP 2 ===== */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label>School name</label>
              <input type="text" value={schoolName} onChange={handleSchoolNameChange} required style={{ width: '100%' }} placeholder="e.g. Nairobi Academy" />
            </div>
            <div className="login-field">
              <label>Slug (URL)</label>
              <input type="text" value={schoolSlug} onChange={(e) => setSchoolSlug(e.target.value)} required style={{ width: '100%' }} placeholder="nairobi-academy" />
            </div>

            <div className="login-field">
              <label>School Levels</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                {SCHOOL_LEVELS.map((lvl) => {
                  const active = selectedLevels.includes(lvl.value)
                  return (
                    <button
                      type="button"
                      key={lvl.value}
                      onClick={() => toggleLevel(lvl.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'),
                        background: active ? 'var(--primary-soft)' : 'var(--surface)',
                        color: active ? 'var(--primary-hover)' : 'var(--text)',
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                      }}
                    >
                      {lvl.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => { setError(''); setStep(1) }}
                disabled={busy}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button type="submit" disabled={busy} className="primary" style={{ flex: 2 }}>
                {busy ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>

      <footer className="login-footer">
        © {new Date().getFullYear()} <strong>PDT Softwares</strong>. All rights reserved.
      </footer>
    </div>
  )
}

