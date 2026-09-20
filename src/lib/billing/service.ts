import Stripe from 'stripe';
import { BILLING_PLANS, EMPTY_SUBSCRIPTION, isPaidPlan, type BillingStatus, type BillingScope, type SubscriptionPlan, type SubscriptionView } from './catalog';
import { testBillingConfig } from './config';
import { billingCustomer, bindBillingCustomer, withBillingLock } from './store';

const product = (scope: BillingScope) => scope === 'club' ? 'campusquest_club_test' : 'campusquest_social_test';
export function testStripe(scope: BillingScope = 'student') {
  return new Stripe(testBillingConfig(scope).secret, { timeout: 15000, maxNetworkRetries: 0 });
}
function assertTest(object: { livemode: boolean }) {
  if (object.livemode !== false) throw new Error('Live payment data is not allowed in this flow.');
}
function customerId(object: Stripe.Subscription): string {
  return typeof object.customer === 'string' ? object.customer : object.customer.id;
}
export function planForPrice(price: Stripe.Price, scope: BillingScope = 'student'): SubscriptionPlan | null {
  const config = testBillingConfig(scope);
  const plans: SubscriptionPlan[] = scope === 'club' ? ['club'] : ['basic', 'plus'];
  for (const plan of plans) {
    if (price.id === config.prices[plan] && price.livemode === false
      && price.currency === 'usd' && price.unit_amount === (plan === 'club' ? 4900 : BILLING_PLANS[plan].cents)
      && price.type === 'recurring' && price.recurring?.interval === 'month'
      && price.recurring.interval_count === 1 && price.recurring.usage_type === 'licensed') return plan;
  }
  return null;
}
export function subscriptionView(subscription: Stripe.Subscription, owner: string, customer: string, scope: BillingScope = 'student'): SubscriptionView {
  assertTest(subscription);
  if (customerId(subscription) !== customer || subscription.metadata.cq_user_id !== owner
    || subscription.metadata.cq_product !== product(scope)) throw new Error('Subscription ownership could not be verified.');
  const item = subscription.items.data[0];
  const plan = subscription.items.data.length === 1 && item.quantity === 1 ? planForPrice(item.price, scope) : null;
  if (!plan || !Number.isFinite(item.current_period_end)) throw new Error('The subscription price or period is not recognized.');
  const statuses: BillingStatus[] = ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete', 'incomplete_expired', 'canceled'];
  if (!statuses.includes(subscription.status as BillingStatus)) throw new Error('Unknown subscription status.');
  return { plan, status: subscription.pause_collection ? 'paused' : subscription.status as BillingStatus,
    periodEnd: item.current_period_end, cancelAtPeriodEnd: subscription.cancel_at_period_end };
}

async function ownedCustomer(stripe: Stripe, userId: string, scope: BillingScope): Promise<string | null> {
  const id = scope === 'club' ? await billingCustomer(userId, scope) : await billingCustomer(userId);
  if (!id) return null;
  const customer = await stripe.customers.retrieve(id);
  if (customer.deleted) throw new Error('The test customer was deleted.');
  assertTest(customer);
  if (customer.metadata.cq_user_id !== userId) throw new Error('Customer ownership could not be verified.');
  if (scope === 'club' && customer.metadata.cq_product !== product(scope)) throw new Error('Club customer ownership could not be verified.');
  return id;
}
async function subscriptions(stripe: Stripe, customer: string) {
  const result = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
  if (result.has_more) throw new Error('This test account needs a billing review.');
  for (const subscription of result.data) assertTest(subscription);
  return result.data;
}
function currentSubscription(rows: Stripe.Subscription[]): Stripe.Subscription | null {
  const current = rows.filter((row) => !['canceled', 'incomplete_expired'].includes(row.status));
  if (current.length > 1) throw new Error('Multiple subscriptions found. Do not start another checkout.');
  return current[0] ?? rows.sort((a, b) => b.created - a.created)[0] ?? null;
}
export async function readTestSubscription(userId: string, scope: BillingScope = 'student'): Promise<SubscriptionView> {
  const stripe = testStripe(scope);
  const customer = await ownedCustomer(stripe, userId, scope);
  if (!customer) return { ...EMPTY_SUBSCRIPTION };
  const subscription = currentSubscription(await subscriptions(stripe, customer));
  return subscription ? subscriptionView(subscription, userId, customer, scope) : { ...EMPTY_SUBSCRIPTION };
}

