import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Megaphone, Calendar } from 'lucide-react'
import { useAnnouncements } from '../hooks/useAnnouncements'
import PageFooter from '../components/PageFooter'
import ConfirmModal from '../components/ConfirmModal'

const emptyForm = { title: '', body: '', audience: 'all' }

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-KE', { 
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  })
}

function audienceBadge(audience) {
  return {
    all: { label: 'Everyone', cls: 'badge-primary' },
    teachers: { label: 'Teachers', cls: 'badge-success' },
    students: { label: 'Students', cls: 'badge-warning' },
    staff: { label: 'Staff', cls: 'badge-muted' },
  }[audience] || { label: audience, cls: 'badge-muted' }
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
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, title }

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

  async function handleDelete() {
    if (!confirmDelete) return
    setBusy(true)
    try {
      await deleteAnnouncement(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="anim-in" style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Announcements</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Post news and updates for your school.
          </p>
        </div>
        <button className="primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999 }}>
          <Plus size={16} /> New announcement
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && announcements.length === 0 && (
        <div className="ui-card" style={{ textAlign: 'center', padding: 40 }}>
          <Megaphone size={32} className="muted" style={{ marginBottom: 8 }} />
          <p className="muted" style={{ margin: 0 }}>No announcements yet.</p>
        </div>
      )}

      {!loading && announcements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements.map((a) => {
            const aud = audienceBadge(a.audience)
            return (
              <div key={a.id} className="ui-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{a.title}</h3>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} /> {formatDate(a.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => openEdit(a)} disabled={busy} style={{ padding: '6px 8px' }} title="Edit"><Pencil size={14} /></button>
                    <button className="danger" onClick={() => setConfirmDelete({ id: a.id, title: a.title })} disabled={busy} style={{ padding: '6px 8px' }} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>

                <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 12px', fontSize: 14, lineHeight: 1.6 }}>{a.body}</p>

                <span className={`badge ${aud.cls}`}>{aud.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={handleSubmit}
            style={{ maxWidth: 560, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{editingId ? 'Edit announcement' : 'New announcement'}</h2>
              <button type="button" onClick={closeForm} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <label>Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  style={{ width: '100%', borderRadius: 999 }}
                  placeholder="e.g. Mid-term break"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Body *</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                  rows={6}
                  style={{ width: '100%', fontFamily: 'inherit', borderRadius: 'var(--radius)' }}
                  placeholder="Write the announcement here…"
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label>Audience</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  style={{ width: '100%', borderRadius: 999 }}
                >
                  <option value="all">Everyone</option>
                  <option value="teachers">Teachers</option>
                  <option value="students">Students</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              {formError && <p className="error-text">{formError}</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeForm} disabled={busy} style={{ borderRadius: 999 }}>Cancel</button>
              <button type="submit" disabled={busy} className="primary" style={{ borderRadius: 999, minWidth: 120 }}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete announcement?"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <PageFooter />
    </div>
  )
}