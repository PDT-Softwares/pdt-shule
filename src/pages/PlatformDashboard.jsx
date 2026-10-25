import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, GraduationCap, CreditCard, Activity, UserCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function PlatformDashboard() {
  const [stats, setStats] = useState({
    schools: 0,
    students: 0,
    teachers: 0,
    activeClients: 0,
  })
  const [loading, setLoading] = useState(true)

  async function loadStats() {
    setLoading(true)
    try {
      const [schoolsRes, studentsRes, teachersRes, clientsRes] = await Promise.all([
        supabase.from('schools').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('school_members').select('*', { count: 'exact', head: true }).in('role', ['teacher', 'classteacher']),
        supabase.from('school_members').select('*', { count: 'exact', head: true }).eq('role', 'admin')
      ])

      console.log('STATS RAW:', { schools: schoolsRes, students: studentsRes, teachers: teachersRes, clients: clientsRes })

      setStats({
        schools: schoolsRes.count ?? 0,
        students: studentsRes.count ?? 0,
        teachers: teachersRes.count ?? 0,
        activeClients: clientsRes.count ?? 0,
      })
    } catch (err) {
      console.error('Failed to load stats', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>Platform Overview</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Welcome to the system control center.</p>
        </div>
        <button onClick={loadStats} disabled={loading} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? <p>Loading stats…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32, marginTop: 16 }}>
          
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, background: 'var(--primary-soft)', borderRadius: 8, color: 'var(--primary)' }}><Building2 size={24} /></div>
            <div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Schools</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.schools}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, background: 'var(--success)', color: '#fff', borderRadius: 8 }}><UserCheck size={24} /></div>
            <div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Clients</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.activeClients}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}><GraduationCap size={24} /></div>
            <div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Students</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.students}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}><Users size={24} /></div>
            <div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Teachers</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.teachers}</div>
            </div>
          </div>

        </div>
      )}

      <h2>System Management</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/app/admin/schools" className="card" style={{ flex: '1 1 200px', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <Building2 size={20} style={{ marginBottom: 8, color: 'var(--primary)' }} />
          <h3 style={{ margin: 0 }}>Manage Schools</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>View, add, or suspend schools.</p>
        </Link>
        
        <div className="card" style={{ flex: '1 1 200px', opacity: 0.6 }}>
          <CreditCard size={20} style={{ marginBottom: 8 }} />
          <h3 style={{ margin: 0 }}>Subscriptions</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Billing and plan management (coming soon).</p>
        </div>

        <div className="card" style={{ flex: '1 1 200px', opacity: 0.6 }}>
          <Activity size={20} style={{ marginBottom: 8 }} />
          <h3 style={{ margin: 0 }}>System Health</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Database and server status (coming soon).</p>
        </div>
      </div>
    </div>
  )
}