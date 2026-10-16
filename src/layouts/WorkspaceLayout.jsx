import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSchool } from '../contexts/SchoolContext'

const navItems = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/students', label: 'Students' },
  { to: '/app/classes', label: 'Classes' },
  { to: '/app/subjects', label: 'Subjects' },
  { to: '/app/terms', label: 'Terms' },
  { to: '/app/marks', label: 'Marks' },
  { to: '/app/attendance', label: 'Attendance' },
  { to: '/app/timetable', label: 'Timetable' },
  { to: '/app/announcements', label: 'Announcements' },
  { to: '/app/resources', label: 'Resources' },
]

export default function WorkspaceLayout() {
  const { user, signOut } = useAuth()
  const { currentSchool, currentRole, memberships, chooseSchool } = useSchool()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220, background: '#111', color: '#eee',
        padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
          PDT Shule
        </div>

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>School</div>
        <select
          value={currentSchool?.school.id ?? ''}
          onChange={(e) => chooseSchool(e.target.value)}
          style={{ marginBottom: 16, padding: 6, width: '100%' }}
        >
          {memberships?.map((m) => (
            <option key={m.school.id} value={m.school.id}>
              {m.school.name}
            </option>
          ))}
        </select>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: '8px 10px',
                borderRadius: 6,
                textDecoration: 'none',
                color: isActive ? '#fff' : '#bbb',
                background: isActive ? '#2563eb' : 'transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          padding: '12px 20px', borderBottom: '1px solid #ddd',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <strong>{currentSchool?.school.name}</strong>
            <span style={{ opacity: 0.6, marginLeft: 8 }}>({currentRole})</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{user?.email}</span>
            <button onClick={handleSignOut} style={{ padding: '6px 10px' }}>Sign out</button>
          </div>
        </header>

        <main style={{ padding: 24, flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
