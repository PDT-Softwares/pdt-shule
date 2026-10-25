import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Schools() {
  const [schools, setSchools] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('schools').select('*')
      setSchools(data ?? [])
    }
    load()
  }, [])

  return (
    <div>
      <h1>All Schools</h1>
      <p className="muted">Manage all schools in the system.</p>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Name</th><th>Slug</th><th>Status</th></tr></thead>
          <tbody>
            {schools.map(s => (
              <tr key={s.id}><td>{s.name}</td><td>{s.slug}</td><td>{s.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}