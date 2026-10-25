import { useEffect, useState, useMemo } from 'react'
import { Trash2, ListChecks, Plus, TrendingUp, Save, Calendar } from 'lucide-react'
import { useMarks } from '../hooks/useMarks'
import { useClasses } from '../hooks/useClasses'
import { useSubjects } from '../hooks/useSubjects'
import { useTerms } from '../hooks/useTerms'
import { useAssessments } from '../hooks/useAssessments'
import { useSchool } from '../contexts/SchoolContext'
import { supabase } from '../lib/supabase'
import { CBC_LEVELS, levelFor } from '../lib/assessmentUtils'
import PageFooter from '../components/PageFooter'
import ConfirmModal from '../components/ConfirmModal'

export default function Marks() {
  const { classes } = useClasses()
  const { subjects } = useSubjects()
  const { terms } = useTerms()
  const { assessments, loading: assessmentsLoading, addAssessment, deleteAssessment } = useAssessments()
  const { currentSchool, currentRole, currentSchoolMembership } = useSchool()
  const { loading, error, loadMarks, saveMarks } = useMarks()

  // Nimeongeza 'deadline' kwenye state
  const [assessmentForm, setAssessmentForm] = useState({ term_id: '', name: '', weight: 100, max_score: 100, deadline: '' })
  const [assessmentBusy, setAssessmentBusy] = useState(false)
  const [assessmentFormError, setAssessmentFormError] = useState('')

  const [classId, setClassId] = useState('')
  const [streamId, setStreamId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [termId, setTermId] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [streams, setStreams] = useState([])
  const [students, setStudents] = useState([])
  const [values, setValues] = useState({})
  const [busy, setBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [confirmDeleteAssessment, setConfirmDeleteAssessment] = useState(null)

  const schoolId = currentSchool?.school.id
  const isAdmin = currentRole === 'admin'
  const isTeacher = currentRole === 'teacher'
  const isClassTeacher = currentRole === 'classteacher'

  const [teacherAssignments, setTeacherAssignments] = useState([])
  useEffect(() => {
    async function load() {
      if (!currentSchoolMembership?.user_id || !schoolId) return
      const { data } = await supabase
        .from('teacher_subject_assignments')
        .select('class_id, stream_id, subject_id, classes(id, name), streams(id, name), subjects(id, name)')
        .eq('teacher_id', currentSchoolMembership.user_id)
        .eq('school_id', schoolId)
      setTeacherAssignments(data ?? [])
    }
    load()
  }, [currentSchoolMembership, schoolId])

  const teacherClasses = useMemo(() => {
    if (isAdmin) return classes
    const unique = {}
    for (const a of teacherAssignments) {
      if (a.classes?.id && !unique[a.classes.id]) unique[a.classes.id] = a.classes
    }
    return Object.values(unique)
  }, [isAdmin, classes, teacherAssignments])

  const teacherSubjects = useMemo(() => {
    if (isAdmin) return subjects
    const unique = {}
    for (const a of teacherAssignments) {
      if (a.subjects?.id && !unique[a.subjects.id]) unique[a.subjects.id] = a.subjects
    }
    return Object.values(unique)
  }, [isAdmin, subjects, teacherAssignments])

  useEffect(() => {
    if (isClassTeacher && currentSchoolMembership) {
      setClassId(currentSchoolMembership.class_id || '')
      setStreamId(currentSchoolMembership.stream_id || '')
    }
  }, [isClassTeacher, currentSchoolMembership])

  const currentAssessments = useMemo(() => {
    return assessments.filter(a => a.term_id === termId)
  }, [assessments, termId])

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
    if (!termId) setAssessmentId('')
  }, [termId])

  useEffect(() => {
    async function run() {
      setSaveMsg('')
      if (!assessmentId) { setStudents([]); setValues({}); return }
      const result = await loadMarks({ classId, streamId, subjectId, termId, assessmentId })
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
  }, [classId, streamId, subjectId, termId, assessmentId, loadMarks])

  const stats = useMemo(() => {
    const entered = students.filter(s => values[s.id] !== '' && values[s.id] != null)
    const scores = entered.map(s => Number(values[s.id])).filter(n => !isNaN(n))
    if (scores.length === 0) return null
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const highest = Math.max(...scores)
    const lowest = Math.min(...scores)
    const dist = {}
    for (const l of CBC_LEVELS) dist[l.level] = 0
    for (const s of entered) {
      const l = levelFor(values[s.id])
      if (l) dist[l.level] = (dist[l.level] ?? 0) + 1
    }
    return { avg, highest, lowest, count: scores.length, total: students.length, dist }
  }, [students, values])

  async function handleSave() {
    if (!classId || !subjectId || !termId || !assessmentId) return
    setBusy(true); setSaveMsg('')
    try {
      const rows = students
        .filter((s) => values[s.id] !== '' && values[s.id] != null)
        .map((s) => {
          const score = Number(values[s.id])
          const l = levelFor(score)
          return {
            student_id: s.id, subject_id: subjectId, term_id: termId,
            assessment_id: assessmentId, score, grade: l?.level ?? '',
          }
        })
      if (rows.length === 0) { setSaveMsg('Nothing to save.'); setBusy(false); return }
      await saveMarks(rows, assessmentId)
      setSaveMsg(`Saved ${rows.length} mark${rows.length === 1 ? '' : 's'}.`)
    } catch (err) { setSaveMsg('Error: ' + err.message) }
    setBusy(false)
  }

  async function handleAddAssessment(e) {
    e.preventDefault()
    if (!isAdmin) return
    setAssessmentBusy(true); setAssessmentFormError('')
    try {
      await addAssessment(assessmentForm) // Sasa inatuma deadline pia
      setAssessmentForm({ term_id: '', name: '', weight: 100, max_score: 100, deadline: '' })
    } catch (err) { setAssessmentFormError(err.message) }
    setAssessmentBusy(false)
  }

  async function handleDeleteAssessment() {
    if (!isAdmin || !confirmDeleteAssessment) return
    setAssessmentBusy(true)
    try { 
      await deleteAssessment(confirmDeleteAssessment.id) 
      setConfirmDeleteAssessment(null)
    } catch (err) { setAssessmentFormError(err.message) }
    setAssessmentBusy(false)
  }

  const canEnter = classId && subjectId && termId && assessmentId

  return (
    <div className="anim-in" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Assessment & Grading</h1>
        <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
          {isAdmin ? 'Manage assessments and record student scores.' : 'Record scores for subjects you teach.'}
        </p>
      </div>

      {isAdmin && (
        <div className="ui-card anim-in" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
                <ListChecks size={18} /> Assessment Periods
              </h3>
              <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                Define the exams for each term.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddAssessment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <label>Term</label>
              <select value={assessmentForm.term_id} onChange={(e) => setAssessmentForm({ ...assessmentForm, term_id: e.target.value })} required style={{ width: '100%', borderRadius: 999 }}>
                <option value="">— pick —</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.academic_years?.name} — {t.name}</option>)}
              </select>
            </div>
            <div>
              <label>Name</label>
              <input value={assessmentForm.name} onChange={(e) => setAssessmentForm({ ...assessmentForm, name: e.target.value })} required placeholder="e.g. Opener" style={{ width: '100%', borderRadius: 999 }} />
            </div>
            <div>
              <label>Weight (%)</label>
              <input type="number" value={assessmentForm.weight} onChange={(e) => setAssessmentForm({ ...assessmentForm, weight: e.target.value })} min={0} max={100} style={{ width: '100%', borderRadius: 999 }} />
            </div>
            <div>
              <label>Deadline</label>
              <input type="date" value={assessmentForm.deadline} onChange={(e) => setAssessmentForm({ ...assessmentForm, deadline: e.target.value })} style={{ width: '100%', borderRadius: 999 }} />
            </div>
            <button type="submit" disabled={assessmentBusy} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, justifyContent: 'center' }}>
              <Plus size={14} /> Add
            </button>
          </form>

          {assessmentFormError && <p className="error-text">{assessmentFormError}</p>}

          {assessmentsLoading ? (
            <p className="muted">Loading assessments…</p>
          ) : assessments.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>No assessments defined yet.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {assessments.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface-2)', padding: '8px 12px',
                  borderRadius: 999, fontSize: 13, flexShrink: 0,
                }}>
                  <strong>{a.name}</strong>
                  <span className="muted">· {a.terms?.name} · {a.weight}%</span>
                  {a.deadline && (
                    <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} /> {new Date(a.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    className="danger"
                    onClick={() => setConfirmDeleteAssessment(a)}
                    disabled={assessmentBusy}
                    style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <h3 style={{ margin: 0, fontSize: 16, marginBottom: 12 }}>Mark Entry</h3>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {/* Filters zote hapa (hazijabadilika) */}
        {isAdmin || isTeacher ? (
          <div>
            <label>Class</label>
            <select value={classId} onChange={(e) => { setClassId(e.target.value); setStreamId('') }} style={{ minWidth: 160, borderRadius: 999 }}>
              <option value="">— pick —</option>
              {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label>Class</label>
            <input value={classes.find(c => c.id === currentSchoolMembership?.class_id)?.name || '—'} disabled style={{ minWidth: 160, borderRadius: 999 }} />
          </div>
        )}
        {isAdmin && classId && streams.length > 0 && (
          <div>
            <label>Stream</label>
            <select value={streamId} onChange={(e) => setStreamId(e.target.value)} style={{ minWidth: 140, borderRadius: 999 }}>
              <option value="">All Streams</option>
              {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {isTeacher && classId && teacherAssignments.filter(a => a.class_id === classId && a.stream_id).length > 0 && (
          <div>
            <label>Stream</label>
            <select value={streamId} onChange={(e) => setStreamId(e.target.value)} style={{ minWidth: 140, borderRadius: 999 }}>
              <option value="">All</option>
              {teacherAssignments
                .filter(a => a.class_id === classId && a.streams)
                .map(a => a.streams)
                .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ minWidth: 180, borderRadius: 999 }}>
            <option value="">— pick —</option>
            {teacherSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label>Term</label>
          <select value={termId} onChange={(e) => { setTermId(e.target.value); setAssessmentId('') }} style={{ minWidth: 200, borderRadius: 999 }}>
            <option value="">— pick —</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.academic_years?.name ? `${t.academic_years.name} — ` : ''}{t.name}{t.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </div>
        {termId && (
          <div>
            <label>Assessment</label>
            <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} style={{ minWidth: 180, borderRadius: 999 }}>
              <option value="">— pick —</option>
              {currentAssessments.length === 0 ? (
                <option value="" disabled>No assessments for this term</option>
              ) : (
                currentAssessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
              )}
            </select>
          </div>
        )}
      </div>

      {/* ...sehemu ya stats, table, mobile cards na modal ya kufuta (hazijabadilika)... */}
      {error && <p className="error-text">{error}</p>}
      {!canEnter && <p className="muted">Pick a class, subject, term, and assessment to begin.</p>}
      {canEnter && loading && <p className="muted">Loading…</p>}
      {canEnter && !loading && students.length === 0 && <p className="muted">No active students found.</p>}

      {canEnter && !loading && students.length > 0 && (
        <>
          {stats && (
            <div className="dash-grid" style={{ marginBottom: 20 }}>
              <div className="dash-col-3 ui-card anim-in" style={{ animationDelay: '0.05s' }}><div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Average</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{stats.avg.toFixed(1)}</div></div>
              <div className="dash-col-3 ui-card anim-in" style={{ animationDelay: '0.10s' }}><div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Highest</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: 'var(--success)' }}>{stats.highest}</div></div>
              <div className="dash-col-3 ui-card anim-in" style={{ animationDelay: '0.15s' }}><div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Lowest</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, color: 'var(--warning)' }}>{stats.lowest}</div></div>
              <div className="dash-col-3 ui-card anim-in" style={{ animationDelay: '0.20s' }}><div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Recorded</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{stats.count} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ {stats.total}</span></div></div>
            </div>
          )}
          {stats && (
            <div className="ui-card anim-in" style={{ marginBottom: 20, animationDelay: '0.25s' }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}><TrendingUp size={16} /> Performance Distribution</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {CBC_LEVELS.map(l => {
                  const count = stats.dist[l.level] ?? 0
                  const pct = stats.count ? (count / stats.count) * 100 : 0
                  return (
                    <div key={l.level} style={{ flex: '1 1 100px', minWidth: 100 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontWeight: 700, color: l.color }}>{l.level}</span><span className="muted" style={{ fontSize: 12 }}>{count}</span></div>
                      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 6, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: l.color }} /></div>
                      <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{l.remark}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="ui-card table-desktop" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <table>
              <thead><tr><th>Adm. No</th><th>Name</th><th>Stream</th><th style={{ width: 140 }}>Score</th><th style={{ width: 100 }}>Level</th><th>Remark</th></tr></thead>
              <tbody>
                {students.map((s) => {
                  const v = values[s.id] ?? ''
                  const l = v === '' ? null : levelFor(v)
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.admission_number}</td>
                      <td>{s.full_name}</td>
                      <td>{s.streams?.name ?? '—'}</td>
                      <td><input type="number" min={0} max={100} step="0.01" value={v} onChange={(e) => setValues({ ...values, [s.id]: e.target.value })} style={{ width: 100, borderRadius: 999, textAlign: 'center', fontWeight: 600 }} /></td>
                      <td>{l ? <span className="badge badge-muted" style={{ color: l.color, fontWeight: 800 }}>{l.level}</span> : '—'}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{l ? l.remark : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="cards-mobile" style={{ marginBottom: 16 }}>
            {students.map((s) => {
              const v = values[s.id] ?? ''
              const l = v === '' ? null : levelFor(v)
              return (
                <div key={s.id} className="ui-card" style={{ padding: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{s.full_name}</div><div className="muted" style={{ fontSize: 12 }}>{s.admission_number}{s.streams?.name ? ` · ${s.streams.name}` : ''}</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <input type="number" min={0} max={100} step="0.01" value={v} onChange={(e) => setValues({ ...values, [s.id]: e.target.value })} placeholder="Score" style={{ width: 90, borderRadius: 999, textAlign: 'center', fontWeight: 700 }} />
                      {l && <span className="badge badge-muted" style={{ color: l.color, fontWeight: 800 }}>{l.level} · {l.remark}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleSave} disabled={busy} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Save size={16} /> {busy ? 'Saving…' : 'Save marks'}</button>
            {saveMsg && <span className="muted">{saveMsg}</span>}
          </div>
        </>
      )}

      <ConfirmModal
        open={!!confirmDeleteAssessment}
        title="Delete assessment?"
        message={`Are you sure you want to delete "${confirmDeleteAssessment?.name}"? All marks under it will also be deleted.`}
        confirmLabel="Delete"
        busy={assessmentBusy}
        onConfirm={handleDeleteAssessment}
        onCancel={() => setConfirmDeleteAssessment(null)}
      />

      <PageFooter />
    </div>
  )
}