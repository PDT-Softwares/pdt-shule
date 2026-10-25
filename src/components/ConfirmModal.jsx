import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({ 
  open, 
  title = 'Are you sure?', 
  message = 'This action cannot be undone.', 
  confirmLabel = 'Delete', 
  cancelLabel = 'Cancel',
  danger = true,
  busy = false,
  onConfirm, 
  onCancel 
}) {
  if (!open) return null

  // createPortal inaiweka modal moja kwa moja kwenye body
  return createPortal(
    <div 
      style={{ 
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 12, 18, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div 
        style={{ 
          background: 'var(--surface)',
          color: 'var(--text)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          animation: 'animIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: danger ? 'var(--danger-soft)' : 'var(--primary-soft)',
              color: danger ? 'var(--danger)' : 'var(--primary-hover)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AlertTriangle size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          </div>
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={busy}
            style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 24px 20px 76px', overflowY: 'auto' }}>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        </div>

        <div style={{
          display: 'flex', gap: 8, padding: '16px 24px',
          borderTop: '1px solid var(--border)', background: 'var(--surface-2)',
          justifyContent: 'flex-end',
        }}>
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={busy}
            style={{ borderRadius: 999 }}
          >
            {cancelLabel}
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            disabled={busy}
            className={danger ? 'danger' : 'primary'}
            style={{ borderRadius: 999, minWidth: 100 }}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body // Hapa ndio inapelekwa moja kwa moja kwenye body
  )
}