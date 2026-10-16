import { useEffect, useMemo, useState } from 'react'
import { useAttendance } from '../hooks/useAttendance'
import { useClasses } from '../hooks/useClasses'

const STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent',  label: 'Absent' },
  { value: 'late',    label: 'Late' },
  { value: 'excused', label: 'Excused' },
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
  const { loading, error, loadDay, saveDay } = useAttendance()

  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [students, setStudents] = useState([])
  const [statuses, setStatuses] = useState({})   // student_id -> status
  const [notes, setNotes] = useState({})         // student_id -> note (optional)
  const [busy, setBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    async function run() {
      setSaveMsg('')
      const result = await loadDay({ classId, date })
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
  }, [classId, date, loadDay])

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
    setBusy(true)
    setSaveMsg('')
    try {
      const entries = students.map((s) => ({
        student_id: s.id,
        status: statuses[s.id] ?? 'present',
        notes: notes[s.id],
      }))
      await saveDay({ date, entries })
      setSaveMsg(`Saved attendance for ${entries.length} students.`)
    } catch (err) {
      setSaveMsg('Error: ' + err.message)
    }
    setBusy(false)
  }

  const canEnter = classId && date

  return (
    <div>
      <h1>Attendance</h1>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ padding: 8, minWidth: 160 }}>
            <option value="">— pick —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: 8 }}
          />
        </div>

        {canEnter && students.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setAll('present')} disabled={busy} style={{ padding: '8px 12px' }}>All present</button>
            <button onClick={() => setAll('absent')}  disabled={busy} style={{ padding: '8px 12px' }}>All absent</button>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!canEnter && <p style={{ opacity: 0.6 }}>Pick a class and date.</p>}
      {canEnter && loading && <p>Loading…</p>}

      {canEnter && !loading && students.length === 0 && (
        <p style={{ opacity: 0.6 }}>No active students in this class.</p>
      )}

      {canEnter && !loading && students.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13, opacity: 0.75 }}>
            <span>Present: <strong>{summary.present}</strong></span>
            <span>Absent: <strong>{summary.absent}</strong></span>
            <span>Late: <strong>{summary.late}</strong></span>
            <span>Excused: <strong>{summary.excused}</strong></span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                <th style={{ padding: 8 }}>Adm. No</th>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8, width: 320 }}>Status</th>
                <th style={{ padding: 8 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{s.admission_number}</td>
                  <td style={{ padding: 8 }}>{s.full_name}</td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {STATUSES.map((st) => {
                        const active = statuses[s.id] === st.value
                        return (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => setStatuses({ ...statuses, [s.id]: st.value })}
                            style={{
                              padding: '6px 10px',
                              border: '1px solid #ccc',
                              borderRadius: 6,
                              background: active ? '#2563eb' : 'transparent',
                              color: active ? '#fff' : 'inherit',
                              cursor: 'pointer',
                            }}
                          >
                            {st.label}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      value={notes[s.id] ?? ''}
                      onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                      placeholder="optional"
                      style={{ padding: 6, width: '100%' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={handleSave} disabled={busy} style={{ padding: '10px 16px' }}>
              {busy ? 'Saving…' : 'Save attendance'}
            </button>
            {saveMsg && <span>{saveMsg}</span>}
          </div>
        </>
      )}
    </div>
  )
}
