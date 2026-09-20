import { NextResponse } from 'next/server';
import { cronSecret } from '@/lib/env';
import { runRetentionJob } from '@/lib/gm/retention-job';

export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  const secret = cronSecret();

  // Refusing to run without a secret configured is deliberate: an
  // unauthenticated endpoint that deletes student data is worse than a job that
  // has not been set up yet.
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured; the retention job will not run.' },
      { status: 503 }
    );
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const outcomes = await runRetentionJob();
    return NextResponse.json({
      ran_at: new Date().toISOString(),
      considered: outcomes.length,
      outcomes,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * The retention job. Warns at day 7 and day 25, de-identifies and purges at 30.
 *
 * GET is what Vercel Cron sends; POST is for invoking it by hand. It is written so
 * a silent failure is not possible: a purge that cannot preserve the corpus copy
 * alerts instead of proceeding, and the response reports every action taken.
 */
export const GET = handle;
export const POST = handle;
