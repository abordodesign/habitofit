import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/server/firebaseAdmin';
import { getStripeSummary } from '@/lib/server/stripeSummary';

const stripe = new Stripe(process.env.NEXT_SECRET_STRIPE_KEY as string, {});

const getTokenFromRequest = (req: NextApiRequest) => {
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
  return authToken || fallbackToken;
};

const isStripeMissingCustomer = (error: any) =>
  error?.code === 'resource_missing' &&
  typeof error?.message === 'string' &&
  error.message.includes('No such customer');

const isStripeCustomer = (
  customer: Stripe.Customer | Stripe.DeletedCustomer
): customer is Stripe.Customer => !('deleted' in customer && customer.deleted);

const resolveStripeCustomer = async (
  stripeCustomerId: string | undefined,
  email: string
): Promise<Stripe.Customer | null> => {
  if (stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (typeof customer !== 'string' && isStripeCustomer(customer)) {
        return customer;
      }
    } catch (error: any) {
      if (!isStripeMissingCustomer(error)) {
        throw error;
      }
    }
  }

  if (email) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    return customer && isStripeCustomer(customer) ? customer : null;
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const decodedEmail = decoded.email || '';

    const customerSnap = await adminDb.collection('customers').doc(uid).get();
    const customerData = customerSnap.exists ? customerSnap.data() || {} : {};
    const email = (customerData.email as string | undefined) || decodedEmail;
    const stripeCustomerId = customerData.stripeId as string | undefined;

    const stripeCustomer = await resolveStripeCustomer(stripeCustomerId, email);
    if (!stripeCustomer) {
      return res.status(404).json({ error: 'Stripe customer not found' });
    }

    if (stripeCustomer.id !== stripeCustomerId || !customerSnap.exists) {
      const stripeLink = `https://dashboard.stripe.com${
        stripeCustomer.livemode ? '' : '/test'
      }/customers/${stripeCustomer.id}`;
      await adminDb.collection('customers').doc(uid).set(
        {
          email: stripeCustomer.email || email,
          stripeId: stripeCustomer.id,
          stripeLink,
        },
        { merge: true }
      );
    }

    const summary = await getStripeSummary(stripeCustomer.id);
    if (!summary.email && stripeCustomer.email) {
      summary.email = stripeCustomer.email;
    }
    return res.status(200).json(summary);
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Failed to fetch Stripe data';
    console.error('Stripe summary error:', error);
    return res.status(statusCode).json({ error: message });
  }
}
