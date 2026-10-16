import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Trash2 } from 'lucide-react'
import { useAIChat } from '../hooks/useAIChat'
import { useSchool } from '../contexts/SchoolContext'

export default function AI() {
  const { messages, sending, error, send, reset } = useAIChat()
  const { currentSchool } = useSchool()
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || sending) return
    send(input)
    setInput('')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={22} /> AI Assistant
          </h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Ask anything about {currentSchool?.school.name}
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} disabled={sending} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      <div className="card" style={{
        padding: 0, display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 260px)', minHeight: 400,
      }}>
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: 20 }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.6 }}>
              <Sparkles size={32} style={{ marginBottom: 8 }} />
              <p>Ask me anything. For example:</p>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 13 }}>
                <li>"Niambie jinsi ya kuongeza mwanafunzi mpya"</li>
                <li>"How do I record marks for Form 1?"</li>
                <li>"Summarize today's attendance"</li>
              </ul>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}>
              <div style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: 16,
                background: m.role === 'user' ? 'var(--primary)' : 'var(--surface-2)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                whiteSpace: 'pre-wrap',
                fontSize: 14,
              }}>
                {m.text}
              </div>
            </div>
          ))}

          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{
                padding: '10px 14px', borderRadius: 16,
                background: 'var(--surface-2)', opacity: 0.7, fontSize: 14,
              }}>
                Thinking…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex', gap: 8, padding: 16,
          borderTop: '1px solid var(--border)',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            disabled={sending}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="primary"
            disabled={sending || !input.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Send size={16} /> Send
          </button>
        </form>
      </div>

      {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  )
}
