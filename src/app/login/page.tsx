import LoginView from '@/app/login/login-view';
import { localTestAccountEmail } from '@/lib/account/test-account';
import { isProductionRuntime } from '@/lib/runtime';

export default async function LoginPage() {
  if (isProductionRuntime()) return <LoginView />;

  const { default: TestAccountButton } = await import('@/app/login/test-account-button');
  const email = localTestAccountEmail();
  return <LoginView testAccount={email ? <TestAccountButton /> : null} />;
}
