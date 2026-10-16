import { useState } from 'react'
import { useClasses } from '../hooks/useClasses'

export default function Classes() {
  const { classes, loading, error, addClass, updateClass, deleteClass } = useClasses()
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [editing, setEditing] = useState(null)   // { id, name, level }

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setFormError('')
    try {
      await addClass({ name: name.trim(), level: level ? Number(level) : null })
      setName('')
      setLevel('')
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
      await updateClass(editing.id, {
        name: editing.name.trim(),
        level: editing.level ? Number(editing.level) : null,
      })
      setEditing(null)
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this class? Students assigned to it will be unassigned.')) return
    setBusy(true)
    setFormError('')
    try {
      await deleteClass(id)
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  return (
    <div>
      <h1>Classes</h1>

      <form onSubmit={handleAdd} style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Form 1, Grade 7"
            required
            style={{ padding: 8, width: 220 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Level (optional)</label>
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="1"
            style={{ padding: 8, width: 100 }}
          />
        </div>
        <button type="submit" disabled={busy} style={{ padding: '8px 14px' }}>
          Add class
        </button>
      </form>

      {formError && <p style={{ color: 'red' }}>{formError}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading && <p>Loading…</p>}

      {!loading && classes.length === 0 && (
        <p style={{ opacity: 0.6 }}>No classes yet. Add your first one above.</p>
      )}

      {!loading && classes.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Level</th>
              <th style={{ padding: 8, width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                {editing?.id === c.id ? (
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
                        type="number"
                        value={editing.level ?? ''}
                        onChange={(e) => setEditing({ ...editing, level: e.target.value })}
                        style={{ padding: 6, width: 80 }}
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      <button onClick={handleSaveEdit} disabled={busy} style={{ marginRight: 6 }}>Save</button>
                      <button onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: 8 }}>{c.name}</td>
                    <td style={{ padding: 8 }}>{c.level ?? '—'}</td>
                    <td style={{ padding: 8 }}>
                      <button
                        onClick={() => setEditing({ id: c.id, name: c.name, level: c.level })}
                        disabled={busy}
                        style={{ marginRight: 6 }}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(c.id)} disabled={busy}>Delete</button>
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
