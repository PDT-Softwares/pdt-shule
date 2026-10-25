import { useEffect, useState, useMemo } from 'react'
import { Sparkles, X, Loader2, Settings as SettingsIcon, Printer, User, BookOpen } from 'lucide-react'
import { useTimetable } from '../hooks/useTimetable'
import { useClasses } from '../hooks/useClasses'
import { useSubjects } from '../hooks/useSubjects'
import { useTerms } from '../hooks/useTerms'
import { useSchool } from '../contexts/SchoolContext'
import { supabase } from '../lib/supabase'
import { callGemini } from '../lib/gemini'
import PageFooter from '../components/PageFooter'
import ConfirmModal from '../components/ConfirmModal'

const WEEK_DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
]

const SCHOOL_LEVELS = [
  { value: 'primary', label: 'Primary' },
  { value: 'junior_secondary', label: 'Junior Secondary' },
  { value: 'senior_secondary', label: 'Senior Secondary' },
]

function formatTime(totalMinutes) {
  let h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function parseTime(str) {
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 500
  let h = parseInt(match[1])
  const m = parseInt(match[2])
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function buildColumns(settings) {
  const columns = []
  const totalPeriods = Number(settings.periods_per_day)
  const lessonMinutes = Number(settings.lesson_minutes)
  const teaAfter = Number(settings.health_break_after)
  const lunchAfter = Number(settings.lunch_break_after)
  let currentMinutes = parseTime(settings.start_time || '8:20 AM')

  for (let p = 1; p <= totalPeriods; p++) {
    columns.push({
      type: 'lesson',
      period: p,
      startTime: formatTime(currentMinutes),
      endTime: formatTime(currentMinutes + lessonMinutes),
    })
    currentMinutes += lessonMinutes

    if (p === teaAfter) {
      columns.push({
        type: 'break',
        label: 'TEA BREAK',
        startTime: formatTime(currentMinutes),
        endTime: formatTime(currentMinutes + Number(settings.health_break_minutes)),
      })
      currentMinutes += Number(settings.health_break_minutes)
    }

    if (p === lunchAfter) {
      columns.push({
        type: 'break',
        label: 'LUNCH BREAK',
        startTime: formatTime(currentMinutes),
        endTime: formatTime(currentMinutes + Number(settings.lunch_break_minutes)),
      })
      currentMinutes += Number(settings.lunch_break_minutes)
    }
  }
  return columns
}

export default function Timetable() {
  const { classes, allClasses } = useClasses()
  const { subjects } = useSubjects()
  const { terms } = useTerms()
  const { currentSchool, currentRole, currentSchoolMembership } = useSchool()
  const { loading, error, loadSlots, upsertSlot, deleteSlot, bulkUpsert } = useTimetable()

  const [classId, setClassId] = useState('')
  const [streamId, setStreamId] = useState('')
  const [termId, setTermId] = useState('')
  const [streams, setStreams] = useState([])
  const [slots, setSlots] = useState([])
  const [mySlots, setMySlots] = useState([])
  const [teacherSubjects, setTeacherSubjects] = useState([])
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const [settings, setSettings] = useState(null)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState(null)
  const [settingsError, setSettingsError] = useState('')

  const [showAIModal, setShowAIModal] = useState(false)
  const [aiSubjects, setAiSubjects] = useState([])
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')

  const [confirmClear, setConfirmClear] = useState(null)

  const schoolId = currentSchool?.school.id
  const selectedClass = classes.find(c => c.id === classId)
  const selectedStream = streams.find(s => s.id === streamId)
  const selectedTerm = terms.find(t => t.id === termId)

  const isAdmin = currentRole === 'admin'
  const isClassTeacher = currentRole === 'classteacher'
  const isSubjectTeacher = currentRole === 'teacher'

  useEffect(() => {
    if (isClassTeacher && currentSchoolMembership) {
      setClassId(currentSchoolMembership.class_id || '')
      setStreamId(currentSchoolMembership.stream_id || '')
    }
  }, [isClassTeacher, currentSchoolMembership])

  useEffect(() => {
    async function load() {
      if (!currentSchoolMembership?.user_id || !schoolId) return
      const { data } = await supabase
        .from('teacher_subject_assignments')
        .select('subject_id, subjects(id, name)')
        .eq('teacher_id', currentSchoolMembership.user_id)
        .eq('school_id', schoolId)
      
      const uniqueSubjects = {}
      for (const d of data ?? []) {
        if (d.subjects?.id) uniqueSubjects[d.subjects.id] = d.subjects
      }
      setTeacherSubjects(Object.values(uniqueSubjects))
    }
    load()
  }, [currentSchoolMembership, schoolId])

  useEffect(() => {
    async function load() {
      if (!schoolId) return
      let { data } = await supabase
        .from('school_timetable_settings')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle()

      if (!data) {
        const { data: created } = await supabase
          .from('school_timetable_settings')
          .insert({ school_id: schoolId })
          .select()
          .single()
        data = created
      }
      setSettings(data)
    }
    load()
  }, [schoolId])

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

  const columns = useMemo(() => settings ? buildColumns(settings) : [], [settings])

  useEffect(() => {
    if (!classId || !termId) return
    async function run() {
      try {
        const data = await loadSlots({ classId, streamId, termId })
        setSlots(data)
      } catch (err) {
        console.error('Failed to load slots', err)
      }
    }
    run()
  }, [classId, streamId, termId, loadSlots])

  useEffect(() => {
    if (!currentSchoolMembership?.user_id || !schoolId || !termId) return
    async function run() {
      const { data } = await supabase
        .from('timetable_slots')
        .select('*, subjects(id, name), classes(id, name), streams(id, name)')
        .eq('school_id', schoolId)
        .eq('term_id', termId)
        .eq('teacher_id', currentSchoolMembership.user_id)
      setMySlots(data ?? [])
    }
    run()
  }, [currentSchoolMembership, schoolId, termId])

  function slotAt(day, period) {
    return slots.find((s) => s.day_of_week === day && s.period === period)
  }

  function mySlotAt(day, period) {
    return mySlots.find((s) => s.day_of_week === day && s.period === period)
  }

  function openEditor(day, period, isMySlot = false) {
    if (!isAdmin && !isClassTeacher && !isMySlot) return
    if (!isAdmin && isMySlot && !isClassTeacher) return

    const existing = isMySlot ? mySlotAt(day, period) : slotAt(day, period)
    
    setEditing({ 
      day, 
      period, 
      existing, 
      isMySlot,
      subject_id: existing?.subject_id ?? '',
      class_id: existing?.class_id ?? (isClassTeacher ? currentSchoolMembership?.class_id : ''),
      stream_id: existing?.stream_id ?? (isClassTeacher ? currentSchoolMembership?.stream_id : ''),
    })
    setFormError('')
  }

  function closeEditor() { setEditing(null); setFormError('') }

  async function handleSave() {
    if (!editing.subject_id) { setFormError('Pick a subject.'); return }
    if (!editing.class_id) { setFormError('Pick a class.'); return }
    
    setBusy(true); setFormError('')
    try {
      await upsertSlot({
        class_id: editing.class_id,
        stream_id: editing.stream_id || null,
        subject_id: editing.subject_id,
        term_id: termId,
        day_of_week: Number(editing.day),
        period: Number(editing.period),
        teacher_id: isClassTeacher ? currentSchoolMembership.user_id : null,
      })
      const data = await loadSlots({ classId, streamId, termId })
      setSlots(data)
      if (isClassTeacher) {
        const { data: myData } = await supabase
          .from('timetable_slots')
          .select('*, subjects(id, name), classes(id, name), streams(id, name)')
          .eq('school_id', schoolId)
          .eq('term_id', termId)
          .eq('teacher_id', currentSchoolMembership.user_id)
        setMySlots(myData ?? [])
      }
      closeEditor()
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  async function handleClear() {
    if (!editing.existing) { closeEditor(); return }
    if (!confirmClear) { setConfirmClear({ classId: editing.class_id, streamId: editing.stream_id, day: editing.day, period: editing.period }); return }
  }

  async function confirmHandleClear() {
    if (!confirmClear) return
    setBusy(true)
    try {
      await deleteSlot({ 
        classId: confirmClear.classId, 
        streamId: confirmClear.streamId, 
        termId, 
        day: confirmClear.day, 
        period: confirmClear.period 
      })
      const data = await loadSlots({ classId, streamId, termId })
      setSlots(data)
      if (isClassTeacher) {
        const { data: myData } = await supabase
          .from('timetable_slots')
          .select('*, subjects(id, name), classes(id, name), streams(id, name)')
          .eq('school_id', schoolId)
          .eq('term_id', termId)
          .eq('teacher_id', currentSchoolMembership.user_id)
        setMySlots(myData ?? [])
      }
      setConfirmClear(null)
      closeEditor()
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  function openSettings() {
    if (!isAdmin) return
    setSettingsForm({ ...settings })
    setShowSettings(true)
    setSettingsError('')
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSettingsBusy(true); setSettingsError('')
    try {
      if (Number(settingsForm.health_break_minutes) < 5) throw new Error('Tea break must be at least 5 minutes.')
      if (Number(settingsForm.lunch_break_minutes) < 15) throw new Error('Lunch break must be at least 15 minutes.')
      if (Number(settingsForm.health_break_after) >= Number(settingsForm.periods_per_day)) throw new Error('Tea break cannot be after the last period.')
      if (Number(settingsForm.lunch_break_after) >= Number(settingsForm.periods_per_day)) throw new Error('Lunch break cannot be after the last period.')
      if (Number(settingsForm.lunch_break_after) <= Number(settingsForm.health_break_after)) throw new Error('Lunch break must come after tea break.')

      const { error: err } = await supabase
        .from('school_timetable_settings')
        .update({
          level: settingsForm.level,
          start_time: settingsForm.start_time,
          lesson_minutes: Number(settingsForm.lesson_minutes),
          periods_per_day: Number(settingsForm.periods_per_day),
          health_break_after: Number(settingsForm.health_break_after),
          health_break_minutes: Number(settingsForm.health_break_minutes),
          lunch_break_after: Number(settingsForm.lunch_break_after),
          lunch_break_minutes: Number(settingsForm.lunch_break_minutes),
        })
        .eq('id', settings.id)
      if (err) throw new Error(err.message)
      setSettings({ ...settings, ...settingsForm })
      setShowSettings(false)
    } catch (err) { setSettingsError(err.message) }
    setSettingsBusy(false)
  }

  async function handleGenerateWithAI() {
    if (!isAdmin) return
    if (aiSubjects.length === 0) { setAiError('Pick at least one subject.'); return }
    setAiBusy(true); setAiError('')

    try {
      const subjectList = aiSubjects.map(id => subjects.find(s => s.id === id)).filter(Boolean).map(s => s.name)
      const lessonColumns = columns.filter(c => c.type === 'lesson')
      const totalSlots = WEEK_DAYS.length * lessonColumns.length
      const streamName = selectedStream?.name || null

      const prompt = `You are generating a Kenyan school timetable.

CONTEXT:
- Class: ${selectedClass?.name || 'a class'}
- Stream: ${streamName ? `Stream ${streamName}` : 'No stream'}
- Start: ${settings.start_time}
- Lesson length: ${settings.lesson_minutes} minutes
- Periods: ${settings.periods_per_day}
- Tea Break: after period ${settings.health_break_after} (${settings.health_break_minutes} min)
- Lunch Break: after period ${settings.lunch_break_after} (${settings.lunch_break_minutes} min)

SUBJECTS:
${subjectList.map(s => `- ${s}`).join('\n')}

RULES:
1. Fill exactly ${totalSlots} lesson slots.
2. Distribute subjects evenly.
3. No subject more than 2x per day.
4. No consecutive same subject.

Return ONLY valid JSON array of ${totalSlots} objects:
[{ "day": 1, "period": 1, "subject": "Mathematics" }, ...]

Only JSON.`

      const text = await callGemini(prompt)
      let clean = text.trim()
      if (clean.startsWith('```')) clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
      const startIdx = clean.indexOf('[')
      const endIdx = clean.lastIndexOf(']')
      if (startIdx === -1 || endIdx === -1) throw new Error('AI returned invalid format')
      const parsed = JSON.parse(clean.slice(startIdx, endIdx + 1))
      if (!Array.isArray(parsed)) throw new Error('AI returned non-array')

      const subjectIdByName = {}
      for (const id of aiSubjects) {
        const s = subjects.find(x => x.id === id)
        if (s) subjectIdByName[s.name.toLowerCase()] = id
      }

      const generatedSlots = parsed
        .filter(item => item.subject)
        .map(item => {
          const subjectId = subjectIdByName[String(item.subject).toLowerCase().trim()]
          if (!subjectId) return null
          return {
            class_id: classId,
            stream_id: streamId || null,
            term_id: termId,
            day_of_week: Number(item.day),
            period: Number(item.period),
            subject_id: subjectId,
          }
        })
        .filter(Boolean)

      if (generatedSlots.length === 0) throw new Error('AI did not generate valid slots')

      await bulkUpsert(generatedSlots)
      const data = await loadSlots({ classId, streamId, termId })
      setSlots(data)
      setShowAIModal(false)
      setAiSubjects([])
    } catch (err) {
      setAiError(err.message)
    }
    setAiBusy(false)
  }

  const canShow = isAdmin ? (classId && termId && settings) : (termId && settings)
  const teacherClass = classes.find(c => c.id === currentSchoolMembership?.class_id)
  const teacherStream = streams.find(s => s.id === currentSchoolMembership?.stream_id)

  return (
    <div className="timetable-page anim-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{isAdmin ? 'Timetable' : 'My Timetable'}</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {isAdmin ? 'Manage class timetables.' : 'Your teaching schedule and class timetable.'}
          </p>
        </div>
        {settings && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isAdmin && (
              <>
                <button onClick={openSettings} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
                  <SettingsIcon size={16} /> Settings
                </button>
                <button
                  onClick={() => { setShowAIModal(true); setAiSubjects([]); setAiError('') }}
                  className="primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}
                >
                  <Sparkles size={16} /> AI Generate
                </button>
              </>
            )}
            {canShow && (
              <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
                <Printer size={16} /> Print
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="no-print filter-bar" style={{ marginBottom: 20 }}>
        {isAdmin && (
          <>
            <div>
              <label>Class</label>
              <select value={classId} onChange={(e) => { setClassId(e.target.value); setStreamId('') }} style={{ minWidth: 180, borderRadius: 999 }}>
                <option value="">— pick —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {classId && streams.length > 0 && (
              <div>
                <label>Stream</label>
                <select value={streamId} onChange={(e) => setStreamId(e.target.value)} style={{ minWidth: 140, borderRadius: 999 }}>
                  <option value="">All Streams</option>
                  {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        {isClassTeacher && teacherClass && (
          <div>
            <label>Class</label>
            <input value={`${teacherClass.name}${teacherStream ? ` — ${teacherStream.name}` : ''}`} disabled style={{ minWidth: 180, borderRadius: 999 }} />
          </div>
        )}
        <div>
          <label>Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} style={{ minWidth: 200, borderRadius: 999 }}>
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
      {!canShow && <p className="muted">{isAdmin ? 'Pick a class and term.' : 'Pick a term.'}</p>}
      {canShow && loading && <p className="muted">Loading…</p>}

      {canShow && !loading && (
        <div>
          {/* === MY TIMETABLE (Class Teacher only) === */}
          {isClassTeacher && (
            <div style={{ marginBottom: 32 }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <User size={18} /> My Teaching Schedule
                </h2>
                <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
                  <Printer size={14} /> Print My Schedule
                </button>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Click any slot to assign a subject you teach. Only your subjects will be shown.
              </p>
              <div className="print-timetable">
                <div className="print-only">
                  <h2>{currentSchool?.school?.name}</h2>
                  <div className="print-subtitle">
                    {selectedTerm?.academic_years?.name} — {selectedTerm?.name}
                  </div>
                  <div className="print-title">
                    My Teaching Schedule
                  </div>
                </div>
                <table className="timetable-grid">
                  <thead>
                    <tr>
                      <th className="corner"></th>
                      {columns.map((col, idx) => {
                        if (col.type === 'break') return <th key={`b-${idx}`} className="break-column">{col.label}</th>
                        return (
                          <th key={`l-${idx}`} className="period-column">
                            <div>{col.period}</div>
                            <span className="period-time">{col.startTime}<br />{col.endTime}</span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEK_DAYS.map((d) => (
                      <tr key={d.value}>
                        <td className="day-cell">{d.label}</td>
                        {columns.map((col, idx) => {
                          if (col.type === 'break') return <td key={`b-${idx}`} className="break-cell"><div className="break-text">{col.label}</div></td>
                          const slot = mySlotAt(d.value, col.period)
                          return (
                            <td
                              key={`l-${idx}`}
                              className="lesson-cell"
                              onClick={() => openEditor(d.value, col.period, true)}
                              style={{ cursor: 'pointer' }}
                            >
                              {slot
                                ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div className="lesson-content">{slot.subjects?.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                      {slot.classes?.name}{slot.streams?.name ? ` (${slot.streams.name})` : ''}
                                    </div>
                                  </div>
                                )
                                : <div className="lesson-empty no-print">+</div>
                              }
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* === SUBJECT TEACHER: MY TIMETABLE === */}
          {isSubjectTeacher && (
            <div style={{ marginBottom: 32 }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <User size={18} /> My Teaching Schedule
                </h2>
                <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
                  <Printer size={14} /> Print
                </button>
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                Your weekly teaching schedule. View only.
              </p>
              <div className="print-timetable">
                <div className="print-only">
                  <h2>{currentSchool?.school?.name}</h2>
                  <div className="print-subtitle">
                    {selectedTerm?.academic_years?.name} — {selectedTerm?.name}
                  </div>
                  <div className="print-title">
                    My Teaching Schedule
                  </div>
                </div>
                <table className="timetable-grid">
                  <thead>
                    <tr>
                      <th className="corner"></th>
                      {columns.map((col, idx) => {
                        if (col.type === 'break') return <th key={`b-${idx}`} className="break-column">{col.label}</th>
                        return (
                          <th key={`l-${idx}`} className="period-column">
                            <div>{col.period}</div>
                            <span className="period-time">{col.startTime}<br />{col.endTime}</span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEK_DAYS.map((d) => (
                      <tr key={d.value}>
                        <td className="day-cell">{d.label}</td>
                        {columns.map((col, idx) => {
                          if (col.type === 'break') return <td key={`b-${idx}`} className="break-cell"><div className="break-text">{col.label}</div></td>
                          const slot = mySlotAt(d.value, col.period)
                          return (
                            <td key={`l-${idx}`} className="lesson-cell" style={{ cursor: 'default' }}>
                              {slot
                                ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div className="lesson-content">{slot.subjects?.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                      {slot.classes?.name}{slot.streams?.name ? ` (${slot.streams.name})` : ''}
                                    </div>
                                  </div>
                                )
                                : <div className="lesson-empty">—</div>
                              }
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* === CLASS TIMETABLE (Class Teacher only) === */}
          {isClassTeacher && teacherClass && (
            <div>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <BookOpen size={18} /> Class Timetable — {teacherClass.name}{teacherStream ? ` (${teacherStream.name})` : ''}
                </h2>
                <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
                  <Printer size={14} /> Print Class Timetable
                </button>
              </div>
              <div className="print-timetable">
                <div className="print-only">
                  <h2>{currentSchool?.school?.name}</h2>
                  <div className="print-subtitle">
                    {selectedTerm?.academic_years?.name} — {selectedTerm?.name}
                  </div>
                  <div className="print-title">
                    {teacherClass?.name}{teacherStream ? ` — Stream ${teacherStream.name}` : ''} Timetable
                  </div>
                </div>
                <table className="timetable-grid">
                  <thead>
                    <tr>
                      <th className="corner"></th>
                      {columns.map((col, idx) => {
                        if (col.type === 'break') return <th key={`b-${idx}`} className="break-column">{col.label}</th>
                        return (
                          <th key={`l-${idx}`} className="period-column">
                            <div>{col.period}</div>
                            <span className="period-time">{col.startTime}<br />{col.endTime}</span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {WEEK_DAYS.map((d) => (
                      <tr key={d.value}>
                        <td className="day-cell">{d.label}</td>
                        {columns.map((col, idx) => {
                          if (col.type === 'break') return <td key={`b-${idx}`} className="break-cell"><div className="break-text">{col.label}</div></td>
                          const slot = slotAt(d.value, col.period)
                          return (
                            <td key={`l-${idx}`} className="lesson-cell" style={{ cursor: 'default' }}>
                              {slot
                                ? <div className="lesson-content">{slot.subjects?.name}</div>
                                : <div className="lesson-empty">—</div>
                              }
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* === ADMIN VIEW === */}
          {isAdmin && (
            <div className="print-timetable">
              <div className="print-only">
                <h2>{currentSchool?.school?.name}</h2>
                <div className="print-subtitle">
                  {selectedTerm?.academic_years?.name} — {selectedTerm?.name}
                </div>
                <div className="print-title">
                  {selectedClass?.name}{selectedStream ? ` — Stream ${selectedStream.name}` : ''} Timetable
                </div>
              </div>

              <table className="timetable-grid">
                <thead>
                  <tr>
                    <th className="corner"></th>
                    {columns.map((col, idx) => {
                      if (col.type === 'break') return <th key={`b-${idx}`} className="break-column">{col.label}</th>
                      return (
                        <th key={`l-${idx}`} className="period-column">
                          <div>{col.period}</div>
                          <span className="period-time">{col.startTime}<br />{col.endTime}</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {WEEK_DAYS.map((d) => (
                    <tr key={d.value}>
                      <td className="day-cell">{d.label}</td>
                      {columns.map((col, idx) => {
                        if (col.type === 'break') return <td key={`b-${idx}`} className="break-cell"><div className="break-text">{col.label}</div></td>
                        const slot = slotAt(d.value, col.period)
                        return (
                          <td
                            key={`l-${idx}`}
                            className="lesson-cell"
                            onClick={() => openEditor(d.value, col.period)}
                          >
                            {slot
                              ? <div className="lesson-content">{slot.subjects?.name}</div>
                              : <div className="lesson-empty no-print">+</div>
                            }
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="print-signatures print-only">
                <div><div className="sig-line" /><div>Class Teacher's Signature</div></div>
                <div><div className="sig-line" /><div>Head Teacher's Signature</div></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal (Admin only) */}
      {showSettings && settingsForm && isAdmin && (
        <div className="modal-backdrop no-print">
          <form className="modal" onSubmit={handleSaveSettings} style={{ maxWidth: 500, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Timetable Settings</h2>
              <button type="button" onClick={() => setShowSettings(false)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <label>School Level</label>
                <select value={settingsForm.level} onChange={(e) => setSettingsForm({ ...settingsForm, level: e.target.value })} style={{ width: '100%', borderRadius: 999 }}>
                  {SCHOOL_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label>Start Time</label>
                  <input value={settingsForm.start_time} onChange={(e) => setSettingsForm({ ...settingsForm, start_time: e.target.value })} placeholder="8:20 AM" style={{ width: '100%', borderRadius: 999 }} />
                </div>
                <div>
                  <label>Lesson Length (min)</label>
                  <input type="number" value={settingsForm.lesson_minutes} onChange={(e) => setSettingsForm({ ...settingsForm, lesson_minutes: e.target.value })} style={{ width: '100%', borderRadius: 999 }} min={30} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Periods per day</label>
                <input type="number" value={settingsForm.periods_per_day} onChange={(e) => setSettingsForm({ ...settingsForm, periods_per_day: e.target.value })} style={{ width: '100%', borderRadius: 999 }} min={4} max={12} />
              </div>

              <h3 style={{ fontSize: 14, marginTop: 16, marginBottom: 8 }}>Tea Break</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label>After Period</label>
                  <input type="number" value={settingsForm.health_break_after} onChange={(e) => setSettingsForm({ ...settingsForm, health_break_after: e.target.value })} style={{ width: '100%', borderRadius: 999 }} min={1} />
                </div>
                <div>
                  <label>Duration (min)</label>
                  <input type="number" value={settingsForm.health_break_minutes} onChange={(e) => setSettingsForm({ ...settingsForm, health_break_minutes: e.target.value })} style={{ width: '100%', borderRadius: 999 }} min={5} />
                </div>
              </div>

              <h3 style={{ fontSize: 14, marginTop: 16, marginBottom: 8 }}>Lunch Break</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                <div>
                  <label>After Period</label>
                  <input type="number" value={settingsForm.lunch_break_after} onChange={(e) => setSettingsForm({ ...settingsForm, lunch_break_after: e.target.value })} style={{ width: '100%', borderRadius: 999 }} min={2} />
                </div>
                <div>
                  <label>Duration (min)</label>
                  <input type="number" value={settingsForm.lunch_break_minutes} onChange={(e) => setSettingsForm({ ...settingsForm, lunch_break_minutes: e.target.value })} style={{ width: '100%', borderRadius: 999 }} min={15} />
                </div>
              </div>

              {settingsError && <p className="error-text">{settingsError}</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowSettings(false)} disabled={settingsBusy} style={{ borderRadius: 999 }}>Cancel</button>
              <button type="submit" className="primary" disabled={settingsBusy} style={{ borderRadius: 999, minWidth: 140 }}>{settingsBusy ? 'Saving…' : 'Save Settings'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Slot Modal (Admin OR Class Teacher) */}
      {editing && (
        <div className="modal-backdrop no-print">
          <div className="modal" style={{ maxWidth: 420, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{editing.existing ? 'Edit Slot' : 'Assign Subject'}</h2>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  {WEEK_DAYS.find((d) => d.value === editing.day)?.label} — Period {editing.period}
                </p>
              </div>
              <button onClick={closeEditor} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <label>Class</label>
                <select
                  value={editing.class_id || ''}
                  onChange={(e) => setEditing({ ...editing, class_id: e.target.value, stream_id: '' })}
                  style={{ width: '100%', borderRadius: 999 }}
                >
                  <option value="">— pick —</option>
                  {allClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {editing.class_id && (
                <div style={{ marginBottom: 16 }}>
                  <label>Stream</label>
                  <select
                    value={editing.stream_id || ''}
                    onChange={(e) => setEditing({ ...editing, stream_id: e.target.value || null })}
                    style={{ width: '100%', borderRadius: 999 }}
                  >
                    <option value="">All Streams</option>
                    {streams
                      .filter(s => s.class_id === editing.class_id)
                      .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: 8 }}>
                <label>Subject</label>
                <select
                  value={editing.subject_id || ''}
                  onChange={(e) => setEditing({ ...editing, subject_id: e.target.value })}
                  style={{ width: '100%', borderRadius: 999 }}
                >
                  <option value="">— pick —</option>
                  {(isAdmin ? subjects : teacherSubjects).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {formError && <p className="error-text">{formError}</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} disabled={busy} className="primary" style={{ flex: 1, borderRadius: 999 }}>{busy ? 'Saving…' : 'Save'}</button>
              {editing.existing && <button onClick={handleClear} disabled={busy} className="danger" style={{ borderRadius: 999 }}>Clear</button>}
              <button onClick={closeEditor} disabled={busy} style={{ borderRadius: 999 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal (Admin only) */}
      {showAIModal && isAdmin && (
        <div className="modal-backdrop no-print">
          <div className="modal" style={{ maxWidth: 520, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 20 }}><Sparkles size={20} /> AI Auto-Generate</h2>
              <button onClick={() => setShowAIModal(false)} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                AI will generate for <strong>{selectedClass?.name}{selectedStream ? ` — Stream ${selectedStream.name}` : ''}</strong>.
                <br />
                {settings.start_time} start · {settings.periods_per_day} periods · {settings.lesson_minutes} min lessons.
              </p>

              <label style={{ marginBottom: 8 }}>Select subjects</label>
              <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 16 }}>
                {subjects.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 14, borderRadius: 999 }}>
                    <input type="checkbox"
                      checked={aiSubjects.includes(s.id)}
                      onChange={() => {
                        if (aiSubjects.includes(s.id)) setAiSubjects(aiSubjects.filter(id => id !== s.id))
                        else setAiSubjects([...aiSubjects, s.id])
                      }}
                    />
                    {s.name}
                  </label>
                ))}
              </div>

              {aiError && <p className="error-text">{aiError}</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAIModal(false)} disabled={aiBusy} style={{ borderRadius: 999 }}>Cancel</button>
              <button onClick={handleGenerateWithAI} className="primary" disabled={aiBusy} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
                {aiBusy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {aiBusy ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Slot Modal */}
      <ConfirmModal
        open={!!confirmClear}
        title="Clear this slot?"
        message="Are you sure you want to remove the subject from this slot?"
        confirmLabel="Clear"
        busy={busy}
        onConfirm={confirmHandleClear}
        onCancel={() => setConfirmClear(null)}
      />

      <div className="no-print">
        <PageFooter />
      </div>
    </div>
  )
}