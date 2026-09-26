import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { acceptFoundingCheckout, foundingBillingConfig, foundingWebhookSecret } from '@/lib/basic/founding';
import { factsFromStripe, foundingStripe } from '@/lib/basic/founding-checkout';

const HANDLED = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);
const FAILED = new Set(['checkout.session.async_payment_failed', 'checkout.session.expired']);

export async function handleFoundingWebhook(request: Request): Promise<Response> {
  let config: ReturnType<typeof foundingBillingConfig>;
  try {
    config = foundingBillingConfig();
  } catch {
    return Response.json({ error: 'Founding checkout is not configured.' }, { status: 503 });
  }
  const secret = foundingWebhookSecret();
  if (!secret) return Response.json({ error: 'Founding webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Missing signature.' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }
  if (event.livemode !== false) return Response.json({ error: 'Live events are refused.' }, { status: 400 });
  if (!HANDLED.has(event.type) && !FAILED.has(event.type)) return Response.json({ received: true });

  const sessionId = sessionIdFromEvent(event);
  if (!sessionId) return Response.json({ received: true });
  try {
    const stripe = foundingStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price', 'payment_intent'] });
    if (session.livemode) return Response.json({ error: 'Live events are refused.' }, { status: 400 });
    if (FAILED.has(event.type) || session.payment_status !== 'paid') return Response.json({ received: true });
    const price = await stripe.prices.retrieve(config.priceId);
    const accepted = acceptFoundingCheckout(factsFromStripe(session, price), config.priceId);
    if (!accepted.ok) return Response.json({ received: true });
    await applyVerifiedPayment(accepted.userId, session);
  } catch {
    return Response.json({ error: 'Founding payment could not be recorded.' }, { status: 500 });
  }
  return Response.json({ received: true });
}

async function applyVerifiedPayment(userId: string, session: Stripe.Checkout.Session): Promise<void> {
  const admin = createAdminClient();
  if (!admin) throw new Error('Founding payment storage is not configured.');
  const paidAt = paymentTime(session);
  const paymentIntentId = paymentIntentIdFrom(session);
  const { error } = await admin.rpc('apply_cq_basic_founding_payment', {
    p_user_id: userId,
    p_checkout_session_id: session.id,
    p_payment_intent_id: paymentIntentId ?? '',
    p_amount: session.amount_total,
    p_currency: session.currency,
    p_paid_at: paidAt,
  });
  if (error) throw new Error('Founding payment could not be recorded.');
}

function sessionIdFromEvent(event: Stripe.Event): string | null {
  const object = event.data.object;
  if (!object || typeof object !== 'object' || !('id' in object) || typeof object.id !== 'string') return null;
  if (!object.id.startsWith('cs_')) return null;
  return object.id;
}

function paymentIntentIdFrom(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

function paymentTime(session: Stripe.Checkout.Session): string {
  const intent = session.payment_intent;
  const unix = intent && typeof intent !== 'string' && intent.status === 'succeeded' ? intent.created : session.created;
  return new Date(unix * 1000).toISOString();
}
