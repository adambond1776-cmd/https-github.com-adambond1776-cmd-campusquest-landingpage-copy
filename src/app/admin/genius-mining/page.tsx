import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CircleAlert, CircleCheck } from 'lucide-react';
import {
  MIN_VERIFIED_PER_WORKING_WORD,
  availableCampuses,
  coverageReport,
} from '@hiddengeniuslabs/genius-mining';
import { adminEmails, isMockEngine } from '@/lib/env';
import { currentIdentity } from '@/lib/gm/identity';
import { getStore } from '@/lib/gm/store';

export const metadata: Metadata = {
  title: 'Genius Mining admin | CampusQuest',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function assertAdmin(): Promise<void> {
  const allowed = adminEmails();

  // An unprotected admin view in production is not acceptable, so production
  // requires the allowlist. Local development without one is fine.
  if (process.env.NODE_ENV === 'production') {
    if (allowed.length === 0) notFound();
    const identity = await currentIdentity();
    if (!identity?.email || !allowed.includes(identity.email)) notFound();
  }
}

export default async function GeniusMiningAdminPage() {
  await assertAdmin();

  const records = await getStore().list();
  const campuses = availableCampuses();

  const withResolution = records.filter((record) => record.d1_resolution);
  const unresolved = withResolution.filter(
    (record) => record.d1_resolution?.resolution === 'UNRESOLVED'
  );
  const tieBrokenByC1 = withResolution.filter(
    (record) => record.d1_resolution?.resolution === 'tie_broken_by_C1'
  );
  const lapsed = records.filter((record) => record.retention.lapsed_at !== null);
  const filed = records.filter(
    (record) => record.profile?.status === 'accepted' || record.profile?.status === 'filed'
  );

  return (
    <div className="min-h-screen bg-cream-50">
      <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-950">
          Genius Mining
        </h1>

        {isMockEngine() ? (
          <p className="mt-6 rounded-xl border border-gold-500/40 bg-gold-400/15 px-4 py-3 text-sm font-semibold text-brand-900">
            No Anthropic key configured. Analyses run against a local stand-in and profiles are
            stamped <code className="font-mono">mock-engine</code>.
          </p>
        ) : null}

        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-brand-900">Pathway coverage gate</h2>
          <p className="mt-2 max-w-2xl text-brand-700">
            Every working word needs at least {MIN_VERIFIED_PER_WORKING_WORD} verified activities
            before a cohort runs. A student who returns PROTECTOR and lands on an empty page has had
            a worse experience than if they had never taken the form, so this blocks launch rather
            than warning about it.
          </p>

          {campuses.map((campus) => {
            const report = coverageReport(campus.id);
            return (
              <div
                key={campus.id}
                className="mt-6 overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 px-5 py-4">
                  <div>
                    <h3 className="font-extrabold text-brand-900">{report.campusName}</h3>
                    <p className="text-xs text-brand-500">
                      Last verified {report.lastVerified}
                    </p>
                  </div>
                  <p
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      report.passes
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {report.passes ? (
                      <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {report.passes
                      ? 'Cohort launch unblocked'
                      : `Blocked — ${report.blockedWords.length} of ${report.rows.length} words short`}
                  </p>
                </div>

                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Verified activity count per working word at {report.campusName}
                  </caption>
                  <thead>
                    <tr className="border-b border-cream-200 text-left text-xs uppercase tracking-wide text-brand-500">
                      <th scope="col" className="px-5 py-2.5 font-bold">
                        Working word
                      </th>
                      <th scope="col" className="px-5 py-2.5 font-bold">
                        Verified
                      </th>
                      <th scope="col" className="px-5 py-2.5 font-bold">
                        Gate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.workingWord} className="border-b border-cream-100 last:border-0">
                        <th scope="row" className="px-5 py-2.5 text-left font-bold text-brand-900">
                          {row.workingWord}
                        </th>
                        <td className="px-5 py-2.5 tabular-nums text-brand-700">
                          {row.verifiedCount}
                        </td>
                        <td className="px-5 py-2.5">
                          {row.meetsGate ? (
                            <span className="font-semibold text-green-700">Clear</span>
                          ) : (
                            <span className="font-semibold text-red-700">
                              Needs {MIN_VERIFIED_PER_WORKING_WORD - row.verifiedCount} more
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold text-brand-900">Instrument health</h2>
          <p className="mt-2 max-w-2xl text-brand-700">
            Six tags across eight verbs means ties are common. How often D1 fails to resolve is
            instrument-design data — if it fires on most students, the tally is too thin to keep in
            the form as it stands.
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Records', value: records.length },
              { label: 'Signed off', value: filed.length },
              {
                label: 'D1 unresolved',
                value: withResolution.length
                  ? `${unresolved.length} of ${withResolution.length}`
                  : '—',
              },
              {
                label: 'Tie broken by C1',
                value: withResolution.length
                  ? `${tieBrokenByC1.length} of ${withResolution.length}`
                  : '—',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-cream-300 bg-white p-5 shadow-soft"
              >
                <dt className="text-xs font-bold uppercase tracking-wide text-brand-500">
                  {stat.label}
                </dt>
                <dd className="mt-2 text-2xl font-extrabold tabular-nums text-brand-900">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-extrabold text-brand-900">Retention</h2>
          {lapsed.length === 0 ? (
            <p className="mt-2 text-brand-700">No deletion clocks are running.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {lapsed.map((record) => (
                <li
                  key={record.participant_code}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-cream-300 bg-white px-5 py-3.5 shadow-soft"
                >
                  <span className="font-bold text-brand-900 tabular-nums">
                    {record.participant_code}
                  </span>
                  <span className="text-sm text-brand-600">
                    {record.retention.membership_status} · purge due{' '}
                    {record.retention.purge_due_at?.slice(0, 10) ?? 'unknown'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12 rounded-2xl border border-cream-300 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-extrabold text-brand-900">Still outstanding</h2>
          <ul className="mt-3 space-y-2 text-brand-700">
            <li>
              GM-001&rsquo;s responses have never been transcribed — his pages exist only as
              photographs, so the golden test cannot run end to end yet.
            </li>
            <li>
              The URInvolved export is what fills the coverage gate. Seven of eight working words are
              short until it lands.
            </li>
            <li>Legal review of the consent copy before launch.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
