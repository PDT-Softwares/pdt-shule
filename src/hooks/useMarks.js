import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useMarks() {
  const { currentSchool } = useSchool()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  // Load marks for a specific class / subject / term.
  // Returns a map: student_id -> mark row (or undefined if not entered).
  const loadMarks = useCallback(async ({ classId, subjectId, termId }) => {
    if (!schoolId || !classId || !subjectId || !termId) return {}
    setLoading(true)
    setError('')

    // Fetch students of the class
    const { data: studentRows, error: sErr } = await supabase
      .from('students')
      .select('id, full_name, admission_number')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('admission_number', { ascending: true })

    if (sErr) { setError(sErr.message); setLoading(false); return {} }

    // Fetch existing marks for these students in this subject/term
    const studentIds = (studentRows ?? []).map((s) => s.id)
    let marksByStudent = {}
    if (studentIds.length > 0) {
      const { data: markRows, error: mErr } = await supabase
        .from('marks')
        .select('id, student_id, score, grade')
        .eq('subject_id', subjectId)
        .eq('term_id', termId)
        .in('student_id', studentIds)

      if (mErr) { setError(mErr.message); setLoading(false); return {} }

      marksByStudent = Object.fromEntries((markRows ?? []).map((m) => [m.student_id, m]))
    }

    setLoading(false)
    return { students: studentRows ?? [], marksByStudent }
  }, [schoolId])

  // Save a batch of marks. Each row: { student_id, subject_id, term_id, score, grade }
  const saveMarks = useCallback(async (rows) => {
    if (!schoolId) throw new Error('No school selected')
    setError('')

    // Upsert using the unique constraint (student_id, subject_id, term_id)
    const { error: err } = await supabase
      .from('marks')
      .upsert(
        rows.map((r) => ({ ...r, school_id: schoolId })),
        { onConflict: 'student_id,subject_id,term_id' }
      )
    if (err) throw new Error(err.message)
  }, [schoolId])

  return { loading, error, loadMarks, saveMarks }
}
