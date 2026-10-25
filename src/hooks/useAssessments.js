import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useAssessments() {
  const { currentSchool } = useSchool()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('assessments')
      .select('*, terms(id, name, academic_years(name))')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true })
    if (err) setError(err.message)
    else setAssessments(data ?? [])
    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  async function addAssessment({ term_id, name, weight, max_score, deadline }) {
    const { error: err } = await supabase
      .from('assessments')
      .insert({
        school_id: schoolId,
        term_id,
        name,
        weight: weight || 100,
        max_score: max_score || 100,
        // Hapa ndio fix: Kama deadline ni empty string, tunatuma null
        deadline: deadline && deadline.trim() !== '' ? deadline : null, 
      })
    if (err) throw new Error(err.message)
    await load()
  }

  async function updateAssessment(id, patch) {
    const { error: err } = await supabase.from('assessments').update(patch).eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function deleteAssessment(id) {
    const { error: err } = await supabase.from('assessments').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  return { assessments, loading, error, addAssessment, updateAssessment, deleteAssessment, reload: load }
}