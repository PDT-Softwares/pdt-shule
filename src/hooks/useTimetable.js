import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useTimetable() {
  const { currentSchool } = useSchool()
  const schoolId = currentSchool?.school.id

  const loadSlots = useCallback(async ({ classId, streamId, termId }) => {
    if (!schoolId || !classId || !termId) return []
    
    let query = supabase
      .from('timetable_slots')
      .select('*, subjects(id, name), classes(id, name), streams(id, name)')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .eq('term_id', termId)

    // Kama stream imechaguliwa, chuja kwa stream hiyo. Kama haijachaguliwa, chukua zote za class hiyo.
    if (streamId) {
      query = query.eq('stream_id', streamId)
    }

    const { data, error } = await query
    if (error) {
      console.error('loadSlots error:', error)
      return []
    }
    return data ?? []
  }, [schoolId])

  const upsertSlot = useCallback(async ({ class_id, stream_id, subject_id, term_id, day_of_week, period, teacher_id }) => {
    if (!schoolId) throw new Error('No school selected')
    if (!class_id) throw new Error('Pick a class.')
    if (!subject_id) throw new Error('Pick a subject.')
    if (!term_id) throw new Error('Pick a term.')

    const payload = {
      school_id: schoolId,
      class_id,
      stream_id: stream_id || null,
      subject_id,
      term_id,
      day_of_week: Number(day_of_week),
      period: Number(period),
      teacher_id: teacher_id || null,
    }

    const { error } = await supabase
      .from('timetable_slots')
      .upsert(payload, { onConflict: 'school_id,class_id,stream_id,term_id,day_of_week,period' })
    if (error) throw new Error(error.message)
  }, [schoolId])

  const deleteSlot = useCallback(async ({ classId, streamId, termId, day, period }) => {
    if (!schoolId || !classId || !termId) return
    let q = supabase
      .from('timetable_slots')
      .delete()
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .eq('term_id', termId)
      .eq('day_of_week', Number(day))
      .eq('period', Number(period))
      
    if (streamId) q = q.eq('stream_id', streamId)
    else q = q.is('stream_id', null)
    
    const { error } = await q
    if (error) throw new Error(error.message)
  }, [schoolId])

  const bulkUpsert = useCallback(async (rows) => {
    if (!schoolId) throw new Error('No school selected')
    if (!rows || rows.length === 0) return

    const cleaned = rows.map(r => ({
      school_id: schoolId,
      class_id: r.class_id,
      stream_id: r.stream_id || null,
      subject_id: r.subject_id,
      term_id: r.term_id,
      day_of_week: Number(r.day_of_week),
      period: Number(r.period),
      teacher_id: r.teacher_id || null,
    }))

    const { error } = await supabase
      .from('timetable_slots')
      .upsert(cleaned, { onConflict: 'school_id,class_id,stream_id,term_id,day_of_week,period' })
    if (error) throw new Error(error.message)
  }, [schoolId])

  return { loadSlots, upsertSlot, deleteSlot, bulkUpsert }
}