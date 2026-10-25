import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Sparkles, Users, UserCog, GraduationCap, BookOpen,
  Calendar, ClipboardList, UserCheck, Clock, Megaphone, FolderOpen, FileText, LogOut, Menu, X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

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

export default function BottomNav({ role }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const visible = navItems.filter(item => !item.role || item.role.includes(role))
  
  const primaryNav = visible.slice(0, 3) 
  const secondaryNav = visible.slice(3)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <nav className="bottom-nav">
        {primaryNav.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="bottom-nav-icon-wrap">
              <Icon size={20} className="bottom-nav-icon" />
            </span>
          </NavLink>
        ))}

        <button 
          onClick={() => setDrawerOpen(true)} 
          className="bottom-nav-menu"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
      </nav>

      {/* Drawer */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <span style={{ fontWeight: 700, fontSize: 16 }}>More Menu</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="drawer-list">
              {secondaryNav.map(({ to, end, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  <Icon size={18} /> {label}
                </NavLink>
              ))}
            </div>

            <div className="drawer-footer">
              <button 
                onClick={handleSignOut} 
                className="bottom-nav-logout"
              >
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}