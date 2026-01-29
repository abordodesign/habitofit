import { atom } from 'recoil'
import { Serie } from '@/typings'

export const modalState = atom({
  key: 'modalState',
  default: false,
})

export const serieState = atom<Serie | null>({
  key: 'serieState',
  default: null,
})

export const episodioInicialState = atom<string | null>({
  key: 'episodioInicialState',
  default: null,
})
