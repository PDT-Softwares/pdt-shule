import { useEffect, useState } from 'react'
import { useTimetable } from '../hooks/useTimetable'
import { useClasses } from '../hooks/useClasses'
import { useSubjects } from '../hooks/useSubjects'
import { useTerms } from '../hooks/useTerms'

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
]

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

export default function Timetable() {
  const { classes } = useClasses()
  const { subjects } = useSubjects()
  const { terms } = useTerms()
  const { loading, error, loadSlots, upsertSlot, deleteSlot } = useTimetable()

  const [classId, setClassId] = useState('')
  const [termId, setTermId] = useState('')
  const [slots, setSlots] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    async function run() {
      const data = await loadSlots({ classId, termId })
      setSlots(data)
    }
    run()
  }, [classId, termId, loadSlots])

  function slotAt(day, period) {
    return slots.find((s) => s.day_of_week === day && s.period === period)
  }

  function openEditor(day, period) {
    const existing = slotAt(day, period)
    setEditing({
      day, period, existing,
      subject_id: existing?.subject_id ?? '',
    })
    setFormError('')
  }

  function closeEditor() {
    setEditing(null)
    setFormError('')
  }

  async function handleSave() {
    if (!editing.subject_id) { setFormError('Pick a subject.'); return }
    setBusy(true)
    setFormError('')
    try {
      await upsertSlot({
        class_id: classId,
        subject_id: editing.subject_id,
        term_id: termId,
        day_of_week: editing.day,
        period: editing.period,
      })
      const data = await loadSlots({ classId, termId })
      setSlots(data)
      closeEditor()
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  async function handleClear() {
    if (!editing.existing) { closeEditor(); return }
    if (!confirm('Clear this slot?')) return
    setBusy(true)
    try {
      await deleteSlot({ classId, termId, day: editing.day, period: editing.period })
      const data = await loadSlots({ classId, termId })
      setSlots(data)
      closeEditor()
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  const canShow = classId && termId

  return (
    <div>
      <h1>Timetable</h1>
      <p style={{ opacity: 0.7 }}>
        Click any cell to assign a subject. Click an occupied cell to change or clear it.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ padding: 8, minWidth: 160 }}>
            <option value="">— pick —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} style={{ padding: 8, minWidth: 200 }}>
            <option value="">— pick —</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.academic_years?.name ? `${t.academic_years.name} — ` : ''}{t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!canShow && <p style={{ opacity: 0.6 }}>Pick a class and term to see the timetable.</p>}
      {canShow && loading && <p>Loading…</p>}

      {canShow && !loading && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: 8, border: '1px solid #ccc', width: 80 }}>Period</th>
              {DAYS.map((d) => (
                <th key={d.value} style={{ padding: 8, border: '1px solid #ccc' }}>{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p}>
                <td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'center', fontWeight: 'bold' }}>
                  {p}
                </td>
                {DAYS.map((d) => {
                  const slot = slotAt(d.value, p)
                  return (
                    <td
                      key={d.value}
                      onClick={() => openEditor(d.value, p)}
                      style={{
                        padding: 8, border: '1px solid #ccc', cursor: 'pointer',
                        background: slot ? '#dbeafe' : 'transparent',
                        minWidth: 120, verticalAlign: 'top',
                      }}
                    >
                      {slot
                        ? <strong style={{ fontSize: 13 }}>{slot.subjects?.name}</strong>
                        : <span style={{ opacity: 0.3, fontSize: 12 }}>—</span>
                      }
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#fff', color: '#111', padding: 24, borderRadius: 8,
            width: '100%', maxWidth: 420,
          }}>
            <h2 style={{ marginTop: 0 }}>
              {editing.existing ? 'Edit slot' : 'Assign slot'}
            </h2>
            <p style={{ margin: 0, opacity: 0.7 }}>
              {DAYS.find((d) => d.value === editing.day)?.label} — Period {editing.period}
            </p>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Subject *</label>
              <select
                value={editing.subject_id}
                onChange={(e) => setEditing({ ...editing, subject_id: e.target.value })}
                style={{ width: '100%', padding: 8 }}
              >
                <option value="">— pick —</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {formError && <p style={{ color: 'red' }}>{formError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleSave} disabled={busy} style={{ padding: '10px 16px' }}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              {editing.existing && (
                <button onClick={handleClear} disabled={busy} style={{ padding: '10px 16px' }}>
                  Clear slot
                </button>
              )}
              <button onClick={closeEditor} disabled={busy} style={{ padding: '10px 16px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
