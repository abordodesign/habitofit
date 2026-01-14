import type { NextApiRequest } from 'next';
import { adminAuth, adminDb } from './firebaseAdmin';

export type StripeCustomerContext = {
  uid: string;
  stripeCustomerId: string;
};

export async function getStripeCustomerContext(
  req: NextApiRequest
): Promise<StripeCustomerContext> {
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
    const error = new Error('Missing bearer token');
    (error as { statusCode?: number }).statusCode = 401;
    throw error;
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const customerSnap = await adminDb.collection('customers').doc(uid).get();
  if (!customerSnap.exists) {
    const error = new Error('Customer not found');
    (error as { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const stripeCustomerId = customerSnap.data()?.stripeId as string | undefined;
  if (!stripeCustomerId) {
    const error = new Error('Stripe customer not found');
    (error as { statusCode?: number }).statusCode = 404;
    throw error;
  }

  return { uid, stripeCustomerId };
}
