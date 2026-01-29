import type { NextApiRequest, NextApiResponse } from 'next'
import admin from '@/lib/firebaseAdmin'

const isAdmin = async (uid: string) => {
  const snap = await admin.firestore().collection('admins').doc(uid).get()
  return snap.exists
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  if (!admin.apps.length) {
    return res.status(500).json({ error: 'Firebase Admin not configured' })
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid

    if (!(await isAdmin(uid))) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const usersSnap = await admin.firestore().collection('users').get()
    const users = []

    for (const doc of usersSnap.docs) {
      const data = doc.data()
      const userId = doc.id
      let subscriptionStatus = 'unknown'
      let currentPeriodEnd: number | null = null

      const subsSnap = await admin
        .firestore()
        .collection('customers')
        .doc(userId)
        .collection('subscriptions')
        .orderBy('current_period_end', 'desc')
        .limit(1)
        .get()

      if (!subsSnap.empty) {
        const sub = subsSnap.docs[0].data()
        subscriptionStatus = sub.status || 'unknown'
        const periodEnd = sub.current_period_end?.seconds
          ? sub.current_period_end.seconds * 1000
          : sub.current_period_end?.toDate?.()?.getTime?.()
        currentPeriodEnd = periodEnd || null
      }

      users.push({
        id: userId,
        name: data.name || '',
        email: data.email || '',
        photoURL: data.photoURL || '',
        subscriptionStatus,
        currentPeriodEnd,
      })
    }

    return res.status(200).json({ users })
  } catch (error: any) {
    console.error('Erro ao buscar usuarios:', error)
    return res.status(500).json({ error: 'Internal error' })
  }
}
