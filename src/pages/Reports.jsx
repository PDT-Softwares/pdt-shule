import { useEffect, useMemo, useState } from 'react'
import { Printer, Sparkles, Loader2, User, AlertTriangle, CheckCircle, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClasses } from '../hooks/useClasses'
import { useTerms } from '../hooks/useTerms'
import { useAssessments } from '../hooks/useAssessments'
import { useSchool } from '../contexts/SchoolContext'
import { levelFor } from '../lib/assessmentUtils'
import { generateReportComments } from '../lib/reportComments'
import PageFooter from '../components/PageFooter'

function PerformanceGraph({ studentData, classData, assessment }) {
  if (!assessment) return null
  const width = 400, height = 160
  const padding = { top: 24, right: 20, bottom: 40, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const barW = 60
  const studentScore = studentData ?? 0
  const classScore = classData ?? 0
  const studentH = (Math.max(0, Math.min(100, studentScore)) / 100) * chartH
  const classH = (Math.max(0, Math.min(100, classScore)) / 100) * chartH
  const studentX = width / 2 - barW - 10, classX = width / 2 + 10
  const studentY = padding.top + chartH - studentH
  const classY = padding.top + chartH - classH
  const lvl = levelFor(studentScore)
  return (
    <div className="rc-graph">
      <div className="rc-label">Performance: {assessment.name}</div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padding.top + chartH - (v / 100) * chartH
          return (
            <g key={v}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 3" />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.6">{v}</text>
            </g>
          )
        })}
        <rect x={studentX} y={studentY} width={barW} height={studentH} fill={lvl?.color ?? '#2563eb'} rx="2" />
        <text x={studentX + barW / 2} y={studentY - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">{studentScore.toFixed(0)}</text>
        <text x={studentX + barW / 2} y={padding.top + chartH + 16} textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="600">You</text>
        <rect x={classX} y={classY} width={barW} height={classH} fill="#94a3b8" rx="2" opacity="0.7" />
        <text x={classX + barW / 2} y={classY - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">{classScore.toFixed(0)}</text>
        <text x={classX + barW / 2} y={padding.top + chartH + 16} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">Class Mean</text>
        <line x1={padding.left} x2={width - padding.right} y1={padding.top + chartH} y2={padding.top + chartH} stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  )
}

