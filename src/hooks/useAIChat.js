import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'
import { useAuth } from '../contexts/AuthContext'

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
      const history = messages.map((m) => ({ role: m.role, text: m.text }))

      const { data, error: fnError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: clean,
          history,
          context: {
            school_name: currentSchool?.school?.name ?? null,
            school_slug: currentSchool?.school?.slug ?? null,
            user_role: currentRole ?? null,
            user_email: user?.email ?? null,
          },
        },
      })

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)

      const reply = data?.reply ?? '(No reply)'
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
