import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline"
import { useRef, useState } from "react"
import Thumbnail from "./Thumbnail"

interface Serie {
  id: string
  nome: string
  descricao: string
  imagem?: string | null
  rating: number
}

interface Props {
  title: string
  series: Serie[]
}

function Row({ title, series }: Props) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [isMoved, setIsMoved] = useState(false)

  const handleClick = (direction: string) => {
    setIsMoved(true)

    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current
      const scrollTo = direction === "left" ? scrollLeft - clientWidth : scrollLeft + clientWidth
      rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" })
    }
  }

  return (
    <div className="space-y-1 md:space-y-3 pl-20">
      <h2 className="sectionTitle cursor-pointer text-base text-white transition duration-200 hover:text-white md:text-3xl">
        {title}
      </h2>

      <div className="group relative md:-ml-3">
        <ChevronLeftIcon
          className={`absolute top-0 bottom-0 left-2 z-40 m-auto h-14 w-14 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100 ${
            !isMoved && "hidden"
          }`}
          onClick={() => handleClick("left")}
        />

        <div
          ref={rowRef}
          className="flex scrollbar-hide items-center space-x-2 overflow-x-scroll md:space-x-4 md:p-3"
        >
          {series.map((serie) => (
            <Thumbnail key={serie.id} serie={serie} />
          ))}
        </div>

        <ChevronRightIcon
          className="absolute top-0 bottom-0 right-2 z-40 m-auto h-14 w-14 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100"
          onClick={() => handleClick("right")}
        />
      </div>
    </div>
  )
}

export default Row
