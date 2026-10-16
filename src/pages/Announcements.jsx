import { useState } from 'react'
import { useAnnouncements } from '../hooks/useAnnouncements'

const emptyForm = { title: '', body: '', audience: 'all' }

function formatDate(iso) {
  return new Date(iso).toLocaleString()
}

export default function Announcements() {
  const {
    announcements, loading, error,
    addAnnouncement, updateAnnouncement, deleteAnnouncement,
  } = useAnnouncements()

  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  function openNew() {
    setForm({ ...emptyForm })
    setEditingId(null)
    setFormError('')
  }

  function openEdit(a) {
    setForm({ title: a.title, body: a.body, audience: a.audience })
    setEditingId(a.id)
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
    try {
      if (editingId) await updateAnnouncement(editingId, form)
      else await addAnnouncement(form)
      closeForm()
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    setBusy(true)
    try {
      await deleteAnnouncement(id)
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Announcements</h1>
        <button onClick={openNew} style={{ padding: '8px 14px' }}>+ New announcement</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && announcements.length === 0 && (
        <p style={{ opacity: 0.6 }}>No announcements yet.</p>
      )}

      {!loading && announcements.map((a) => (
        <div key={a.id} style={{
          border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0 }}>{a.title}</h3>
            <span style={{ fontSize: 12, opacity: 0.6 }}>{formatDate(a.created_at)}</span>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{a.body}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12, padding: '2px 8px', background: '#eee', borderRadius: 12 }}>
              {a.audience}
            </span>
            <button onClick={() => openEdit(a)} disabled={busy}>Edit</button>
            <button onClick={() => handleDelete(a.id)} disabled={busy}>Delete</button>
          </div>
        </div>
      ))}

      {form && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <form onSubmit={handleSubmit} style={{
            background: '#fff', color: '#111', padding: 24, borderRadius: 8,
            width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit announcement' : 'New announcement'}</h2>

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
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Body *</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
                rows={6}
                style={{ width: '100%', padding: 8, fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Audience</label>
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                style={{ width: '100%', padding: 8 }}
              >
                <option value="all">Everyone</option>
                <option value="teachers">Teachers</option>
                <option value="students">Students</option>
                <option value="staff">Staff</option>
              </select>
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
