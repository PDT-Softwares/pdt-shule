import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'
import { useAuth } from '../contexts/AuthContext'

export function useMarks() {
  const { currentSchool } = useSchool()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const loadMarks = useCallback(async ({ classId, streamId, subjectId, termId, assessmentId }) => {
    if (!schoolId || !classId || !subjectId || !termId || !assessmentId) return {}
    setLoading(true)
    setError('')

    let query = supabase
      .from('students')
      .select('id, full_name, admission_number, streams(name)')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('admission_number', { ascending: true })

    if (streamId) query = query.eq('stream_id', streamId)

    const { data: studentRows, error: sErr } = await query
    if (sErr) { setError(sErr.message); setLoading(false); return {} }

    const studentIds = (studentRows ?? []).map((s) => s.id)
    let marksByStudent = {}
    if (studentIds.length > 0) {
      const { data: markRows, error: mErr } = await supabase
        .from('marks')
        .select('id, student_id, score, grade')
        .eq('subject_id', subjectId)
        .eq('term_id', termId)
        .eq('assessment_id', assessmentId)
        .in('student_id', studentIds)

      if (mErr) { setError(mErr.message); setLoading(false); return {} }
      marksByStudent = Object.fromEntries((markRows ?? []).map((m) => [m.student_id, m]))
    }

    setLoading(false)
    return { students: studentRows ?? [], marksByStudent }
  }, [schoolId])

  const saveMarks = useCallback(async (rows, assessmentId) => {
    if (!schoolId) throw new Error('No school selected')
    if (!user) throw new Error('No user')
    setError('')

    const payload = rows.map((r) => ({
      student_id: r.student_id,
      subject_id: r.subject_id,
      term_id: r.term_id,
      assessment_id: assessmentId,
      score: r.score,
      grade: r.grade,
      school_id: schoolId,
      recorded_by: user.id, // Ensure this is set
    }))

    const { error: err } = await supabase
      .from('marks')
      .upsert(payload, { onConflict: 'student_id,subject_id,term_id,assessment_id' })

    if (err) throw new Error(err.message)
  }, [schoolId, user])

  return { loading, error, loadMarks, saveMarks }
}