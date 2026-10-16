import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SchoolProvider, useSchool } from './contexts/SchoolContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import CreateSchool from './pages/CreateSchool'
import WorkspaceLayout from './layouts/WorkspaceLayout'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Classes from './pages/Classes'
import Subjects from './pages/Subjects'
import Terms from './pages/Terms'
import Marks from './pages/Marks'
import Attendance from './pages/Attendance'
import Timetable from './pages/Timetable'
import Announcements from './pages/Announcements'
import Resources from './pages/Resources'

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RequireSchool() {
  const { currentSchool, loading, memberships } = useSchool()
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>
  if (memberships && memberships.length === 0) return <Navigate to="/create-school" replace />
  if (!currentSchool) return <div style={{ padding: 40 }}>Loading school…</div>
  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<RequireAuth />}>
              <Route path="/" element={<Home />} />
              <Route path="/create-school" element={<CreateSchool />} />

              <Route element={<RequireSchool />}>
                <Route path="/app" element={<WorkspaceLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="students" element={<Students />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="subjects" element={<Subjects />} />
                  <Route path="terms" element={<Terms />} />
                  <Route path="marks" element={<Marks />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="timetable" element={<Timetable />} />
                  <Route path="announcements" element={<Announcements />} />
                  <Route path="resources" element={<Resources />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </SchoolProvider>
    </AuthProvider>
  )
}
