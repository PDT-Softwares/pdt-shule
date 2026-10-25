import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useDashboardStats() {
  const { currentSchool, currentRole, currentSchoolMembership } = useSchool()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id
  const userId = currentSchoolMembership?.user_id
  const classId = currentSchoolMembership?.class_id
  const streamId = currentSchoolMembership?.stream_id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')

    const isAdmin = currentRole === 'admin'
    const isClassTeacher = currentRole === 'classteacher'
    const isTeacher = currentRole === 'teacher'

    const { data: currentTerm } = await supabase
      .from('terms')
      .select('id, name, start_date, end_date, academic_years(name, start_date, end_date)')
      .eq('is_current', true)
      .maybeSingle()

    const termId = currentTerm?.id

    let studentCount = 0
    if (isAdmin || isClassTeacher) {
      let q = supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active')
      if (isClassTeacher && classId) q = q.eq('class_id', classId)
      const { count } = await q
      studentCount = count ?? 0
    }

    let teacherCount = 0
    let classCount = 0
    if (isAdmin) {
      const { count: t } = await supabase.from('school_members').select('*', { count: 'exact', head: true }).in('role', ['teacher', 'classteacher'])
      teacherCount = t ?? 0
      const { count: c } = await supabase.from('classes').select('*', { count: 'exact', head: true })
      classCount = c ?? 0
    }

    let marksCount = 0
    if (termId) {
      if (isTeacher) {
        const { count } = await supabase
          .from('marks')
          .select('*', { count: 'exact', head: true })
          .eq('term_id', termId)
          .eq('recorded_by', userId)
        marksCount = count ?? 0
      } else if (isClassTeacher && classId) {
        const { data: stu } = await supabase.from('students').select('id').eq('class_id', classId)
        const ids = stu?.map(s => s.id) ?? []
        if (ids.length > 0) {
          const { count } = await supabase
            .from('marks')
            .select('*', { count: 'exact', head: true })
            .eq('term_id', termId)
            .in('student_id', ids)
          marksCount = count ?? 0
        }
      } else if (isAdmin) {
        const { count } = await supabase
          .from('marks')
          .select('*', { count: 'exact', head: true })
          .eq('term_id', termId)
        marksCount = count ?? 0
      }
    }

    let presentCount = 0
    if (isAdmin || isClassTeacher) {
      let q = supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'present')
      if (isClassTeacher && classId) {
        const { data: stu } = await supabase.from('students').select('id').eq('class_id', classId)
        const ids = stu?.map(s => s.id) ?? []
        if (ids.length > 0) q = q.in('student_id', ids)
      }
      const { count } = await q
      presentCount = count ?? 0
    }

    // ===== Attendance for TODAY (class teacher only) =====
    let attendanceToday = null
    if (isClassTeacher && classId) {
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, '0')
      const d = String(today.getDate()).padStart(2, '0')
      const todayStr = `${y}-${m}-${d}`

      const { data: stu } = await supabase.from('students').select('id').eq('class_id', classId)
      const ids = stu?.map(s => s.id) ?? []

      let todayCount = 0
      if (ids.length > 0) {
        const { count } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', todayStr)
          .eq('school_id', schoolId)
          .in('student_id', ids)
        todayCount = count ?? 0
      }

      attendanceToday = {
        date: todayStr,
        count: todayCount,
        taken: todayCount > 0,
      }
    }

    // ===== Assessment Deadlines & Pending Marks =====
    let assessmentDeadlines = []
    if (termId) {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, name, deadline, weight')
        .eq('term_id', termId)
        .order('deadline', { ascending: true })

      if (assessments) {
        for (const asm of assessments) {
          let totalExpected = 0
          let recorded = 0
          let subjectInfo = []

          if (isAdmin) {
            const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active')
            const { data: tSlots } = await supabase
              .from('timetable_slots')
              .select('subject_id, subjects(id, name)')
              .eq('term_id', termId)
            
            const subjMap = {}
            for (const s of tSlots ?? []) {
              if (s.subjects?.id && !subjMap[s.subjects.id]) {
                subjMap[s.subjects.id] = { id: s.subjects.id, name: s.subjects.name }
              }
            }
            subjectInfo = Object.values(subjMap)
            totalExpected = (sCount ?? 0) * subjectInfo.length

            const { count: mCount } = await supabase
              .from('marks')
              .select('*', { count: 'exact', head: true })
              .eq('term_id', termId)
              .eq('assessment_id', asm.id)
            recorded = mCount ?? 0
          } else if (isClassTeacher && classId) {
            const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('class_id', classId)
            
            // === HAPA NDIO FIX: Chukua subjects alizopewa mwalimu kwenye teacher_subject_assignments ===
            const { data: assignments } = await supabase
              .from('teacher_subject_assignments')
              .select('subject_id, subjects(id, name)')
              .eq('teacher_id', userId)
              .eq('class_id', classId)
            
            const subjMap = {}
            for (const a of assignments ?? []) {
              if (a.subjects?.id && !subjMap[a.subjects.id]) {
                subjMap[a.subjects.id] = { id: a.subjects.id, name: a.subjects.name }
              }
            }
            subjectInfo = Object.values(subjMap)
            totalExpected = (sCount ?? 0) * subjectInfo.length

            const { data: stu } = await supabase.from('students').select('id').eq('class_id', classId)
            const ids = stu?.map(s => s.id) ?? []
            if (ids.length > 0 && subjectInfo.length > 0) {
              const { count: mCount } = await supabase
                .from('marks')
                .select('*', { count: 'exact', head: true })
                .eq('term_id', termId)
                .eq('assessment_id', asm.id)
                .in('student_id', ids)
                .in('subject_id', subjectInfo.map(s => s.id)) // Chuja kwa subjects zake tu
              recorded = mCount ?? 0
            }
          } else if (isTeacher) {
            const { count: mCount } = await supabase
              .from('marks')
              .select('*', { count: 'exact', head: true })
              .eq('term_id', termId)
              .eq('assessment_id', asm.id)
              .eq('recorded_by', userId)
            recorded = mCount ?? 0
            totalExpected = recorded > 0 ? recorded : 1
          }

          const pending = Math.max(0, totalExpected - recorded)

          assessmentDeadlines.push({
            id: asm.id,
            name: asm.name,
            deadline: asm.deadline,
            weight: asm.weight,
            recorded,
            totalExpected: isTeacher ? null : totalExpected,
            pending: isTeacher ? null : pending,
            subjects: subjectInfo,
          })
        }
      }
    }

    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    setStats({
      students: studentCount,
      teachers: teacherCount,
      classes: classCount,
      marks: marksCount,
      presentRecords: presentCount,
      currentTerm: currentTerm ?? null,
      recentAnnouncements: announcements ?? [],
      attendanceToday,
      assessmentDeadlines,
    })
    setLoading(false)
  }, [schoolId, currentRole, classId, userId, streamId])

  useEffect(() => { load() }, [load])

  return { stats, loading, error, reload: load }
}