import useAuth from '@/hooks/useAuth'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/firebase'

interface Inputs {
  email: string
  password: string
}

function Login() {
  const [login, setLogin] = useState(false)
  const { signIn, signUp } = useAuth()
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>()

  const onSubmit: SubmitHandler<Inputs> = async ({ email, password }) => {
    if (login) {
      await signIn(email, password)
    } else {
      await signUp(email, password)
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail) return setResetMsg('Digite um e-mail válido.')
  
    try {
      auth.languageCode = 'pt-BR' // <-- Aqui define o idioma para português
      await sendPasswordResetEmail(auth, resetEmail)
      setResetMsg('Um link foi enviado para seu e-mail!')
    } catch (error: any) {
      setResetMsg('Erro ao enviar o e-mail: ' + error.message)
    }
  }
  

  return (
    <div className="relative flex h-screen w-screen flex-col bg-[#141414]/80 md:items-center md:bg-transparent pt-[88px]">
      <Head>
        <title>Habito</title>
      </Head>

      <Image
        alt=""
        src="/bg-habito2.jpg"
        layout="fill"
        className="-z-10 !hidden opacity-70 sm:!inline object-cover"
      />

      <img
        src="logo-login.svg"
        alt=""
        className="left-4 top-4 cursor-pointer object-contain md:left-[calc(50%-192.105px)]"
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative mt-24 space-y-8 bg-black/75 py-12 px-6 md:mt-[88px]  md:px-14px md:!w-[500px] md:h-auto rounded-[24px]"
      >
        <h1 className="text-[38px] font-bold text-[#DF9DC0] text-center mt-0">
          Acesse a sua conta!
        </h1>
        <p className="text-[16px] text-center !mt-[0px] font-light">
          Faça seu login para acessar o seu perfil.
        </p>
        <div className="space-y-4">
          <label className="inline-block w-full">
            <input
              type="email"
              placeholder="Digite seu e-mail"
              className="input"
              {...register('email', { required: true })}
            />
            {errors.email && (
              <span className="p-1 text-[13px] font-light text-[#DF9DC0]">
                Digite um e-mail
              </span>
            )}
          </label>
          <label className="inline-block w-full !mt-[24px]">
            <input
              type="password"
              placeholder="Digite a sua senha"
              className="input "
              {...register('password', { required: true })}
            />
            {errors.password && (
              <span className="p-1 text-[13px] font-light text-[#DF9DC0] ">
                Digite a senha
              </span>
            )}
          </label>

          {/* Botão "Esqueceu sua senha?" */}
          <p
            onClick={() => setShowResetModal(true)}
            className="text-[14px] text-[#DF9DC0] underline text-right cursor-pointer mt-1 hover:opacity-80"
          >
            Esqueceu sua senha?
          </p>
        </div>

        <button
          className="w-full bg-[#DF9DC0] font-extrabold h-[54px] text-[24px] uppercase !mt-[24px]"
          onClick={() => setLogin(true)}
        >
          Entrar
        </button>

        <div className="flex justify-between items-center text-[gray]">
          <div className="text-[16px] text-[#828282] font-light flex items-center">
            <input className="mr-[6px]" type="radio" />
            Lembre-se de mim!
          </div>
          <div>
            Novo por aqui?{' '}
            <button
              className="hover:underline ml-0.5 text-white"
              onClick={() => setLogin(false)}
            >
              Cadastrar
            </button>
          </div>
        </div>

        <Link
          href="#"
          className="text-[16px] text-[#DF9DC0] underline text-center mt-[24px] block"
        >
          Precisa de ajuda?
        </Link>
      </form>

      {/* MODAL DE RECUPERAÇÃO */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#141414] p-8 rounded-lg w-[90%] max-w-md shadow-lg space-y-4 relative">
            <button
              onClick={() => {
                setShowResetModal(false)
                setResetMsg('')
                setResetEmail('')
              }}
              className="absolute top-3 right-4 text-white text-xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-[#DF9DC0] text-center">
              Recuperar senha
            </h2>
            <p className="text-white text-sm text-center">
              Enviaremos um link de redefinição para o seu e-mail.
            </p>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full p-3 rounded bg-[#252525] text-white placeholder-gray-400"
              placeholder="Digite seu e-mail"
            />
            <button
              onClick={handleResetPassword}
              className="w-full bg-[#DF9DC0] text-black font-bold py-2 rounded hover:bg-[#c084ac] transition"
            >
              Enviar
            </button>
            {resetMsg && (
              <p className="text-sm text-center text-white mt-2">{resetMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="flex justify-between w-full max-w-[1300px] m-auto">
        <div>
          <p className="text-[#DF9DC0]">
            2023 - HábitoFit - Todos os direitos reservados
          </p>
          <p className="mt-[8px]">
            Termos e Condições / Privacidade{' '}
            <span className="ml-[24.65px]">Teste de Velocidade</span>
          </p>
        </div>
        <div>
          <p>Desenvolvido por: HábitoFIT - CNPJ: 22.230.754/0001-70</p>
          <p className="text-[#DF9DC0] mt-[8px] text-right">
            Dúvidas? Fale Conosco
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
