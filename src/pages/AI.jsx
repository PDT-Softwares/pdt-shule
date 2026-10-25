import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Trash2, Bot, User, Shield, BookOpen, GraduationCap } from 'lucide-react'
import { useAIChat } from '../hooks/useAIChat'
import { useSchool } from '../contexts/SchoolContext'
import PageFooter from '../components/PageFooter'

function roleMeta(role) {
  switch (role) {
    case 'admin':
      return {
        label: 'Administrator',
        icon: Shield,
        color: 'var(--primary)',
        suggestions: [
          'How do I add a new teacher?',
          'How do I set up a new term?',
          'How do I generate a timetable with AI?',
          'How do I post a school-wide announcement?',
        ],
      }
    case 'classteacher':
      return {
        label: 'Class Teacher',
        icon: GraduationCap,
        color: 'var(--lime)',
        suggestions: [
          'How do I record marks for my class?',
          'How do I take attendance for my class?',
          'How do I view my class report cards?',
          'How do I see my class timetable?',
        ],
      }
    case 'teacher':
      return {
        label: 'Subject Teacher',
        icon: BookOpen,
        color: 'var(--primary-hover)',
        suggestions: [
          'How do I record marks for my subject?',
          'How do I view my teaching schedule?',
          'What are assessment periods?',
          'How do I post an announcement?',
        ],
      }
    default:
      return {
        label: 'User',
        icon: User,
        color: 'var(--text-muted)',
        suggestions: [
          'What can PDT Shule do?',
          'How do I get started?',
          'Who built this platform?',
        ],
      }
  }
}

export default function AI() {
  const { messages, sending, error, send, reset } = useAIChat()
  const { currentSchool, currentRole } = useSchool()
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  const meta = roleMeta(currentRole)
  const RoleIcon = meta.icon

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
    <div className="ai-page">
      {/* Header */}
      <div className="ai-header">
        <div>
          <h1 className="ai-title">
            <span className="ai-title-icon"><Sparkles size={20} /></span>
            AI Assistant
          </h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Ask anything about {currentSchool?.school.name}
          </p>
          <div className="ai-role-badge" style={{ borderColor: meta.color }}>
            <RoleIcon size={12} style={{ color: meta.color }} />
            <span>{meta.label} mode</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            disabled={sending}
            className="ai-clear"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      {/* Chat card */}
      <div className="ai-card">
        <div ref={scrollRef} className="ai-scroll">
          {messages.length === 0 && (
            <div className="ai-empty">
              <div className="ai-empty-icon"><Sparkles size={28} /></div>
              <h3 style={{ margin: '12px 0 4px', fontSize: 18 }}>How can I help?</h3>
              <p className="muted" style={{ margin: '0 0 16px', fontSize: 13 }}>
                Suggestions for your role ({meta.label}):
              </p>
              <div className="ai-suggestions">
                {meta.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    disabled={sending}
                    className="ai-suggestion"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user'
            return (
              <div key={i} className={`ai-row ${isUser ? 'ai-row-user' : 'ai-row-bot'}`}>
                <div className={`ai-avatar ${isUser ? 'ai-avatar-user' : 'ai-avatar-bot'}`}>
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`ai-bubble ${isUser ? 'ai-bubble-user' : 'ai-bubble-bot'}`}>
                  {m.text}
                </div>
              </div>
            )
          })}

          {sending && (
            <div className="ai-row ai-row-bot">
              <div className="ai-avatar ai-avatar-bot"><Bot size={16} /></div>
              <div className="ai-bubble ai-bubble-bot">
                <span className="ai-typing">
                  <span></span><span></span><span></span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="ai-composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask as ${meta.label}…`}
            disabled={sending}
            className="ai-input"
          />
          <button
            type="submit"
            className="primary ai-send"
            disabled={sending || !input.trim()}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}

      <PageFooter />
    </div>
  )
}
