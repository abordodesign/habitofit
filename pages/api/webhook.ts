import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: "netflix-59b1f",
      clientEmail: "firebase-adminsdk-9mwsa@netflix-59b1f.iam.gserviceaccount.com",
      privateKey:"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDOunpRQzMMo1Tc\nKAxeeVjxSMOUH2z0XwMgrP8bVLsJ5Gois0pqQflPOsOiWxatf6+oMHhnqM//ZyWM\nYxLlPk+tNVppbDcFfMy1DUJR7utsXFrWXgOnUngbgzDo2yMKeL7R2g2uLlKPYXF8\nw4NcjtFpf53rix7o45vLMEccHeXGzngcHpKeZaSOvnA86R1uUyZYJ5cciO8g/QWF\nNAOYyTW4tmtkFbI6f/bM+GtkM6F7kn/gjrsJ3KGlm3oWhwiaLFYGHOQxQGGuVTMk\nwDkVe1n9Xw/Wf4U8WcONxwNrQUJBGoFbTfZK7lNTkLxtBiT7UTrMbmRCw/pQQ0Vt\nLNc/1nZJAgMBAAECgf8gnnK98yoTKcH0QNmTwQZPeLdjeVPekJO3dSfyZh6g/Jgf\nusWtz/FvYGm8FW0KQNWs8jcFqBG1aZEWjfBGiVgoIzN9+pU/lf0zEFEgywZ5rctS\nJtjJ09SUJarQC2aqlaidkyeNsWRdStwJ8rCRN8k4CtOiIJdTXkkQDFfHNv/7ELz9\nfnkMdnV30W81WV8e4iT0Ry5U+5GXfsojpDVMWV+WmiR2YQ0tj+Lr7nBrmO5nQwFm\nBdWY7uo+sHslRXKQpLPz4VoON02Qb7OyccI9xvrrtowVnt8Uv2i+fRMluFdV496L\nTAR53u0QnSs1IXABqUFMjMMk0k1LAAZLn7LXOYECgYEA3TZvE7Glsltk6hKKCdZL\nwyWRzAoyuhAsWPSF5BaHJ9HQ4dCYLUL3PaSpiwwlQNdC+Svx0lZn6CuHrEcY75Xz\ntu8thC7A5m/x9SkdLQjiGY6go1h9RrgkD3tQGr2Bie++/P0fcfN6ZnBbIGTcWrJd\n30aSecX7qQLnUmBCc7HaRRECgYEA7zzwi88y1srZRzKoOF7pSPTB4Cv+fqDUZw48\niI6qfzkOa/nPuVKEeWevr9TZEI2T/jMvgIV+Jvev8pO8iQ7IsA2rYZGfxyawfLSc\ns5YqMEs9FylniomyTwLJ3oDD7AKwQanyft3Tg3oAd7bCB3KTZ31+MS6RcpG8Esk9\nAe5NvbkCgYEAkGRpmLdKauNROaCkTct9ZIHvavn1JpJMADyL8NfrnMhNyjg4PMML\nU0daC5L/9hUMeEyA6kTQSjGvu3olAq4kiPISCcfizgegLeCKVM0JmJkKrdSi4Tht\nAVYCcZHlLj45sjUfA2hkKt2H/dsYInNu5sDP94CNxkJI7/I5Lf+Xc6ECgYEAjx9O\n7OU1Dejm2cBFgQvO1lWO0vSe2NSQnWKX9j4bY+cXaKNXkQ/7rsHIChH1FgENA2tN\nxL6X/On6+c1GYlxU1XYoDEPZaYQM214VzR5N+PxZ/MxJZEkCQmBxskooa74kAfSQ\n3TMKAcLwGq5cH6Z85tHdt8CbRQZIlJiNheUx3wkCgYEAkQMBAg/s+1Kd+zWu0NgT\nDTzcstiaB94so8xFMsoLg15R9coW3ctT/USBYJuW3bDFlCg/95p3fogeOfdR5Vpp\n6DuxjmdPaSfBSMhJOj7oOwYYoaM8/Ekzl3MRZY4W2AOCnofrkH0ofGz3Mf5uW5oh\nd1GIvykgqBYn2kg0Ygjuag8=\n-----END PRIVATE KEY-----\n",
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
      return res.status(405).send('Método não permitido');
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
  
        const userId = session.metadata?.userId;
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