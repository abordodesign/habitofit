import Head from 'next/head'
import Header from '@/components/Header'
import Banner from '@/components/Banner'
import useAuth from '@/hooks/useAuth'
import { useRecoilValue } from 'recoil'
import { modalState } from '@/atoms/modalAtom'
import Modal from '@/components/Modal'
import Plans from '@/components/Plans'
import SeriesList from '@/components/SeriesList'
import useSubscription from '@/hooks/useSubscription'
import { useState } from 'react'
import Stripe from 'stripe'
import { PlanProduct } from '@/types/stripe'

interface Props {
  products: PlanProduct[]
}

const Home = ({ products }: Props) => {
  const { loading, user, authReady } = useAuth()

  const showModal = useRecoilValue(modalState)
  const subscription = useSubscription()
  const [mostrarFavoritas, setMostrarFavoritas] = useState(false);

  if (!authReady) return null
  if (!subscription) return <Plans products={products} />
  if (loading) return null

  return (
    <div className='relative h-screen bg-gradient-to-b from-black via-[#141414] to-[#141414] lg:h-[140vh]'>
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
              2026 - HábitoFit - Todos os direitos reservados
            </p>

            <a href="https://fast.com/pt/" target="_blank">
              <p className='mt-[8px]'>
                Termos e Condições / Privacidade <span className='ml-[24.65px]'>Teste de Velocidade</span>
              </p>
            </a>
          </div>
          <div>
            <p>Desenvolvido por: HábitoFIT - CNPJ: 22.230.754/0001-70</p>
            <a href="mailto:contato@habitofit.com.br" className="block text-right">
              <p className='text-[#DF9DC0] mt-[8px]'>Dúvidas? Fale Conosco</p>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home

export const getServerSideProps = async () => {
  if (!process.env.NEXT_SECRET_STRIPE_KEY) {
    throw new Error('Missing env var: NEXT_SECRET_STRIPE_KEY')
  }

  const stripe = new Stripe(process.env.NEXT_SECRET_STRIPE_KEY, {})

  const products = await stripe.products
    .list({ active: true })
    .then(async (productList) => {
      const mapped = await Promise.all(
        productList.data.map(async (product) => {
          const prices = await stripe.prices.list({
            product: product.id,
            active: true,
            limit: 1,
          })

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            metadata: product.metadata,
            prices: prices.data.map((price) => ({
              id: price.id,
              unit_amount: price.unit_amount,
            })),
          }
        })
      )

      return mapped
    })
    .catch((error) => {
      console.error('Erro ao obter produtos do Stripe:', error)
      return []
    })

  return {
    props: {
      products,
    },
  }
}
