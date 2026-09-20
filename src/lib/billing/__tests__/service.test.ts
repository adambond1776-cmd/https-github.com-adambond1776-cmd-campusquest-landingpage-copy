import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
const mock = vi.hoisted(() => ({
  customer: { retrieve: vi.fn(), create: vi.fn() }, prices: { retrieve: vi.fn() },
  subscriptions: { list: vi.fn(), update: vi.fn() }, sessions: { list: vi.fn(), create: vi.fn() },
  billingCustomer: vi.fn(), bindBillingCustomer: vi.fn(), lock: vi.fn(),
}));
vi.mock('stripe', () => ({
  default: class { customers = mock.customer; prices = mock.prices; subscriptions = mock.subscriptions; checkout = { sessions: mock.sessions }; },
}));
vi.mock('../store', () => ({ billingCustomer: mock.billingCustomer, bindBillingCustomer: mock.bindBillingCustomer, withBillingLock: mock.lock }));
import { changeTestCancellation, planForPrice, readTestSubscription, startTestCheckout, subscriptionView } from '../service';
function price(overrides = {}) {
  return { id: 'price_basic', active: true, livemode: false, currency: 'usd', unit_amount: 300, type: 'recurring',
    recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' }, ...overrides } as Stripe.Price;
}
function subscription(overrides = {}) {
  return { id: 'sub_1', customer: 'cus_1', livemode: false, status: 'active', created: 100,
    cancel_at_period_end: false, pause_collection: null,
    metadata: { cq_user_id: 'me', cq_product: 'campusquest_social_test' },
    items: { data: [{ price: price(), quantity: 1, current_period_end: 2000000000 }] }, ...overrides } as unknown as Stripe.Subscription;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('CQ_BILLING_MODE', 'test'); vi.stubEnv('CQ_STRIPE_TEST_SECRET_KEY', 'sk_test_fixture');
  vi.stubEnv('CQ_STRIPE_TEST_BASIC_PRICE_ID', 'price_basic'); vi.stubEnv('CQ_STRIPE_TEST_PLUS_PRICE_ID', 'price_plus');
  vi.stubEnv('CQ_BILLING_TEST_ORIGIN', 'http://localhost:43917');
  mock.billingCustomer.mockResolvedValue('cus_1');
  mock.customer.retrieve.mockResolvedValue({ id: 'cus_1', livemode: false, metadata: { cq_user_id: 'me' } });
  mock.customer.create.mockResolvedValue({ id: 'cus_1', livemode: false });
  mock.prices.retrieve.mockResolvedValue(price());
  mock.subscriptions.list.mockResolvedValue({ data: [], has_more: false });
  mock.sessions.list.mockResolvedValue({ data: [], has_more: false });
  mock.sessions.create.mockResolvedValue({ livemode: false, url: 'https://checkout.stripe.com/c/pay/cs_test_fixture' });
  mock.lock.mockImplementation(async (_user, work) => work());
});
afterEach(() => vi.unstubAllEnvs());
describe('Stripe-backed test billing', () => {
  it('recognizes an isolated $49 club price and refuses cross-plan access', () => {
    vi.stubEnv('CQ_STRIPE_TEST_CLUB_PRICE_ID', 'price_club');
    const clubPrice = price({ id: 'price_club', unit_amount: 4900 });
    expect(planForPrice(clubPrice, 'club')).toBe('club');
    expect(planForPrice(clubPrice)).toBeNull();
    expect(planForPrice(price(), 'club')).toBeNull();
    expect(planForPrice(price({ id: 'price_club', unit_amount: 49 }), 'club')).toBeNull();
  });
  it('requires club-specific subscription metadata', () => {
    vi.stubEnv('CQ_STRIPE_TEST_CLUB_PRICE_ID', 'price_club');
    const row = subscription({ metadata: { cq_user_id: 'me', cq_product: 'campusquest_club_test' },
      items: { data: [{ price: price({ id: 'price_club', unit_amount: 4900 }), quantity: 1, current_period_end: 2000000000 }] } });
    expect(subscriptionView(row, 'me', 'cus_1', 'club').plan).toBe('club');
    expect(() => subscriptionView(row, 'me', 'cus_1')).toThrow();
    expect(() => subscriptionView(subscription(), 'me', 'cus_1', 'club')).toThrow();
  });
  it('creates club checkout using a separate binding, product marker and return route', async () => {
    vi.stubEnv('CQ_STRIPE_TEST_CLUB_PRICE_ID', 'price_club');
    mock.customer.retrieve.mockResolvedValue({ id: 'cus_1', livemode: false, metadata: { cq_user_id: 'me', cq_product: 'campusquest_club_test' } });
    mock.prices.retrieve.mockResolvedValue(price({ id: 'price_club', unit_amount: 4900 }));
    await startTestCheckout('me','owner@example.com','club','club');
    expect(mock.billingCustomer).toHaveBeenCalledWith('me','club');
    expect(mock.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{price:'price_club',quantity:1}], success_url:'http://localhost:43917/clubs/manage?checkout=returned',
      subscription_data: {metadata:{cq_user_id:'me',cq_product:'campusquest_club_test'}},
    }),expect.anything());
    expect(mock.lock).toHaveBeenCalledWith('me',expect.any(Function),'club');
  });
  it('rejects club checkout through student billing and student plans through club billing', async () => {
    await expect(startTestCheckout('me','a@example.com','club')).rejects.toThrow('account type');
    await expect(startTestCheckout('me','a@example.com','plus','club')).rejects.toThrow('account type');
  });
  it.each([
    { livemode: true }, { unit_amount: 500 }, { currency: 'eur' }, { id: 'price_unknown' },
    { recurring: { interval: 'year', interval_count: 1, usage_type: 'licensed' } },
    { recurring: { interval: 'month', interval_count: 2, usage_type: 'licensed' } },
    { recurring: { interval: 'month', interval_count: 1, usage_type: 'metered' } },
  ])('rejects a price mismatch %j', (overrides) => expect(planForPrice(price(overrides))).toBeNull());
  it('recognizes the $5 Plus price without GM mapping', () => expect(planForPrice(price({ id: 'price_plus', unit_amount: 500 }))).toBe('plus'));
  it('reads authoritative provider state, not metadata plan', async () => {
    mock.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
    expect(await readTestSubscription('me')).toMatchObject({ plan: 'basic', status: 'active' });
  });
  it('returns Free for an account with no customer', async () => {
    mock.billingCustomer.mockResolvedValue(null);
    expect((await readTestSubscription('me')).plan).toBeNull();
    expect(mock.subscriptions.list).not.toHaveBeenCalled();
  });
  it.each([
    { livemode: true }, { customer: 'cus_other' }, { metadata: { cq_user_id: 'other' } },
    { items: { data: [] } }, { status: 'future_unknown' },
  ])('fails closed for invalid subscription %j', (changes) => expect(() => subscriptionView(subscription(changes), 'me', 'cus_1')).toThrow());
  it('blocks paused payment collection', () => expect(subscriptionView(subscription({ pause_collection: { behavior: 'void' } }), 'me', 'cus_1').status).toBe('paused'));
  it('checks customer ownership before creating checkout', async () => {
    mock.customer.retrieve.mockResolvedValue({ livemode: false, metadata: { cq_user_id: 'other' } });
    await expect(startTestCheckout('me', 'test@example.edu', 'basic')).rejects.toThrow('ownership');
    expect(mock.sessions.create).not.toHaveBeenCalled();
  });
  it('creates hosted checkout using server prices and the authenticated owner', async () => {
    expect(await startTestCheckout('me', 'test@example.edu', 'basic')).toContain('https://checkout.stripe.com/');
    expect(mock.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription', customer: 'cus_1', client_reference_id: 'me', line_items: [{ price: 'price_basic', quantity: 1 }],
      success_url: 'http://localhost:43917/billing?checkout=returned',
      subscription_data: { metadata: { cq_user_id: 'me', cq_product: 'campusquest_social_test' } },
    }), expect.objectContaining({ idempotencyKey: expect.stringContaining('cq-test-checkout-v1:me:basic:') }));
    expect(mock.lock).toHaveBeenCalled();
  });
  it('creates and binds a test customer if needed', async () => {
    mock.billingCustomer.mockResolvedValue(null);
    await startTestCheckout('me', 'test@example.edu', 'basic');
    expect(mock.bindBillingCustomer).toHaveBeenCalledWith('me', 'cus_1');
    expect(mock.customer.create).toHaveBeenCalledWith(expect.anything(), { idempotencyKey: 'cq-test-customer-v1:me' });
  });
  it('refuses an inactive configured price before creating customer or checkout', async () => {
    mock.prices.retrieve.mockResolvedValue(price({ active: false }));
    await expect(startTestCheckout('me', 'test@example.edu', 'basic')).rejects.toThrow('test price');
    expect(mock.customer.create).not.toHaveBeenCalled();
    expect(mock.sessions.create).not.toHaveBeenCalled();
  });
  it.each(['active', 'past_due', 'incomplete', 'unpaid', 'paused'])('prevents a second subscription when %s', async (status) => {
    mock.subscriptions.list.mockResolvedValue({ data: [subscription({ status })], has_more: false });
    await expect(startTestCheckout('me', 'test@example.edu', 'basic')).rejects.toThrow('already');
    expect(mock.sessions.create).not.toHaveBeenCalled();
  });
  it('reuses an existing matching open checkout', async () => {
    mock.sessions.list.mockResolvedValue({ data: [{ livemode: false, client_reference_id: 'me', metadata: { cq_plan: 'basic' }, url: 'https://checkout.stripe.com/c/pay/old' }], has_more: false });
    expect(await startTestCheckout('me', 'test@example.edu', 'basic')).toContain('/old');
    expect(mock.sessions.create).not.toHaveBeenCalled();
  });
  it('blocks an open checkout for the other plan', async () => {
    mock.sessions.list.mockResolvedValue({ data: [{ livemode: false, client_reference_id: 'me', metadata: { cq_plan: 'plus' } }], has_more: false });
    await expect(startTestCheckout('me', 'test@example.edu', 'basic')).rejects.toThrow('another plan');
  });
  it('rejects a non-Stripe redirect', async () => {
    mock.sessions.create.mockResolvedValue({ livemode: false, url: 'https://example.com/steal' });
    await expect(startTestCheckout('me', 'test@example.edu', 'basic')).rejects.toThrow('destination');
  });
  it.each([true, false])('schedules or reverses cancellation without immediate deletion: %s', async (cancel) => {
    mock.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
    mock.subscriptions.update.mockResolvedValue(subscription({ cancel_at_period_end: cancel }));
    expect((await changeTestCancellation('me', cancel)).cancelAtPeriodEnd).toBe(cancel);
    expect(mock.subscriptions.update).toHaveBeenCalledExactlyOnceWith('sub_1', { cancel_at_period_end: cancel });
  });
  it('does not resume a past-due subscription', async () => {
    mock.subscriptions.list.mockResolvedValue({ data: [subscription({ status: 'past_due' })], has_more: false });
    await expect(changeTestCancellation('me', false)).rejects.toThrow('payment status');
    expect(mock.subscriptions.update).not.toHaveBeenCalled();
  });
  it('fails closed on ambiguous or truncated subscription lists', async () => {
    mock.subscriptions.list.mockResolvedValue({ data: [subscription(), subscription({ id: 'sub_2' })], has_more: false });
    await expect(readTestSubscription('me')).rejects.toThrow('Multiple');
    mock.subscriptions.list.mockResolvedValue({ data: [], has_more: true });
    await expect(readTestSubscription('me')).rejects.toThrow('review');
  });
});
