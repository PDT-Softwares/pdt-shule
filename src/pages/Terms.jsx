import { useState } from 'react'
import { useTerms } from '../hooks/useTerms'

export default function Terms() {
  const {
    years, terms, loading, error,
    addYear, deleteYear, addTerm, deleteTerm,
    setCurrentYear, setCurrentTerm,
  } = useTerms()

  const [yearForm, setYearForm] = useState({ name: '', start_date: '', end_date: '' })
  const [termForm, setTermForm] = useState({ academic_year_id: '', name: '', start_date: '', end_date: '' })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleAddYear(e) {
    e.preventDefault()
    if (!yearForm.name.trim()) return
    setBusy(true); setFormError('')
    try {
      await addYear({
        name: yearForm.name.trim(),
        start_date: yearForm.start_date,
        end_date: yearForm.end_date,
      })
      setYearForm({ name: '', start_date: '', end_date: '' })
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  async function handleAddTerm(e) {
    e.preventDefault()
    if (!termForm.name.trim() || !termForm.academic_year_id) return
    setBusy(true); setFormError('')
    try {
      await addTerm({
        academic_year_id: termForm.academic_year_id,
        name: termForm.name.trim(),
        start_date: termForm.start_date,
        end_date: termForm.end_date,
      })
      setTermForm({ academic_year_id: '', name: '', start_date: '', end_date: '' })
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  async function handleDeleteYear(id) {
    if (!confirm('Delete this academic year? Its terms will also be deleted.')) return
    setBusy(true); setFormError('')
    try { await deleteYear(id) } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  async function handleDeleteTerm(id) {
    if (!confirm('Delete this term? Marks linked to it will be deleted.')) return
    setBusy(true); setFormError('')
    try { await deleteTerm(id) } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  return (
    <div>
      <h1>Academic Calendar</h1>
      <p style={{ opacity: 0.7 }}>
        Define the school's academic years and terms. One year and one term can be marked "current".
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {formError && <p style={{ color: 'red' }}>{formError}</p>}
      {loading && <p>Loading…</p>}

      <h2>Academic years</h2>
      <form onSubmit={handleAddYear} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Year name</label>
          <input
            value={yearForm.name}
            onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
            placeholder="2026"
            required
            style={{ padding: 8, width: 100 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>Start</label>
          <input
            type="date"
            value={yearForm.start_date}
            onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
            style={{ padding: 8 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12 }}>End</label>
          <input
            type="date"
            value={yearForm.end_date}
            onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
            style={{ padding: 8 }}
          />
        </div>
        <button type="submit" disabled={busy} style={{ padding: '8px 14px' }}>Add year</button>
      </form>

      {years.length === 0 && !loading && <p style={{ opacity: 0.6 }}>No academic years yet.</p>}

      {years.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th style={{ padding: 8 }}>Year</th>
              <th style={{ padding: 8 }}>Start</th>
              <th style={{ padding: 8 }}>End</th>
              <th style={{ padding: 8 }}>Current</th>
              <th style={{ padding: 8, width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{y.name}</td>
                <td style={{ padding: 8 }}>{y.start_date ?? '—'}</td>
                <td style={{ padding: 8 }}>{y.end_date ?? '—'}</td>
                <td style={{ padding: 8 }}>{y.is_current ? '✅' : '—'}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => setCurrentYear(y.id)} disabled={busy || y.is_current} style={{ marginRight: 6 }}>
                    Set current
                  </button>
                  <button onClick={() => handleDeleteYear(y.id)} disabled={busy}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Terms</h2>

      {years.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Add an academic year first.</p>
      ) : (
        <>
          <form onSubmit={handleAddTerm} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12 }}>Year</label>
              <select
                value={termForm.academic_year_id}
                onChange={(e) => setTermForm({ ...termForm, academic_year_id: e.target.value })}
                required
                style={{ padding: 8 }}
              >
                <option value="">— pick —</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12 }}>Term name</label>
              <input
                value={termForm.name}
                onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                placeholder="Term 1"
                required
                style={{ padding: 8, width: 140 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12 }}>Start</label>
              <input
                type="date"
                value={termForm.start_date}
                onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })}
                style={{ padding: 8 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12 }}>End</label>
              <input
                type="date"
                value={termForm.end_date}
                onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })}
                style={{ padding: 8 }}
              />
            </div>
            <button type="submit" disabled={busy} style={{ padding: '8px 14px' }}>Add term</button>
          </form>

          {terms.length === 0 && <p style={{ opacity: 0.6 }}>No terms yet.</p>}

          {terms.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: 8 }}>Year</th>
                  <th style={{ padding: 8 }}>Term</th>
                  <th style={{ padding: 8 }}>Start</th>
                  <th style={{ padding: 8 }}>End</th>
                  <th style={{ padding: 8 }}>Current</th>
                  <th style={{ padding: 8, width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{t.academic_years?.name ?? '—'}</td>
                    <td style={{ padding: 8 }}>{t.name}</td>
                    <td style={{ padding: 8 }}>{t.start_date ?? '—'}</td>
                    <td style={{ padding: 8 }}>{t.end_date ?? '—'}</td>
                    <td style={{ padding: 8 }}>{t.is_current ? '✅' : '—'}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => setCurrentTerm(t.id)} disabled={busy || t.is_current} style={{ marginRight: 6 }}>
                        Set current
                      </button>
                      <button onClick={() => handleDeleteTerm(t.id)} disabled={busy}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
