import { useState } from 'react'
import { Plus, Trash2, CheckCircle, Calendar, Clock } from 'lucide-react'
import { useTerms } from '../hooks/useTerms'
import { TERM_NAMES, CURRENT_YEAR } from '../lib/kenyaConstants'
import PageFooter from '../components/PageFooter'
import ConfirmModal from '../components/ConfirmModal'

export default function Terms() {
  const {
    years, terms, loading, error,
    addYear, deleteYear, addTerm, deleteTerm,
    setCurrentYear, setCurrentTerm,
  } = useTerms()

  const [yearForm, setYearForm] = useState({ name: String(CURRENT_YEAR), start_date: '', end_date: '' })
  const [termForm, setTermForm] = useState({ academic_year_id: '', name: '', start_date: '', end_date: '' })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  // State za ConfirmModal
  const [confirmDeleteYear, setConfirmDeleteYear] = useState(null)
  const [confirmDeleteTerm, setConfirmDeleteTerm] = useState(null)

  async function handleAddYear(e) {
    e.preventDefault()
    if (!yearForm.name) return
    setBusy(true); setFormError('')
    try {
      await addYear({
        name: yearForm.name,
        start_date: yearForm.start_date,
        end_date: yearForm.end_date,
      })
      setYearForm({ name: String(CURRENT_YEAR), start_date: '', end_date: '' })
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  async function handleAddTerm(e) {
    e.preventDefault()
    if (!termForm.name || !termForm.academic_year_id) return
    setBusy(true); setFormError('')
    try {
      await addTerm({
        academic_year_id: termForm.academic_year_id,
        name: termForm.name,
        start_date: termForm.start_date,
        end_date: termForm.end_date,
      })
      setTermForm({ academic_year_id: '', name: '', start_date: '', end_date: '' })
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  // Badilishwa kutumia confirmDeleteYear
  async function handleDeleteYear() {
    if (!confirmDeleteYear) return
    setBusy(true); setFormError('')
    try { 
      await deleteYear(confirmDeleteYear.id) 
      setConfirmDeleteYear(null)
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  // Badilishwa kutumia confirmDeleteTerm
  async function handleDeleteTerm() {
    if (!confirmDeleteTerm) return
    setBusy(true); setFormError('')
    try { 
      await deleteTerm(confirmDeleteTerm.id) 
      setConfirmDeleteTerm(null)
    } catch (err) { setFormError(err.message) }
    setBusy(false)
  }

  const yearOptions = []
  for (let y = CURRENT_YEAR + 5; y >= CURRENT_YEAR - 10; y--) yearOptions.push(String(y))

  return (
    <div className="anim-in" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Academic Calendar</h1>
        <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
          Define the school's academic years and terms. Set one year and one term as <strong>current</strong>.
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {formError && <p className="error-text">{formError}</p>}
      {loading && <p className="muted">Loading…</p>}

      {/* ===== Academic Years ===== */}
      <div className="ui-card anim-in" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} /> Academic Years
        </h2>

        <form onSubmit={handleAddYear} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <label>Year</label>
            <select
              value={yearForm.name}
              onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
              required
              style={{ width: '100%', borderRadius: 999 }}
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label>Start date</label>
            <input
              type="date"
              value={yearForm.start_date}
              onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
              style={{ width: '100%', borderRadius: 999 }}
            />
          </div>
          <div>
            <label>End date</label>
            <input
              type="date"
              value={yearForm.end_date}
              onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
              style={{ width: '100%', borderRadius: 999 }}
            />
          </div>
          <button type="submit" disabled={busy} className="primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999 }}>
            <Plus size={14} /> Add Year
          </button>
        </form>

        {years.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>No academic years yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {years.map((y) => (
              <div
                key={y.id}
                style={{
                  border: `2px solid ${y.is_current ? 'var(--primary)' : 'var(--border)'}`,
                  background: y.is_current ? 'var(--primary-soft)' : 'var(--surface)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 18, fontWeight: 800 }}>{y.name}</strong>
                  {y.is_current && (
                    <span className="badge badge-primary" style={{ fontSize: 10 }}>CURRENT</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} />
                  {y.start_date ? new Date(y.start_date).toLocaleDateString() : '—'}
                  {' → '}
                  {y.end_date ? new Date(y.end_date).toLocaleDateString() : '—'}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {terms.filter(t => t.academic_year_id === y.id).length} term{terms.filter(t => t.academic_year_id === y.id).length === 1 ? '' : 's'}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {!y.is_current && (
                    <button
                      onClick={() => setCurrentYear(y.id)}
                      disabled={busy}
                      style={{ flex: 1, padding: '6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 999 }}
                      title="Set as current"
                    >
                      <CheckCircle size={12} /> Set Current
                    </button>
                  )}
                  <button
                    className="danger"
                    onClick={() => setConfirmDeleteYear(y)}
                    disabled={busy}
                    style={{ padding: '6px 10px', fontSize: 11, borderRadius: 999 }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Terms ===== */}
      <div className="ui-card anim-in" style={{ animationDelay: '0.1s' }}>
        <h2 style={{ margin: 0, fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} /> Terms
        </h2>

        {years.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Add an academic year first.</p>
        ) : (
          <>
            <form onSubmit={handleAddTerm} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
              <div>
                <label>Year</label>
                <select
                  value={termForm.academic_year_id}
                  onChange={(e) => setTermForm({ ...termForm, academic_year_id: e.target.value })}
                  required
                  style={{ width: '100%', borderRadius: 999 }}
                >
                  <option value="">— pick —</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
              <div>
                <label>Term</label>
                <select
                  value={termForm.name}
                  onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                  required
                  style={{ width: '100%', borderRadius: 999 }}
                >
                  <option value="">— pick —</option>
                  {TERM_NAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Start date</label>
                <input
                  type="date"
                  value={termForm.start_date}
                  onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })}
                  style={{ width: '100%', borderRadius: 999 }}
                />
              </div>
              <div>
                <label>End date</label>
                <input
                  type="date"
                  value={termForm.end_date}
                  onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })}
                  style={{ width: '100%', borderRadius: 999 }}
                />
              </div>
              <button type="submit" disabled={busy} className="primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999 }}>
                <Plus size={14} /> Add Term
              </button>
            </form>

            {terms.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>No terms yet.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="table-desktop" style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Term</th>
                        <th>Start</th>
                        <th>End</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map((t) => (
                        <tr key={t.id}>
                          <td>{t.academic_years?.name ?? '—'}</td>
                          <td><strong>{t.name}</strong></td>
                          <td>{t.start_date ? new Date(t.start_date).toLocaleDateString() : '—'}</td>
                          <td>{t.end_date ? new Date(t.end_date).toLocaleDateString() : '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {t.is_current
                              ? <span className="badge badge-success">CURRENT</span>
                              : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              {!t.is_current && (
                                <button
                                  onClick={() => setCurrentTerm(t.id)}
                                  disabled={busy}
                                  style={{ padding: '6px 10px', fontSize: 12, borderRadius: 999 }}
                                >
                                  Set Current
                                </button>
                              )}
                              <button
                                className="danger"
                                onClick={() => setConfirmDeleteTerm(t)}
                                disabled={busy}
                                style={{ padding: '6px 8px' }}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="cards-mobile">
                  {terms.map((t) => (
                    <div key={t.id} className="ui-card" style={{ padding: 16, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{t.academic_years?.name ?? '—'}</div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {t.start_date ? new Date(t.start_date).toLocaleDateString() : '—'} → {t.end_date ? new Date(t.end_date).toLocaleDateString() : '—'}
                          </div>
                          {t.is_current && (
                            <span className="badge badge-success" style={{ marginTop: 6 }}>CURRENT</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {!t.is_current && (
                            <button
                              onClick={() => setCurrentTerm(t.id)}
                              disabled={busy}
                              style={{ padding: '6px 8px', fontSize: 11, borderRadius: 999 }}
                            >
                              <CheckCircle size={12} />
                            </button>
                          )}
                          <button
                            className="danger"
                            onClick={() => setConfirmDeleteTerm(t)}
                            disabled={busy}
                            style={{ padding: '6px 8px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        open={!!confirmDeleteYear}
        title="Delete academic year?"
        message={`Are you sure you want to delete "${confirmDeleteYear?.name}"? Its terms will also be deleted.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDeleteYear}
        onCancel={() => setConfirmDeleteYear(null)}
      />

      <ConfirmModal
        open={!!confirmDeleteTerm}
        title="Delete term?"
        message={`Are you sure you want to delete "${confirmDeleteTerm?.name}"? Marks linked to it will be deleted.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDeleteTerm}
        onCancel={() => setConfirmDeleteTerm(null)}
      />

      <PageFooter />
    </div>
  )
}