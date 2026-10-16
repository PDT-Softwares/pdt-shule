import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user, signOut } = useAuth()
  const [memberships, setMemberships] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('school_members')
        .select('role, schools(id, name, slug)')
      setMemberships(data ?? [])
    }
    load()
  }, [])

  return (
    <div style={{ padding: 40 }}>
      <h1>Home</h1>
      <p>Logged in as: {user?.email ?? 'nobody'}</p>
      <button onClick={signOut}>Sign out</button>

      <hr style={{ margin: '24px 0' }} />

      <h2>Your schools</h2>
      {memberships === null && <p>Loading…</p>}

      {memberships && memberships.length === 0 && (
        <p>
          You're not in any school yet. <Link to="/create-school">Create one</Link>.
        </p>
      )}

      {memberships && memberships.length > 0 && (
        <ul>
          {memberships.map((m) => (
            <li key={m.schools.id}>
              <strong>{m.schools.name}</strong> — role: {m.role} (slug: {m.schools.slug})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
