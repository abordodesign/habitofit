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

const pickStore = async () => {
  for (const table of tables) {
    const test = await supabaseAdmin.from(table).select('id').limit(1)
    if (!test.error) return { type: 'supabase' as const, table }
  }
  return { type: 'firestore' as const }
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

    const store = await pickStore()

    if (req.method === 'GET') {
      if (store.type === 'firestore') {
        const snap = await admin.firestore().collection('notificacoes').orderBy('createdAt', 'desc').get()
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        return res.status(200).json({ data, table: 'firestore' })
      }
      let result = await supabaseAdmin.from(store.table).select('*').order('id', { ascending: false })
      if (result.error && isMissingRelation(result.error) && store.table !== tables[1]) {
        result = await supabaseAdmin.from(tables[1]).select('*').order('id', { ascending: false })
      }
      if (result.error) return res.status(400).json({ error: result.error.message })
      return res.status(200).json({ data: result.data, table: store.table })
    }

    if (req.method === 'POST') {
      const { titulo, descricao, imagem } = req.body || {}
      if (store.type === 'firestore') {
        const ref = await admin.firestore().collection('notificacoes').add({
          titulo,
          descricao,
          imagem,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        const doc = await ref.get()
        return res.status(200).json({ data: { id: doc.id, ...doc.data() }, table: 'firestore' })
      }
      const payload =
        store.table === 'notifications'
          ? { title: titulo, body: descricao, image: imagem }
          : { titulo, descricao, imagem }
      let result = await supabaseAdmin.from(store.table).insert(payload).select('*').single()
      if (result.error && isMissingRelation(result.error) && store.table !== tables[1]) {
        const fallbackPayload =
          tables[1] === 'notifications'
            ? { title: titulo, body: descricao, image: imagem }
            : { titulo, descricao, imagem }
        result = await supabaseAdmin.from(tables[1]).insert(fallbackPayload).select('*').single()
      }
      if (result.error) return res.status(400).json({ error: result.error.message })
      return res.status(200).json({ data: result.data, table: store.table })
    }

    if (req.method === 'PUT') {
      const { id, titulo, descricao, imagem } = req.body || {}
      if (store.type === 'firestore') {
        await admin.firestore().collection('notificacoes').doc(id).set(
          {
            titulo,
            descricao,
            imagem,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
        const doc = await admin.firestore().collection('notificacoes').doc(id).get()
        return res.status(200).json({ data: { id: doc.id, ...doc.data() }, table: 'firestore' })
      }
      const payload =
        store.table === 'notifications'
          ? { title: titulo, body: descricao, image: imagem }
          : { titulo, descricao, imagem }
      let result = await supabaseAdmin.from(store.table).update(payload).eq('id', id).select('*').single()
      if (result.error && isMissingRelation(result.error) && store.table !== tables[1]) {
        const fallbackPayload =
          tables[1] === 'notifications'
            ? { title: titulo, body: descricao, image: imagem }
            : { titulo, descricao, imagem }
        result = await supabaseAdmin.from(tables[1]).update(fallbackPayload).eq('id', id).select('*').single()
      }
      if (result.error) return res.status(400).json({ error: result.error.message })
      return res.status(200).json({ data: result.data, table: store.table })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {}
      if (store.type === 'firestore') {
        await admin.firestore().collection('notificacoes').doc(id).delete()
        return res.status(200).json({ ok: true, table: 'firestore' })
      }
      let result = await supabaseAdmin.from(store.table).delete().eq('id', id)
      if (result.error && isMissingRelation(result.error) && store.table !== tables[1]) {
        result = await supabaseAdmin.from(tables[1]).delete().eq('id', id)
      }
      if (result.error) return res.status(400).json({ error: result.error.message })
      return res.status(200).json({ ok: true, table: store.table })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Notificacoes API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal error' })
  }
}
