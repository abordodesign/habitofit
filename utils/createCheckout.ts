import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

export async function createCheckout(
  priceId: string,
  userId: string,
  email: string // Adicionando o e-mail como parâmetro
): Promise<void> {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId, userId, email }), // Incluindo o e-mail no corpo
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao criar a sessão de checkout:', error);
      throw new Error('Erro ao criar a sessão de checkout.');
    }

    const { sessionId } = await response.json();

    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId });
  } catch (error) {
    console.error('Erro geral ao criar o checkout:', (error as Error).message);
  }
}
