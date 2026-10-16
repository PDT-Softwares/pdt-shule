import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user, signOut } = useAuth()
  return (
    <div style={{ padding: 40 }}>
      <h1>Home</h1>
      <p>Logged in as: {user?.email ?? 'nobody'}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  )
}
