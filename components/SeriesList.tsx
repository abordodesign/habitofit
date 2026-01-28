import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Row from './Row'
import { buscarFavoritosDetalhados, buscarSeriesFavoritas } from '@/firebase'
import useAuth from '@/hooks/useAuth'


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
  const { user } = useAuth()
  const [series, setSeries] = useState<Serie[]>([])
  const [favoritas, setFavoritas] = useState<Serie[]>([])
  const [favoritosIds, setFavoritosIds] = useState<string[]>([])
  const [favoritosDetalhados, setFavoritosDetalhados] = useState<Serie[]>([])
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

      setLoading(false)
    }

    fetchSeries()
  }, [mostrarFavoritas])

  useEffect(() => {
    let isActive = true

    const carregarFavoritos = async () => {
      if (!user?.uid) {
        setFavoritosIds([])
        setFavoritosDetalhados([])
        return
      }

      const detalhados = await buscarFavoritosDetalhados(user.uid)
      if (!isActive) return
      setFavoritosDetalhados(
        detalhados.map((item: any) => ({
          id: String(item.serieId),
          nome: item.nome ?? 'Sem título',
          descricao: item.descricao ?? '',
          imagem: item.imagem ?? '/card.svg',
          rating: Number(item.rating ?? 0),
          categoria_id: null,
          data_criacao: '',
        }))
      )

      const ids = await buscarSeriesFavoritas(user.uid)
      if (!isActive) return
      setFavoritosIds(ids.map((id) => String(id)))
    }

    carregarFavoritos()

    return () => {
      isActive = false
    }
  }, [user?.uid, mostrarFavoritas])

  useEffect(() => {
    if (!favoritosIds.length) {
      setFavoritas([])
      return
    }

    const favoritasSeries = series.filter((serie) => favoritosIds.includes(String(serie.id)))
    setFavoritas(favoritasSeries)
  }, [favoritosIds, series])

  if (loading) return <p className="text-center text-white">Carregando series...</p>

  const serieBase = series[0]
  const seriesComTemporadas = serieBase
    ? [
        ...series,
        ...Array.from({ length: 10 }).map((_, index) => ({
          ...serieBase,
          id: `temporada-extra-${index + 1}`,
          nome: `Nova Temporada ${index + 1}`,
          imagem: serieBase.imagem || "/card.svg",
        })),
      ]
    : series

  const favoritosParaExibir =
    favoritosDetalhados.length > 0
      ? favoritosDetalhados
      : seriesComTemporadas.filter((serie) => favoritosIds.includes(String(serie.id)))

  return (
    <div className="pt-14 space-y-10">
      <Row
        title={mostrarFavoritas ? "Serie Favoritas" : "Aulas Gravadas - Mais populares"}
        series={mostrarFavoritas ? favoritosParaExibir : seriesComTemporadas}
      />
      {!mostrarFavoritas && (
        <section className="pl-20">
          <h3 className="sectionTitle text-white text-base md:text-2xl">
            Parceiros Exclusivos da Habito FIT
          </h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-10 overflow-x-auto scrollbar-hide py-2 md:flex-nowrap md:justify-start md:snap-x md:snap-mandatory">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={`logo-parceiro-${index}`}
                className="flex h-20 min-w-[200px] snap-start items-center justify-center"
              >
                <img
                  src="/logo-parceiro-1.svg"
                  alt="Logo parceiro"
                  className="h-12 w-auto md:h-14"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default SeriesList
