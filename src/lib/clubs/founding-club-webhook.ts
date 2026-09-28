import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { foundingTestSecret } from '@/lib/basic/founding';
import {
  FOUNDING_CLUB_PLAN,
  acceptFoundingClubCheckout,
  foundingClubBillingConfig,
  type FoundingClubFacts,
} from '@/lib/clubs/founding-club';

export function isFoundingClubEvent(event: Stripe.Event): boolean {
  const object = event.data.object;
  if (!object || typeof object !== 'object' || !('metadata' in object)) return false;
  const metadata = object.metadata;
  return Boolean(metadata && typeof metadata === 'object' && metadata.plan === FOUNDING_CLUB_PLAN);
}

export async function handleFoundingClubEvent(event: Stripe.Event): Promise<Response> {
  let config: ReturnType<typeof foundingClubBillingConfig>;
  try {
    config = foundingClubBillingConfig();
  } catch {
    return Response.json({ error: 'Founding Club checkout is not configured.' }, { status: 503 });
  }
  if (event.livemode !== false) return Response.json({ error: 'Live events are refused.' }, { status: 400 });
  const failed = event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired';
  const handled = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
  if (!handled && !failed) return Response.json({ received: true });
  const sessionId = sessionIdFrom(event);
  if (!sessionId) return Response.json({ received: true });

  try {
    const stripe = new Stripe(foundingTestSecret(), { timeout: 15000, maxNetworkRetries: 0 });
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price', 'payment_intent'] });
    if (session.livemode) return Response.json({ error: 'Live events are refused.' }, { status: 400 });
    if (failed || session.payment_status !== 'paid') return Response.json({ received: true });
    const price = await stripe.prices.retrieve(config.priceId);
    const accepted = acceptFoundingClubCheckout(factsFromSession(session, price), config.priceId);
    if (!accepted.ok) return Response.json({ received: true });
    const admin = createAdminClient();
    if (!admin) return Response.json({ error: 'Founding Club payment could not be recorded.' }, { status: 500 });
    const paidAt = paymentTime(session);
    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? '';
    const { error } = await admin.rpc('apply_cq_club_founding_payment', {
      p_user_id: accepted.userId,
      p_organization_id: accepted.organizationId,
      p_checkout_session_id: session.id,
      p_payment_intent_id: paymentIntent,
      p_amount: session.amount_total,
      p_currency: session.currency,
      p_paid_at: paidAt,
    });
    if (error) return Response.json({ error: 'Founding Club payment could not be recorded.' }, { status: 500 });
  } catch {
    return Response.json({ error: 'Founding Club payment could not be recorded.' }, { status: 500 });
  }
  return Response.json({ received: true });
}

function factsFromSession(session: Stripe.Checkout.Session, price: Stripe.Price): FoundingClubFacts {
  const line = session.line_items?.data?.[0];
  const linePrice = line?.price;
  const priceId = typeof linePrice === 'string' ? linePrice : linePrice?.id ?? null;
  return {
    livemode: session.livemode,
    mode: session.mode,
    paymentStatus: session.payment_status,
    clientReferenceId: session.client_reference_id,
    userId: session.metadata?.campusquest_user_id ?? null,
    organizationId: session.metadata?.organization_id ?? null,
    plan: session.metadata?.plan ?? null,
    source: session.metadata?.source ?? null,
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

function sessionIdFrom(event: Stripe.Event): string | null {
  const object = event.data.object;
  if (!object || typeof object !== 'object' || !('id' in object) || typeof object.id !== 'string') return null;
  if (!object.id.startsWith('cs_')) return null;
  return object.id;
}

function paymentTime(session: Stripe.Checkout.Session): string {
  const intent = session.payment_intent;
  const unix = intent && typeof intent !== 'string' && intent.status === 'succeeded' ? intent.created : session.created;
  return new Date(unix * 1000).toISOString();
}
