import { useEffect, useState } from 'react'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'
import { useClasses } from '../hooks/useClasses'
import EditableSelect from '../components/EditableSelect'

const PRESET_STREAMS = [
  'East', 'West', 'North', 'South',
  'Blue', 'Red', 'Green', 'Yellow',
  'A', 'B', 'C', 'D',
  'Alpha', 'Beta', 'Gamma', 'Delta',
]

export default function Streams() {
  const { currentSchool } = useSchool()
  const { classes } = useClasses()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)

  const schoolId = currentSchool?.school.id

  async function load() {
    if (!schoolId) return
    setLoading(true); setError('')
    const { data, error: err } = await supabase
      .from('streams')
      .select('*, classes(id, name)')
      .order('name', { ascending: true })
    if (err) setError(err.message)
    else setStreams(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [schoolId])

  function openNew(classId = '') {
    setForm({ class_id: classId, name: '' })
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name?.trim() || !form.class_id) return
    setBusy(true); setError('')
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('streams')
          .update({ name: form.name.trim(), class_id: form.class_id })
          .eq('id', editingId)
        if (err) throw new Error(err.message)
      } else {
        const { error: err } = await supabase
          .from('streams')
          .insert({
            school_id: schoolId,
            class_id: form.class_id,
            name: form.name.trim(),
          })
        if (err) throw new Error(err.message)
      }
      await load()
      setForm(null); setEditingId(null)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this stream? Students assigned to it will be unassigned.')) return
    setBusy(true)
    const { error: err } = await supabase.from('streams').delete().eq('id', id)
    if (err) setError(err.message)
    else await load()
    setBusy(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Streams</h1>
        <button className="primary" onClick={() => openNew()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add stream
        </button>
      </div>

      <p className="muted">
        Streams are sub-groups within a class (e.g. East/West, Blue/Red, A/B).
        Use the presets or type your own.
      </p>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && streams.length === 0 && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>No streams yet. Add your first one.</p>
        </div>
      )}

      {!loading && streams.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Stream</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {streams.map((s) => (
                <tr key={s.id}>
                  <td>{s.classes?.name ?? '—'}</td>
                  <td>{s.name}</td>
                  <td>
                    <button
                      onClick={() => { setForm({ class_id: s.class_id, name: s.name }); setEditingId(s.id) }}
                      disabled={busy}
                      style={{ marginRight: 6, padding: '6px 10px' }}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="danger"
                      onClick={() => handleDelete(s.id)}
                      disabled={busy}
                      style={{ padding: '6px 10px' }}
                      title="Delete"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{editingId ? 'Edit stream' : 'Add stream'}</h2>
              <button type="button" onClick={() => { setForm(null); setEditingId(null) }} style={{ padding: 6, background: 'transparent', border: 'none' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 12, marginTop: 16 }}>
              <label>Class *</label>
              <select
                value={form.class_id}
                onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                required
                style={{ width: '100%' }}
              >
                <option value="">— pick a class —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Stream name *</label>
              <EditableSelect
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                options={PRESET_STREAMS}
                placeholder="e.g. East, Blue, A…"
                required
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => { setForm(null); setEditingId(null) }} disabled={busy}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}