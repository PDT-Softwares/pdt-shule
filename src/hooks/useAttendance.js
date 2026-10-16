import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useAttendance() {
  const { currentSchool } = useSchool()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const loadDay = useCallback(async ({ classId, date }) => {
    if (!schoolId || !classId || !date) return { students: [], byStudent: {} }
    setLoading(true)
    setError('')

    const { data: studentRows, error: sErr } = await supabase
      .from('students')
      .select('id, full_name, admission_number')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('admission_number', { ascending: true })

    if (sErr) { setError(sErr.message); setLoading(false); return { students: [], byStudent: {} } }

    const ids = (studentRows ?? []).map((s) => s.id)
    let byStudent = {}
    if (ids.length > 0) {
      const { data: rows, error: aErr } = await supabase
        .from('attendance')
        .select('id, student_id, status, notes')
        .eq('date', date)
        .in('student_id', ids)

      if (aErr) { setError(aErr.message); setLoading(false); return { students: [], byStudent: {} } }
      byStudent = Object.fromEntries((rows ?? []).map((r) => [r.student_id, r]))
    }

    setLoading(false)
    return { students: studentRows ?? [], byStudent }
  }, [schoolId])

  const saveDay = useCallback(async ({ date, entries }) => {
    if (!schoolId) throw new Error('No school selected')
    setError('')

    const rows = entries.map((e) => ({
      school_id: schoolId,
      student_id: e.student_id,
      date,
      status: e.status,
      notes: e.notes || null,
    }))

    const { error: err } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'student_id,date' })

    if (err) throw new Error(err.message)
  }, [schoolId])

  return { loading, error, loadDay, saveDay }
}
