import { useState } from 'react'
import { Plus, Pencil, Trash2, BookOpen, Check, X } from 'lucide-react'
import { useSubjects } from '../hooks/useSubjects'
import { useSchool } from '../contexts/SchoolContext'
import { ALL_SUBJECTS } from '../lib/kenyaConstants'
import PageFooter from '../components/PageFooter'
import ConfirmModal from '../components/ConfirmModal'

export default function Subjects() {
  const { subjects, loading, error, addSubject, updateSubject, deleteSubject } = useSubjects()
  const { currentRole } = useSchool()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [editing, setEditing] = useState(null)
  
  // State mpya kwa ConfirmModal
  const [confirmDelete, setConfirmDelete] = useState(null)

  const isAdmin = currentRole === 'admin'

  function handleNameChange(value) {
    setName(value)
    const short = value
      .split(' ')
      .filter((w) => w && !['and', 'of', 'in'].includes(w.toLowerCase()))
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4)
    setCode(short)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim() || !isAdmin) return
    setBusy(true); setFormError('')
    try {
      await addSubject({ name: name.trim(), code: code.trim() })
      setName(''); setCode('')
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  async function handleSaveEdit() {
    if (!editing?.name.trim() || !isAdmin) return
    setBusy(true); setFormError('')
    try {
      await updateSubject(editing.id, {
        name: editing.name.trim(),
        code: editing.code?.trim() || null,
      })
      setEditing(null)
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  // Badilishwa kutumia confirmDelete
  async function handleDelete() {
    if (!isAdmin || !confirmDelete) return
    setBusy(true); setFormError('')
    try { 
      await deleteSubject(confirmDelete.id) 
      setConfirmDelete(null)
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  return (
    <div className="anim-in" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Subjects</h1>
        <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
          Manage subjects offered at your school.
        </p>
      </div>

      {isAdmin && (
        <form onSubmit={handleAdd} className="ui-card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label>Subject name</label>
            <select
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              style={{ width: '100%', borderRadius: 999 }}
            >
              <option value="">— pick a subject —</option>
              {ALL_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 120 }}>
            <label>Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAT" style={{ width: '100%', borderRadius: 999 }} />
          </div>
          <button type="submit" disabled={busy} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999 }}>
            <Plus size={16} /> Add subject
          </button>
        </form>
      )}

      {formError && <p className="error-text">{formError}</p>}
      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && subjects.length === 0 && (
        <div className="ui-card" style={{ textAlign: 'center', padding: 40 }}>
          <BookOpen size={32} className="muted" style={{ marginBottom: 8 }} />
          <p className="muted" style={{ margin: 0 }}>No subjects yet. {isAdmin ? 'Add your first one above.' : ''}</p>
        </div>
      )}

      {!loading && subjects.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="ui-card table-desktop" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  {isAdmin && <th style={{ width: 120 }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    {editing?.id === s.id ? (
                      <>
                        <td>
                          <select value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={{ width: '100%', borderRadius: 999 }}>
                            {ALL_SUBJECTS.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                          </select>
                        </td>
                        <td>
                          <input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} style={{ width: 100, borderRadius: 999 }} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={handleSaveEdit} disabled={busy} className="primary" style={{ padding: '6px 10px' }}><Check size={14} /></button>
                            <button onClick={() => setEditing(null)} disabled={busy} style={{ padding: '6px 10px' }}><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td><span className="badge badge-muted">{s.code ?? '—'}</span></td>
                        {isAdmin && (
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => setEditing({ id: s.id, name: s.name, code: s.code })} disabled={busy} style={{ padding: '6px 8px' }}><Pencil size={14} /></button>
                              <button className="danger" onClick={() => setConfirmDelete(s)} disabled={busy} style={{ padding: '6px 8px' }}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="cards-mobile">
            {subjects.map((s) => (
              <div key={s.id} className="ui-card" style={{ marginBottom: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editing?.id === s.id ? (
                      <>
                        <select value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={{ width: '100%', borderRadius: 999, marginBottom: 8 }}>
                          {ALL_SUBJECTS.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                        <input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} style={{ width: '100%', borderRadius: 999 }} placeholder="Code" />
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Code: {s.code ?? '—'}</div>
                      </>
                    )}
                  </div>
                  {isAdmin && editing?.id !== s.id && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setEditing({ id: s.id, name: s.name, code: s.code })} disabled={busy} style={{ padding: '6px 8px' }}><Pencil size={14} /></button>
                      <button className="danger" onClick={() => setConfirmDelete(s)} disabled={busy} style={{ padding: '6px 8px' }}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                {editing?.id === s.id && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button onClick={handleSaveEdit} disabled={busy} className="primary" style={{ flex: 1 }}>Save</button>
                    <button onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete subject?"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? Marks referencing it will be deleted.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <PageFooter />
    </div>
  )
}