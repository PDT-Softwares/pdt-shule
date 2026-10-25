import React, { useEffect, useState } from 'react'
import { ChevronRight, Plus, Pencil, Trash2, X, GraduationCap } from 'lucide-react'
import { useClasses } from '../hooks/useClasses'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'
import { ALL_CLASSES } from '../lib/kenyaConstants'
import EditableSelect from '../components/EditableSelect'
import PageFooter from '../components/PageFooter'
import ConfirmModal from '../components/ConfirmModal'

const PRESET_STREAMS = [
  'East', 'West', 'North', 'South',
  'Blue', 'Red', 'Green', 'Yellow',
  'A', 'B', 'C', 'D',
  'Alpha', 'Beta', 'Gamma', 'Delta',
]

export default function Classes() {
  const { currentSchool, currentRole } = useSchool()
  const { classes, loading, error, addClass, updateClass, deleteClass } = useClasses()
  
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [editing, setEditing] = useState(null)

  const [streams, setStreams] = useState([])
  const [expandedClass, setExpandedClass] = useState(null)
  const [streamForm, setStreamForm] = useState(null)
  const [editingStreamId, setEditingStreamId] = useState(null)

  // State mpya kwa ajili ya ConfirmModal
  const [confirmDeleteClass, setConfirmDeleteClass] = useState(null)
  const [confirmDeleteStream, setConfirmDeleteStream] = useState(null)

  const schoolId = currentSchool?.school.id
  const isAdmin = currentRole === 'admin'

  async function loadStreams() {
    if (!schoolId) return
    const { data } = await supabase
      .from('streams')
      .select('*')
      .order('name', { ascending: true })
    setStreams(data ?? [])
  }

  useEffect(() => {
    loadStreams()
  }, [schoolId])

  async function handleAddClass(e) {
    e.preventDefault()
    if (!name.trim() || !isAdmin) return
    setBusy(true); setFormError('')
    try {
      const level = ALL_CLASSES.indexOf(name.trim()) + 1
      await addClass({ name: name.trim(), level })
      setName('')
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  async function handleSaveEditClass() {
    if (!editing?.name.trim() || !isAdmin) return
    setBusy(true); setFormError('')
    try {
      const level = ALL_CLASSES.indexOf(editing.name.trim()) + 1
      await updateClass(editing.id, { name: editing.name.trim(), level })
      setEditing(null)
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  // Badilishwa kutumia confirmDeleteClass
  async function handleDeleteClass() {
    if (!isAdmin || !confirmDeleteClass) return
    setBusy(true); setFormError('')
    try { 
      await deleteClass(confirmDeleteClass.id)
      if (expandedClass === confirmDeleteClass.id) setExpandedClass(null)
      setConfirmDeleteClass(null)
      await loadStreams()
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  function openNewStream(classId) {
    if (!isAdmin) return
    setStreamForm({ class_id: classId, name: '' })
    setEditingStreamId(null)
    setExpandedClass(classId)
  }

  async function handleSaveStream(e) {
    e.preventDefault()
    if (!streamForm.name?.trim() || !isAdmin) return
    setBusy(true)
    try {
      if (editingStreamId) {
        await supabase.from('streams').update({ name: streamForm.name.trim() }).eq('id', editingStreamId)
      } else {
        await supabase.from('streams').insert({
          school_id: schoolId,
          class_id: streamForm.class_id,
          name: streamForm.name.trim(),
        })
      }
      setStreamForm(null); setEditingStreamId(null)
      await loadStreams()
    } catch (err) { alert(err.message) }
    setBusy(false)
  }

  // Badilishwa kutumia confirmDeleteStream
  async function handleDeleteStream() {
    if (!isAdmin || !confirmDeleteStream) return
    const { error: err } = await supabase.from('streams').delete().eq('id', confirmDeleteStream.id)
    if (err) alert(err.message)
    else {
      setConfirmDeleteStream(null)
      await loadStreams()
    }
  }

  return (
    <div className="anim-in" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Classes & Streams</h1>
        <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
          Manage school classes and their streams.
        </p>
      </div>

      {isAdmin && (
        <form onSubmit={handleAddClass} className="ui-card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Add new class</label>
            <select value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', borderRadius: 999 }}>
              <option value="">— pick a class —</option>
              {ALL_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
            <Plus size={16} /> Add class
          </button>
        </form>
      )}

      {formError && <p className="error-text">{formError}</p>}
      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && classes.length === 0 && (
        <div className="ui-card" style={{ textAlign: 'center', padding: 40 }}>
          <GraduationCap size={32} className="muted" style={{ marginBottom: 8 }} />
          <p className="muted" style={{ margin: 0 }}>No classes yet. Add your first one above.</p>
        </div>
      )}

      {!loading && classes.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="ui-card table-desktop" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 160 }}>Class</th>
                  <th>Level</th>
                  <th>Streams</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => {
                  const isExpanded = expandedClass === c.id
                  const classStreams = streams.filter(s => s.class_id === c.id)
                  
                  return (
                    <React.Fragment key={c.id}>
                      <tr style={{ background: isExpanded ? 'var(--surface-2)' : 'transparent' }}>
                        {editing?.id === c.id ? (
                          <>
                            <td>
                              <select value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={{ width: '100%', borderRadius: 999 }}>
                                {ALL_CLASSES.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
                              </select>
                            </td>
                            <td>{c.level ?? '—'}</td>
                            <td></td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={handleSaveEditClass} disabled={busy} className="primary" style={{ padding: '6px 10px' }}>Save</button>
                                <button onClick={() => setEditing(null)} disabled={busy} style={{ padding: '6px 10px' }}>Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td><strong>{c.name}</strong></td>
                            <td>{c.level ?? '—'}</td>
                            <td>
                              <button
                                onClick={() => setExpandedClass(isExpanded ? null : c.id)}
                                className={`badge badge-${isExpanded ? 'primary' : 'muted'}`}
                                style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer', gap: 6 }}
                              >
                                <ChevronRight size={14} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                {classStreams.length} stream{classStreams.length === 1 ? '' : 's'}
                              </button>
                            </td>
                            <td>
                              {isAdmin && (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={() => setEditing({ id: c.id, name: c.name })} disabled={busy} style={{ padding: '6px 8px' }} title="Edit Class"><Pencil size={14} /></button>
                                  <button className="danger" onClick={() => setConfirmDeleteClass({ id: c.id, name: c.name })} disabled={busy} style={{ padding: '6px 8px' }} title="Delete Class"><Trash2 size={14} /></button>
                                </div>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} style={{ padding: '0 20px 20px 20px', background: 'var(--surface-2)' }}>
                            <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h4 style={{ margin: 0 }}>Streams for {c.name}</h4>
                                {isAdmin && (
                                  <button onClick={() => openNewStream(c.id)} className="primary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, borderRadius: 999 }}>
                                    <Plus size={14} /> Add Stream
                                  </button>
                                )}
                              </div>
                              
                              {classStreams.length === 0 ? (
                                <p className="muted" style={{ margin: 0, fontSize: 13 }}>No streams yet. {isAdmin ? 'Click "Add Stream" to group students (e.g., A, B, East, West).' : ''}</p>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {classStreams.map(s => (
                                    <div key={s.id} className="badge badge-muted" style={{ padding: '8px 14px', fontSize: 13, gap: 8 }}>
                                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                                      {isAdmin && (
                                        <>
                                          <button onClick={() => { setStreamForm({ class_id: c.id, name: s.name }); setEditingStreamId(s.id) }} style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }} title="Edit Stream"><Pencil size={12} /></button>
                                          <button onClick={() => setConfirmDeleteStream(s)} style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--danger)', display: 'flex' }} title="Delete Stream"><Trash2 size={12} /></button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="cards-mobile">
            {classes.map((c) => {
              const isExpanded = expandedClass === c.id
              const classStreams = streams.filter(s => s.class_id === c.id)
              return (
                <div key={c.id} className="ui-card" style={{ marginBottom: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editing?.id === c.id ? (
                        <select value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={{ width: '100%', borderRadius: 999 }}>
                          {ALL_CLASSES.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
                        </select>
                      ) : (
                        <>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>Level {c.level ?? '—'} · {classStreams.length} stream{classStreams.length === 1 ? '' : 's'}</div>
                        </>
                      )}
                    </div>
                    {isAdmin && editing?.id !== c.id && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setEditing({ id: c.id, name: c.name })} disabled={busy} style={{ padding: '6px 8px' }}><Pencil size={14} /></button>
                        <button className="danger" onClick={() => setConfirmDeleteClass({ id: c.id, name: c.name })} disabled={busy} style={{ padding: '6px 8px' }}><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>

                  {editing?.id === c.id && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button onClick={handleSaveEditClass} disabled={busy} className="primary" style={{ flex: 1 }}>Save</button>
                      <button onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
                    </div>
                  )}

                  {editing?.id !== c.id && (
                    <>
                      <button
                        onClick={() => setExpandedClass(isExpanded ? null : c.id)}
                        className={`badge badge-${isExpanded ? 'primary' : 'muted'}`}
                        style={{ marginTop: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer', gap: 6 }}
                      >
                        <ChevronRight size={14} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                        {isExpanded ? 'Hide streams' : 'Show streams'}
                      </button>

                      {isExpanded && (
                        <div style={{ marginTop: 10, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                          {classStreams.length === 0 ? (
                            <p className="muted" style={{ margin: 0, fontSize: 12 }}>No streams yet.</p>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                              {classStreams.map(s => (
                                <div key={s.id} className="badge badge-muted" style={{ padding: '4px 10px', gap: 6 }}>
                                  <span>{s.name}</span>
                                  {isAdmin && (
                                    <>
                                      <button onClick={() => { setStreamForm({ class_id: c.id, name: s.name }); setEditingStreamId(s.id) }} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><Pencil size={11} /></button>
                                      <button onClick={() => setConfirmDeleteStream(s)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}><Trash2 size={11} /></button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {isAdmin && (
                            <button onClick={() => openNewStream(c.id)} className="primary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, borderRadius: 999 }}>
                              <Plus size={12} /> Add Stream
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {streamForm && isAdmin && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleSaveStream} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>{editingStreamId ? 'Edit Stream' : 'Add Stream'}</h2>
              <button type="button" onClick={() => { setStreamForm(null); setEditingStreamId(null) }} style={{ padding: 6, background: 'transparent', border: 'none' }}><X size={18} /></button>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label>Stream name</label>
              <EditableSelect
                value={streamForm.name}
                onChange={(v) => setStreamForm({ ...streamForm, name: v })}
                options={PRESET_STREAMS}
                placeholder="e.g. A, East, Blue…"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className="primary" disabled={busy} style={{ flex: 1 }}>Save</button>
              <button type="button" onClick={() => { setStreamForm(null); setEditingStreamId(null) }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        open={!!confirmDeleteClass}
        title="Delete class?"
        message={`Are you sure you want to delete "${confirmDeleteClass?.name}"? Students and streams assigned to it will be deleted/unassigned.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDeleteClass}
        onCancel={() => setConfirmDeleteClass(null)}
      />

      <ConfirmModal
        open={!!confirmDeleteStream}
        title="Delete stream?"
        message={`Are you sure you want to delete "${confirmDeleteStream?.name}"? Students assigned to it will be unassigned.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDeleteStream}
        onCancel={() => setConfirmDeleteStream(null)}
      />

      <PageFooter />
    </div>
  )
}