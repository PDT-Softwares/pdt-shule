export default function PageFooter() {
  return (
    <footer style={{
      marginTop: 40,
      paddingTop: 20,
      borderTop: '1px solid var(--border)',
      textAlign: 'center',
      fontSize: 12,
      color: 'var(--text-muted)',
    }}>
      © {new Date().getFullYear()} <strong style={{ color: 'var(--text)', fontWeight: 700 }}>PDT Softwares</strong>. All rights reserved.
    </footer>
  )
}