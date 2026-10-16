import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useSubjects() {
  const { currentSchool } = useSchool()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('subjects')
      .select('*')
      .order('name', { ascending: true })
    if (err) setError(err.message)
    else setSubjects(data ?? [])
    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  async function addSubject({ name, code }) {
    const { error: err } = await supabase
      .from('subjects')
      .insert({ school_id: schoolId, name, code: code || null })
    if (err) throw new Error(err.message)
    await load()
  }

  async function updateSubject(id, patch) {
    const { error: err } = await supabase
      .from('subjects')
      .update(patch)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function deleteSubject(id) {
    const { error: err } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  return { subjects, loading, error, addSubject, updateSubject, deleteSubject, reload: load }
}
