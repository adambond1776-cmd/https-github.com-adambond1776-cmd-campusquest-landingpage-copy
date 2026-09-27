import Stripe from 'stripe';
import { loadOwnBasicEntitlement } from '@/lib/basic/store';
import {
  FOUNDING_PASS_CENTS,
  FOUNDING_PRODUCT,
  foundingBillingConfig,
  foundingLocalCheckoutConfigured,
  type FoundingCheckoutFacts,
} from '@/lib/basic/founding';
import { isDemoAccountEmail } from '@/lib/account/demo-account';

export function foundingStripe(): Stripe {
  return new Stripe(foundingBillingConfig().secret, { timeout: 15000, maxNetworkRetries: 0 });
}

export function factsFromStripe(
  session: Stripe.Checkout.Session,
  price: Stripe.Price
): FoundingCheckoutFacts {
  const line = session.line_items?.data?.[0];
  const linePrice = line?.price;
  const priceId = typeof linePrice === 'string' ? linePrice : linePrice?.id ?? null;
  return {
    livemode: session.livemode,
    mode: session.mode,
    paymentStatus: session.payment_status,
    clientReferenceId: session.client_reference_id,
    metadataUserId: session.metadata?.cq_user_id ?? null,
    metadataProduct: session.metadata?.cq_product ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    priceId,
    quantity: line?.quantity ?? null,
    priceType: price.type,
    priceLivemode: price.livemode,
    priceActive: price.active,
    priceCurrency: price.currency,
    priceUnitAmount: price.unit_amount,
    priceRecurring: Boolean(price.recurring),
  };
}

export async function createFoundingCheckout(userId: string, email: string): Promise<string> {
  if (isDemoAccountEmail(email)) throw new Error('Founding checkout is not available for this account.');
  if (!foundingLocalCheckoutConfigured()) throw new Error('Founding checkout is closed.');
  const entitlement = await loadOwnBasicEntitlement();
  if (entitlement.active) throw new Error('Founding Basic is already active.');
  const config = foundingBillingConfig();
  const stripe = foundingStripe();
  const price = await stripe.prices.retrieve(config.priceId);
  if (price.livemode || !price.active || price.type !== 'one_time' || price.recurring
    || price.currency !== 'usd' || price.unit_amount !== FOUNDING_PASS_CENTS) {
    throw new Error('The founding test price must be an active one-time $5 USD price.');
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    client_reference_id: userId,
    line_items: [{ price: config.priceId, quantity: 1 }],
    payment_method_types: ['card'],
    allow_promotion_codes: false,
    metadata: { cq_user_id: userId, cq_product: FOUNDING_PRODUCT },
    payment_intent_data: { metadata: { cq_user_id: userId, cq_product: FOUNDING_PRODUCT } },
    success_url: `${config.origin}/billing?checkout=returned`,
    cancel_url: `${config.origin}/billing?checkout=canceled`,
  });
  if (session.livemode || !session.url) throw new Error('Checkout is unavailable. Refresh and retry.');
  return checkoutUrl(session.url);
}

function checkoutUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') {
    throw new Error('Unrecognized checkout destination.');
  }
  return value;
}
