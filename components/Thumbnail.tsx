import { modalState, serieState } from "@/atoms/modalAtom"
import { Serie } from "@/typings"
import Image from "next/image"
import { useRecoilState } from "recoil"

interface Props {
  serie: Serie
}

function Thumbnail({ serie }: Props) {
  const [showModal, setShowModal] = useRecoilState(modalState)
  const [currentSerie, setCurrentSerie] = useRecoilState(serieState)

  return (
    <div
      className="relative h-[268px] min-w-[216px] cursor-pointer transition duration-200 ease-out md:h-[268px] md:min-w-[216px] md:hover:scale-105"
      onClick={() => {
        console.log('Thumbnail clicado')
        setCurrentSerie(serie)
        setShowModal(true)
      }}
    >
      <img
        src={serie.imagem || '/card.svg'}
        alt={serie.nome}
        className="w-full h-full object-cover rounded-sm"
      />
      <div className="absolute inset-0 bg-black opacity-40 hover:opacity-10 transition-all duration-300 rounded"></div>
    </div>
  )
}

export default Thumbnail
