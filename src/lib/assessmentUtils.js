export const CBC_LEVELS = [
  { min: 80, max: 100, level: 'EE', remark: 'Exceeding Expectation', color: '#16a34a' },
  { min: 65, max: 79,  level: 'ME', remark: 'Meeting Expectation',    color: '#2563eb' },
  { min: 50, max: 64,  level: 'AE', remark: 'Approaching Expectation', color: '#f59e0b' },
  { min: 0,  max: 49,  level: 'BE', remark: 'Below Expectation',      color: '#dc2626' },
]

export function levelFor(score) {
  const n = Number(score)
  if (isNaN(n)) return null
  return CBC_LEVELS.find(l => n >= l.min && n <= l.max) ?? null
}