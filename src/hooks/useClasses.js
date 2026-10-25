import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'
import { useAuth } from '../contexts/AuthContext'

export function useClasses() {
  const { currentSchool, currentRole } = useSchool()
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [allClasses, setAllClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId || !user) return
    setLoading(true)
    setError('')

    // 1. Pata classes zote za shule
    const { data: allData, error: allErr } = await supabase
      .from('classes')
      .select('*')
      .order('level', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })

    if (allErr) {
      setError(allErr.message)
      setLoading(false)
      return
    }
    setAllClasses(allData ?? [])

    // 2. Kama ni admin, classes = zote
    if (currentRole === 'admin') {
      setClasses(allData ?? [])
      setLoading(false)
      return
    }

    // 3. Kama ni class teacher, classes = zile alizopewa tu
    const { data: assignments } = await supabase
      .from('teacher_subject_assignments')
      .select('class_id')
      .eq('teacher_id', user.id)

    const classIds = [...new Set((assignments ?? []).map(a => a.class_id))]
    const filtered = (allData ?? []).filter(c => classIds.includes(c.id))

    // 3b. Hakikisha class ya classteacher ipo
    if (currentSchool?.class_id) {
      const hasClass = filtered.some(c => c.id === currentSchool.class_id)
      if (!hasClass) {
        const own = (allData ?? []).find(c => c.id === currentSchool.class_id)
        if (own) filtered.push(own)
      }
    }

    setClasses(filtered)
    setLoading(false)
  }, [schoolId, user, currentRole, currentSchool])

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

  return { classes, allClasses, loading, error, addClass, updateClass, deleteClass, reload: load }
}