import { changeTestCancellation, readTestSubscription, startTestCheckout } from '@/lib/billing/service';
import type { ClubBilling } from './service';
export const stripeClubBilling: ClubBilling = {
  read: user => readTestSubscription(user, 'club'),
  checkout: (user, email) => startTestCheckout(user, email, 'club', 'club'),
  cancel: (user, cancel) => changeTestCancellation(user, cancel, 'club'),
};
