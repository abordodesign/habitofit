import MuiModal from "@mui/material/Modal"
import { XMarkIcon } from "@heroicons/react/24/solid"
import { useState, useEffect } from "react"
import { salvarRating, buscarMediaRating } from "@/firebase"
import { auth } from "@/firebase"
import { supabase } from "@/lib/supabase"
import { buscarNotaDoUsuario } from "@/firebase"

interface Props {
    open: boolean
    onClose: () => void
    episodioId: string
    atualizarMedia: () => void
    atualizarComentarios: () => void
  }

export default function AvaliacaoEpisodioModal({ open, onClose, episodioId, atualizarMedia, atualizarComentarios }: Props) {
  const [rating, setRating] = useState<number>(0)
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const fetchNota = async () => {
      const user = auth.currentUser
      if (user && episodioId) {
        const nota = await buscarNotaDoUsuario(user.uid, episodioId, "episodio")
        if (nota) setRating(nota)
      }
    }
  
    if (open) {
      fetchNota()
    }
  }, [open, episodioId])

  const handleEnviar = async () => {
    const user = auth.currentUser
    if (!user || rating === 0) return

    setEnviando(true)

    await salvarRating(user.uid, episodioId, "episodio", rating)

    if (comentario.trim()) {
      await supabase.from("comentarios").insert([
        {
          aula_id: episodioId,
          usuario: user.email,
          comentario: comentario.trim(),
          rating,
        },
      ])
    }

    const novaMedia = await buscarMediaRating(episodioId, "episodio")
    await supabase.from("aulas").update({ rating: novaMedia }).eq("id", episodioId)

    atualizarMedia()
    atualizarComentarios()
    setEnviando(false)
    setComentario("")
    setRating(0)
    onClose()
  }

  return (
    <MuiModal open={open} onClose={onClose} className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center z-50 bg-black/70">
      <div className="bg-[#181818] w-full max-w-3xl rounded-md p-6 relative text-white">
        <button onClick={onClose} className="absolute top-4 right-4">
          <XMarkIcon className="h-6 w-6 text-white" />
        </button>

        <h2 className="text-2xl font-bold mb-4">Avaliações</h2>

        <p className="mb-2">Avalie o que você achou deste episódio</p>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((estrela) => (
            <button
              key={estrela}
              onClick={() => setRating(estrela)}
              className={`text-2xl ${estrela <= rating ? "text-yellow-400" : "text-gray-600"}`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          className="w-full h-32 p-3 bg-[#2a2a2a] rounded text-white mb-4 resize-none"
          placeholder="Deixe seu comentário sobre aula/temporada."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />

        <button
          onClick={handleEnviar}
          disabled={enviando || rating === 0}
          className="bg-[#DF9DC0] px-4 py-2 font-bold rounded hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </MuiModal>
  )
}
