import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { SubscriptionStatus, Tier } from '@hiddengeniuslabs/genius-mining';
import { stripeWebhookSecret } from '@/lib/env';
import { applyToStudent, parseCoverage, parseSnapshot } from '@/lib/gm/subscription';

export const dynamic = 'force-dynamic';

/**
 * Price ids that grant the Genius Mining tier.
 *
 * Kept in configuration rather than in code so the tier mapping can change with
 * pricing without a deploy.
 */
function premiumPriceIds(): string[] {
  return (process.env.STRIPE_PREMIUM_PRICE_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function adminToken(): string | undefined {
  return process.env.GM_ADMIN_TOKEN?.trim() || undefined;
}

function tierFor(subscription: Stripe.Subscription): Tier {
  const premium = premiumPriceIds();
  const prices = subscription.items.data.map((item) => item.price.id);

  if (premium.length > 0 && prices.some((price) => premium.includes(price))) return 'premium';

  // With no mapping configured, a live subscription is assumed to be the paid
  // student tier. That errs toward keeping data rather than deleting it.
  return premium.length === 0 ? 'premium' : 'basic';
}

/**
 * Applies a subscription change to a student's retention state.
 *
 * Two ways in. A Stripe webhook with a valid signature is the production path.
 * A signed admin call is the support and testing path — it needs GM_ADMIN_TOKEN,
 * so an unconfigured deployment exposes neither.
 */
export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = stripeWebhookSecret();
  const body = await request.text();

  if (signature && webhookSecret) {
    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      return NextResponse.json(
        { error: `Signature verification failed: ${(error as Error).message}` },
        { status: 400 }
      );
    }

    // Test billing is isolated from the legacy Genius Mining access/retention
    // path. Even a correctly signed test event must never grant GM or send mail.
    if (event.livemode !== true) {
      return NextResponse.json({ ignored: 'Test events cannot change Genius Mining access.' });
    }

    if (
      event.type !== 'customer.subscription.updated' &&
      event.type !== 'customer.subscription.deleted' &&
      event.type !== 'customer.subscription.created'
    ) {
      return NextResponse.json({ ignored: event.type });
    }

    const subscription = event.data.object as Stripe.Subscription;
    if (subscription.metadata?.cq_product === 'campusquest_social_test') {
      return NextResponse.json({ ignored: 'Social test subscriptions do not grant Genius Mining.' });
    }

    // The account this subscription belongs to. Set this when the checkout
    // session is created; without it there is no way to know whose data this is.
    const userId =
      (subscription.metadata?.user_id as string | undefined) ??
      (subscription.metadata?.supabase_user_id as string | undefined);

    if (!userId) {
      return NextResponse.json(
        { error: 'Subscription has no user_id in metadata; cannot attribute it to an account.' },
        { status: 422 }
      );
    }

    const status =
      event.type === 'customer.subscription.deleted'
        ? ('canceled' as SubscriptionStatus)
        : (subscription.status as SubscriptionStatus);

    const outcome = await applyToStudent(userId, {
      subscription: { tier: tierFor(subscription), status },
    });

    return NextResponse.json(
      outcome ?? { ignored: 'No Genius Mining record for that account.' }
    );
  }

  const token = adminToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          'Configure STRIPE_WEBHOOK_SECRET for the Stripe path, or GM_ADMIN_TOKEN for the admin path.',
      },
      { status: 503 }
    );
  }

  if (request.headers.get('authorization') !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let parsed: { user_id?: string; subscription?: unknown; coverage?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Body was not JSON.' }, { status: 400 });
  }

  const snapshot = parsed.subscription === undefined ? undefined : parseSnapshot(parsed.subscription);
  // `null` clears the seat, an absent key leaves it alone, and an object sets it.
  const coverage = parsed.coverage === undefined ? undefined : parseCoverage(parsed.coverage);

  if (!parsed.user_id || (parsed.subscription !== undefined && !snapshot)) {
    return NextResponse.json(
      {
        error:
          'Expected { user_id, subscription?: { tier, status }, coverage?: { campus_id, starts_at, ends_at } | null }.',
      },
      { status: 400 }
    );
  }

  const outcome = await applyToStudent(parsed.user_id, {
    subscription: snapshot ?? undefined,
    coverage,
  });
  return NextResponse.json(outcome ?? { ignored: 'No Genius Mining record for that account.' });
}
