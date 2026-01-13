import Head from 'next/head'
import Header from '@/components/Header'
import Banner from '@/components/Banner'
import useAuth from '@/hooks/useAuth'
import { useRecoilValue } from 'recoil'
import { modalState } from '@/atoms/modalAtom'
import Modal from '@/components/Modal'
import Plans from '@/components/Plans'
import { Product, getProducts } from '@stripe/firestore-stripe-payments'
import SeriesList from '@/components/SeriesList'
import payments from '@/lib/stripe'
import useSubscription from '@/hooks/useSubscription'
import { useState } from 'react'

interface Props {
  products: Product[]
}

const Home = ({ products }: Props) => {
  const { loading, user } = useAuth()

  const showModal = useRecoilValue(modalState)
  const subscription = useSubscription()
  const [mostrarFavoritas, setMostrarFavoritas] = useState(false);

  if (!subscription) return <Plans products={products} />
  if (loading) return null

  return (
    <div className='relative h-screen bg-gradient-to-b lg:h-[140vh]'>
      <Head>
        <title>Hábito Fit</title>
      </Head>

      <Header
        onToggleFavoritos={() => setMostrarFavoritas((prev) => !prev)}
        mostrarFavoritas={mostrarFavoritas}
      />

      <main className='relative pl-4 pb-24 lg:space-y-24 lg:pl-0'>
        <Banner />
        <section className='md:space-y-24'>
          <SeriesList mostrarFavoritas={mostrarFavoritas} />
        </section>
        {showModal && <Modal />}
      </main>

      <footer className='py-[40px]'>
        <div className='flex justify-between w-full max-w-[1650px] m-auto '>
          <div>
            <p className='text-[#DF9DC0]'>
              2023 - HábitoFit - Todos os direitos reservados
            </p>

            <a href="https://fast.com/pt/" target="_blank">
              <p className='mt-[8px]'>
                Termos e Condições / Privacidade <span className='ml-[24.65px]'>Teste de Velocidade</span>
              </p>
            </a>
          </div>
          <div>
            <p>Desenvolvido por: HábitoFIT - CNPJ: 22.230.754/0001-70</p>
            <p className='text-[#DF9DC0] mt-[8px] text-right'>Dúvidas? Fale Conosco</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home

export const getServerSideProps = async () => {
  const products = await getProducts(payments, {
    includePrices: true,
    activeOnly: true,
  }).catch((error) => {
    console.error('Erro ao obter produtos:', error)
    return []
  })

  return {
    props: {
      products,
    },
  }
}
