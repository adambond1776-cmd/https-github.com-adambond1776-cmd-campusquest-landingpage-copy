import LoginView from '@/app/login/login-view';
import TestAccountButton from '@/app/login/test-account-button';
import { localTestAccountEmail } from '@/lib/account/test-account';

export default function LoginPage() {
  const email = localTestAccountEmail();
  return <LoginView testAccount={email ? <TestAccountButton /> : null} />;
}
