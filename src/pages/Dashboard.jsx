import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCog, GraduationCap, ClipboardList, ArrowRight, Megaphone, Calendar, FileText, UserCheck, ListChecks, Home, BarChart3, Settings, AlertTriangle, Clock } from 'lucide-react'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useAssessments } from '../hooks/useAssessments'
import { useSchool } from '../contexts/SchoolContext'
import PageFooter from '../components/PageFooter'

function StatCard({ icon: Icon, label, value, to, color }) {
  const content = (
    <div className="ui-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, cursor: to ? 'pointer' : 'default', height: '100%' }}>
      <div style={{ padding: 14, background: color.bg, color: color.fg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link> : content
}

function QuickAction({ icon: Icon, label, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="ui-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
        </div>
        <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { stats, loading, error, reload } = useDashboardStats()
  const { assessments, loading: assessmentsLoading } = useAssessments()
  const { currentSchool, currentRole } = useSchool()

  const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isAdmin = currentRole === 'admin'
  const isClassTeacher = currentRole === 'classteacher'
  const isTeacher = currentRole === 'teacher'

  useEffect(() => {
    reload()
  }, [reload])

  const currentTermAssessments = assessments.filter(a =>
    a.terms?.is_current ||
    (stats?.currentTerm && a.term_id === stats.currentTerm.id)
  )

  return (
    <div className="dash-wrap" style={{ paddingBottom: 90 }}>
      <div style={{ marginBottom: 20 }} className="anim-in">
        <h1 style={{ margin: 0, fontSize: 26 }}>Dashboard</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          {currentSchool?.school.name} — {today}
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading stats…</p>}

      {!loading && stats && (
        <>
          {/* Attendance reminder */}
          {isClassTeacher && stats.attendanceToday && !stats.attendanceToday.taken && (
            <div className="ui-card anim-in" style={{
              marginBottom: 20,
              background: 'var(--warning-soft)',
              borderLeft: '4px solid var(--warning)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}>
              <AlertTriangle size={28} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong style={{ fontSize: 15 }}>Attendance not taken today</strong>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  You haven't recorded attendance for your class today ({stats.attendanceToday.date}).
                </p>
              </div>
              <Link to="/app/attendance" className="primary" style={{ padding: '8px 16px', borderRadius: 999, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                Take attendance
              </Link>
            </div>
          )}

          {/* ===== Assessment Deadlines & Pending Marks ===== */}
          {stats.assessmentDeadlines && stats.assessmentDeadlines.length > 0 && (
            <div className="ui-card anim-in" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <Clock size={18} /> Assessment Deadlines
              </h3>
              <p className="muted" style={{ margin: '4px 0 16px', fontSize: 13 }}>
                {isAdmin
                  ? 'Track mark submission deadlines and pending entries across the school.'
                  : 'Track deadlines for your assessments and pending entries.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {stats.assessmentDeadlines.map(a => {
                  const overdue = a.deadline && new Date(a.deadline) < new Date()
                  const dueSoon = a.deadline && !overdue && (new Date(a.deadline) - new Date()) < 7 * 24 * 60 * 60 * 1000
                  const statusColor = overdue ? 'var(--danger)' : dueSoon ? 'var(--warning)' : 'var(--success)'
                  const statusLabel = overdue ? 'Overdue' : dueSoon ? 'Due soon' : 'On track'
                  const pending = a.pending ?? 0
                  return (
                    <div key={a.id} style={{
                      padding: 16,
                      background: overdue ? 'var(--danger-soft)' : dueSoon ? 'var(--warning-soft)' : 'var(--surface-2)',
                      borderRadius: 'var(--radius)',
                      borderLeft: `4px solid ${statusColor}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <strong style={{ fontSize: 15 }}>{a.name}</strong>
                        <span className={`badge badge-${overdue ? 'danger' : dueSoon ? 'warning' : 'success'}`} style={{ fontSize: 10 }}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                        {a.deadline ? `Deadline: ${new Date(a.deadline).toLocaleDateString()}` : 'No deadline set'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span>Recorded: <strong>{a.recorded}</strong></span>
                        {isTeacher ? (
                          <span>—</span>
                        ) : (
                          <span>Pending: <strong style={{ color: pending > 0 ? 'var(--danger)' : 'var(--success)' }}>{pending}</strong></span>
                        )}
                      </div>
                      {!isTeacher && a.subjects?.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                          Subjects: {a.subjects.map(s => s.name).join(', ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hero Card */}
          {stats.currentTerm && (
            <div className="hero-card anim-in" style={{ marginBottom: 20 }}>
              <div className="hero-label">Academic Period</div>
              <div className="hero-value" style={{ fontSize: 28 }}>
                {stats.currentTerm.academic_years?.name || '—'}
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12, fontSize: 13, fontWeight: 600 }}>
                <div>
                  <div style={{ opacity: 0.8, fontSize: 11, textTransform: 'uppercase' }}>Current Term</div>
                  <div style={{ fontSize: 18, marginTop: 2 }}>{stats.currentTerm.name || '—'}</div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>
                    <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {stats.currentTerm.start_date ? new Date(stats.currentTerm.start_date).toLocaleDateString() : '—'} → {stats.currentTerm.end_date ? new Date(stats.currentTerm.end_date).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="dash-grid" style={{ marginBottom: 20 }}>
            {(isAdmin || isClassTeacher) && (
              <div className="dash-col-4 anim-in" style={{ animationDelay: '0.05s' }}>
                <StatCard icon={Users} label="Students" value={stats.students} to="/app/students" color={{ bg: 'var(--primary-soft)', fg: 'var(--primary)' }} />
              </div>
            )}
            {isAdmin && (
              <div className="dash-col-4 anim-in" style={{ animationDelay: '0.10s' }}>
                <StatCard icon={UserCog} label="Teachers" value={stats.teachers} to="/app/teachers" color={{ bg: 'var(--surface-2)', fg: 'var(--text)' }} />
              </div>
            )}
            {isAdmin && (
              <div className="dash-col-4 anim-in" style={{ animationDelay: '0.15s' }}>
                <StatCard icon={GraduationCap} label="Classes" value={stats.classes} to="/app/classes" color={{ bg: 'var(--surface-2)', fg: 'var(--text)' }} />
              </div>
            )}
            <div className="dash-col-4 anim-in" style={{ animationDelay: '0.20s' }}>
              <StatCard icon={ClipboardList} label="Marks Recorded" value={stats.marks} to="/app/marks" color={{ bg: 'var(--surface-2)', fg: 'var(--text)' }} />
            </div>
            {(isAdmin || isClassTeacher) && (
              <div className="dash-col-4 anim-in" style={{ animationDelay: '0.25s' }}>
                <StatCard icon={UserCheck} label="Present Records" value={stats.presentRecords} to="/app/attendance" color={{ bg: 'var(--surface-2)', fg: 'var(--text)' }} />
              </div>
            )}
          </div>

          {/* Quick Actions & Announcements */}
          <div className="dash-grid">
            {isAdmin && (
              <div className="dash-col-6 anim-in" style={{ animationDelay: '0.35s' }}>
                <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 12 }}>Quick Actions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <QuickAction icon={Users} label="Add a student" to="/app/students" />
                  <QuickAction icon={ClipboardList} label="Record marks" to="/app/marks" />
                  <QuickAction icon={Calendar} label="Academic Calendar" to="/app/terms" />
                  <QuickAction icon={Megaphone} label="Post an announcement" to="/app/announcements" />
                </div>
              </div>
            )}

            {isTeacher && (
              <div className="dash-col-6 anim-in" style={{ animationDelay: '0.35s' }}>
                <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 12 }}>My Tools</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <QuickAction icon={ClipboardList} label="Record marks" to="/app/marks" />
                  <QuickAction icon={Calendar} label="My Timetable" to="/app/timetable" />
                  <QuickAction icon={FileText} label="Announcements" to="/app/announcements" />
                </div>
              </div>
            )}

            <div className={`${isAdmin || isTeacher ? 'dash-col-6' : 'dash-col-12'} anim-in`} style={{ animationDelay: '0.40s' }}>
              <h2 style={{ fontSize: 16, marginTop: 0, marginBottom: 12 }}>Recent Announcements</h2>
              {stats.recentAnnouncements.length === 0 ? (
                <div className="ui-card"><p className="muted" style={{ margin: 0, fontSize: 14 }}>No announcements yet.</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.recentAnnouncements.map(a => (
                    <div key={a.id} className="ui-card" style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{a.title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <PageFooter />

      {/* Bottom Nav (mobile only) */}
      <nav className="bottom-nav">
        <Link to="/app/dashboard" className="active"><Home size={22} /></Link>
        <Link to="/app/marks"><ClipboardList size={22} /></Link>
        <Link to="/app/reports"><BarChart3 size={22} /></Link>
        <Link to="/app/settings"><Settings size={22} /></Link>
      </nav>
    </div>
  )
}
