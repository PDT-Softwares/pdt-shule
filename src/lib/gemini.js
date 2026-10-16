const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const MODEL = 'gemini-3.5-flash-lite'
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'

export async function callGemini(prompt, systemInstruction = '') {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY is not set in .env.local')

  const body = {
    model: MODEL,
    input: prompt,
  }
  if (systemInstruction) body.system_instruction = systemInstruction

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error('Gemini error: ' + JSON.stringify(data))
  }

  const steps = data?.steps ?? []
  for (const step of steps) {
    if (step.type === 'model_output' && Array.isArray(step.content)) {
      for (const c of step.content) {
        if (c.type === 'text' && c.text) return c.text
      }
    }
  }
  return '(No reply)'
}
