import Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { testBillingConfig } from '@/lib/billing/config';

export const dynamic = 'force-dynamic';
/** No cached entitlements to replay: every paid access decision reads Stripe.
 * Duplicate/out-of-order notifications only invalidate pages, never overwrite
 * an access snapshot, trigger mail, or touch Genius Mining retention.
 */
export async function POST(request: Request): Promise<Response> {
  try { testBillingConfig(); } catch {
    try { testBillingConfig('club'); } catch {
      return Response.json({ error: 'Test billing is disabled or unconfigured.' }, { status: 503 });
    }
  }
  const secret = process.env.CQ_STRIPE_TEST_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: 'Test webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Missing signature.' }, { status: 400 });
  let event: Stripe.Event;
  try { event = Stripe.webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 }); }
  if (event.livemode !== false) return Response.json({ error: 'Live events are refused.' }, { status: 400 });
  if (event.type.startsWith('customer.subscription.') || event.type.startsWith('invoice.')
    || event.type.startsWith('checkout.session.')) {
    revalidatePath('/billing');
    revalidatePath('/activities');
    revalidatePath('/clubs', 'layout');
  }
  return Response.json({ received: true });
}
