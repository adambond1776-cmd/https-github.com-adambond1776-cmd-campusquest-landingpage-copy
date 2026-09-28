import Stripe from 'stripe';
import { isDemoAccountEmail } from '@/lib/account/demo-account';
import {
  FOUNDING_CLUB_CENTS,
  FOUNDING_CLUB_PLAN,
  FOUNDING_CLUB_SOURCE,
  foundingClubBillingConfig,
  foundingClubCheckoutConfigured,
} from '@/lib/clubs/founding-club';
import {
  checkoutBlockMessage,
  clubCheckoutEligibility,
  type ClaimStatus,
} from '@/lib/clubs/representation';
import { loadClubCheckoutFacts } from '@/lib/clubs/representation-store';

export async function createFoundingClubCheckout(userId: string, email: string, organizationId: string): Promise<string> {
  const facts = await loadClubCheckoutFacts(userId, organizationId);
  const decision = clubCheckoutEligibility({
    authenticated: true,
    demo: isDemoAccountEmail(email),
    organizationId,
    organizationExists: facts.organizationExists,
    approvedRepresentative: facts.approvedRepresentative,
    claimStatus: facts.claimStatus as ClaimStatus | null,
    accessActive: facts.accessActive,
    checkoutConfigured: foundingClubCheckoutConfigured(),
  });
  if (!decision.ok) throw new Error(checkoutBlockMessage(decision.reason));

  const config = foundingClubBillingConfig();
  const stripe = new Stripe(config.secret, { timeout: 15000, maxNetworkRetries: 0 });
  const price = await stripe.prices.retrieve(config.priceId);
  if (price.livemode || !price.active || price.type !== 'one_time' || price.recurring
    || price.currency !== 'usd' || price.unit_amount !== FOUNDING_CLUB_CENTS) {
    throw new Error('Founding Club price must be an active one-time $99 USD price.');
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    client_reference_id: userId,
    line_items: [{ price: config.priceId, quantity: 1 }],
    payment_method_types: ['card'],
    allow_promotion_codes: false,
    metadata: {
      campusquest_user_id: userId,
      organization_id: organizationId,
      plan: FOUNDING_CLUB_PLAN,
      source: FOUNDING_CLUB_SOURCE,
    },
    payment_intent_data: {
      metadata: {
        campusquest_user_id: userId,
        organization_id: organizationId,
        plan: FOUNDING_CLUB_PLAN,
        source: FOUNDING_CLUB_SOURCE,
      },
    },
    success_url: `${config.origin}/clubs/represent?organization=${encodeURIComponent(organizationId)}&checkout=returned`,
    cancel_url: `${config.origin}/clubs/represent?organization=${encodeURIComponent(organizationId)}&checkout=canceled`,
  });
  if (session.livemode || !session.url) throw new Error('Founding Club checkout is unavailable. Refresh and retry.');
  return checkoutUrl(session.url);
}

function checkoutUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') {
    throw new Error('Founding Club checkout destination was not recognized.');
  }
  return value;
}
