import { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import useAdmin from '@/hooks/useAdmin'

const AdminHome = () => {
  const router = useRouter()
  const { loading, isAdmin, role } = useAdmin()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/')
    }
  }, [loading, isAdmin, router])

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
        <title>Painel Master | HabitoFit</title>
      </Head>

      <header className="!static px-6 md:px-8 py-6 border-b border-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Painel Master</h1>
            <p className="text-sm text-white/60">Acesso: {role || 'viewer'}</p>
          </div>
          <button
            className="self-start md:self-auto rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition"
            onClick={() => router.push('/')}
          >
            Voltar ao site
          </button>
        </div>
      </header>

      <main className="px-6 md:px-8 py-8 space-y-8 max-w-7xl mx-auto">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { title: 'Temporadas', description: 'Gerencie séries, capas e descrições.', href: '/admin/temporadas' },
            { title: 'Aulas', description: 'Cadastre vídeos, ordem e conteúdo.', href: '/admin/aulas' },
            { title: 'Notificações', description: 'Comunique novidades para os alunos.', href: '/admin/notificacoes' },
            { title: 'Usuarios', description: 'Contas e status de assinaturas.', href: '/admin/usuarios' },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-white/10 bg-[#1b1b1b] p-5 shadow min-h-[140px]"
            >
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-white/70">{card.description}</p>
              {card.href ? (
                <button
                  className="mt-4 text-sm text-[#DF9DC0] hover:underline"
                  onClick={() => router.push(card.href)}
                >
                  Abrir módulo
                </button>
              ) : (
                <button className="mt-4 text-sm text-[#DF9DC0] hover:underline" disabled>
                  Em breve
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1b1b1b] p-6">
          <h2 className="text-lg font-semibold">Status</h2>
          <p className="mt-2 text-sm text-white/70">
            Este é o esqueleto seguro do painel. Próximo passo: CRUD de Temporadas, Aulas e Notificações.
          </p>
          <div className="mt-4 text-xs text-white/50">
            Para liberar acesso, crie no Firestore: admins/{'{uid}'} com role: master | editor | viewer
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminHome
