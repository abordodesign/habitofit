import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import useAdmin from '@/hooks/useAdmin'

type Notificacao = {
  id: string
  titulo: string
  descricao: string
  imagem?: string | null
}

const emptyForm = {
  id: '',
  titulo: '',
  descricao: '',
  imagem: '',
}

const AdminNotificacoes = () => {
  const router = useRouter()
  const { loading, isAdmin } = useAdmin()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/')
    }
  }, [loading, isAdmin, router])

  const fetchNotificacoes = async () => {
    setLoadingList(true)
    let response: any = await supabase
      .from('notificacoes')
      .select('id, titulo, descricao, imagem')
      .order('id', { ascending: false })

    if (response.error) {
      response = (await supabase
        .from('notifications')
        .select('id, title, body, image')
        .order('id', { ascending: false })) as any
    }

    if (response.error) {
      console.error('Erro ao buscar notificacoes:', response.error)
      setError('Nao foi possivel carregar as notificacoes.')
      setNotificacoes([])
    } else {
      setError('')
      const data = response.data || []
      const mapped = data.map((item: any) => ({
        id: String(item.id),
        titulo: item.titulo ?? item.title ?? '',
        descricao: item.descricao ?? item.body ?? '',
        imagem: item.imagem ?? item.image ?? '',
      }))
      setNotificacoes(mapped)
    }
    setLoadingList(false)
  }

  useEffect(() => {
    if (isAdmin) {
      fetchNotificacoes()
    }
  }, [isAdmin])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <p>Verificando acesso...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEdit = (item: Notificacao) => {
    setForm({
      id: item.id,
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      imagem: item.imagem || '',
    })
  }

  const handleCancel = () => {
    setForm({ ...emptyForm })
    setError('')
  }

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      setError('Titulo e obrigatorio.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      imagem: form.imagem.trim() || null,
    }

    const baseTable = 'notificacoes'
    const targetTable = baseTable

    if (form.id) {
      const { error: updateError } = await supabase
        .from(targetTable)
        .update(payload)
        .eq('id', form.id)
      if (updateError) {
        console.error('Erro ao atualizar notificacao:', updateError)
        setError('Nao foi possivel atualizar.')
      } else {
        setForm({ ...emptyForm })
        fetchNotificacoes()
      }
    } else {
      const { error: insertError } = await supabase.from(targetTable).insert(payload)
      if (insertError) {
        console.error('Erro ao criar notificacao:', insertError)
        setError('Nao foi possivel criar.')
      } else {
        setForm({ ...emptyForm })
        fetchNotificacoes()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta notificacao?')) return
    const { error: deleteError } = await supabase.from('notificacoes').delete().eq('id', id)
    if (deleteError) {
      console.error('Erro ao excluir notificacao:', deleteError)
      setError('Nao foi possivel excluir.')
      return
    }
    fetchNotificacoes()
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Head>
        <title>Painel Master | Notificacoes</title>
      </Head>

      <header className="px-8 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notificacoes</h1>
            <p className="text-sm text-white/60">Gerencie mensagens do app.</p>
          </div>
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition"
            onClick={() => router.push('/admin')}
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="px-8 py-8 grid gap-8 lg:grid-cols-[380px_1fr]">
        <section className="rounded-xl border border-white/10 bg-[#1b1b1b] p-6">
          <h2 className="text-lg font-semibold">{form.id ? 'Editar notificacao' : 'Nova notificacao'}</h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="Titulo"
              value={form.titulo}
              onChange={(e) => handleChange('titulo', e.target.value)}
            />
            <textarea
              className="w-full min-h-[120px] rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="Descricao"
              value={form.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
            />
            <input
              className="w-full rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="URL da imagem"
              value={form.imagem}
              onChange={(e) => handleChange('imagem', e.target.value)}
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button
              className="rounded-md bg-[#DF9DC0] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : form.id ? 'Atualizar' : 'Criar'}
            </button>
            <button
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              onClick={handleCancel}
              disabled={saving}
            >
              Limpar
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1b1b1b] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lista de notificacoes</h2>
            <button
              className="text-sm text-[#DF9DC0] hover:underline"
              onClick={fetchNotificacoes}
              disabled={loadingList}
            >
              Atualizar
            </button>
          </div>
          {loadingList ? (
            <p className="mt-4 text-sm text-white/70">Carregando...</p>
          ) : (
            <div className="mt-4 space-y-4">
              {notificacoes.length === 0 && (
                <p className="text-sm text-white/70">Nenhuma notificacao encontrada.</p>
              )}
              {notificacoes.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border border-white/5 rounded-lg p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-16 w-16 rounded-md bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${item.imagem || '/card.png'}')`,
                      }}
                    />
                    <div>
                      <p className="font-semibold">{item.titulo}</p>
                      <p className="text-xs text-white/60 line-clamp-2">{item.descricao}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-sm text-[#DF9DC0] hover:underline"
                      onClick={() => handleEdit(item)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-sm text-red-300 hover:underline"
                      onClick={() => handleDelete(item.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default AdminNotificacoes
