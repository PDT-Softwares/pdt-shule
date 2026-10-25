import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import PageLoader from './components/PageLoader'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SchoolProvider, useSchool } from './contexts/SchoolContext'
import { ThemeProvider } from './contexts/ThemeContext'

import Login from './pages/Login'
import Signup from './pages/Signup'
import WorkspaceLayout from './layouts/WorkspaceLayout'
import PlatformAdminLayout from './layouts/PlatformAdminLayout'
import Dashboard from './pages/Dashboard'
import AI from './pages/AI'
import Students from './pages/Students'
import StudentProfile from './pages/StudentProfile'
import Classes from './pages/Classes'
import Subjects from './pages/Subjects'
import Terms from './pages/Terms'
import Marks from './pages/Marks'
import Reports from './pages/Reports'
import Attendance from './pages/Attendance'
import Timetable from './pages/Timetable'
import Announcements from './pages/Announcements'
import Resources from './pages/Resources'
import Teachers from './pages/Teachers'
import Schools from './pages/Schools'
import PlatformDashboard from './pages/PlatformDashboard'

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RequireSchool() {
  const { currentSchool, loading, memberships, isPlatformAdmin } = useSchool()
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>
  if (isPlatformAdmin) return <Navigate to="/app/admin" replace />
  
  if (memberships && memberships.length === 0) {
    return (
      <div style={{ padding: 40 }}>
        <h1>No School Assigned</h1>
        <p>You are not a member of any school yet. Please contact the PDT Shule platform administrator.</p>
      </div>
    )
  }
  if (!currentSchool) return <div style={{ padding: 40 }}>Loading school…</div>
  return <Outlet />
}

// RequireRole - allows access if role matches, OR if allowAdmin is true and user is admin
function RequireRole({ roles }) {
  const { currentRole, loading } = useSchool()
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>
  if (roles.includes(currentRole)) return <Outlet />
  return <Navigate to="/app" replace />
}

function RequirePlatformAdmin() {
  const { isPlatformAdmin, loading } = useSchool()
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>
  if (!isPlatformAdmin) return <Navigate to="/app" replace />
  return <Outlet />
}

function RootRedirect() {
  const { user, loading: authLoading } = useAuth()
  const { isPlatformAdmin, memberships, loading: schoolLoading } = useSchool()
  
  if (authLoading || schoolLoading) return <div style={{ padding: 40 }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (isPlatformAdmin) return <Navigate to="/app/admin" replace />
  if (memberships && memberships.length > 0) return <Navigate to="/app" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SchoolProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route element={<RequireAuth />}>
                <Route path="/" element={<RootRedirect />} />

                {/* Platform Admin Routes */}
                <Route element={<RequirePlatformAdmin />}>
                  <Route path="/app/admin" element={<PlatformAdminLayout />}>
                    <Route index element={<PlatformDashboard />} />
                    <Route path="schools" element={<Schools />} />
                  </Route>
                </Route>

                {/* School Workspace Routes */}
                <Route element={<RequireSchool />}>
                  <Route path="/app" element={<WorkspaceLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="ai" element={<AI />} />
                    <Route path="timetable" element={<Timetable />} />
                    <Route path="announcements" element={<Announcements />} />
                    <Route path="resources" element={<Resources />} />
                    <Route path="marks" element={<Marks />} />

                    <Route element={<RequireRole roles={['admin', 'classteacher']} />}>
                      <Route path="students" element={<Students />} />
                      <Route path="students/:id" element={<StudentProfile />} />
                      <Route path="classes" element={<Classes />} />
                      <Route path="subjects" element={<Subjects />} />
                      <Route path="terms" element={<Terms />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="attendance" element={<Attendance />} />
                    </Route>

                    <Route element={<RequireRole roles={['admin']} />}>
                      <Route path="teachers" element={<Teachers />} />
                    </Route>
                  </Route>
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </SchoolProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
