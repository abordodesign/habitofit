import React, { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/firebase'
import useAuth from './useAuth'

function useSubscription() {
  const [hasSubscription, setHasSubscription] = useState(false)
  const { authReady, user } = useAuth()

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      setHasSubscription(false)
      return
    }

    const q = query(
      collection(db, 'customers', user.uid, 'subscriptions'),
      where('status', '==', 'active')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setHasSubscription(!snapshot.empty)
      },
      (error) => {
        console.error('Erro ao verificar status da assinatura:', error)
        setHasSubscription(false)
      }
    )

    return () => unsubscribe()
  }, [authReady, user])

  return hasSubscription
}

export default useSubscription
