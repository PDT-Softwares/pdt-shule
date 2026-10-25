export default function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '4px solid var(--surface-2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p className="muted" style={{ fontSize: 14 }}>Loading your workspace…</p>
    </div>
  )
}
