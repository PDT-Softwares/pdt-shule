import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useReportsReadiness() {
  const { currentSchool, currentRole, currentSchoolMembership } = useSchool()
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id
  const classId = currentSchoolMembership?.class_id
  const streamId = currentSchoolMembership?.stream_id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true); setError('')

    const isClassTeacher = currentRole === 'classteacher'

    // 1. Get current term
    const { data: currentTerm } = await supabase
      .from('terms')
      .select('id, name, academic_years(name)')
      .eq('is_current', true)
      .maybeSingle()

    if (!currentTerm) {
      setReadiness({ term: null, noTerm: true, noAssessment: false, noTimetable: false, ready: false, missing: 0, total: 0, percent: 0 })
      setLoading(false)
      return
    }

    // 2. Get assessments for this term
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, name, weight')
      .eq('term_id', currentTerm.id)

    if (!assessments || assessments.length === 0) {
      setReadiness({ term: currentTerm, noTerm: false, noAssessment: true, noTimetable: false, ready: false, missing: 0, total: 0, percent: 0 })
      setLoading(false)
      return
    }

    // 3. Get students (filtered by class if class teacher)
    let studentQuery = supabase.from('students').select('id').eq('status', 'active')
    if (isClassTeacher && classId) {
      studentQuery = studentQuery.eq('class_id', classId)
      if (streamId) studentQuery = studentQuery.eq('stream_id', streamId)
    }
    const { data: studentData } = await studentQuery
    const studentIds = (studentData ?? []).map(s => s.id)

    // 4. Get subjects from timetable (filtered by class if class teacher)
    let slotQuery = supabase.from('timetable_slots').select('subject_id').eq('term_id', currentTerm.id)
    if (isClassTeacher && classId) {
      slotQuery = slotQuery.eq('class_id', classId)
      if (streamId) slotQuery = slotQuery.eq('stream_id', streamId)
    }
    const { data: slots } = await slotQuery
    const subjectIds = [...new Set((slots ?? []).map(s => s.subject_id).filter(Boolean))]

    if (subjectIds.length === 0) {
      setReadiness({ term: currentTerm, noTerm: false, noAssessment: false, noTimetable: true, ready: false, missing: 0, total: 0, percent: 0 })
      setLoading(false)
      return
    }

    // 5. Get marks count
    let marksQuery = supabase
      .from('marks')
      .select('*', { count: 'exact', head: true })
      .eq('term_id', currentTerm.id)
      .in('assessment_id', assessments.map(a => a.id))
      .in('subject_id', subjectIds)
      .in('student_id', studentIds)

    const { count: marksCount } = await marksQuery

    const total = studentIds.length * subjectIds.length * assessments.length
    const missing = Math.max(0, total - (marksCount ?? 0))
    const percent = total > 0 ? Math.round(((total - missing) / total) * 100) : 0

    setReadiness({
      term: currentTerm,
      noTerm: false,
      noAssessment: false,
      noTimetable: false,
      ready: missing === 0,
      missing,
      total,
      percent,
    })
    setLoading(false)
  }, [schoolId, classId, streamId, currentRole])

  useEffect(() => { load() }, [load])

  return { readiness, loading, error, reload: load }
}