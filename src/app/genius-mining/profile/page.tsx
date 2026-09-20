import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import {
  SECTION_IDS,
  engine2Enabled,
  pathwaySet,
  verifiedPathwaysFor,
} from '@hiddengeniuslabs/genius-mining';
import AcceptProfile from '@/components/gm/AcceptProfile';
import AgeLocked from '@/components/gm/AgeLocked';
import GmHeader from '@/components/gm/GmHeader';
import RunAnalysis from '@/components/gm/RunAnalysis';
import StudentProfile from '@/components/gm/StudentProfile';
import RulesStep from '@/components/book/RulesStep';
import { isMockEngine } from '@/lib/env';
import { requireGeniusMiningAccess } from '@/lib/gate';
import { loadCurrentRecord } from '@/lib/gm/load';

export const metadata: Metadata = {
  title: 'Your Genius Profile | CampusQuest',
};

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const access = await requireGeniusMiningAccess();
  if (!access.allowed) return <AgeLocked reason={access.reason} />;

  const record = await loadCurrentRecord();

  if (!record?.consent) redirect('/genius-mining');

  const everySectionDone = SECTION_IDS.every((id) =>
    record.progress.completed_sections.includes(id)
  );
  if (!everySectionDone) redirect('/genius-mining/questionnaire');

  const campus = pathwaySet(record.campus_id);

  if (!record.profile) {
    return (
      <div className="min-h-screen bg-cream-50">
        <GmHeader participantCode={record.participant_code} />
        <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
          <RunAnalysis isMockEngine={isMockEngine()} />
        </main>
      </div>
    );
  }

  const workingWord = record.profile.primary_working_word;

  return (
    <div className="min-h-screen bg-cream-50">
      <GmHeader participantCode={record.participant_code} />

      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-8 sm:px-8">
        {record.profile.status === 'accepted' || record.profile.status === 'filed' ? (
          <p className="mb-8 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Filed. You can still rewrite any line on it.
          </p>
        ) : null}

        <StudentProfile
          profile={record.profile}
          d3Sentence={record.responses.D3 ?? ''}
          pathways={verifiedPathwaysFor(record.campus_id, workingWord)}
          campusName={campus.campus_name}
          coverageMet={engine2Enabled(record.campus_id, workingWord)}
        />

        {record.profile.status !== 'accepted' && record.profile.status !== 'filed' ? (
          <div className="mt-8">
            <AcceptProfile />
          </div>
        ) : (
          // Only once the profile is theirs. Before that the page is asking them
          // to judge a result, and a purchase prompt alongside that reads badly.
          <RulesStep workingWord={workingWord} />
        )}
      </main>
    </div>
  );
}
