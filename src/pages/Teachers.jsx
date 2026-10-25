import { useEffect, useState, useMemo } from 'react'
import { UserPlus, X, Trash2, Plus, Check, Pencil, UserCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'
import { useClasses } from '../hooks/useClasses'
import { useSubjects } from '../hooks/useSubjects'
import PageFooter from '../components/PageFooter'
import ConfirmModal from '../components/ConfirmModal'

export default function Teachers() {
  const { currentSchool, currentRole } = useSchool()
  const { classes } = useClasses()
  const { subjects } = useSubjects()
  
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [streams, setStreams] = useState([])
  
  // State ya ConfirmModal
  const [confirmDelete, setConfirmDelete] = useState(null) 

  const schoolId = currentSchool?.school.id

  const uniqueSubjects = useMemo(() => {
    const seen = new Set()
    return subjects.filter(s => {
      if (seen.has(s.name)) return false
      seen.add(s.name)
      return true
    })
  }, [subjects])

  async function load() {
    if (!schoolId) return
    setLoading(true); setError('')
    
    const { data: members, error: err } = await supabase
      .from('school_members')
      .select('id, role, user_id, class_id, stream_id')
      .eq('school_id', schoolId)
      .in('role', ['teacher', 'classteacher'])

    if (err) { setError(err.message); setLoading(false); return }

    const userIds = (members ?? []).map(m => m.user_id)

    let profiles = []
    if (userIds.length > 0) {
      const { data: p } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
      profiles = p ?? []
    }

    let assignments = []
    if (userIds.length > 0) {
      const { data: a } = await supabase
        .from('teacher_subject_assignments')
        .select('*, classes(name), streams(name), subjects(name)')
        .in('teacher_id', userIds)
      assignments = a ?? []
    }

    const merged = (members ?? []).map(m => {
      const profile = profiles.find(p => p.id === m.user_id)
      return {
        ...m,
        profile: profile || { full_name: 'Unknown' },
        assignments: assignments.filter(a => a.teacher_id === m.user_id)
      }
    })

    setTeachers(merged)
    setLoading(false)
  }

  useEffect(() => {
    load()
    async function loadStreams() {
      const { data } = await supabase.from('streams').select('*')
      setStreams(data ?? [])
    }
    loadStreams()
  }, [schoolId])

  function openCreate() {
    setForm({ email: '', password: '', full_name: '', role: 'teacher', class_id: '', stream_id: '', assignments: [] })
    setEditingId(null); setFormError(''); setSuccessMsg('')
  }

  function openEdit(t) {
    const mappedAssignments = t.assignments.map(a => ({
      class_id: a.class_id,
      stream_id: a.stream_id || '',
      subject_id: a.subject_id,
      confirmed: true,
    }))
    setForm({
      email: '', password: '', full_name: t.profile?.full_name || '',
      role: t.role, class_id: t.class_id || '', stream_id: t.stream_id || '',
      assignments: mappedAssignments,
    })
    setEditingId(t.user_id); setFormError(''); setSuccessMsg('')
  }

  function closeForm() { setForm(null); setEditingId(null); setFormError('') }

  function addAssignment() {
    setForm({ ...form, assignments: [...(form.assignments || []), { class_id: '', stream_id: '', subject_id: '', confirmed: false }] })
  }

  function removeAssignment(index) {
    setForm({ ...form, assignments: form.assignments.filter((_, i) => i !== index) })
  }

  function updateAssignment(index, patch) {
    setForm({ ...form, assignments: form.assignments.map((a, i) => i === index ? { ...a, ...patch } : a) })
  }

  function confirmAssignment(index) {
    const a = form.assignments[index]
    if (!a.class_id || !a.subject_id) { setFormError('Please select both Class and Subject before confirming.'); return }
    updateAssignment(index, { confirmed: true })
    setFormError('')
  }

  function unconfirmAssignment(index) { updateAssignment(index, { confirmed: false }) }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setFormError(''); setSuccessMsg('')
    
    const unconfirmed = (form.assignments || []).filter(a => (a.class_id || a.subject_id) && !a.confirmed)
    if (unconfirmed.length > 0) { setFormError('Please confirm all subject assignments before saving.'); setBusy(false); return }

    try {
      if (editingId) {
        const payload = {
          user_id: editingId, school_id: schoolId, full_name: form.full_name, role: form.role,
          class_id: form.role === 'classteacher' ? (form.class_id || null) : null,
          stream_id: form.role === 'classteacher' ? (form.stream_id || null) : null,
          assignments: (form.assignments || []).filter(a => a.confirmed && a.class_id && a.subject_id).map(a => ({
            class_id: a.class_id, stream_id: a.stream_id || null, subject_id: a.subject_id
          }))
        }
        const { data, error: fnErr } = await supabase.functions.invoke('admin-update-teacher', { body: payload })
        if (fnErr) throw new Error(fnErr.message)
        if (data?.error) throw new Error(data.error)
        setSuccessMsg('Teacher updated successfully.')
      } else {
        const payload = {
          email: form.email, password: form.password, full_name: form.full_name, school_id: schoolId, role: form.role,
          class_id: form.role === 'classteacher' ? (form.class_id || null) : null,
          stream_id: form.role === 'classteacher' ? (form.stream_id || null) : null,
          assignments: (form.assignments || []).filter(a => a.confirmed && a.class_id && a.subject_id).map(a => ({
            class_id: a.class_id, stream_id: a.stream_id || null, subject_id: a.subject_id
          }))
        }
        const { data, error: fnErr } = await supabase.functions.invoke('admin-create-teacher', { body: payload })
        if (fnErr) throw new Error(fnErr.message)
        if (data?.error) throw new Error(data.error)
        setSuccessMsg(`Teacher created. Email: ${form.email} — Password: ${form.password}`)
      }
      closeForm()
      await load()
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  // Hapa tumebadilisha function ya delete kutegemea state ya confirmDelete
  async function handleDelete() {
    if (!confirmDelete) return
    setBusy(true); setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-delete-teacher', {
        body: { user_id: confirmDelete.user_id, school_id: schoolId }
      })
      if (fnErr) throw new Error(fnErr.message)
      if (data?.error) throw new Error(data.error)
      setConfirmDelete(null)
      await load()
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  if (currentRole !== 'admin') {
    return <div className="card"><p className="muted">Only admins can manage teachers.</p></div>
  }

  const formStreams = streams.filter(s => s.class_id === form?.class_id)

  return (
    <div className="anim-in" style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Teachers</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>Create teacher accounts and set their class and subjects.</p>
        </div>
        <button className="primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999 }}>
          <UserPlus size={16} /> Add Teacher
        </button>
      </div>

      {successMsg && <p style={{ color: 'var(--success)', fontWeight: 600 }}>{successMsg}</p>}
      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && teachers.length === 0 && (
        <div className="ui-card" style={{ textAlign: 'center', padding: 40 }}>
          <UserCog size={32} className="muted" style={{ marginBottom: 8 }} />
          <p className="muted" style={{ margin: 0 }}>No teachers yet.</p>
        </div>
      )}

      {!loading && teachers.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="ui-card table-desktop" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Class & Subjects</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.profile?.full_name ?? '—'}</td>
                    <td>
                      <span className={`badge badge-${t.role === 'classteacher' ? 'primary' : 'muted'}`}>
                        {t.role === 'classteacher' ? 'Class Teacher' : 'Teacher'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                        {t.class_id && (
                          <span className="badge badge-muted">
                            Class: {classes.find(c => c.id === t.class_id)?.name} {t.stream_id ? `(${streams.find(s => s.id === t.stream_id)?.name})` : ''}
                          </span>
                        )}
                        {t.assignments.map(a => (
                          <span key={a.id} className="badge badge-muted" style={{ fontSize: 11 }}>
                            {a.subjects?.name} · {a.classes?.name} {a.streams?.name ? `(${a.streams.name})` : ''}
                          </span>
                        ))}
                        {!t.class_id && t.assignments.length === 0 && (
                          <span className="muted">No assignments</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => openEdit(t)} disabled={busy} style={{ padding: '6px 8px' }} title="Edit"><Pencil size={14} /></button>
                        <button className="danger" onClick={() => setConfirmDelete(t)} disabled={busy} style={{ padding: '6px 8px' }} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="cards-mobile">
            {teachers.map((t) => (
              <div key={t.id} className="ui-card" style={{ marginBottom: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div className="dash-avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
                        {(t.profile?.full_name || '?')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{t.profile?.full_name ?? '—'}</div>
                        <span className={`badge badge-${t.role === 'classteacher' ? 'primary' : 'muted'}`} style={{ marginTop: 2 }}>
                          {t.role === 'classteacher' ? 'Class Teacher' : 'Teacher'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, marginTop: 6 }}>
                      {t.class_id && (
                        <span className="muted">
                          <strong>Class:</strong> {classes.find(c => c.id === t.class_id)?.name} {t.stream_id ? `(${streams.find(s => s.id === t.stream_id)?.name})` : ''}
                        </span>
                      )}
                      {t.assignments.map(a => (
                        <span key={a.id} className="muted">
                          {a.subjects?.name} · {a.classes?.name} {a.streams?.name ? `(${a.streams.name})` : ''}
                        </span>
                      ))}
                      {!t.class_id && t.assignments.length === 0 && (
                        <span className="muted">No assignments</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => openEdit(t)} disabled={busy} style={{ padding: '6px 8px' }}><Pencil size={14} /></button>
                    <button className="danger" onClick={() => setConfirmDelete(t)} disabled={busy} style={{ padding: '6px 8px' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {form && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleSubmit} style={{ maxWidth: 580, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{editingId ? 'Edit Teacher' : 'Add Teacher'}</h2>
              <button type="button" onClick={closeForm} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <label>Full Name *</label>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required style={{ width: '100%', borderRadius: 999 }} />
              </div>

              {!editingId && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label>Email *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required style={{ width: '100%', borderRadius: 999 }} />
                  </div>
                  <div>
                    <label>Password *</label>
                    <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} style={{ width: '100%', borderRadius: 999 }} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, class_id: '', stream_id: '' })} style={{ width: '100%', borderRadius: 999 }}>
                  <option value="teacher">Subject Teacher</option>
                  <option value="classteacher">Class Teacher</option>
                </select>
              </div>

              {form.role === 'classteacher' && (
                <div style={{ padding: 14, background: 'var(--primary-soft)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, marginBottom: 10, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UserCog size={14} /> Class Teacher Details
                  </h3>
                  <div style={{ marginBottom: 10 }}>
                    <label>Class *</label>
                    <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, stream_id: '' })} required style={{ width: '100%', borderRadius: 999 }}>
                      <option value="">— pick a class —</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {formStreams.length > 0 && (
                    <div>
                      <label>Stream (optional)</label>
                      <select value={form.stream_id} onChange={(e) => setForm({ ...form, stream_id: e.target.value })} style={{ width: '100%', borderRadius: 999 }}>
                        <option value="">All Streams</option>
                        {formStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>Subjects Taught</h3>
                  <button type="button" onClick={addAssignment} className="primary" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus size={14} /> Add Subject
                  </button>
                </div>
                {(form.assignments || []).length === 0 && (
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>No subjects added yet.</p>
                )}
                {(form.assignments || []).map((a, i) => {
                  const aStreams = streams.filter(s => s.class_id === a.class_id)
                  const isConfirmed = a.confirmed
                  return (
                    <div key={i} style={{ border: `1px solid ${isConfirmed ? 'var(--success)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 12, marginTop: 10, background: isConfirmed ? 'var(--success-soft)' : 'var(--surface)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong style={{ fontSize: 13 }}>Subject #{i + 1}</strong>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!isConfirmed && (
                            <button type="button" onClick={() => confirmAssignment(i)} className="primary" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, borderRadius: 999 }}>
                              <Check size={12} /> Confirm
                            </button>
                          )}
                          {isConfirmed && (
                            <button type="button" onClick={() => unconfirmAssignment(i)} style={{ padding: '4px 8px', fontSize: 12, borderRadius: 999 }}>Edit</button>
                          )}
                          <button type="button" onClick={() => removeAssignment(i)} className="danger" style={{ padding: '4px 8px', fontSize: 12, borderRadius: 999 }}>Remove</button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label>Class</label>
                          <select value={a.class_id} onChange={(e) => updateAssignment(i, { class_id: e.target.value, stream_id: '', subject_id: '', confirmed: false })} required style={{ width: '100%', borderRadius: 999 }} disabled={isConfirmed}>
                            <option value="">— pick —</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label>Stream</label>
                          <select value={a.stream_id || ''} onChange={(e) => updateAssignment(i, { stream_id: e.target.value, confirmed: false })} style={{ width: '100%', borderRadius: 999 }} disabled={!a.class_id || isConfirmed}>
                            <option value="">All</option>
                            {aStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label>Subject</label>
                        <select value={a.subject_id || ''} onChange={(e) => updateAssignment(i, { subject_id: e.target.value, confirmed: false })} required style={{ width: '100%', borderRadius: 999 }} disabled={isConfirmed}>
                          <option value="">— pick —</option>
                          {uniqueSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      {isConfirmed && (
                        <div style={{ marginTop: 8, padding: '4px 10px', background: 'var(--success-soft)', borderRadius: 999, fontSize: 12, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> {classes.find(c => c.id === a.class_id)?.name} · {uniqueSubjects.find(s => s.id === a.subject_id)?.name}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {formError && <p className="error-text">{formError}</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeForm} disabled={busy} style={{ borderRadius: 999 }}>Cancel</button>
              <button type="submit" className="primary" disabled={busy} style={{ borderRadius: 999, minWidth: 140 }}>
                {busy ? 'Saving…' : (editingId ? 'Save Changes' : 'Create Teacher')}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete teacher?"
        message={`Are you sure you want to delete "${confirmDelete?.profile?.full_name}"? This will permanently remove them.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <PageFooter />
    </div>
  )
}