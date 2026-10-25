import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useStudents() {
  const { currentSchool } = useSchool()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('students')
      .select('*, classes(id, name), streams(id, name)')
      .order('admission_number', { ascending: true })
    if (err) setError(err.message)
    else setStudents(data ?? [])
    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  async function addStudent(payload) {
    const { error: err } = await supabase
      .from('students')
      .insert({ school_id: schoolId, ...payload })
    if (err) throw new Error(err.message)
    await load()
  }

  async function updateStudent(id, patch) {
    const { error: err } = await supabase
      .from('students')
      .update(patch)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function deleteStudent(id) {
    const { error: err } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  return { students, loading, error, addStudent, updateStudent, deleteStudent, reload: load }
}