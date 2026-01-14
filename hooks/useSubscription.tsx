import React, { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
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

    const ref = collection(db, 'customers', user.uid, 'subscriptions')
    const allowedStatuses = new Set(['active', 'trialing', 'incomplete'])

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const hasAllowedStatus = snapshot.docs.some(
          (doc) => allowedStatuses.has(doc.data().status)
        )
        setHasSubscription(hasAllowedStatus)
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
