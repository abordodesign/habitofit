import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    
    extend: {
    
      fontFamily: {
        nunito: ["Nunito", "sans-serif"],
      },
      backgroundImage: {
        'gradient-to-b':
        'linear-gradient(to bottom,rgba(20,20,20,100) 0,rgba(20,20,20,.15) 15%,rgba(20,20,20,.35) 29%,rgba(20,20,20,.58) 44%,rgba(223, 157, 192,.58) 68%,#141414 100%);',
      },
    },
  },
  plugins: [require('tailwindcss-textshadow'),
            require('tailwind-scrollbar-hide'),
            require('tailwind-scrollbar'),
          ],
            
}
export default config
