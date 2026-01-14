import type { NextApiRequest, NextApiResponse } from 'next';
import { getStripeCustomerContext } from '@/lib/server/stripeCustomer';
import { getStripeSummary } from '@/lib/server/stripeSummary';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { stripeCustomerId } = await getStripeCustomerContext(req);
    const summary = await getStripeSummary(stripeCustomerId);
    const card = summary.card;
    return res.status(200).json({
      expMonth: card?.expMonth ?? null,
      expYear: card?.expYear ?? null,
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Failed to fetch Stripe expiry data';
    console.error('Stripe expiry error:', error);
    return res.status(statusCode).json({ error: message });
  }
}
