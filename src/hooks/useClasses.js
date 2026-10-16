import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useClasses() {
  const { currentSchool } = useSchool()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('classes')
      .select('*')
      .order('level', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
    if (err) setError(err.message)
    else setClasses(data ?? [])
    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  async function addClass({ name, level }) {
    const { error: err } = await supabase
      .from('classes')
      .insert({ school_id: schoolId, name, level: level || null })
    if (err) throw new Error(err.message)
    await load()
  }

  async function updateClass(id, patch) {
    const { error: err } = await supabase
      .from('classes')
      .update(patch)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function deleteClass(id) {
    const { error: err } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  return { classes, loading, error, addClass, updateClass, deleteClass, reload: load }
}
