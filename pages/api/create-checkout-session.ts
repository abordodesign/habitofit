import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_SECRET_STRIPE_KEY as string, {});

interface CheckoutSessionRequest {
  priceId: string;
  userId: string;
  email: string; // Incluímos o e-mail
}

interface CheckoutSessionResponse {
  sessionId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckoutSessionResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { priceId, userId, email } = req.body as CheckoutSessionRequest;
  const baseUrl =
    req.headers.origin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://habitofit-iujc.vercel.app';

  if (!priceId || !userId || !email) {
    return res
      .status(400)
      .json({ error: 'Os parâmetros priceId, userId e email são obrigatórios.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email, // Preenche automaticamente o e-mail do cliente
      success_url: `${baseUrl}/`,
      cancel_url: `${baseUrl}/`,
      metadata: {
        userId, // Incluímos o userId nos metadados
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Erro ao criar a sessão de checkout:', error.message);
    res.status(500).json({ error: 'Erro ao criar a sessão de checkout.' });
  }
}
