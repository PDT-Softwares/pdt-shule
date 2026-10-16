import { Link } from 'react-router-dom'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useSchool } from '../contexts/SchoolContext'

function Card({ label, value, to }) {
  const inner = (
    <div style={{
      border: '1px solid #ddd', borderRadius: 8, padding: 20,
      minWidth: 160, flex: '1 1 160px', background: '#f9fafb',
    }}>
      <div style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 'bold', marginTop: 6 }}>{value}</div>
    </div>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none', color: 'inherit', flex: '1 1 160px' }}>{inner}</Link> : inner
}

export default function Dashboard() {
  const { stats, loading, error } = useDashboardStats()
  const { currentSchool } = useSchool()

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ opacity: 0.7 }}>
        Snapshot for <strong>{currentSchool?.school.name}</strong>
        {stats?.currentTerm && (
          <> — current term: <strong>{stats.currentTerm.academic_years?.name} {stats.currentTerm.name}</strong></>
        )}
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && stats && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <Card label="Active students" value={stats.students} to="/app/students" />
            <Card label="Classes" value={stats.classes} to="/app/classes" />
            <Card label="Subjects" value={stats.subjects} to="/app/subjects" />
            <Card label="Marks recorded" value={stats.marks} to="/app/marks" />
            <Card label="Present records" value={stats.presentRecords} to="/app/attendance" />
          </div>

          <h2>Quick actions</h2>
          <ul>
            <li><Link to="/app/students">Add a student</Link></li>
            <li><Link to="/app/marks">Record marks</Link></li>
            <li><Link to="/app/attendance">Take attendance</Link></li>
            <li><Link to="/app/announcements">Post an announcement</Link></li>
          </ul>

          {!stats.currentTerm && (
            <div style={{
              marginTop: 24, padding: 12, border: '1px solid #f59e0b',
              background: '#fffbeb', borderRadius: 8,
            }}>
              ⚠️ No current term set. <Link to="/app/terms">Set one in Academic Calendar</Link> so marks
              and timetables can be tied to a term.
            </div>
          )}
        </>
      )}
    </div>
  )
}
