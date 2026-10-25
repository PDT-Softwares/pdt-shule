import { useEffect, useMemo, useState } from 'react'
import { Printer, Save, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { useAttendance } from '../hooks/useAttendance'
import { useClasses } from '../hooks/useClasses'
import { useSchool } from '../contexts/SchoolContext'
import { supabase } from '../lib/supabase'

const STATUSES = [
  { value: 'present', label: 'Present', icon: CheckCircle, color: 'var(--success)' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: 'var(--danger)' },
  { value: 'late', label: 'Late', icon: Clock, color: 'var(--warning)' },
  { value: 'excused', label: 'Excused', icon: AlertCircle, color: 'var(--text-muted)' },
]

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Attendance() {
  const { classes } = useClasses()
  const { currentSchool, currentRole, currentSchoolMembership } = useSchool()
  const { loading, error, loadDay, saveDay } = useAttendance()

  const [classId, setClassId] = useState('')
  const [streamId, setStreamId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [streams, setStreams] = useState([])
  const [students, setStudents] = useState([])
  const [statuses, setStatuses] = useState({})
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const schoolId = currentSchool?.school.id
  const isAdmin = currentRole === 'admin'
  const isClassTeacher = currentRole === 'classteacher'

  const selectedClass = classes.find(c => c.id === classId)

  // Class teacher: auto-load their class/stream
  useEffect(() => {
    if (isClassTeacher && currentSchoolMembership) {
      setClassId(currentSchoolMembership.class_id || '')
      setStreamId(currentSchoolMembership.stream_id || '')
    }
  }, [isClassTeacher, currentSchoolMembership])

  useEffect(() => {
    async function load() {
      if (!schoolId || !classId) { setStreams([]); return }
      const { data } = await supabase
        .from('streams')
        .select('id, name, class_id')
        .eq('class_id', classId)
        .order('name')
      setStreams(data ?? [])
    }
    load()
  }, [schoolId, classId])

  useEffect(() => {
    async function run() {
      setSaveMsg('')
      const result = await loadDay({ classId, streamId, date })
      if (!result.students) { setStudents([]); setStatuses({}); setNotes({}); return }

      setStudents(result.students)
      const initialStatuses = {}
      const initialNotes = {}
      for (const s of result.students) {
        const existing = result.byStudent[s.id]
        initialStatuses[s.id] = existing?.status ?? 'present'
        initialNotes[s.id] = existing?.notes ?? ''
      }
      setStatuses(initialStatuses)
      setNotes(initialNotes)
    }
    run()
  }, [classId, streamId, date, loadDay])

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 }
    for (const s of students) {
      const v = statuses[s.id]
      if (counts[v] !== undefined) counts[v]++
    }
    return counts
  }, [students, statuses])

  function setAll(status) {
    const next = {}
    for (const s of students) next[s.id] = status
    setStatuses(next)
  }

  async function handleSave() {
    if (!classId || !date || students.length === 0) return
    setBusy(true); setSaveMsg('')
    try {
      const entries = students.map((s) => ({
        student_id: s.id,
        status: statuses[s.id] ?? 'present',
        notes: notes[s.id],
      }))
      await saveDay({ date, entries })
      setSaveMsg(`Register saved for ${entries.length} students.`)
    } catch (err) {
      setSaveMsg('Error: ' + err.message)
    }
    setBusy(false)
  }

  const canEnter = classId && date

  return (
    <div>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Class Daily Register</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Mark attendance for your class. Records are filed and printable.
          </p>
        </div>
        {canEnter && students.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Printer size={16} /> Print Register
            </button>
          </div>
        )}
      </div>

      <div className="no-print filter-bar" style={{ marginBottom: 20 }}>
        {isAdmin && (
          <>
            <div>
              <label>Class</label>
              <select value={classId} onChange={(e) => { setClassId(e.target.value); setStreamId('') }} style={{ minWidth: 160 }}>
                <option value="">— pick —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {classId && streams.length > 0 && (
              <div>
                <label>Stream</label>
                <select value={streamId} onChange={(e) => setStreamId(e.target.value)} style={{ minWidth: 140 }}>
                  <option value="">All Streams</option>
                  {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        {isClassTeacher && selectedClass && (
          <div>
            <label>Class</label>
            <input 
              value={`${selectedClass.name}${streams.find(s => s.id === streamId)?.name ? ` — ${streams.find(s => s.id === streamId)?.name}` : ''}`} 
              disabled 
              style={{ minWidth: 180 }} 
            />
          </div>
        )}
        <div>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {canEnter && students.length > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            <button onClick={() => setAll('present')} disabled={busy}>All present</button>
            <button onClick={() => setAll('absent')} disabled={busy}>All absent</button>
          </div>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}
      {!canEnter && <p className="muted">Pick a class and date to begin.</p>}
      {canEnter && loading && <p className="muted">Loading…</p>}

      {canEnter && !loading && students.length === 0 && (
        <p className="muted">No active students in this class.</p>
      )}

      {canEnter && !loading && students.length > 0 && (
        <>
          <div className="print-only" style={{ display: 'none' }}>
            <h2 style={{ margin: 0 }}>{currentSchool?.school?.name}</h2>
            <div style={{ fontSize: 12, fontStyle: 'italic' }}>
              Class Daily Register — {selectedClass?.name}
            </div>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              Date: {new Date(date).toLocaleDateString()}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }} className="no-print">
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Present</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{summary.present}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Absent</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>{summary.absent}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Late</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{summary.late}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Excused</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-muted)' }}>{summary.excused}</div>
            </div>
          </div>

          <div className="card register-print" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <table className="register-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Adm No</th>
                  <th>Name</th>
                  <th style={{ width: 100 }}>Stream</th>
                  <th style={{ width: 340 }} className="no-print">Status</th>
                  <th style={{ width: 80 }} className="print-only">Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const status = statuses[s.id] ?? 'present'
                  return (
                    <tr key={s.id}>
                      <td>{s.admission_number}</td>
                      <td>{s.full_name}</td>
                      <td>{s.streams?.name ?? '—'}</td>
                      <td className="no-print">
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {STATUSES.map((st) => {
                            const Icon = st.icon
                            const active = status === st.value
                            return (
                              <button
                                key={st.value}
                                type="button"
                                onClick={() => setStatuses({ ...statuses, [s.id]: st.value })}
                                style={{
                                  padding: '6px 8px', fontSize: 11,
                                  border: `1px solid ${active ? st.color : 'var(--border)'}`,
                                  borderRadius: 6,
                                  background: active ? st.color : 'transparent',
                                  color: active ? '#fff' : 'inherit',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                <Icon size={12} /> {st.label}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                      <td className="print-only">
                        {STATUSES.find(x => x.value === status)?.label ?? '—'}
                      </td>
                      <td>
                        <input
                          value={notes[s.id] ?? ''}
                          onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                          placeholder="optional"
                          style={{ padding: 6, width: '100%' }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={handleSave} disabled={busy} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> {busy ? 'Saving…' : 'Save Register'}
            </button>
            {saveMsg && <span className="muted">{saveMsg}</span>}
          </div>
        </>
      )}
    </div>
  )
}