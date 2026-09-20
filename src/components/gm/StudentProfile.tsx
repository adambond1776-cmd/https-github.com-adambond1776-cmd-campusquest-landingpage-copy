import Link from 'next/link';
import { CircleAlert, ExternalLink, MapPin, Printer } from 'lucide-react';
import type { PathwayEntry, Profile } from '@hiddengeniuslabs/genius-mining';
import EditableLine from '@/components/gm/EditableLine';
import { safeText } from '@/lib/gm/render';

export type StudentProfileProps = {
  profile: Profile;
  d3Sentence: string;
  pathways: PathwayEntry[];
  campusName: string;
  coverageMet: boolean;
};

/**
 * The student rendering: second person, warm, concrete.
 *
 * Same profile object as the advisor printout, different job. This one is theirs
 * to read and to argue with.
 */
export default function StudentProfile({
  profile,
  d3Sentence,
  pathways,
  campusName,
  coverageMet,
}: StudentProfileProps) {
  const thinSpots = profile.thin_spots ?? [];
  const evidence = safeText(profile.evidence, thinSpots);
  const bodySignal = safeText(profile.body_signal_read, thinSpots);
  const editable = profile.status !== 'filed';
  const tallyWasThin = profile.d1_resolution?.resolution === 'UNRESOLVED';

  return (
    <article className="space-y-8">
      <section className="rounded-2xl bg-brand-950 px-6 py-10 text-center sm:px-10 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
          Your working word
        </p>
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          {profile.primary_working_word}
        </h1>
        {d3Sentence ? (
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            &ldquo;{d3Sentence}&rdquo;
          </p>
        ) : null}
        <p className="mt-6 text-sm text-white/50">
          Your sentence is the important one. The word is only a starting place.
        </p>
      </section>

      {evidence.text ? (
        <section className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
          <h2 className="text-lg font-extrabold text-brand-900">Where it already showed up</h2>
          <div className="mt-4">
            <EditableLine
              field="evidence"
              label="Evidence"
              value={evidence.text}
              editable={editable}
              className="text-brand-800 leading-relaxed"
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        {bodySignal.text ? (
          <section className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand-500">
              What your body said
            </h2>
            <div className="mt-3">
              <EditableLine
                field="body_signal_read"
                label="Body signal"
                value={bodySignal.text}
                editable={editable}
                className="text-brand-800"
              />
            </div>
          </section>
        ) : null}

        {profile.secondary_pattern?.word ? (
          <section className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand-500">
              Also in there
            </h2>
            <p className="mt-3 text-2xl font-extrabold text-brand-900">
              {profile.secondary_pattern.word}
            </p>
            <p className="mt-2 text-brand-700">{profile.secondary_pattern.note}</p>
          </section>
        ) : null}
      </div>

      {profile.disagreement_with_self_tally?.value || tallyWasThin ? (
        <section className="rounded-2xl border border-gold-500/40 bg-gold-400/15 p-6 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-brand-900">
            <CircleAlert className="h-5 w-5 text-gold-600" aria-hidden />
            Where this disagrees with your own count
          </h2>
          <p className="mt-3 text-brand-800">{profile.disagreement_with_self_tally.reason}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-extrabold text-brand-900">
            Things at {campusName} that fit this
          </h2>
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" aria-hidden />
        </div>

        {pathways.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-brand-600">
              Verified as of this term. These are places {profile.primary_working_word} fits, not
              personalised picks — that part comes next.
            </p>
            <ul className="mt-5 space-y-4">
              {pathways.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-cream-300 bg-cream-100/50 p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-bold text-brand-900">{entry.name}</h3>
                    {entry.low_commitment_entry ? (
                      <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                        Easy way in
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-brand-500">{entry.location}</p>
                  <p className="mt-2.5 text-sm text-brand-800">{entry.what_it_is}</p>
                  <p className="mt-2 text-sm font-semibold text-brand-700">{entry.how_to_join}</p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          // Never an empty page. A student who lands on nothing has had a worse
          // experience than if they had never taken the form, so say plainly
          // where things stand rather than padding it with filler.
          <div className="mt-4 rounded-xl bg-cream-100 p-5">
            <p className="text-brand-800">
              We are still verifying which {campusName} clubs and events fit{' '}
              {profile.primary_working_word}, and we would rather send you nothing than send you to
              a club that folded last spring.
            </p>
            <p className="mt-3 text-brand-800">
              Your profile is finished and saved. We will email you the moment there are real
              options for your word — you will not have to fill anything in again.
            </p>
            {!coverageMet ? (
              <p className="mt-3 text-xs text-brand-500">
                Every working word needs at least three verified activities before we start matching.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-cream-300 bg-white p-6 shadow-soft sm:p-7">
        <h2 className="text-lg font-extrabold text-brand-900">Take this to someone</h2>
        <p className="mt-2.5 text-brand-700">
          There is a printable version built for an advisor or a parent. It shows the same finding
          with the evidence, how confident the reading is, and which of your answers were too thin to
          use — so they read it as a conversation starter rather than a result.
        </p>
        <Link
          href="/genius-mining/profile/advisor"
          className="btn-secondary mt-5 w-full sm:w-auto"
        >
          <Printer className="h-4 w-4" />
          Open the advisor version
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
      </section>
    </article>
  );
}
