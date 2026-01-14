import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin
if (!getApps().length) {
  const firebaseProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const firebaseClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyBase64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;
  const firebasePrivateKey =
    privateKeyBase64
      ? Buffer.from(privateKeyBase64, 'base64').toString('utf8')
      : process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
    throw new Error(
      'Missing Firebase Admin env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_ADMIN_PRIVATE_KEY_BASE64'
    );
  }

  initializeApp({
    credential: cert({
      projectId: firebaseProjectId,
      clientEmail: firebaseClientEmail,
      privateKey: firebasePrivateKey,
    }),
  });
}

const db = getFirestore();
const stripe = new Stripe(process.env.NEXT_SECRET_STRIPE_KEY as string, {
});

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }
  
  export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(200).send('OK');
    }
  
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      console.error('Assinatura do webhook não encontrada.');
      return res.status(400).send('Assinatura do webhook não encontrada.');
    }
  
    let event: Stripe.Event;
  
    try {
      const rawBody = await getRawBody(req);
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.NEXT_WEBHOOK_SECRET as string
      );
      console.log('Evento recebido:', event.type);
    } catch (err: any) {
      console.error('Erro ao verificar assinatura do webhook:', err.message);
      return res.status(400).send(`Erro ao verificar assinatura do webhook: ${err.message}`);
    }
  
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
  
        const userId = session.client_reference_id || session.metadata?.userId;
        const stripeId = session.customer as string;
        const email = session.customer_details?.email;
  
        if (!userId || !stripeId || !email) {
          console.error('Dados ausentes no evento:', { userId, stripeId, email });
          return res.status(400).json({ error: 'Dados ausentes no evento' });
        }
  
        try {
          // Criar documento no Firestore ou atualizar informações principais do cliente
          await db.collection('customers').doc(userId).set(
            {
              email,
              stripeId,
              stripeLink: `https://dashboard.stripe.com/customers/${stripeId}`,
            },
            { merge: true }
          );
  
          // Adicionar o ID da sessão de checkout na subcoleção `checkout_sessions`
          if (session.id) {
            await db
              .collection('customers')
              .doc(userId)
              .collection('checkout_sessions')
              .doc(session.id)
              .set({ created: session.created });
          }
  
          console.log(`Dados salvos para o cliente ${userId}`);
        } catch (error) {
          console.error('Erro ao salvar no Firestore:', error);
          return res.status(500).json({ error: 'Erro ao salvar no Firestore.' });
        }
        break;
  
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
  
        try {
          const customerId = subscription.customer as string;
          const userDocs = await db
            .collection('customers')
            .where('stripeId', '==', customerId)
            .get();
  
          if (!userDocs.empty) {
            const userId = userDocs.docs[0].id;
  
            await db
              .collection('customers')
              .doc(userId)
              .collection('subscriptions')
              .doc(subscription.id)
              .set(subscription);
          }
  
          console.log(`Assinatura registrada: ${subscription.id}`);
        } catch (error) {
          console.error('Erro ao salvar assinatura no Firestore:', error);
          return res.status(500).json({ error: 'Erro ao salvar assinatura no Firestore.' });
        }
        break;
  
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
        try {
          const customerId = paymentIntent.customer as string;
          const userDocs = await db
            .collection('customers')
            .where('stripeId', '==', customerId)
            .get();
  
          if (!userDocs.empty) {
            const userId = userDocs.docs[0].id;
  
            await db
              .collection('customers')
              .doc(userId)
              .collection('payments')
              .doc(paymentIntent.id)
              .set(paymentIntent);
          }
  
          console.log(`Pagamento registrado: ${paymentIntent.id}`);
        } catch (error) {
          console.error('Erro ao salvar pagamento no Firestore:', error);
          return res.status(500).json({ error: 'Erro ao salvar pagamento no Firestore.' });
        }
        break;
  
      default:
        console.log(`Evento não tratado: ${event.type}`);
        return res.status(200).send('Evento ignorado.');
    }
  
    res.status(200).send('Evento processado com sucesso.');
  }


