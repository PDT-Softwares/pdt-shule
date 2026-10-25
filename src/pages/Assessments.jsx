import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAssessments } from '../hooks/useAssessments'
import { useTerms } from '../hooks/useTerms'

export default function Assessments() {
  const { assessments, loading, error, addAssessment, deleteAssessment } = useAssessments()
  const { terms, loading: termsLoading } = useTerms()
  const [form, setForm] = useState({ term_id: '', name: '', weight: 100, max_score: 100 })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    setBusy(true); setFormError('')
    try {
      await addAssessment(form)
      setForm({ term_id: '', name: '', weight: 100, max_score: 100 })
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this assessment? All marks under it will also be deleted.')) return
    setBusy(true)
    try { await deleteAssessment(id) } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Assessment Periods</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Define the exams or assessments per term (e.g. Opener, Mid-Term, End-Term).
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Add Assessment</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label>Term</label>
            <select 
              value={form.term_id} 
              onChange={(e) => setForm({ ...form, term_id: e.target.value })} 
              required 
              style={{ minWidth: 200 }}
            >
              <option value="">— pick a term —</option>
              {termsLoading ? (
                <option value="" disabled>Loading terms…</option>
              ) : terms.length === 0 ? (
                <option value="" disabled>No terms available</option>
              ) : (
                terms.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.academic_years?.name} — {t.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label>Name</label>
            <input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              required 
              placeholder="e.g. Opener" 
              style={{ minWidth: 160 }} 
            />
          </div>
          <div>
            <label>Weight (%)</label>
            <input 
              type="number" 
              value={form.weight} 
              onChange={(e) => setForm({ ...form, weight: e.target.value })} 
              min={0} 
              max={100} 
              style={{ width: 100 }} 
            />
          </div>
          <div>
            <label>Max score</label>
            <input 
              type="number" 
              value={form.max_score} 
              onChange={(e) => setForm({ ...form, max_score: e.target.value })} 
              min={1} 
              style={{ width: 100 }} 
            />
          </div>
          <button type="submit" disabled={busy} className="primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Add
          </button>
        </form>
        {formError && <p className="error-text">{formError}</p>}
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && assessments.length === 0 && (
        <div className="card"><p className="muted" style={{ margin: 0 }}>No assessments defined yet.</p></div>
      )}

      {!loading && assessments.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>Assessment</th>
                <th style={{ textAlign: 'center' }}>Weight</th>
                <th style={{ textAlign: 'center' }}>Max Score</th>
                <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map(a => (
                <tr key={a.id}>
                  <td>{a.terms?.academic_years?.name} — {a.terms?.name}</td>
                  <td><strong>{a.name}</strong></td>
                  <td style={{ textAlign: 'center' }}>{a.weight}%</td>
                  <td style={{ textAlign: 'center' }}>{a.max_score}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="danger" onClick={() => handleDelete(a.id)} disabled={busy} style={{ padding: '6px 10px' }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}