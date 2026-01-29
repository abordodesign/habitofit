import type { NextApiRequest, NextApiResponse } from 'next'
import admin from '@/lib/firebaseAdmin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const isAdmin = async (uid: string) => {
  const snap = await admin.firestore().collection('admins').doc(uid).get()
  return snap.exists
}

const getTable = async () => {
  const tables = ['notificacoes', 'notifications']
  for (const table of tables) {
    const test = await supabaseAdmin.from(table).select('id').limit(1)
    if (!test.error) return table
  }
  return 'notificacoes'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Missing token' })
  if (!admin.apps.length) return res.status(500).json({ error: 'Firebase Admin not configured' })

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const uid = decoded.uid
    if (!(await isAdmin(uid))) return res.status(403).json({ error: 'Forbidden' })

    const table = await getTable()

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .order('id', { ascending: false })
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ data, table })
    }

    if (req.method === 'POST') {
      const { titulo, descricao, imagem } = req.body || {}
      const payload =
        table === 'notifications'
          ? { title: titulo, body: descricao, image: imagem }
          : { titulo, descricao, imagem }
      const { data, error } = await supabaseAdmin.from(table).insert(payload).select('*').single()
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ data, table })
    }

    if (req.method === 'PUT') {
      const { id, titulo, descricao, imagem } = req.body || {}
      const payload =
        table === 'notifications'
          ? { title: titulo, body: descricao, image: imagem }
          : { titulo, descricao, imagem }
      const { data, error } = await supabaseAdmin.from(table).update(payload).eq('id', id).select('*').single()
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ data, table })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {}
      const { error } = await supabaseAdmin.from(table).delete().eq('id', id)
      if (error) return res.status(400).json({ error: error.message })
      return res.status(200).json({ ok: true, table })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Notificacoes API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal error' })
  }
}
