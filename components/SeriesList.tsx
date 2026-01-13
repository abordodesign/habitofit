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
        console.error('Erro ao buscar séries:', error)
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

  if (loading) return <p className="text-center text-white">Carregando séries...</p>

  return (
    <div className="pt-10">
      <Row
        title={mostrarFavoritas ? "Minhas Séries Favoritas" : "Séries em Destaque"}
        series={mostrarFavoritas ? favoritas : series}
      />
    </div>
  )
}

export default SeriesList
