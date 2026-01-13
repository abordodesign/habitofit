import { AuthProvider } from '@/hooks/useAuth'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { RecoilRoot } from 'recoil'
import { Toaster } from 'react-hot-toast'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RecoilRoot>
      <AuthProvider>    
        <Component {...pageProps} />
        <Toaster position="top-right" reverseOrder={false} />
    </AuthProvider>
  </RecoilRoot>)
}
