import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

    const originHeader = Array.isArray(req.headers.origin)
      ? req.headers.origin[0]
      : req.headers.origin;
    const refererHeader = Array.isArray(req.headers.referer)
      ? req.headers.referer[0]
      : req.headers.referer;
    const baseUrl = originHeader || refererHeader || 'http://localhost:3000';
    const returnUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}
