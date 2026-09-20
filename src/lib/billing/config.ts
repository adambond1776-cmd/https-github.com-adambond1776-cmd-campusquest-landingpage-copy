/** There is deliberately no live mode in this implementation. */
export function billingTestEnabled(): boolean { return process.env.CQ_BILLING_MODE === 'test'; }
export function billingDemoEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
}
export function testBillingConfig(scope: 'student' | 'club' = 'student') {
  if (!billingTestEnabled()) throw new Error('Test billing is disabled.');
  const secret = process.env.CQ_STRIPE_TEST_SECRET_KEY?.trim();
  if (!secret?.startsWith('sk_test_')) throw new Error('A Stripe test secret key is required. Live keys are refused.');
  const basic = process.env.CQ_STRIPE_TEST_BASIC_PRICE_ID?.trim();
  const plus = process.env.CQ_STRIPE_TEST_PLUS_PRICE_ID?.trim();
  const club = process.env.CQ_STRIPE_TEST_CLUB_PRICE_ID?.trim();
  if (scope === 'student' && (!basic?.startsWith('price_') || !plus?.startsWith('price_') || basic === plus)) {
    throw new Error('Configure separate Basic and Plus test prices.');
  }
  if (scope === 'club' && (!club?.startsWith('price_') || club === basic || club === plus)) {
    throw new Error('Configure a separate $49 Club test price.');
  }
  const origin = new URL(process.env.CQ_BILLING_TEST_ORIGIN || 'http://localhost:43917');
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
    || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) {
    throw new Error('Invalid test billing origin.');
  }
  return { secret, prices: { basic: basic ?? '', plus: plus ?? '', club: club ?? '' }, origin: origin.origin };
}
