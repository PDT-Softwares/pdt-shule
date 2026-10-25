import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSchool } from '../contexts/SchoolContext'

export function useTerms() {
  const { currentSchool } = useSchool()
  const [years, setYears] = useState([])
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const schoolId = currentSchool?.school.id

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    setError('')

    const [yRes, tRes] = await Promise.all([
      supabase.from('academic_years').select('*').order('name', { ascending: false }),
      supabase.from('terms')
        .select('*, academic_years(id, name)')
        .order('created_at', { ascending: true }),
    ])

    if (yRes.error) setError(yRes.error.message)
    else setYears(yRes.data ?? [])

    if (tRes.error) setError(tRes.error.message)
    else setTerms(tRes.data ?? [])

    setLoading(false)
  }, [schoolId])

  useEffect(() => { load() }, [load])

  async function addYear({ name, start_date, end_date }) {
    const { error: err } = await supabase
      .from('academic_years')
      .insert({
        school_id: schoolId,
        name,
        start_date: start_date || null,
        end_date: end_date || null,
      })
    if (err) throw new Error(err.message)
    await load()
  }

  async function deleteYear(id) {
    const { error: err } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function addTerm({ academic_year_id, name, start_date, end_date }) {
    const { error: err } = await supabase
      .from('terms')
      .insert({
        school_id: schoolId,
        academic_year_id,
        name,
        start_date: start_date || null,
        end_date: end_date || null,
      })
    if (err) throw new Error(err.message)
    await load()
  }

  async function deleteTerm(id) {
    const { error: err } = await supabase
      .from('terms')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function setCurrentYear(id) {
    await supabase.from('academic_years').update({ is_current: false }).eq('school_id', schoolId)
    const { error: err } = await supabase
      .from('academic_years')
      .update({ is_current: true })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function setCurrentTerm(id) {
    await supabase.from('terms').update({ is_current: false }).eq('school_id', schoolId)
    const { error: err } = await supabase
      .from('terms')
      .update({ is_current: true })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function updateYear(id, patch) {
    const { error: err } = await supabase
      .from('academic_years')
      .update(patch)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  async function updateTerm(id, patch) {
    const { error: err } = await supabase
      .from('terms')
      .update(patch)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await load()
  }

  return {
    years, terms, loading, error,
    addYear, deleteYear, addTerm, deleteTerm,
    setCurrentYear, setCurrentTerm,
    updateYear, updateTerm,
    reload: load,
  }
}