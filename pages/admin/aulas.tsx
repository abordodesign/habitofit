import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import useAdmin from '@/hooks/useAdmin'

type Serie = {
  id: string
  nome: string
}

type Aula = {
  id: string
  nome: string
  subtitulo: string
  video: string
  grupo_id: string
  ordem?: number | null
}

const emptyForm = {
  id: '',
  nome: '',
  subtitulo: '',
  video: '',
  grupo_id: '',
  ordem: '',
}

const AdminAulas = () => {
  const router = useRouter()
  const { loading, isAdmin } = useAdmin()
  const [series, setSeries] = useState<Serie[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/')
    }
  }, [loading, isAdmin, router])

  const fetchSeries = async () => {
    const { data, error: fetchError } = await supabase
      .from('series')
      .select('id, nome')
      .order('nome', { ascending: true })
    if (fetchError) {
      console.error('Erro ao buscar series:', fetchError)
      setSeries([])
      return
    }
    setSeries(data || [])
  }

  const fetchAulas = async () => {
    setLoadingList(true)
    const { data, error: fetchError } = await supabase
      .from('aulas')
      .select('id, nome, subtitulo, video, grupo_id, ordem')
      .order('ordem', { ascending: true })
    if (fetchError) {
      console.error('Erro ao buscar aulas:', fetchError)
      setError('Nao foi possivel carregar as aulas.')
      setAulas([])
    } else {
      setError('')
      setAulas(data || [])
    }
    setLoadingList(false)
  }

  useEffect(() => {
    if (isAdmin) {
      fetchSeries()
      fetchAulas()
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

  const handleEdit = (aula: Aula) => {
    setForm({
      id: aula.id,
      nome: aula.nome || '',
      subtitulo: aula.subtitulo || '',
      video: aula.video || '',
      grupo_id: aula.grupo_id || '',
      ordem: aula.ordem?.toString() || '',
    })
  }

  const handleCancel = () => {
    setForm({ ...emptyForm })
    setError('')
  }

  const handleSave = async () => {
    if (!form.nome.trim() || !form.grupo_id) {
      setError('Nome e temporada sao obrigatorios.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      nome: form.nome.trim(),
      subtitulo: form.subtitulo.trim(),
      video: form.video.trim(),
      grupo_id: form.grupo_id,
      ordem: form.ordem ? Number(form.ordem) : null,
    }

    if (form.id) {
      const { error: updateError } = await supabase
        .from('aulas')
        .update(payload)
        .eq('id', form.id)
      if (updateError) {
        console.error('Erro ao atualizar aula:', updateError)
        setError('Nao foi possivel atualizar.')
      } else {
        setForm({ ...emptyForm })
        fetchAulas()
      }
    } else {
      const { error: insertError } = await supabase.from('aulas').insert(payload)
      if (insertError) {
        console.error('Erro ao criar aula:', insertError)
        setError('Nao foi possivel criar.')
      } else {
        setForm({ ...emptyForm })
        fetchAulas()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta aula?')) return
    const { error: deleteError } = await supabase.from('aulas').delete().eq('id', id)
    if (deleteError) {
      console.error('Erro ao excluir aula:', deleteError)
      setError('Nao foi possivel excluir.')
      return
    }
    fetchAulas()
  }

  const resolveSerieName = (id: string) => {
    const serie = series.find((item) => item.id === id)
    return serie?.nome || 'Sem temporada'
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Head>
        <title>Painel Master | Aulas</title>
      </Head>

      <header className="!static px-8 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Aulas</h1>
            <p className="text-sm text-white/60">Gerencie videos e conteudo.</p>
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
          <h2 className="text-lg font-semibold">{form.id ? 'Editar aula' : 'Nova aula'}</h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
            />
            <textarea
              className="w-full min-h-[120px] rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="Subtitulo"
              value={form.subtitulo}
              onChange={(e) => handleChange('subtitulo', e.target.value)}
            />
            <input
              className="w-full rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="URL do video"
              value={form.video}
              onChange={(e) => handleChange('video', e.target.value)}
            />
            <select
              className="w-full rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              value={form.grupo_id}
              onChange={(e) => handleChange('grupo_id', e.target.value)}
            >
              <option value="">Selecione a temporada</option>
              {series.map((serie) => (
                <option key={serie.id} value={serie.id}>
                  {serie.nome}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="Ordem (opcional)"
              value={form.ordem}
              onChange={(e) => handleChange('ordem', e.target.value)}
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
            <h2 className="text-lg font-semibold">Lista de aulas</h2>
            <button
              className="text-sm text-[#DF9DC0] hover:underline"
              onClick={fetchAulas}
              disabled={loadingList}
            >
              Atualizar
            </button>
          </div>
          {loadingList ? (
            <p className="mt-4 text-sm text-white/70">Carregando...</p>
          ) : (
            <div className="mt-4 space-y-4">
              {aulas.length === 0 && (
                <p className="text-sm text-white/70">Nenhuma aula encontrada.</p>
              )}
              {aulas.map((aula) => (
                <div
                  key={aula.id}
                  className="flex items-center justify-between gap-4 border border-white/5 rounded-lg p-4"
                >
                  <div>
                    <p className="font-semibold">{aula.nome}</p>
                    <p className="text-xs text-white/60 line-clamp-1">{aula.subtitulo}</p>
                    <p className="text-xs text-white/40">Temporada: {resolveSerieName(aula.grupo_id)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-sm text-[#DF9DC0] hover:underline"
                      onClick={() => handleEdit(aula)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-sm text-red-300 hover:underline"
                      onClick={() => handleDelete(aula.id)}
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

export default AdminAulas
