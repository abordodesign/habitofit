import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/server/firebaseAdmin';

const stripe = new Stripe(process.env.NEXT_SECRET_STRIPE_KEY as string, {});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const authHeader = req.headers.authorization || '';
  const headerToken = Array.isArray(req.headers['x-firebase-token'])
    ? req.headers['x-firebase-token'][0]
    : req.headers['x-firebase-token'];
  const authToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const fallbackToken =
    typeof headerToken === 'string' && headerToken.startsWith('Bearer ')
      ? headerToken.slice(7)
      : typeof headerToken === 'string'
        ? headerToken
        : '';
  const token = authToken || fallbackToken;
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const emailFromBody =
      typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const email = emailFromBody || decoded.email || '';
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return res.status(404).json({ error: 'Stripe customer not found' });
    }

    const stripeLink = `https://dashboard.stripe.com${
      customer.livemode ? '' : '/test'
    }/customers/${customer.id}`;

    await adminDb.collection('customers').doc(uid).set(
      {
        email: customer.email || email,
        stripeId: customer.id,
        stripeLink,
      },
      { merge: true }
    );

    return res.status(200).json({
      email: customer.email || email,
      stripeId: customer.id,
      livemode: customer.livemode,
    });
  } catch (error) {
    console.error('Stripe link-customer error:', error);
    return res.status(500).json({ error: 'Failed to link Stripe customer' });
  }
}
