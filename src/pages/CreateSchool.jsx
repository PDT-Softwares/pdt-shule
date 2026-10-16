import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function CreateSchool() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  function handleNameChange(e) {
    const value = e.target.value
    setName(value)
    setSlug(slugify(value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const { error: rpcError } = await supabase.rpc('create_school', {
      school_name: name,
      school_slug: slug,
    })

    setBusy(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    navigate('/')
    window.location.reload()
  }

  return (
    <div style={{ padding: 40, maxWidth: 500 }}>
      <h1>Create a school</h1>
      <p>You'll become the administrator of this school.</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>School name</label><br />
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Slug (used in URLs)</label><br />
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ padding: 10 }}>
          {busy ? 'Creating…' : 'Create school'}
        </button>
      </form>
    </div>
  )
}
