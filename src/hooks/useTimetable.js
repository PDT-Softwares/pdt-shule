import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useTimetable() {
  const { currentSchool } = useSchool()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const loadSlots = useCallback(async ({ classId, termId }) => {
    if (!schoolId || !classId || !termId) return []
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('timetable_slots')
      .select('*, subjects(id, name)')
      .eq('class_id', classId)
      .eq('term_id', termId)

    setLoading(false)
    if (err) { setError(err.message); return [] }
    return data ?? []
  }, [schoolId])

  const upsertSlot = useCallback(async (slot) => {
    if (!schoolId) throw new Error('No school selected')
    setError('')
    const payload = {
      school_id: schoolId,
      class_id: slot.class_id,
      stream_id: slot.stream_id ?? null,
      subject_id: slot.subject_id,
      teacher_id: slot.teacher_id ?? null,
      term_id: slot.term_id,
      day_of_week: slot.day_of_week,
      period: slot.period,
    }
    const { error: err } = await supabase
      .from('timetable_slots')
      .upsert(payload, { onConflict: 'class_id,term_id,day_of_week,period' })
    if (err) throw new Error(err.message)
  }, [schoolId])

  const deleteSlot = useCallback(async ({ classId, termId, day, period }) => {
    if (!schoolId) throw new Error('No school selected')
    const { error: err } = await supabase
      .from('timetable_slots')
      .delete()
      .eq('class_id', classId)
      .eq('term_id', termId)
      .eq('day_of_week', day)
      .eq('period', period)
    if (err) throw new Error(err.message)
  }, [schoolId])

  return { loading, error, loadSlots, upsertSlot, deleteSlot }
}
