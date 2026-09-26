import { handleFoundingWebhook } from '@/lib/basic/founding-webhook';

export const dynamic = 'force-dynamic';

/** CQ Basic founding pass only. Genius Mining and monthly test subscriptions use other endpoints. */
export async function POST(request: Request): Promise<Response> {
  return handleFoundingWebhook(request);
}
