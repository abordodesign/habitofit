import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import useAuth from './useAuth'
import { db } from '@/firebase'

type AdminRole = 'master' | 'editor' | 'viewer'

type AdminState = {
  loading: boolean
  isAdmin: boolean
  role: AdminRole | null
}

const useAdmin = (): AdminState => {
  const { user, authReady } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<AdminRole | null>(null)

  useEffect(() => {
    let active = true

    const checkAdmin = async () => {
      if (!authReady) return
      if (!user?.uid) {
        if (!active) return
        setIsAdmin(false)
        setRole(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const snap = await getDoc(doc(db, 'admins', user.uid))
        if (!active) return
        if (snap.exists()) {
          const data = snap.data() as { role?: AdminRole }
          setIsAdmin(true)
          setRole(data?.role ?? 'viewer')
        } else {
          setIsAdmin(false)
          setRole(null)
        }
      } catch (error) {
        console.error('Erro ao verificar admin:', error)
        setIsAdmin(false)
        setRole(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    checkAdmin()

    return () => {
      active = false
    }
  }, [authReady, user?.uid])

  return { loading, isAdmin, role }
}

export default useAdmin
