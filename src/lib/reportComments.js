import { callGemini } from './gemini'

export async function generateReportComments({ schoolName, className, termName, students }) {
  const studentBlocks = students.map((s) => {
    const subjectLines = s.subjects
      .map((x) => `  - ${x.subject}: ${x.score} (${x.grade})`)
      .join('\n')
    
    // Calculate overall average
    const scores = s.subjects.map((x) => Number(x.score)).filter((n) => !isNaN(n))
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A'
    
    // Determine overall level
    let overallLevel = 'N/A'
    if (avg !== 'N/A') {
      const n = Number(avg)
      if (n >= 80) overallLevel = 'EE (Exceeding Expectation)'
      else if (n >= 65) overallLevel = 'ME (Meeting Expectation)'
      else if (n >= 50) overallLevel = 'AE (Approaching Expectation)'
      else overallLevel = 'BE (Below Expectation)'
    }

    return `Student: ${s.name} (${s.adm})
  Overall Mean: ${avg}% — ${overallLevel}
  Subjects:
${subjectLines}`
  }).join('\n\n')

  const prompt = `You are a Kenyan school teacher writing report card comments using the CBC (Competency Based Curriculum) system.

For each student, write ONE comment (2-3 sentences) that focuses on their OVERALL performance, not individual subjects.

Rules:
- Reference their overall mean and CBC level (EE/ME/AE/BE), not A/B/C.
- Mention one general strength, one area to improve, and one word of encouragement.
- Do NOT list or repeat individual subject names or scores.
- Formal but warm tone, English only.
- Each comment must be unique and personalized.

Return ONLY a valid JSON array like this:
[
  { "name": "Student Full Name", "comment": "..." },
  { "name": "Student 2 Name", "comment": "..." }
]

Do not include any other text. Just the JSON array.

Students:

${studentBlocks}`

  const text = await callGemini(prompt)

  try {
    let clean = text.trim()
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    }
    const startIdx = clean.indexOf('[')
    const endIdx = clean.lastIndexOf(']')
    if (startIdx === -1 || endIdx === -1) throw new Error('No JSON array found')
    const jsonStr = clean.slice(startIdx, endIdx + 1)
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(item => ({ name: String(item.name || ''), comment: String(item.comment || '') }))
    }
    throw new Error('Parsed JSON is not an array')
  } catch (err) {
    return students.map((s, i) => ({
      name: s.name,
      comment: i === 0 ? text : '(AI failed to generate comment for this student. Please regenerate.)',
    }))
  }
}