export async function startTestCheckout(userId: string, email: string, plan: SubscriptionPlan, scope: BillingScope = 'student'): Promise<string> {
  if (scope === 'club' ? plan !== 'club' : !isPaidPlan(plan)) throw new Error('Choose a plan for this account type.');
  const config = testBillingConfig(scope);
  const stripe = testStripe(scope);
  return withBillingLock(userId, async () => {
    // Validate the actual configured price, not just its ID, before a session.
    const price = await stripe.prices.retrieve(config.prices[plan]);
    if (!price.active || planForPrice(price, scope) !== plan) throw new Error('The test price must match the advertised USD monthly amount.');
    let customer = await ownedCustomer(stripe, userId, scope);
    if (!customer) {
      const created = await stripe.customers.create({ email, metadata: { cq_user_id: userId, cq_product: product(scope) } },
        { idempotencyKey: `cq-test-customer-v1:${scope === 'club' ? 'club:' : ''}${userId}` });
      assertTest(created);
      customer = created.id;
      if (scope === 'club') await bindBillingCustomer(userId, customer, scope);
      else await bindBillingCustomer(userId, customer);
    }
    const existing = currentSubscription(await subscriptions(stripe, customer));
    if (existing && !['canceled', 'incomplete_expired'].includes(existing.status)) {
      throw new Error('You already have a subscription or payment pending. Refresh to manage it instead.');
    }
    const open = await stripe.checkout.sessions.list({ customer, status: 'open', limit: 10 });
    if (open.has_more || open.data.length > 1) throw new Error('Multiple checkouts found. This test account needs review.');
    if (open.data[0]) {
      const session = open.data[0];
      assertTest(session);
      if (session.client_reference_id !== userId || session.metadata?.cq_plan !== plan) {
        throw new Error('A checkout for another plan is still open. Complete it or let it expire before changing plans.');
      }
      if (!session.url) throw new Error('The open checkout has no URL.');
      return safeCheckoutUrl(session.url);
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer, client_reference_id: userId,
      line_items: [{ price: config.prices[plan], quantity: 1 }],
      payment_method_types: ['card'],
      allow_promotion_codes: false,
      metadata: { cq_plan: plan, cq_product: product(scope) },
      subscription_data: { metadata: { cq_user_id: userId, cq_product: product(scope) } },
      success_url: `${config.origin}/${scope === 'club' ? 'clubs/manage' : 'billing'}?checkout=returned`,
      cancel_url: `${config.origin}/${scope === 'club' ? 'clubs/manage' : 'billing'}?checkout=canceled`,
    }, { idempotencyKey: `cq-test-checkout-v1:${userId}:${plan}:${existing?.id ?? 'first'}:${Math.floor(Date.now() / 86400000)}` });
    assertTest(session);
    if (!session.url) throw new Error('Checkout is unavailable. Refresh and retry.');
    return safeCheckoutUrl(session.url);
  }, scope);
}
function safeCheckoutUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Unrecognized checkout destination.');
  return value;
}
export async function changeTestCancellation(userId: string, cancel: boolean, scope: BillingScope = 'student'): Promise<SubscriptionView> {
  const stripe = testStripe(scope);
  return withBillingLock(userId, async () => {
    const customer = await ownedCustomer(stripe, userId, scope);
    if (!customer) throw new Error('There is no test subscription to manage.');
    const subscription = currentSubscription(await subscriptions(stripe, customer));
    if (!subscription) throw new Error('There is no test subscription to manage.');
    subscriptionView(subscription, userId, customer, scope);
    if (['canceled', 'incomplete_expired'].includes(subscription.status)) throw new Error('This subscription has ended.');
    if (!cancel && subscription.status !== 'active') throw new Error('Resolve the payment status before resuming renewal.');
    const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: cancel });
    return subscriptionView(updated, userId, customer, scope);
  }, scope);
}
