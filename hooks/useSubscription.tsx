import React, { useState, useEffect } from 'react'
import { checkSubscriptionStatus } from '@/firebase'
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

    const fetchSubscriptionStatus = async () => {
      try {
        const subscriptionData = await checkSubscriptionStatus()
        const hasActiveSubscription: boolean = !!subscriptionData
        setHasSubscription(hasActiveSubscription)
      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error)
        setHasSubscription(false)
      }
    }

    fetchSubscriptionStatus()
  }, [authReady, user])

  return hasSubscription
}

export default useSubscription
