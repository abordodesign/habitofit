import type { NextApiRequest, NextApiResponse } from 'next'
import admin from '@/lib/firebaseAdmin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const isAdmin = async (uid: string) => {
  const snap = await admin.firestore().collection('admins').doc(uid).get()
  return snap.exists
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    const { bucket, path, contentType, base64 } = req.body || {}
    if (!bucket || !path || !base64) {
      return res.status(400).json({ error: 'Missing upload data' })
    }

    const buffer = Buffer.from(base64, 'base64')
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, { upsert: true, contentType: contentType || 'image/png' })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    const publicUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
    return res.status(200).json({ publicUrl })
  } catch (error: any) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Internal error' })
  }
}
