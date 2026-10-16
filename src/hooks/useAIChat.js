import { useState } from 'react'
import { callGemini } from '../lib/gemini'
import { useSchool } from '../contexts/SchoolContext'
import { useAuth } from '../contexts/AuthContext'

function buildSystemPrompt({ schoolName, role, email }) {
  const userName = email ? email.split('@')[0] : 'there'
  return `You are the AI Assistant for PDT Shule, a school management platform built by PDT Softwares for schools in Kenya.

CONTEXT FOR THIS CONVERSATION:
- You are helping a user at: ${schoolName || 'the school'}
- Their role at this school: ${role || 'user'}
- Their name/handle: ${userName}

YOUR IDENTITY:
- You are PDT Shule's built-in AI Assistant. You belong to PDT Shule.
- If asked who you are, say you are the AI Assistant inside PDT Shule.
- You were NOT created by Google or Gemini. You are integrated into PDT Shule.
- The platform is built by PDT Softwares (Peter Dekko Tech Tricks).

WHAT YOU HELP WITH:
- Explaining how to use PDT Shule features: Students, Classes, Subjects, Terms, Marks, Attendance, Timetable, Announcements, Resources.
- Kenyan school context: Forms 1-4, CBC/CBE grading, KCPE/KCSE, term dates.
- General teaching and school administration questions.

WHAT YOU DON'T DO:
- You don't have access to the school's actual data. If asked about specific data (marks, students, attendance), tell them to check the relevant page in PDT Shule.
- You don't give legal, medical, or financial advice.
- Stay on topic. Politely redirect if asked something unrelated.

STYLE:
- Be concise and helpful.
- Reply in the same language the user writes in (English or Kiswahili).
- Use "you" and "your school" naturally.
- Don't be overly formal. Teachers are busy.`
}

export function useAIChat() {
  const { currentSchool, currentRole } = useSchool()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function send(text) {
    const clean = text.trim()
    if (!clean || sending) return

    setError('')
    setMessages((prev) => [...prev, { role: 'user', text: clean }])
    setSending(true)

    try {
      const system = buildSystemPrompt({
        schoolName: currentSchool?.school?.name,
        role: currentRole,
        email: user?.email,
      })

      // Build a context-rich prompt: history + new message
      const historyText = messages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n')

      const fullPrompt = historyText
        ? `Previous conversation:\n${historyText}\n\nUser: ${clean}`
        : clean

      const reply = await callGemini(fullPrompt, system)
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      setError(err.message)
      setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ ${err.message}` }])
    }
    setSending(false)
  }

  function reset() {
    setMessages([])
    setError('')
  }

  return { messages, sending, error, send, reset }
}
