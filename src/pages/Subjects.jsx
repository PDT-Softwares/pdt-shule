import { useState } from 'react'
import { useSubjects } from '../hooks/useSubjects'

export default function Subjects() {
  const { subjects, loading, error, addSubject, updateSubject, deleteSubject } = useSubjects()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [editing, setEditing] = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setFormError('')
    try {
      await addSubject({ name: name.trim(), code: code.trim() })
      setName('')
      setCode('')
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  async function handleSaveEdit() {
    if (!editing?.name.trim()) return
    setBusy(true)
    setFormError('')
    try {
      await updateSubject(editing.id, {
        name: editing.name.trim(),
        code: editing.code?.trim() || null,
      })
      setEditing(null)
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this subject? Marks referencing it will be deleted.')) return
    setBusy(true)
    setFormError('')
    try {
      await deleteSubject(id)
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  return (
    <div>
      <h1>Subjects</h1>

      <form onSubmit={handleAdd} style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mathematics"
            required
            style={{ padding: 8, width: 240 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Code (optional)</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MAT"
            style={{ padding: 8, width: 120 }}
          />
        </div>
        <button type="submit" disabled={busy} style={{ padding: '8px 14px' }}>
          Add subject
        </button>
      </form>

      {formError && <p style={{ color: 'red' }}>{formError}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading && <p>Loading…</p>}

      {!loading && subjects.length === 0 && (
        <p style={{ opacity: 0.6 }}>No subjects yet. Add your first one above.</p>
      )}

      {!loading && subjects.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Code</th>
              <th style={{ padding: 8, width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                {editing?.id === s.id ? (
                  <>
                    <td style={{ padding: 8 }}>
                      <input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        style={{ padding: 6, width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      <input
                        value={editing.code ?? ''}
                        onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                        style={{ padding: 6, width: 100 }}
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      <button onClick={handleSaveEdit} disabled={busy} style={{ marginRight: 6 }}>Save</button>
                      <button onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: 8 }}>{s.name}</td>
                    <td style={{ padding: 8 }}>{s.code ?? '—'}</td>
                    <td style={{ padding: 8 }}>
                      <button
                        onClick={() => setEditing({ id: s.id, name: s.name, code: s.code })}
                        disabled={busy}
                        style={{ marginRight: 6 }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(s.id)} disabled={busy}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
