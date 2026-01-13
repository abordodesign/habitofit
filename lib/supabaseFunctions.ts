import { supabase } from './supabase'

export async function saveRatingToSupabase({
  userId,
  itemId,
  tipo, // 'serie' ou 'episodio'
  nota
}: {
  userId: string
  itemId: string
  tipo: string
  nota: number
}) {
  const { error } = await supabase.from('ratings').insert([
    {
      user_id: userId,
      item_id: itemId,
      tipo,
      nota,
      data_avaliacao: new Date().toISOString(),
    },
  ])

  if (error) {
    console.error('Erro ao salvar no Supabase:', error)
    throw error
  }
}