export default function Reports() {
  const { classes } = useClasses()
  const { terms } = useTerms()
  const { assessments } = useAssessments()
  const { currentSchool, currentRole, currentSchoolMembership } = useSchool()

  const [classId, setClassId] = useState('')
  const [streamId, setStreamId] = useState('')
  const [termId, setTermId] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [studentFilter, setStudentFilter] = useState('all')

  const [streams, setStreams] = useState([])
  const [students, setStudents] = useState([])
  const [classSubjects, setClassSubjects] = useState([])
  const [marksByStudent, setMarksByStudent] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [comments, setComments] = useState({})
  const [commentsBusy, setCommentsBusy] = useState(false)
  const [commentsError, setCommentsError] = useState('')

  const schoolId = currentSchool?.school.id
  const isAdmin = currentRole === 'admin'
  const isClassTeacher = currentRole === 'classteacher'

  useEffect(() => {
    if (isClassTeacher && currentSchoolMembership) {
      setClassId(currentSchoolMembership.class_id || '')
      setStreamId(currentSchoolMembership.stream_id || '')
    }
  }, [isClassTeacher, currentSchoolMembership])

  const currentAssessments = useMemo(() => {
    return assessments.filter(a => a.term_id === termId)
  }, [assessments, termId])

  const selectedAssessment = currentAssessments.find(a => a.id === assessmentId)

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

  // Hii inasoma timetable_slots kila classId, termId, au streamId inapobadilika
  useEffect(() => {
    async function run() {
      if (!classId || !termId || !assessmentId) {
        setStudents([]); setClassSubjects([]); setMarksByStudent({}); setComments({})
        return
      }
      setLoading(true); setError(''); setComments({}); setStudentFilter('all')

      let query = supabase
        .from('students')
        .select('id, full_name, admission_number, streams(name)')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('admission_number', { ascending: true })

      if (streamId) query = query.eq('stream_id', streamId)

      const { data: stu, error: sErr } = await query
      if (sErr) { setError(sErr.message); setLoading(false); return }
      setStudents(stu ?? [])

      // Hapa tunachukua slots za timetable kwa class na term hii, NA stream (kama imechaguliwa)
      let slotsQuery = supabase
        .from('timetable_slots')
        .select('subject_id, subjects(id, name)')
        .eq('class_id', classId)
        .eq('term_id', termId)
      
      if (streamId) {
        slotsQuery = slotsQuery.eq('stream_id', streamId)
      }

      const { data: slots, error: tErr } = await slotsQuery
      if (tErr) { setError(tErr.message); setLoading(false); return }

      const subjMap = {}
      for (const s of slots ?? []) {
        if (s.subjects?.id && !subjMap[s.subjects.id]) {
          subjMap[s.subjects.id] = { id: s.subjects.id, name: s.subjects.name }
        }
      }
      const classSubjs = Object.values(subjMap).sort((a, b) => a.name.localeCompare(b.name))
      setClassSubjects(classSubjs)

      const ids = (stu ?? []).map(s => s.id)
      if (ids.length === 0) { setMarksByStudent({}); setLoading(false); return }

      const { data: mk, error: mErr } = await supabase
        .from('marks')
        .select('student_id, score, grade, subject_id, subjects(id, name)')
        .eq('term_id', termId)
        .eq('assessment_id', assessmentId)
        .in('student_id', ids)

      if (mErr) { setError(mErr.message); setLoading(false); return }

      const byStudent = {}
      for (const m of mk ?? []) {
        if (!byStudent[m.student_id]) byStudent[m.student_id] = []
        byStudent[m.student_id].push(m)
      }
      setMarksByStudent(byStudent)
      setLoading(false)
    }
    run()
  }, [classId, streamId, termId, assessmentId])

  const readiness = useMemo(() => {
    if (!students.length || !classSubjects.length) return { ready: false, missing: 0, total: 0, noMarks: true }
    const total = students.length * classSubjects.length
    let missing = 0
    for (const s of students) {
      const studentMarks = marksByStudent[s.id] ?? []
      for (const subj of classSubjects) {
        const found = studentMarks.find(m => m.subject_id === subj.id)
        if (!found || found.score == null) missing++
      }
    }
    return { ready: missing === 0, missing, total, noMarks: false }
  }, [students, classSubjects, marksByStudent])

  const studentMeans = useMemo(() => {
    const result = {}
    for (const s of students) {
      const studentMarks = marksByStudent[s.id] ?? []
      const scores = studentMarks.map(m => Number(m.score)).filter(n => !isNaN(n))
      if (scores.length > 0) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length
        const level = levelFor(mean)
        result[s.id] = { mean: mean.toFixed(2), level: level?.level ?? '—', color: level?.color ?? 'var(--text-muted)' }
      } else {
        result[s.id] = { mean: '—', level: '—', color: 'var(--text-muted)' }
      }
    }
    return result
  }, [students, marksByStudent])

  const classMeanForAssessment = useMemo(() => {
    let total = 0, count = 0
    for (const s of students) {
      const studentMarks = marksByStudent[s.id] ?? []
      for (const m of studentMarks) if (m.score != null) { total += Number(m.score); count++ }
    }
    return count > 0 ? total / count : 0
  }, [students, marksByStudent])

  async function handleGenerateComments() {
    setCommentsError(''); setCommentsBusy(true)
    if (students.length === 0) { setCommentsError('No students.'); setCommentsBusy(false); return }
    try {
      const list = await generateReportComments({
        schoolName: currentSchool?.school?.name ?? '',
        className: classes.find(c => c.id === classId)?.name ?? '',
        termName: `${terms.find(t => t.id === termId)?.name ?? ''} — ${selectedAssessment?.name ?? ''}`,
        students: students.map(s => {
          const studentMarks = marksByStudent[s.id] ?? []
          return {
            name: s.full_name, adm: s.admission_number,
            subjects: studentMarks.map(m => ({ subject: m.subjects?.name ?? 'Subject', score: m.score, grade: levelFor(m.score)?.level ?? '' })),
          }
        }),
      })
      const map = {}
      for (const item of list) {
        const match = students.find(s => s.full_name.trim().toLowerCase() === item.name.trim().toLowerCase())
        if (match) map[match.id] = item.comment
      }
      setComments(map)
      if (Object.keys(map).length === 0) setCommentsError('AI returned an unexpected format.')
    } catch (err) { setCommentsError(err.message) }
    setCommentsBusy(false)
  }

  function handlePrintAll() {
    if (!readiness.ready) { alert(`Cannot print: ${readiness.missing} marks missing.`); return }
    setStudentFilter('all'); setTimeout(() => window.print(), 100)
  }
  function handlePrintOne(studentId) {
    if (!readiness.ready) { alert(`Cannot print: ${readiness.missing} marks missing.`); return }
    setStudentFilter(studentId); setTimeout(() => window.print(), 100)
  }

  const ready = classId && termId && assessmentId && !loading && students.length > 0
  const visibleStudents = studentFilter === 'all' ? students : students.filter(s => s.id === studentFilter)
  const termObj = terms.find(t => t.id === termId)

  return (
    <div className="anim-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Report Cards</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Generate and print student performance reports.
          </p>
        </div>
        {ready && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleGenerateComments} disabled={commentsBusy} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
              {commentsBusy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {commentsBusy ? 'Generating…' : (Object.keys(comments).length ? 'Regenerate AI comments' : 'Generate AI comments')}
            </button>
            <button onClick={handlePrintAll} className="primary" disabled={!readiness.ready} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: readiness.ready ? 1 : 0.5, borderRadius: 999 }}>
              <Printer size={16} /> Print all
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="no-print filter-bar" style={{ marginBottom: 20 }}>
        {isAdmin && (
          <div>
            <label>Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ minWidth: 160, borderRadius: 999 }}>
              <option value="">— pick —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {isClassTeacher && currentSchoolMembership && (
          <div>
            <label>Class</label>
            <input value={classes.find(c => c.id === currentSchoolMembership.class_id)?.name || '—'} disabled style={{ minWidth: 160, borderRadius: 999 }} />
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
                <option value="" disabled>No assessments</option>
              ) : currentAssessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}
      {commentsError && <p className="error-text">{commentsError}</p>}

      {/* Readiness Banner */}
      {ready && (
        <div className="no-print ui-card anim-in" style={{
          marginBottom: 20,
          background: readiness.ready ? 'var(--success-soft)' : 'var(--warning-soft)',
          borderLeft: `4px solid ${readiness.ready ? 'var(--success)' : 'var(--warning)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {readiness.ready
              ? <CheckCircle size={28} style={{ color: 'var(--success)', flexShrink: 0 }} />
              : <AlertTriangle size={28} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>
                {readiness.ready ? `Ready for printing — ${selectedAssessment?.name}` : `Not ready — ${readiness.missing} marks missing`}
              </strong>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                {readiness.ready ? `All ${readiness.total} marks recorded (${classSubjects.length} subjects).` : `${readiness.total - readiness.missing} of ${readiness.total} marks recorded.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {!classId || !termId || !assessmentId ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: 40 }}>
          <FileText size={32} className="muted" style={{ marginBottom: 8 }} />
          <p className="muted" style={{ margin: 0 }}>Pick a class, term, and assessment.</p>
        </div>
      ) : loading ? (
        <p className="muted">Loading…</p>
      ) : students.length === 0 ? (
        <p className="muted">No students found.</p>
      ) : classSubjects.length === 0 ? (
        <p className="muted">No timetable set for this class and term.</p>
      ) : null}

      {/* ===== Report cards (print view — unchanged) ===== */}
      {ready && (
        <div id="report-cards">
          {visibleStudents.map((s, idx) => {
            const studentMarks = marksByStudent[s.id] ?? []
            const meanInfo = studentMeans[s.id] ?? { mean: '—', level: '—', color: 'var(--text-muted)' }
            const studentMean = Number(meanInfo.mean) || 0
            return (
              <div key={s.id} className="report-card" style={{ pageBreakAfter: idx < visibleStudents.length - 1 ? 'always' : 'auto', breakAfter: idx < visibleStudents.length - 1 ? 'page' : 'auto' }}>
                <div className="rc-header">
                  <div className="rc-school-name">{currentSchool?.school?.name}</div>
                  <div className="rc-subtitle">{termObj?.academic_years?.name} — {termObj?.name} Academic Report (CBC)</div>
                  {selectedAssessment && <div className="rc-assessment-name">Assessment: {selectedAssessment.name}</div>}
                  <div className="rc-title">Student Report Card</div>
                </div>
                <div className="rc-student">
                  <div className="rc-cell"><span className="rc-key">Name:</span><span className="rc-val">{s.full_name}</span></div>
                  <div className="rc-cell"><span className="rc-key">Adm No:</span><span className="rc-val">{s.admission_number}</span></div>
                  <div className="rc-cell"><span className="rc-key">Class:</span><span className="rc-val">{classes.find(c => c.id === classId)?.name} {s.streams?.name ? `(${s.streams.name})` : ''}</span></div>
                  <div className="rc-cell"><span className="rc-key">Mean Level:</span><span className="rc-val" style={{ color: meanInfo.color, fontWeight: 600 }}>{meanInfo.level} ({meanInfo.mean}%)</span></div>
                </div>
                <table className="rc-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th style={{ textAlign: 'center' }}>Score</th>
                      <th style={{ textAlign: 'center' }}>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classSubjects.map(sub => {
                      const m = studentMarks.find(x => x.subject_id === sub.id)
                      const lvl = m ? levelFor(m.score) : null
                      return (
                        <tr key={sub.id}>
                          <td>{sub.name}</td>
                          <td style={{ textAlign: 'center' }}>{m?.score ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>{lvl ? <strong style={{ color: lvl.color }}>{lvl.level}</strong> : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <PerformanceGraph studentData={studentMean} classData={classMeanForAssessment} assessment={selectedAssessment} />
                <div className="rc-comment">
                  <div className="rc-label">Class Teacher's Comment</div>
                  <div className="rc-comment-body">{comments[s.id] || ''}</div>
                </div>
                <div className="rc-signatures">
                  <div className="rc-sig"><div className="rc-sig-label">Class Teacher's Signature</div><div className="rc-sig-line" /></div>
                  <div className="rc-sig"><div className="rc-sig-label">Head Teacher's Signature &amp; Stamp</div><div className="rc-sig-line" /></div>
                </div>
                <div className="no-print" style={{ textAlign: 'right', marginTop: 12 }}>
                  <button onClick={() => handlePrintOne(s.id)} disabled={!readiness.ready} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: readiness.ready ? 1 : 0.5, borderRadius: 999 }}>
                    <User size={14} /> Print this student
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="no-print">
        <PageFooter />
      </div>
    </div>
  )
}