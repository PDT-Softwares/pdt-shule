import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useResources() {
  const { currentSchool } = useSchool()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('resources')
      .select('*, subjects(id, name)')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setResources(data ?? [])
    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  async function addResource({ title, description, url, subject_id }) {
    const { error: err } = await supabase
      .from('resources')
      .insert({
        school_id: schoolId,
        title,
        description: description || null,
        url: url || null,
        subject_id: subject_id || null,
      })
    if (err) throw new Error(err.message)
    await load()
  }

  async function updateResource(id, patch) {
    const { error: err } = await supabase
      .from('resources')
      .update(patch)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function deleteResource(id) {
    const { error: err } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  return {
    resources, loading, error,
    addResource, updateResource, deleteResource,
    reload: load,
  }
}
