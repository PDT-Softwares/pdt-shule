import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Sun, Moon, Building2, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function PlatformAdminLayout() {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside style={{
        width: 240, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
        color: 'var(--sidebar-text)', padding: 16, display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 18, padding: '4px 12px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary)', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>P</div>
          PDT Platform
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <NavLink to="/app/admin" end style={({ isActive }) => ({
            padding: '10px 14px', borderRadius: 'var(--radius)', textDecoration: 'none',
            color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
            background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
          })}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          
          <NavLink to="/app/admin/schools" style={({ isActive }) => ({
            padding: '10px 14px', borderRadius: 'var(--radius)', textDecoration: 'none',
            color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
            background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
          })}>
            <Building2 size={16} /> All Schools
          </NavLink>
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ 
          padding: '14px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }}>
          <div>
            <strong>Platform Owner</strong>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={toggle} style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <span className="muted" style={{ fontSize: 12 }}>{user?.email}</span>
            <button onClick={handleSignOut} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </header>
        <main style={{ padding: 24, flex: 1 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}><Outlet /></div>
        </main>
      </div>
    </div>
  )
}
