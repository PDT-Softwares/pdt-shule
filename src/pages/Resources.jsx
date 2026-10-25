import { useState } from 'react'
import { Plus, Pencil, Trash2, X, FolderOpen, BookOpen, ExternalLink } from 'lucide-react'
import { useResources } from '../hooks/useResources'
import { useSubjects } from '../hooks/useSubjects'
import PageFooter from '../components/PageFooter'
import ConfirmModal from '../components/ConfirmModal'

const emptyForm = { title: '', description: '', url: '', subject_id: '' }

export default function Resources() {
  const { resources, loading, error, addResource, updateResource, deleteResource } = useResources()
  const { subjects } = useSubjects()

  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

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

  async function handleDelete() {
    if (!confirmDelete) return
    setBusy(true)
    try {
      await deleteResource(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  return (
    <div className="anim-in" style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Resources</h1>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Share learning materials and links with your school.
          </p>
        </div>
        <button className="primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999 }}>
          <Plus size={16} /> Add resource
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && resources.length === 0 && (
        <div className="ui-card" style={{ textAlign: 'center', padding: 40 }}>
          <FolderOpen size={32} className="muted" style={{ marginBottom: 8 }} />
          <p className="muted" style={{ margin: 0 }}>No resources yet.</p>
        </div>
      )}

      {!loading && resources.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {resources.map((r) => (
            <div key={r.id} className="ui-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{r.title}</h3>
                  {r.subjects?.name && (
                    <span className="badge badge-primary" style={{ marginTop: 6 }}>
                      <BookOpen size={11} /> {r.subjects.name}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => openEdit(r)} disabled={busy} style={{ padding: '6px 8px' }} title="Edit"><Pencil size={14} /></button>
                  <button className="danger" onClick={() => setConfirmDelete({ id: r.id, title: r.title })} disabled={busy} style={{ padding: '6px 8px' }} title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>

              {r.description && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.description}</p>
              )}

              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--primary-hover)', textDecoration: 'none', marginTop: 'auto' }}
                >
                  <ExternalLink size={14} /> Open link
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={handleSubmit}
            style={{ maxWidth: 520, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{editingId ? 'Edit resource' : 'Add resource'}</h2>
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
                  placeholder="e.g. Algebra revision notes"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Subject</label>
                <select
                  value={form.subject_id}
                  onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                  style={{ width: '100%', borderRadius: 999 }}
                >
                  <option value="">— none —</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Link (URL)</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://…"
                  style={{ width: '100%', borderRadius: 999 }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  style={{ width: '100%', fontFamily: 'inherit', borderRadius: 'var(--radius)' }}
                  placeholder="What is this resource about?"
                />
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
        title="Delete resource?"
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