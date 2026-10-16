import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useMarks } from '../hooks/useMarks'
import { useClasses } from '../hooks/useClasses'
import { useSubjects } from '../hooks/useSubjects'
import { useTerms } from '../hooks/useTerms'
import { useSchool } from '../contexts/SchoolContext'
import { callGemini } from '../lib/gemini'

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
  const { currentSchool } = useSchool()
  const { loading, error, loadMarks, saveMarks } = useMarks()

  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [termId, setTermId] = useState('')
  const [students, setStudents] = useState([])
  const [values, setValues] = useState({})
  const [busy, setBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [insights, setInsights] = useState(null)
  const [insightsBusy, setInsightsBusy] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  useEffect(() => {
    async function run() {
      setSaveMsg(''); setInsights(null)
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
    setBusy(true); setSaveMsg(''); setInsights(null)
    try {
      const rows = students
        .filter((s) => values[s.id] !== '' && values[s.id] != null)
        .map((s) => {
          const score = Number(values[s.id])
          return { student_id: s.id, subject_id: subjectId, term_id: termId, score, grade: scoreToGrade(score) }
        })
      if (rows.length === 0) { setSaveMsg('Nothing to save.'); setBusy(false); return }
      await saveMarks(rows)
      setSaveMsg(`Saved ${rows.length} mark${rows.length === 1 ? '' : 's'}.`)
    } catch (err) { setSaveMsg('Error: ' + err.message) }
    setBusy(false)
  }

  async function handleGetInsights() {
    setInsightsError(''); setInsightsBusy(true)

    const filled = students
      .filter((s) => values[s.id] !== '' && values[s.id] != null)
      .map((s) => ({
        name: s.full_name, adm: s.admission_number,
        score: Number(values[s.id]), grade: scoreToGrade(values[s.id]),
      }))

    if (filled.length < 2) {
      setInsightsError('Enter marks for at least 2 students first.')
      setInsightsBusy(false); return
    }

    const className = classes.find((c) => c.id === classId)?.name ?? ''
    const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? ''
    const termObj = terms.find((t) => t.id === termId)
    const termName = termObj ? `${termObj.academic_years?.name ?? ''} ${termObj.name}`.trim() : ''

    const scores = filled.map((m) => m.score)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const highest = Math.max(...scores)
    const lowest = Math.min(...scores)

    const markList = filled.map((m) => `${m.name} (${m.adm}): ${m.score}${m.grade ? ` [${m.grade}]` : ''}`).join('\n')

    const prompt = `Context:
- School: ${currentSchool?.school?.name ?? ''}
- Class: ${className}
- Subject: ${subjectName}
- Term: ${termName}
- Students: ${filled.length}
- Average: ${avg.toFixed(1)}
- Highest: ${highest}
- Lowest: ${lowest}

Scores:
${markList}

Write a brief, practical analysis (max 250 words) for the teacher. Include:
1. Overall performance summary.
2. Top 3 students by name.
3. Bottom 3 students needing support by name.
4. Actionable teaching recommendations.
5. One encouraging note.`

    try {
      const text = await callGemini(prompt)
      setInsights({ text, stats: { average: avg.toFixed(1), highest, lowest, count: filled.length } })
    } catch (err) {
      setInsightsError(err.message)
    }
    setInsightsBusy(false)
  }

  const canEnter = classId && subjectId && termId
  const hasSomeMarks = students.some((s) => values[s.id] !== '' && values[s.id] != null)

  return (
    <div>
      <h1>Marks</h1>
      <p className="muted">Pick a class, subject, and term. Enter scores out of 100.</p>

      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <label>Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">— pick —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">— pick —</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label>Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">— pick —</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.academic_years?.name ? `${t.academic_years.name} — ` : ''}{t.name}{t.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!canEnter && <p className="muted">Pick a class, subject, and term to begin.</p>}
      {canEnter && loading && <p className="muted">Loading…</p>}

      {canEnter && !loading && students.length === 0 && <p className="muted">No active students in this class.</p>}

      {canEnter && !loading && students.length > 0 && (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Adm. No</th>
                  <th>Name</th>
                  <th style={{ width: 140 }}>Score (/100)</th>
                  <th style={{ width: 80 }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const v = values[s.id] ?? ''
                  const grade = v === '' ? '' : scoreToGrade(v)
                  return (
                    <tr key={s.id}>
                      <td>{s.admission_number}</td>
                      <td>{s.full_name}</td>
                      <td>
                        <input type="number" min={0} max={100} step="0.01" value={v}
                          onChange={(e) => setValues({ ...values, [s.id]: e.target.value })}
                          style={{ width: 100 }} />
                      </td>
                      <td>{grade}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleSave} disabled={busy} className="primary">
              {busy ? 'Saving…' : 'Save all marks'}
            </button>
            <button onClick={handleGetInsights} disabled={insightsBusy || !hasSomeMarks}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} />
              {insightsBusy ? 'Analyzing…' : 'Get AI Insights'}
            </button>
            {saveMsg && <span className="muted">{saveMsg}</span>}
          </div>
        </>
      )}

      {insightsError && <p className="error-text" style={{ marginTop: 12 }}>{insightsError}</p>}

      {insights && (
        <div className="card" style={{ marginTop: 20, background: 'var(--primary-soft)', border: 'none', position: 'relative' }}>
          <button onClick={() => setInsights(null)} style={{ position: 'absolute', top: 12, right: 12, padding: 6, background: 'transparent', border: 'none' }} title="Close">
            <X size={16} />
          </button>
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
            <Sparkles size={18} /> AI Insights
          </h2>
          {insights.stats && (
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 13 }}>
              <span>Average: <strong>{insights.stats.average}</strong></span>
              <span>Highest: <strong>{insights.stats.highest}</strong></span>
              <span>Lowest: <strong>{insights.stats.lowest}</strong></span>
              <span>Students: <strong>{insights.stats.count}</strong></span>
            </div>
          )}
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{insights.text}</div>
        </div>
      )}
    </div>
  )
}
