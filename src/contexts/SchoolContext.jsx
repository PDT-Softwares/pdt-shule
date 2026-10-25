import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SchoolContext = createContext(null)

export function SchoolProvider({ children }) {
  const { user } = useAuth()
  const [memberships, setMemberships] = useState(null)
  const [currentSchool, setCurrentSchool] = useState(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setMemberships(null)
      setCurrentSchool(null)
      setIsPlatformAdmin(false)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)

      // Kama ni wemapeter, ni platform admin automatically
      const isOwner = user.email === 'wemapeter44@gmail.com'
      setIsPlatformAdmin(isOwner)

      // Kama ni owner, hana haja ya school_members
      if (isOwner) {
        setMemberships([])
        setCurrentSchool(null)
        setLoading(false)
        return
      }

      // Kama ni mtu mwingine, angalia school_members
      const { data } = await supabase
        .from('school_members')
        .select('role, class_id, stream_id, schools(id, name, slug, status)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      const list = (data ?? []).map((m) => ({
        role: m.role,
        class_id: m.class_id,
        stream_id: m.stream_id,
        user_id: user.id,
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
    currentSchoolMembership: currentSchool,
    isPlatformAdmin,
    chooseSchool,
    loading,
  }

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
}

export function useSchool() {
  return useContext(SchoolContext)
}