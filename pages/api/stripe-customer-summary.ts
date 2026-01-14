import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type SummaryResponse = {
  email: string | null;
  card: {
    brand: string;
    last4: string;
    expMonth: number | null;
    expYear: number | null;
  } | null;
  status: string | null;
  renewalDate: string | null;
};

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

const stripe = new Stripe(process.env.NEXT_SECRET_STRIPE_KEY as string, {});
const db = getFirestore();
const auth = getAuth();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const customerSnap = await db.collection('customers').doc(uid).get();
    if (!customerSnap.exists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerData = customerSnap.data() || {};
    const stripeCustomerId = customerData.stripeId as string | undefined;
    if (!stripeCustomerId) {
      return res.status(404).json({ error: 'Stripe customer not found' });
    }

    const customer = await stripe.customers.retrieve(stripeCustomerId);
    const email =
      typeof customer !== 'string' && 'email' in customer ? customer.email : null;

    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 1,
      expand: ['data.default_payment_method', 'data.latest_invoice.payment_intent.payment_method'],
    });
    const subscription = subscriptions.data[0] || null;
    const status = subscription?.status || null;
    const renewalDate = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR')
      : null;

    const subDefaultMethod = subscription?.default_payment_method;
    const subMethod =
      subDefaultMethod && typeof subDefaultMethod !== 'string' ? subDefaultMethod : null;
    const invoiceMethod =
      subscription?.latest_invoice && typeof subscription.latest_invoice !== 'string'
        ? (subscription.latest_invoice.payment_intent &&
            typeof subscription.latest_invoice.payment_intent !== 'string'
            ? subscription.latest_invoice.payment_intent.payment_method
            : null)
        : null;
    const invoiceCard =
      invoiceMethod && typeof invoiceMethod !== 'string' ? invoiceMethod.card : null;

    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
      limit: 1,
    });
    const card = subMethod?.card || invoiceCard || paymentMethods.data[0]?.card || null;

    const response: SummaryResponse = {
      email,
      card: card
        ? {
            brand: card.brand || '',
            last4: card.last4 || '',
            expMonth: card.exp_month || null,
            expYear: card.exp_year || null,
          }
        : null,
      status,
      renewalDate,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Stripe summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch Stripe data' });
  }
}
