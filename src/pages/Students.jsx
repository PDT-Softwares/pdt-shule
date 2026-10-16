import { useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { useStudents } from '../hooks/useStudents'
import { useClasses } from '../hooks/useClasses'

const emptyForm = {
  admission_number: '',
  full_name: '',
  gender: '',
  date_of_birth: '',
  class_id: '',
  guardian_name: '',
  guardian_phone: '',
  status: 'active',
}

export default function Students() {
  const { students, loading, error, addStudent, updateStudent, deleteStudent } = useStudents()
  const { classes } = useClasses()

  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (filterClass && s.class_id !== filterClass) return false
      if (!q) return true
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q)
      )
    })
  }, [students, search, filterClass])

  function openNew() {
    setForm({ ...emptyForm })
    setEditingId(null)
    setFormError('')
  }

  function openEdit(s) {
    setForm({
      admission_number: s.admission_number,
      full_name: s.full_name,
      gender: s.gender ?? '',
      date_of_birth: s.date_of_birth ?? '',
      class_id: s.class_id ?? '',
      guardian_name: s.guardian_name ?? '',
      guardian_phone: s.guardian_phone ?? '',
      status: s.status ?? 'active',
    })
    setEditingId(s.id)
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
      admission_number: form.admission_number.trim(),
      full_name: form.full_name.trim(),
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      class_id: form.class_id || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
      status: form.status,
    }

    try {
      if (editingId) await updateStudent(editingId, payload)
      else await addStudent(payload)
      closeForm()
    } catch (err) {
      setFormError(err.message)
    }
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this student?')) return
    setBusy(true)
    try { await deleteStudent(id) } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Students</h1>
        <button className="primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add student
        </button>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={16}
            style={{
              position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            placeholder="Search by name or admission number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 36 }}
          />
        </div>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {formError && <p className="error-text">{formError}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            {students.length === 0
              ? 'No students yet. Click "Add student" to get started.'
              : 'No students match your search.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Adm. No</th>
                <th>Name</th>
                <th>Class</th>
                <th>Gender</th>
                <th>Status</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>{s.admission_number}</td>
                  <td>{s.full_name}</td>
                  <td>{s.classes?.name ?? '—'}</td>
                  <td>{s.gender ?? '—'}</td>
                  <td>{s.status}</td>
                  <td>
                    <button
                      onClick={() => openEdit(s)}
                      disabled={busy}
                      title="Edit"
                      style={{ marginRight: 6, padding: '6px 10px' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="danger"
                      onClick={() => handleDelete(s.id)}
                      disabled={busy}
                      title="Delete"
                      style={{ padding: '6px 10px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit student' : 'Add student'}</h2>

            <Field label="Admission number" required>
              <input
                value={form.admission_number}
                onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </Field>

            <Field label="Full name" required>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </Field>

            <Field label="Class">
              <select
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="">— none —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="Gender">
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="">— none —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Date of birth">
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                style={{ width: '100%' }}
              />
            </Field>

            <Field label="Guardian name">
              <input
                value={form.guardian_name}
                onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
                style={{ width: '100%' }}
              />
            </Field>

            <Field label="Guardian phone">
              <input
                value={form.guardian_phone}
                onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })}
                style={{ width: '100%' }}
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="transferred">Transferred</option>
                <option value="graduated">Graduated</option>
              </select>
            </Field>

            {formError && <p className="error-text">{formError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={closeForm} disabled={busy}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label>{label}{required && ' *'}</label>
      {children}
    </div>
  )
}
