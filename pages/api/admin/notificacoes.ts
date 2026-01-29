import type { NextApiRequest, NextApiResponse } from 'next'
import admin from '@/lib/firebaseAdmin'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const isAdmin = async (uid: string) => {
  const snap = await admin.firestore().collection('admins').doc(uid).get()
  return snap.exists
}

const tables = ['notificacoes', 'notifications'] as const

const isMissingRelation = (error: any) =>
  typeof error?.message === 'string' && error.message.includes('does not exist')

const getTable = async () => {
  for (const table of tables) {
    const test = await supabaseAdmin.from(table).select('id').limit(1)
    if (!test.error) return table
  }
  return tables[0]
}

const withFallback = async <T>(
  primary: (table: string) => Promise<T & { error?: any }>,
  fallback: (table: string) => Promise<T & { error?: any }>
) => {
  const first = await primary(tables[0])
  if (!first.error) return { result: first, table: tables[0] }
  if (isMissingRelation(first.error)) {
    const second = await fallback(tables[1])
    return { result: second, table: tables[1] }
  }
  return { result: first, table: tables[0] }
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

    if (req.method === 'GET') {
      const { result, table } = await withFallback(
        (t) => supabaseAdmin.from(t).select('*').order('id', { ascending: false }),
        (t) => supabaseAdmin.from(t).select('*').order('id', { ascending: false })
      )
      if (result.error) return res.status(400).json({ error: result.error.message })
      return res.status(200).json({ data: result.data, table })
    }

    if (req.method === 'POST') {
      const { titulo, descricao, imagem } = req.body || {}
      const { result, table } = await withFallback(
        (t) =>
          supabaseAdmin
            .from(t)
            .insert(t === 'notifications' ? { title: titulo, body: descricao, image: imagem } : { titulo, descricao, imagem })
            .select('*')
            .single(),
        (t) =>
          supabaseAdmin
            .from(t)
            .insert(t === 'notifications' ? { title: titulo, body: descricao, image: imagem } : { titulo, descricao, imagem })
            .select('*')
            .single()
      )
      if (result.error) return res.status(400).json({ error: result.error.message })
      return res.status(200).json({ data: result.data, table })
    }

    if (req.method === 'PUT') {
      const { id, titulo, descricao, imagem } = req.body || {}
      const { result, table } = await withFallback(
        (t) =>
          supabaseAdmin
            .from(t)
            .update(t === 'notifications' ? { title: titulo, body: descricao, image: imagem } : { titulo, descricao, imagem })
            .eq('id', id)
            .select('*')
            .single(),
        (t) =>
          supabaseAdmin
            .from(t)
            .update(t === 'notifications' ? { title: titulo, body: descricao, image: imagem } : { titulo, descricao, imagem })
            .eq('id', id)
            .select('*')
            .single()
      )
      if (result.error) return res.status(400).json({ error: result.error.message })
      return res.status(200).json({ data: result.data, table })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {}
      const { result, table } = await withFallback(
        (t) => supabaseAdmin.from(t).delete().eq('id', id),
        (t) => supabaseAdmin.from(t).delete().eq('id', id)
      )
      if (result.error) return res.status(400).json({ error: result.error.message })
      return res.status(200).json({ ok: true, table })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Notificacoes API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal error' })
  }
}
