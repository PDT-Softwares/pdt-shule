import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SchoolContext = createContext(null)

export function SchoolProvider({ children }) {
  const { user } = useAuth()
  const [memberships, setMemberships] = useState(null)   // array of { school, role }
  const [currentSchool, setCurrentSchool] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setMemberships(null)
      setCurrentSchool(null)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('school_members')
        .select('role, schools(id, name, slug, status)')
        .order('created_at', { ascending: true })

      const list = (data ?? []).map((m) => ({
        role: m.role,
        school: m.schools,
      }))
      setMemberships(list)

      const savedId = localStorage.getItem('pdt_current_school_id')
      const saved = list.find((m) => m.school.id === savedId)
      setCurrentSchool(saved ?? list[0] ?? null)

      setLoading(false)
    }

    load()
  }, [user])

  function chooseSchool(schoolId) {
    const found = memberships?.find((m) => m.school.id === schoolId)
    if (found) {
      setCurrentSchool(found)
      localStorage.setItem('pdt_current_school_id', schoolId)
    }
  }

  const value = {
    memberships,
    currentSchool,
    currentRole: currentSchool?.role ?? null,
    chooseSchool,
    loading,
  }

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
}

export function useSchool() {
  return useContext(SchoolContext)
}
