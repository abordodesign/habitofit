import MuiModal from "@mui/material/Modal"
import { useRecoilState } from 'recoil'
import { modalState, serieState } from '@/atoms/modalAtom'
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid"
import { useEffect, useRef, useState } from "react"
import { Episodio } from "@/typings"
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid'

import ReactPlayer from "react-player/lazy"
import {
  FaPlay
} from "react-icons/fa"
import {
  HandThumbUpIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline"
import { supabase } from "@/lib/supabase"
import { salvarRating, buscarMediaRating, buscarNotaDoUsuario, verificarFavorito, removerFavorito, adicionarFavorito } from "@/firebase"
import { auth } from "@/firebase"
import AvaliacaoEpisodioModal from "./AvaliacaoEpisodioModal"
import CustomPlayer from "./CustomPlayer"
import toast from "react-hot-toast"


function Modal() {
  const [showModal, setShowModal] = useRecoilState(modalState)
  const [currentSerie] = useRecoilState(serieState)
  const [serieRating, setSerieRating] = useState(0)
  const [mediaSerie, setMediaSerie] = useState(0)
  const [notaUsuario, setNotaUsuario] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [episodioParaAvaliar, setEpisodioParaAvaliar] = useState<Episodio | null>(null)
  const [isFavorito, setIsFavorito] = useState(false)
  const [episodios, setEpisodios] = useState<Episodio[]>([])
  const [videoAtual, setVideoAtual] = useState<Episodio | null>(null)
  const [mediasEpisodios, setMediasEpisodios] = useState<{ [key: string]: number }>({})
  const [comentarios, setComentarios] = useState<any[]>([])
  const [novoComentario, setNovoComentario] = useState("")

  const [muted, setMuted] = useState(true)
  const [ocult, setOcult] = useState('flex')
  const modalContentRef = useRef<HTMLDivElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  const handleClose = () => setShowModal(false)

  // const toggleFullScreen = () => {
  //   if (playerContainerRef.current) {
  //     if (document.fullscreenElement) {
  //       document.exitFullscreen()
  //       setOcult('flex')
  //     } else {
  //       playerContainerRef.current.requestFullscreen()
  //       setOcult('hidden')
  //       setMuted(false)
  //     }
  //   }
  // }

  const scrollSlider = (direction: 'left' | 'right') => {
    if (!sliderRef.current || episodios.length === 0) return
    const scrollAmount = sliderRef.current.clientWidth
    if (direction === 'left') {
      sliderRef.current.scrollLeft -= scrollAmount
    } else {
      const isAtEnd =
        sliderRef.current.scrollLeft + sliderRef.current.clientWidth >=
        sliderRef.current.scrollWidth
      if (isAtEnd) {
        sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        sliderRef.current.scrollLeft += scrollAmount
      }
    }
  }

  const fetchComentarios = async (aulaId: string) => {
    const { data, error } = await supabase
      .from("comentarios")
      .select("*")
      .eq("aula_id", aulaId)
      .order("data_comentario", { ascending: false })

    if (!error) setComentarios(data)
  }

  const handleEnviarComentario = async () => {
    const user = auth.currentUser
    if (!user) return alert("Você precisa estar logado")
    if (!novoComentario.trim()) return

    const { error } = await supabase.from("comentarios").insert([
      {
        aula_id: videoAtual?.id,
        usuario: user.email,
        comentario: novoComentario.trim(),
        rating: null,
      },
    ])

    if (!error) {
      setNovoComentario("")
      fetchComentarios(videoAtual!.id)
    }
  }

  const atualizarMediaEpisodio = async (episodioId: string) => {
    const novaMedia = await buscarMediaRating(episodioId, "episodio")
    setMediasEpisodios(prev => ({ ...prev, [episodioId]: novaMedia }))
  }


  useEffect(() => {
    if (!currentSerie) return

    const fetchNotas = async () => {
      const user = auth.currentUser;
      if (user) {
        const nota = await buscarNotaDoUsuario(user.uid, currentSerie.id, "serie");
        setNotaUsuario(nota);
      }
    };

    buscarMediaRating(currentSerie.id, "serie").then(setMediaSerie)




    const fetchData = async () => {
      const { data: episodiosData, error: epError } = await supabase
        .from('aulas')
        .select('*')
        .eq('grupo_id', currentSerie.id)
        .order('ordem', { ascending: true })

      if (epError) {
        console.error('Erro ao buscar episódios:', epError)
        return
      }

      setEpisodios(episodiosData)
      setVideoAtual(episodiosData[0])
      fetchComentarios(episodiosData[0].id)

      const { data: serieData } = await supabase
        .from('series')
        .select('rating')
        .eq('id', currentSerie.id)
        .single()

      if (serieData?.rating) {
        setSerieRating(serieData.rating)
      }

      const medias: { [key: string]: number } = {}
      await Promise.all(
        episodiosData.map(async (ep) => {
          const media = await buscarMediaRating(ep.id, "episodio")
          medias[ep.id] = media
        })
      )
      setMediasEpisodios(medias)
    }

    const checkFavorito = async () => {
      const user = auth.currentUser
      if (user) {
        const fav = await verificarFavorito(user.uid, currentSerie.id)
        setIsFavorito(fav)
      }
    }
    if (currentSerie) checkFavorito()

    fetchNotas()
    fetchData()
  }, [currentSerie])

  const handleExcluirComentario = async (comentarioId: string) => {
    const { error } = await supabase
      .from('comentarios')
      .delete()
      .eq('id', comentarioId);

    if (!error && videoAtual?.id) {
      fetchComentarios(videoAtual.id); 
    } else {
      console.error('Erro ao excluir comentário:', error);
    }
  };


  const atualizarCacheFavoritos = (serie: { id: string; nome?: string; descricao?: string; imagem?: string | null; rating?: number }, adicionar: boolean) => {
    if (typeof window === 'undefined') return
    try {
      const key = 'favoritos_cache'
      const raw = window.localStorage.getItem(key)
      const list = raw ? JSON.parse(raw) : []
      const filtrados = Array.isArray(list) ? list : []
      let atualizado
      if (adicionar) {
        const existe = filtrados.some((item: any) => String(item.serieId) === String(serie.id))
        atualizado = existe
          ? filtrados
          : [
              ...filtrados,
              {
                serieId: String(serie.id),
                nome: serie.nome ?? null,
                descricao: serie.descricao ?? null,
                imagem: serie.imagem ?? null,
                rating: serie.rating ?? null,
              },
            ]
      } else {
        atualizado = filtrados.filter((item: any) => String(item.serieId) !== String(serie.id))
      }
      window.localStorage.setItem(key, JSON.stringify(atualizado))
    } catch (error) {
      console.error('Erro ao atualizar cache de favoritos:', error)
    }
  }

  const toggleFavorito = async () => {
    const user = auth.currentUser
    if (!user || !currentSerie) return

    if (isFavorito) {
      await removerFavorito(user.uid, currentSerie.id)
      setIsFavorito(false)
      toast.success('Removido dos favoritos');
      atualizarCacheFavoritos(currentSerie, false)
    } else {
      await adicionarFavorito(user.uid, currentSerie)
      setIsFavorito(true)
      toast.success('Adicionado aos favoritos')
      atualizarCacheFavoritos(currentSerie, true)
    }
  }

  useEffect(() => {
    if (videoAtual) {
      fetchComentarios(videoAtual.id)
    }
  }, [videoAtual])

  if (!currentSerie || !videoAtual) return null

  return (
    <MuiModal open={showModal} onClose={handleClose} className="fixed !top-7 left-0 right-0 z-50 mx-auto w-full max-w-5xl overflow-x-hidden rounded-md">
      <>
        <button onClick={handleClose} className="modalButton absolute right-5 top-5 z-40">
          <XMarkIcon className="h-6 w-6" />
        </button>


        <CustomPlayer url={videoAtual.video} />


        <div ref={modalContentRef} className="bg-[#181818] py-6 px-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white">{currentSerie.nome}</h1>
            <button onClick={toggleFavorito}>
              {isFavorito ? (
                <HeartSolid className="h-6 w-6 text-[#DF9DC0]" />
              ) : (
                <HeartOutline className="h-6 w-6 text-white" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <p className="text-white font-semibold">Sua Avaliação:</p>
              {[1, 2, 3, 4, 5].map((estrela) => (
                <button
                  key={estrela}
                  onClick={async () => {
                    const user = auth.currentUser;
                    if (!user) return alert("Você precisa estar logado");

                    await salvarRating(user.uid, currentSerie.id, "serie", estrela);
                    const novaMedia = await buscarMediaRating(currentSerie.id, "serie");
                    setMediaSerie(novaMedia);
                    setNotaUsuario(estrela);

                    await supabase
                      .from('series')
                      .update({ rating: novaMedia })
                      .eq('id', currentSerie.id);
                  }}
                  className={`text-2xl ${estrela <= (notaUsuario ?? 0) ? 'text-yellow-400' : 'text-gray-600'}`}
                >
                  ★
                </button>
              ))}
              <span className="text-white">({notaUsuario ?? "-"})</span>
            </div>

            <div className="flex items-center gap-1">
              <p className="text-white font-semibold">Geral:</p>
              {[1, 2, 3, 4, 5].map((estrela) => (
                <span key={estrela} className={`text-2xl ${estrela <= mediaSerie ? 'text-yellow-400' : 'text-gray-600'}`}>
                  ★
                </span>
              ))}
              <span className="text-white">({mediaSerie.toFixed(1)})</span>
            </div>
          </div>


          <p className="text-white whitespace-pre-line">{currentSerie.descricao}</p>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 px-2">
            <div className="mb-2 md:mb-0">
              <p className="text-2xl font-bold text-white">{videoAtual?.nome}</p>
              <p className="text-md text-gray-300 mt-5">{videoAtual?.subtitulo}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEpisodioParaAvaliar(videoAtual);
              setShowRatingModal(true);
            }}
            className="bg-[#DF9DC0] text-white px-4 py-2 rounded-lg shadow hover:bg-[#e7b1d0] transition"
          >
            Avaliar esta aula
          </button>
          {/* Slider Episódios */}
          <div className="relative group w-full overflow-hidden mt-10">
            <h2 className="text-2xl font-bold uppercase text-white mb-4">Temporada 1</h2>
            <ChevronLeftIcon
              onClick={() => scrollSlider('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 text-white cursor-pointer bg-black/70 rounded-full hover:scale-110"
            />
            <div
              ref={sliderRef}
              className="flex overflow-x-auto space-x-6 px-12 scrollbar-hide snap-x snap-mandatory scroll-smooth py-4"
            >
              {episodios.map((ep) => {
                const isCurrent = ep.id === videoAtual.id
                return (
                  <button
                    key={ep.id}
                    onClick={() => setVideoAtual(ep)}
                    className={`snap-start transition-all duration-300 ease-in-out flex-shrink-0 rounded-lg ${isCurrent ? 'scale-110 w-[330px] h-[280px]' : 'w-[280px] h-[260px]'
                      }`}
                  >
                    <div className="bg-[#2a2a2a] p-4 rounded-lg h-full flex flex-col justify-between overflow-hidden">
                      <img src="/cardInside.svg" alt="" className="w-full rounded-lg mb-2 object-cover h-32" />
                      <div className="text-left">
                        <p className="text-[16px] font-semibold text-white">{ep.nome}</p>
                        <p className="text-[14px] text-white line-clamp-2">{ep.subtitulo}</p>
                        <div className="flex items-center gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <svg
                              key={value}
                              xmlns="http://www.w3.org/2000/svg"
                              fill={(mediasEpisodios[ep.id] || 0) >= value ? "#facc15" : "#4b5563"}
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              className="h-4 w-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.97-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.783-.57-.38-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.518-4.674z"
                              />
                            </svg>
                          ))}
                          <span className="text-sm text-white ml-1">({(mediasEpisodios[ep.id] || 0).toFixed(1)})</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <ChevronRightIcon
              onClick={() => scrollSlider('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 text-white cursor-pointer bg-black/70 rounded-full hover:scale-110"
            />
          </div>

          {episodioParaAvaliar && (
            <AvaliacaoEpisodioModal
              open={showRatingModal}
              onClose={() => {
                setShowRatingModal(false)
                setEpisodioParaAvaliar(null)
              }}
              episodioId={episodioParaAvaliar.id}
              atualizarMedia={() => atualizarMediaEpisodio(episodioParaAvaliar.id)}
              atualizarComentarios={() => fetchComentarios(episodioParaAvaliar.id)}
            />
          )}

          {/* Comentários */}
          <div className="space-y-6 mt-10">
            <h3 className="text-xl font-semibold text-white">Comentários</h3>
            <div className="flex gap-4">
              <textarea
                className="w-full bg-[#2a2a2a] text-white rounded p-3 h-24 resize-none"
                placeholder="Deixe seu comentário..."
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
              />
              <button
                onClick={handleEnviarComentario}
                className="bg-[#DF9DC0] px-4 py-2 text-white font-bold rounded hover:opacity-90"
              >
                Enviar
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
              {comentarios.length === 0 && <p className="text-white">Nenhum comentário ainda.</p>}
              {comentarios.map((c) => (
                <div key={c.id} className="bg-[#2a2a2a] p-4 rounded">
                  <div className="flex justify-between items-start">
                    <p className="text-gray-300 text-sm">{c.usuario}</p>
                    {auth.currentUser?.email === c.usuario && (
                      <button
                        onClick={() => handleExcluirComentario(c.id)}
                        className="text-red-500 text-xs hover:underline"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                  <p className="text-white">{c.comentario}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    </MuiModal>
  )
}

export default Modal
