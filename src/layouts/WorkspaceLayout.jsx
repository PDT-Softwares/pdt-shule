import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Sun, Moon, LayoutDashboard, Users, GraduationCap, BookOpen,
  Calendar, ClipboardList, UserCheck, Clock, Megaphone, FolderOpen,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSchool } from '../contexts/SchoolContext'
import { useTheme } from '../contexts/ThemeContext'

const navItems = [
  { to: '/app', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/app/ai', label: 'AI Assistant', icon: Sparkles },
  { to: '/app/students', label: 'Students', icon: Users },
  { to: '/app/classes', label: 'Classes', icon: GraduationCap },
  { to: '/app/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/app/terms', label: 'Terms', icon: Calendar },
  { to: '/app/marks', label: 'Marks', icon: ClipboardList },
  { to: '/app/attendance', label: 'Attendance', icon: UserCheck },
  { to: '/app/timetable', label: 'Timetable', icon: Clock },
  { to: '/app/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/app/resources', label: 'Resources', icon: FolderOpen },
]

export default function WorkspaceLayout() {
  const { user, signOut } = useAuth()
  const { currentSchool, currentRole, memberships, chooseSchool } = useSchool()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 240, background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        color: 'var(--sidebar-text)',
        padding: 16, display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{
          color: 'var(--text)', fontWeight: 700, fontSize: 18,
          padding: '4px 12px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>P</div>
          PDT Shule
        </div>

        <label>School</label>
        <select
          value={currentSchool?.school.id ?? ''}
          onChange={(e) => chooseSchool(e.target.value)}
          style={{ marginBottom: 20, width: '100%' }}
        >
          {memberships?.map((m) => (
            <option key={m.school.id} value={m.school.id}>{m.school.name}</option>
          ))}
        </select>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                  background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background 0.12s, color 0.12s',
                })}
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          padding: '14px 24px', background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <strong>{currentSchool?.school.name}</strong>
            <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
              {currentRole}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={toggle}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>{user?.email}</span>
            <button onClick={handleSignOut}>Sign out</button>
          </div>
        </header>

        <main style={{ padding: 24, flex: 1, minWidth: 0 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
