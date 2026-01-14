import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Row from './Row'
import { auth, buscarSeriesFavoritas } from '@/firebase'


type Serie = {
  id: string
  nome: string
  descricao: string
  imagem?: string | null
  rating: number
  categoria_id?: string | null
  data_criacao: string
}

const SeriesList = ({ mostrarFavoritas }: { mostrarFavoritas: boolean }) => {
  const [series, setSeries] = useState<Serie[]>([])
  const [favoritas, setFavoritas] = useState<Serie[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSeries = async () => {
      const { data, error } = await supabase.from('series').select('*')
      if (error) {
        console.error('Erro ao buscar series:', error)
        return
      }

      const todasSeries = data || []
      setSeries(todasSeries)

      const user = auth.currentUser
      if (user) {
        const favoritosIds = await buscarSeriesFavoritas(user.uid)
        const favoritasSeries = todasSeries.filter((serie) => favoritosIds.includes(serie.id))
        setFavoritas(favoritasSeries)
      }

      setLoading(false)
    }

    fetchSeries()
  }, [mostrarFavoritas])

  if (loading) return <p className="text-center text-white">Carregando series...</p>

  return (
    <div className="pt-14 space-y-10">
      <Row
        title={mostrarFavoritas ? "Minhas Series Favoritas" : "Aulas Gravadas - Mais populares"}
        series={mostrarFavoritas ? favoritas : series}
      />
      {!mostrarFavoritas && (
        <section className="pl-20">
          <h3 className="sectionTitle text-white text-base md:text-2xl">
            Parceiros Exclusivos da Habito FIT
          </h3>
          <div className="mt-4 flex items-center gap-8 overflow-x-auto scrollbar-hide py-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={`logo-parceiro-${index}`}
                className="flex h-16 min-w-[160px] items-center justify-center rounded-md bg-black/40 px-6"
              >
                <img src="/logo-parceiro-1.svg" alt="Logo parceiro" className="max-h-10 w-auto" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default SeriesList
