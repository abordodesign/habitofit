import { InformationCircleIcon } from '@heroicons/react/20/solid'
import { useRecoilState } from 'recoil'
import { modalState, serieState } from '@/atoms/modalAtom'
import { Serie } from '@/typings'

function Banner() {
  const [showModal, setShowModal] = useRecoilState(modalState)
  const [currentSerie, setCurrentSerie] = useRecoilState(serieState)

  const serie: Serie = {
    id: 'UUID_DA_SERIE',
    nome: 'Método Prepara',
    descricao:
      'Prepare-se para superar todos os desafios e alcançar suas metas fitness. Este é o seu passo a passo para uma semana de treinos incrível. Assista e esteja pronto para arrasar!',
    imagem: '/bg-full.svg',
    rating: 5,
  }

  return (
    <div className='relative flex flex-col space-y-6 py-30 px-20 md:space-y-10 md:h-[100vh] lg:justify-end overflow-hidden p-10'>
      {/* Vídeo de fundo */}
      <video
        className="absolute top-0 left-0 -z-20 h-[100vh] w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster={serie.imagem ?? undefined} 
      >
        <source src="/video.mp4" type="video/mp4" />
        {/* Fallback para navegadores sem suporte a vídeo */}
        <img
          src={serie.imagem ?? '/bg-full.svg'}
          alt="Banner da Série"
          className="h-full w-full object-cover"
        />
      </video>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black via-black/80 to-[#141414]" />

      {/* Conteúdo */}
      <div className='flex items-center'>
        <img src="logo-title.svg" alt="" />
        <h2 className='text-[28px] tracking-[11px] ml-[20px]'>AULAS GRAVADAS</h2>
      </div>

      <h1 className='block text-2xl lg:text-[83px] md:text-[2xl] font-bold mt-[30px] h-[42px]'>
        Método<i>Prepara</i>
      </h1>

      <div className="flex items-center">
        <img src="Top10.svg" alt="" />
        <h3 className='ml-[10px] font-[400] text-[18px]'>Como me preparar para os treinos?</h3>
      </div>

      <p className='max-w-xs text-shadow-md text-xs md:max-w-lg md:text-lg lg:max-w-2xl lg:text-lg mt-[30px]'>
        {serie.descricao}
      </p>

      <div className='flex items-center gap-x-4'>
        <button
          onClick={() => {
            setCurrentSerie(serie)
            setShowModal(true)
          }}
          className='gap-x-3 rounded-[8px] bg-black flex justify-center items-center font-bold lg:text-[32px] text-1xl px-5 py-1.5 hover:opacity-75 transition-all duration-300 md:py-2.5 md:px-8 mt-[40px]'
        >
          <InformationCircleIcon className='h-5 w-5 md:h-8 md:w-8' />
          Informações
        </button>
      </div>
    </div>
  )
}

export default Banner
