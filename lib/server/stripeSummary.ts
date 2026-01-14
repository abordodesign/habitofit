import Stripe from 'stripe';

export type StripeCardSummary = {
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
};

export type StripeSummary = {
  email: string | null;
  card: StripeCardSummary | null;
  status: string | null;
  renewalDate: string | null;
};

const stripe = new Stripe(process.env.NEXT_SECRET_STRIPE_KEY as string, {});

export async function getStripeSummary(
  stripeCustomerId: string
): Promise<StripeSummary> {
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

  return {
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
}
