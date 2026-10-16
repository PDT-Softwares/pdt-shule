import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useDashboardStats() {
  const { currentSchool } = useSchool()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')

    const [studentsRes, classesRes, subjectsRes, marksRes, attendanceRes, currentTermRes] =
      await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('marks').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'present'),
        supabase.from('terms').select('id, name, academic_years(name)').eq('is_current', true).maybeSingle(),
      ])

    const firstErr = [studentsRes, classesRes, subjectsRes, marksRes, attendanceRes, currentTermRes]
      .find((r) => r.error)
    if (firstErr?.error) {
      setError(firstErr.error.message)
      setLoading(false)
      return
    }

    setStats({
      students: studentsRes.count ?? 0,
      classes: classesRes.count ?? 0,
      subjects: subjectsRes.count ?? 0,
      marks: marksRes.count ?? 0,
      presentRecords: attendanceRes.count ?? 0,
      currentTerm: currentTermRes.data ?? null,
    })
    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  return { stats, loading, error, reload: load }
}
