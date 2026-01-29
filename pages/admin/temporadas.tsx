import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import useAuth from '@/hooks/useAuth'
import useAdmin from '@/hooks/useAdmin'

type Serie = {
  id: string
  nome: string
  descricao: string
  imagem?: string | null
  rating?: number | null
}

const emptyForm = {
  id: '',
  nome: '',
  descricao: '',
  imagem: '',
  rating: '',
}

const AdminTemporadas = () => {
  const router = useRouter()
  const { loading, isAdmin } = useAdmin()
  const { user } = useAuth()
  const [series, setSeries] = useState<Serie[]>([])
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploadPreview, setUploadPreview] = useState<string>('')

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/')
    }
  }, [loading, isAdmin, router])

  const fetchSeries = async () => {
    setLoadingList(true)
    const { data, error: fetchError } = await supabase
      .from('series')
      .select('id, nome, descricao, imagem, rating')
      .order('nome', { ascending: true })

    if (fetchError) {
      console.error('Erro ao buscar temporadas:', fetchError)
      setError('Nao foi possivel carregar as temporadas.')
      setSeries([])
    } else {
      setError('')
      setSeries(data || [])
    }
    setLoadingList(false)
  }

  useEffect(() => {
    if (isAdmin) {
      fetchSeries()
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

  const handleEdit = (serie: Serie) => {
    setForm({
      id: serie.id,
      nome: serie.nome || '',
      descricao: serie.descricao || '',
      imagem: serie.imagem || '',
      rating: serie.rating?.toString() || '',
    })
    setUploadError('')
    setUploadPreview(serie.imagem || '')
  }

  const handleCancel = () => {
    setForm({ ...emptyForm })
    setUploadFile(null)
    setUploadPreview('')
    setUploadError('')
    setError('')
  }

  const withCacheBuster = (url: string) => {
    if (!url) return url
    const joiner = url.includes('?') ? '&' : '?'
    return `${url}${joiner}t=${Date.now()}`
  }

  const uploadImage = async () => {
    if (!uploadFile) {
      setUploadError('Selecione uma imagem para upload.')
      return null
    }
    if (!user) {
      setUploadError('Usuario nao autenticado.')
      return null
    }

    setUploading(true)
    setUploadError('')

    const ext = uploadFile.name.split('.').pop() || 'png'
    const fileName = form.id ? `${form.id}.${ext}` : `temp-${Date.now()}.${ext}`

    const token = await user.getIdToken(true)
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result?.toString() || ''
        const cleaned = result.includes(',') ? result.split(',')[1] : result
        resolve(cleaned)
      }
      reader.onerror = () => reject(new Error('Falha ao ler arquivo.'))
      reader.readAsDataURL(uploadFile)
    })

    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bucket: 'series',
        path: fileName,
        contentType: uploadFile.type || 'image/png',
        base64,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      console.error('Erro ao enviar imagem:', payload)
      setUploadError(`Nao foi possivel enviar a imagem. ${payload.error || ''}`.trim())
      setUploading(false)
      return null
    }

    const publicUrl = payload.publicUrl as string
    if (!publicUrl) {
      setUploadError('Nao foi possivel obter a URL da imagem.')
      setUploading(false)
      return null
    }
    const previewUrl = withCacheBuster(publicUrl)
    setUploadPreview(previewUrl)
    setUploading(false)
    return publicUrl
  }

  const handleUpload = async () => {
    const publicUrl = await uploadImage()
    if (!publicUrl) return
    const cacheBustedUrl = withCacheBuster(publicUrl)
    setForm((prev) => ({ ...prev, imagem: cacheBustedUrl }))

    if (form.id) {
      const { error: updateError } = await supabase
        .from('series')
        .update({ imagem: cacheBustedUrl })
        .eq('id', form.id)
      if (updateError) {
        console.error('Erro ao salvar imagem:', updateError)
        setUploadError('Imagem enviada, mas nao foi salva na temporada.')
      } else {
        fetchSeries()
      }
    }
  }

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setError('Nome e obrigatorio.')
      return
    }

    setSaving(true)
    setError('')

    let imageUrl = form.imagem.trim() || null
    if (!imageUrl && uploadFile) {
      const uploaded = await uploadImage()
      imageUrl = uploaded || null
    }

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      imagem: imageUrl,
      rating: form.rating ? Number(form.rating) : null,
    }

    if (form.id) {
      const { error: updateError } = await supabase
        .from('series')
        .update(payload)
        .eq('id', form.id)
      if (updateError) {
        console.error('Erro ao atualizar temporada:', updateError)
        setError('Nao foi possivel atualizar.')
      } else {
        setForm({ ...emptyForm })
        fetchSeries()
      }
    } else {
      const { error: insertError } = await supabase.from('series').insert(payload)
      if (insertError) {
        console.error('Erro ao criar temporada:', insertError)
        setError('Nao foi possivel criar.')
      } else {
        setForm({ ...emptyForm })
        fetchSeries()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta temporada?')) return
    const { error: deleteError } = await supabase.from('series').delete().eq('id', id)
    if (deleteError) {
      console.error('Erro ao excluir temporada:', deleteError)
      setError('Nao foi possivel excluir.')
      return
    }
    fetchSeries()
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Head>
        <title>Painel Master | Temporadas</title>
      </Head>

      <header className="!static px-8 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Temporadas</h1>
            <p className="text-sm text-white/60">Gerencie series e capas.</p>
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
          <h2 className="text-lg font-semibold">{form.id ? 'Editar temporada' : 'Nova temporada'}</h2>
          {form.id ? (
            <p className="mt-1 text-xs text-white/60">
              Temporada selecionada: {series.find((item) => item.id === form.id)?.nome || 'Sem nome'}
            </p>
          ) : (
            <p className="mt-1 text-xs text-white/50">
              Voce pode fazer upload agora ou colar uma URL. A imagem sera usada ao criar.
            </p>
          )}
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
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
            <div className="rounded-md border border-white/10 p-3">
              <p className="text-xs text-white/60 mb-2">Upload de imagem (bucket: series)</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setUploadFile(file)
                  setUploadPreview(file ? URL.createObjectURL(file) : '')
                }}
                className="text-xs text-white/80"
              />
              {uploadError && <p className="mt-2 text-xs text-red-300">{uploadError}</p>}
              <button
                className="mt-3 rounded-md border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Enviando...' : 'Enviar imagem'}
              </button>
              {uploadPreview && (
                <div className="mt-3">
                  <p className="text-xs text-white/60 mb-2">Preview</p>
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-md object-cover"
                  />
                </div>
              )}
            </div>
            <input
              className="w-full rounded-md bg-[#141414] border border-white/10 p-3 text-sm text-white"
              placeholder="Rating (opcional)"
              value={form.rating}
              onChange={(e) => handleChange('rating', e.target.value)}
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
            <h2 className="text-lg font-semibold">Lista de temporadas</h2>
            <button
              className="text-sm text-[#DF9DC0] hover:underline"
              onClick={fetchSeries}
              disabled={loadingList}
            >
              Atualizar
            </button>
          </div>
          {loadingList ? (
            <p className="mt-4 text-sm text-white/70">Carregando...</p>
          ) : (
            <div className="mt-4 space-y-4">
              {series.length === 0 && (
                <p className="text-sm text-white/70">Nenhuma temporada encontrada.</p>
              )}
              {series.map((serie) => (
                <div
                  key={serie.id}
                  className="flex items-center justify-between gap-4 border border-white/5 rounded-lg p-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-16 w-16 rounded-md bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${serie.imagem || '/card.png'}')`,
                      }}
                    />
                    <div>
                      <p className="font-semibold">{serie.nome}</p>
                      <p className="text-xs text-white/60 line-clamp-2">{serie.descricao}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-sm text-[#DF9DC0] hover:underline"
                      onClick={() => handleEdit(serie)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-sm text-red-300 hover:underline"
                      onClick={() => handleDelete(serie.id)}
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

export default AdminTemporadas
