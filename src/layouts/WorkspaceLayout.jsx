import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Sun, Moon, LayoutDashboard, Users, GraduationCap, BookOpen,
  Calendar, ClipboardList, UserCheck, Clock, Megaphone, FolderOpen,
  Sparkles, FileText, UserCog
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSchool } from '../contexts/SchoolContext'
import { useTheme } from '../contexts/ThemeContext'
import BottomNav from '../components/BottomNav'

const navItems = [
  { to: '/app', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/app/ai', label: 'AI Assistant', icon: Sparkles },
  { to: '/app/students', label: 'Students', icon: Users, role: ['admin', 'classteacher'] },
  { to: '/app/teachers', label: 'Teachers', icon: UserCog, role: ['admin'] },
  { to: '/app/classes', label: 'Classes', icon: GraduationCap, role: ['admin'] },
  { to: '/app/subjects', label: 'Subjects', icon: BookOpen, role: ['admin'] },
  { to: '/app/terms', label: 'Academic Calendar', icon: Calendar, role: ['admin'] },
  { to: '/app/marks', label: 'Assessment & Grading', icon: ClipboardList, role: ['admin', 'classteacher', 'teacher'] },
  { to: '/app/reports', label: 'Reports', icon: FileText, role: ['admin', 'classteacher'] },
  { to: '/app/attendance', label: 'Attendance', icon: UserCheck, role: ['admin', 'classteacher'] },
  { to: '/app/timetable', label: 'Timetable', icon: Clock, role: ['admin', 'classteacher', 'teacher'] },
  { to: '/app/announcements', label: 'Announcements', icon: Megaphone, role: ['admin', 'classteacher', 'teacher'] },
  { to: '/app/resources', label: 'Resources', icon: FolderOpen, role: ['admin', 'classteacher', 'teacher'] },
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

  const visibleNavItems = navItems.filter((item) => {
    if (!item.role) return true
    return item.role.includes(currentRole)
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside className="no-print sidebar-desktop" style={{
        width: 250, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
        color: 'var(--sidebar-text)', padding: 16, display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 18, padding: '4px 12px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="PDT" style={{ height: 32, width: "auto", objectFit: "contain" }} />
          PDT Shule
        </div>

        {memberships && memberships.length > 0 && (
          <>
            <label>School</label>
            <select value={currentSchool?.school.id ?? ''} onChange={(e) => chooseSchool(e.target.value)} style={{ marginBottom: 20, width: '100%' }}>
              {memberships.map((m) => <option key={m.school.id} value={m.school.id}>{m.school.name}</option>)}
            </select>
          </>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.to} to={item.to} end={item.end} style={({ isActive }) => ({
                padding: '10px 14px', borderRadius: 'var(--radius)', textDecoration: 'none',
                color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
                transition: 'background 0.12s, color 0.12s',
              })}>
                <Icon size={16} strokeWidth={2} /> {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="no-print header-desktop" style={{ padding: '14px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <strong>{currentSchool?.school?.name ?? 'PDT Shule'}</strong>
            {currentRole && <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{currentRole}</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={toggle} title="Toggle theme" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>{user?.email}</span>
            <button onClick={handleSignOut} className="primary">Sign out</button>
          </div>
        </header>
        <main style={{ padding: 24, flex: 1, minWidth: 0, paddingBottom: 100 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}><Outlet /></div>
        </main>
      </div>

      <BottomNav role={currentRole} />
    </div>
  )
}
