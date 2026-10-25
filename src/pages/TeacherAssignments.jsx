import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'
import { useClasses } from '../hooks/useClasses'
import { useSubjects } from '../hooks/useSubjects'

export default function TeacherAssignments() {
  const { currentSchool } = useSchool()
  const { classes } = useClasses()
  const { subjects } = useSubjects()
  
  const [teachers, setTeachers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [streams, setStreams] = useState([])
  
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  
  const schoolId = currentSchool?.school.id

  async function load() {
    if (!schoolId) return
    
    const { data: members } = await supabase
      .from('school_members')
      .select('user_id, profiles(full_name)')
      .eq('school_id', schoolId)
      .in('role', ['teacher', 'classteacher'])
    setTeachers(members ?? [])

    const { data: str } = await supabase.from('streams').select('*')
    setStreams(str ?? [])

    const { data: asg } = await supabase
      .from('teacher_subject_assignments')
      .select('*, subjects(name), classes(name), streams(name)')
    setAssignments(asg ?? [])
  }

  useEffect(() => { load() }, [schoolId])

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await supabase.from('teacher_subject_assignments').insert({
        school_id: schoolId,
        teacher_id: selectedTeacher,
        class_id: form.class_id,
        stream_id: form.stream_id || null,
        subject_id: form.subject_id
      })
      setForm(null)
      await load()
    } catch (err) { alert(err.message) }
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Remove this assignment?')) return
    await supabase.from('teacher_subject_assignments').delete().eq('id', id)
    await load()
  }

  const filteredStreams = streams.filter(s => s.class_id === form?.class_id)
  const teacherAssignments = assignments.filter(a => a.teacher_id === selectedTeacher)

  return (
    <div>
      <h1>Teacher Assignments</h1>
      <p className="muted">Assign subjects and classes to teachers.</p>

      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <div>
          <label>Select Teacher</label>
          <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} style={{ minWidth: 250 }}>
            <option value="">— pick a teacher —</option>
            {teachers.map(t => (
              <option key={t.user_id} value={t.user_id}>{t.profiles?.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedTeacher && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Assignments</h3>
            <button className="primary" onClick={() => setForm({ class_id: '', stream_id: '', subject_id: '' })}>
              <Plus size={16} /> Add
            </button>
          </div>
          <table>
            <thead><tr><th>Subject</th><th>Class</th><th>Stream</th><th style={{ width: 80 }}>Actions</th></tr></thead>
            <tbody>
              {teacherAssignments.length === 0 ? (
                <tr><td colSpan={4} className="muted" style={{ textAlign: 'center' }}>No assignments yet.</td></tr>
              ) : teacherAssignments.map(a => (
                <tr key={a.id}>
                  <td>{a.subjects?.name}</td>
                  <td>{a.classes?.name}</td>
                  <td>{a.streams?.name ?? 'All'}</td>
                  <td><button className="danger" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleSave}>
            <h2>Add Assignment</h2>
            
            <div style={{ marginBottom: 12 }}>
              <label>Class</label>
              <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, stream_id: '' })} style={{ width: '100%' }}>
                <option value="">— pick —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Stream</label>
              <select value={form.stream_id} onChange={(e) => setForm({ ...form, stream_id: e.target.value })} style={{ width: '100%' }} disabled={!form.class_id}>
                <option value="">All Streams</option>
                {filteredStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Subject</label>
              <select required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} style={{ width: '100%' }}>
                <option value="">— pick —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className="primary" disabled={busy}>Save</button>
              <button type="button" onClick={() => setForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}