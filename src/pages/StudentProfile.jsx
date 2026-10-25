import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, GraduationCap } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function StudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true); setError('')

      const { data: s, error: sErr } = await supabase
        .from('students')
        .select('*, classes(name), streams(name)')
        .eq('id', id)
        .maybeSingle()

      if (sErr) { setError(sErr.message); setLoading(false); return }
      if (!s) { setError('Student not found'); setLoading(false); return }
      setStudent(s)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div style={{ padding: 40 }} className="muted">Loading…</div>
  if (error) return <div style={{ padding: 40 }} className="error-text">{error}</div>
  if (!student) return null

  const initials = (student.full_name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="anim-in">
      {/* Back */}
      <button
        onClick={() => navigate('/app/students')}
        className="muted"
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Back to Students
      </button>

      {/* Hero profile card */}
      <div className="hero-card" style={{ marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(255,255,255,0.4)',
          color: '#0f172a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 900,
          flexShrink: 0,
          border: '3px solid rgba(255,255,255,0.6)',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>
            {student.full_name}
          </h1>
          <p style={{ margin: '6px 0 10px', fontWeight: 600, opacity: 0.85 }}>
            {student.admission_number} · {student.classes?.name || '—'}{student.streams?.name ? ` (${student.streams.name})` : ''}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="hero-delta" style={{ background: 'rgba(255,255,255,0.55)', textTransform: 'capitalize' }}>
              {student.status}
            </span>
            {student.gender && (
              <span className="hero-delta" style={{ background: 'rgba(255,255,255,0.55)', textTransform: 'capitalize' }}>
                {student.gender}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="dash-grid">
        <div className="dash-col-6 anim-in" style={{ animationDelay: '0.05s' }}>
          <div className="ui-card">
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <User size={16} /> Personal
            </h3>
            <InfoRow label="Date of birth" value={student.date_of_birth || '—'} />
            <InfoRow label="Gender" value={student.gender || '—'} />
            <InfoRow label="Status" value={student.status} />
            <InfoRow label="Enrolled" value={new Date(student.created_at).toLocaleDateString()} />
          </div>
        </div>

        <div className="dash-col-6 anim-in" style={{ animationDelay: '0.10s' }}>
          <div className="ui-card">
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <Phone size={16} /> Guardian
            </h3>
            <InfoRow label="Guardian name" value={student.guardian_name || '—'} />
            <InfoRow label="Guardian phone" value={student.guardian_phone || '—'} />
          </div>
        </div>

        <div className="dash-col-12 anim-in" style={{ animationDelay: '0.15s' }}>
          <div className="ui-card">
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
              <GraduationCap size={16} /> Academic
            </h3>
            <InfoRow label="Class" value={student.classes?.name || '—'} />
            <InfoRow label="Stream" value={student.streams?.name || '—'} />
            <InfoRow label="Admission number" value={student.admission_number || '—'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}