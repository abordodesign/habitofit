import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import useAdmin from '@/hooks/useAdmin'
import useAuth from '@/hooks/useAuth'

type AdminUser = {
  id: string
  name: string
  email: string
  photoURL?: string
  subscriptionStatus: string
  currentPeriodEnd: number | null
}

const AdminUsuarios = () => {
  const router = useRouter()
  const { loading, isAdmin } = useAdmin()
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/')
    }
  }, [loading, isAdmin, router])

  const fetchUsers = async () => {
    if (!user) return
    setLoadingList(true)
    setError('')
    try {
      const token = await user.getIdToken(true)
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        throw new Error('Nao foi possivel carregar usuarios.')
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Erro ao buscar usuarios:', err)
      setError('Nao foi possivel carregar usuarios.')
      setUsers([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
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

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Head>
        <title>Painel Master | Usuarios</title>
      </Head>

      <header className="px-8 py-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <p className="text-sm text-white/60">Acompanhe contas e assinaturas.</p>
          </div>
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition"
            onClick={() => router.push('/admin')}
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="px-8 py-8">
        <div className="rounded-xl border border-white/10 bg-[#1b1b1b] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lista de usuarios</h2>
            <button
              className="text-sm text-[#DF9DC0] hover:underline"
              onClick={fetchUsers}
              disabled={loadingList}
            >
              Atualizar
            </button>
          </div>

          {loadingList ? (
            <p className="mt-4 text-sm text-white/70">Carregando...</p>
          ) : (
            <>
              {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
              {users.length === 0 && !error && (
                <p className="mt-4 text-sm text-white/70">Nenhum usuario encontrado.</p>
              )}
              {users.length > 0 && (
                <div className="mt-4 space-y-4">
                  {users.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 border border-white/5 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={item.photoURL || '/Avatar.svg'}
                          alt={item.name || item.email}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold">{item.name || 'Sem nome'}</p>
                          <p className="text-xs text-white/60">{item.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white/80">{item.subscriptionStatus}</p>
                        <p className="text-xs text-white/50">
                          {item.currentPeriodEnd
                            ? new Date(item.currentPeriodEnd).toLocaleDateString('pt-BR')
                            : '--/--/----'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminUsuarios
