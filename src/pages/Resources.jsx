import { useState } from 'react'
import { useResources } from '../hooks/useResources'
import { useSubjects } from '../hooks/useSubjects'

const emptyForm = { title: '', description: '', url: '', subject_id: '' }

export default function Resources() {
  const { resources, loading, error, addResource, updateResource, deleteResource } = useResources()
  const { subjects } = useSubjects()

  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  function openNew() {
    setForm({ ...emptyForm })
    setEditingId(null)
    setFormError('')
  }

  function openEdit(r) {
    setForm({
      title: r.title,
      description: r.description ?? '',
      url: r.url ?? '',
      subject_id: r.subject_id ?? '',
    })
    setEditingId(r.id)
    setFormError('')
  }

  function closeForm() {
    setForm(null)
    setEditingId(null)
    setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setFormError('')
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
      subject_id: form.subject_id || null,
    }
    try {
      if (editingId) await updateResource(editingId, payload)
      else await addResource(payload)
      closeForm()
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this resource?')) return
    setBusy(true)
    try { await deleteResource(id) } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Resources</h1>
        <button onClick={openNew} style={{ padding: '8px 14px' }}>+ Add resource</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading…</p>}
      {!loading && resources.length === 0 && (
        <p style={{ opacity: 0.6 }}>No resources yet.</p>
      )}

      {!loading && resources.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {resources.map((r) => (
            <li key={r.id} style={{
              border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{r.title}</h3>
                  {r.subjects?.name && (
                    <span style={{ fontSize: 12, background: '#eee', padding: '2px 8px', borderRadius: 12 }}>
                      {r.subjects.name}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(r)} disabled={busy}>Edit</button>
                  <button onClick={() => handleDelete(r.id)} disabled={busy}>Delete</button>
                </div>
              </div>
              {r.description && <p style={{ marginTop: 8 }}>{r.description}</p>}
              {r.url && (
                <p style={{ margin: 0 }}>
                  <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {form && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <form onSubmit={handleSubmit} style={{
            background: '#fff', color: '#111', padding: 24, borderRadius: 8,
            width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit resource' : 'Add resource'}</h2>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                style={{ width: '100%', padding: 8 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Subject</label>
              <select
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                style={{ width: '100%', padding: 8 }}
              >
                <option value="">— none —</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Link (URL)</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                style={{ width: '100%', padding: 8 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                style={{ width: '100%', padding: 8, fontFamily: 'inherit' }}
              />
            </div>

            {formError && <p style={{ color: 'red' }}>{formError}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={busy} style={{ padding: '10px 16px' }}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={closeForm} disabled={busy} style={{ padding: '10px 16px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
