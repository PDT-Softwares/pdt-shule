import { useEffect, useState } from 'react'
import { useMarks } from '../hooks/useMarks'
import { useClasses } from '../hooks/useClasses'
import { useSubjects } from '../hooks/useSubjects'
import { useTerms } from '../hooks/useTerms'

// Convert a 0–100 score to a simple A–E grade.
// Adjust later to match your school's grading system.
function scoreToGrade(score) {
  const n = Number(score)
  if (isNaN(n)) return ''
  if (n >= 80) return 'A'
  if (n >= 70) return 'B'
  if (n >= 60) return 'C'
  if (n >= 50) return 'D'
  return 'E'
}

export default function Marks() {
  const { classes } = useClasses()
  const { subjects } = useSubjects()
  const { terms } = useTerms()
  const { loading, error, loadMarks, saveMarks } = useMarks()

  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [termId, setTermId] = useState('')
  const [students, setStudents] = useState([])
  const [values, setValues] = useState({})      // student_id -> score (string)
  const [busy, setBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Whenever class/subject/term change, reload
  useEffect(() => {
    async function run() {
      setSaveMsg('')
      const result = await loadMarks({ classId, subjectId, termId })
      if (!result.students) { setStudents([]); setValues({}); return }

      setStudents(result.students)
      const initial = {}
      for (const s of result.students) {
        const existing = result.marksByStudent[s.id]
        initial[s.id] = existing?.score != null ? String(existing.score) : ''
      }
      setValues(initial)
    }
    run()
  }, [classId, subjectId, termId, loadMarks])

  async function handleSave() {
    if (!classId || !subjectId || !termId) return
    setBusy(true)
    setSaveMsg('')
    try {
      const rows = students
        .filter((s) => values[s.id] !== '' && values[s.id] != null)
        .map((s) => {
          const score = Number(values[s.id])
          return {
            student_id: s.id,
            subject_id: subjectId,
            term_id: termId,
            score,
            grade: scoreToGrade(score),
          }
        })

      if (rows.length === 0) {
        setSaveMsg('Nothing to save.')
        setBusy(false)
        return
      }

      await saveMarks(rows)
      setSaveMsg(`Saved ${rows.length} mark${rows.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setSaveMsg('Error: ' + err.message)
    }
    setBusy(false)
  }

  const canEnter = classId && subjectId && termId

  return (
    <div>
      <h1>Marks</h1>
      <p style={{ opacity: 0.7 }}>
        Pick a class, subject, and term. Enter scores out of 100. Grades are assigned automatically.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ padding: 8, minWidth: 160 }}>
            <option value="">— pick —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ padding: 8, minWidth: 180 }}>
            <option value="">— pick —</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} style={{ padding: 8, minWidth: 180 }}>
            <option value="">— pick —</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.academic_years?.name ? `${t.academic_years.name} — ` : ''}{t.name}{t.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!canEnter && <p style={{ opacity: 0.6 }}>Pick a class, subject, and term to begin.</p>}

      {canEnter && loading && <p>Loading…</p>}

      {canEnter && !loading && students.length === 0 && (
        <p style={{ opacity: 0.6 }}>
          No active students in this class. Add students first, or pick a different class.
        </p>
      )}

      {canEnter && !loading && students.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                <th style={{ padding: 8 }}>Adm. No</th>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8, width: 140 }}>Score (/100)</th>
                <th style={{ padding: 8, width: 80 }}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const v = values[s.id] ?? ''
                const grade = v === '' ? '' : scoreToGrade(v)
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{s.admission_number}</td>
                    <td style={{ padding: 8 }}>{s.full_name}</td>
                    <td style={{ padding: 8 }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={v}
                        onChange={(e) => setValues({ ...values, [s.id]: e.target.value })}
                        style={{ padding: 6, width: 100 }}
                      />
                    </td>
                    <td style={{ padding: 8 }}>{grade}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={handleSave} disabled={busy} style={{ padding: '10px 16px' }}>
              {busy ? 'Saving…' : 'Save all marks'}
            </button>
            {saveMsg && <span>{saveMsg}</span>}
          </div>
        </>
      )}
    </div>
  )
}
