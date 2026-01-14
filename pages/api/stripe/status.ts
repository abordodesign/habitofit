import type { NextApiRequest, NextApiResponse } from 'next';
import { getStripeCustomerContext } from '@/lib/server/stripeCustomer';
import { getStripeSummary } from '@/lib/server/stripeSummary';

const mapStripeStatus = (status: string | null) => {
  const normalized = String(status || '').toLowerCase();
  if (!normalized) return '';
  if (['active', 'trialing', 'past_due'].includes(normalized)) return 'Ativa';
  if (['canceled', 'incomplete', 'incomplete_expired', 'unpaid'].includes(normalized))
    return 'Inativa';
  return normalized;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { stripeCustomerId } = await getStripeCustomerContext(req);
    const summary = await getStripeSummary(stripeCustomerId);
    return res.status(200).json({
      status: summary.status,
      statusLabel: mapStripeStatus(summary.status),
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const message = error?.message || 'Failed to fetch Stripe status';
    console.error('Stripe status error:', error);
    return res.status(statusCode).json({ error: message });
  }
}
