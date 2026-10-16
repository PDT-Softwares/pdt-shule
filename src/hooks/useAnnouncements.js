import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useAnnouncements() {
  const { currentSchool } = useSchool()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setAnnouncements(data ?? [])
    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  async function addAnnouncement({ title, body, audience }) {
    const { error: err } = await supabase
      .from('announcements')
      .insert({ school_id: schoolId, title, body, audience })
    if (err) throw new Error(err.message)
    await load()
  }

  async function updateAnnouncement(id, patch) {
    const { error: err } = await supabase
      .from('announcements')
      .update(patch)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function deleteAnnouncement(id) {
    const { error: err } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  return {
    announcements, loading, error,
    addAnnouncement, updateAnnouncement, deleteAnnouncement,
    reload: load,
  }
}
