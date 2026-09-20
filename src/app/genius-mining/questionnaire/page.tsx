import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SECTION_IDS } from '@hiddengeniuslabs/genius-mining';
import AgeLocked from '@/components/gm/AgeLocked';
import GmHeader from '@/components/gm/GmHeader';
import QuestionnaireForm from '@/components/gm/QuestionnaireForm';
import { requireGeniusMiningAccess } from '@/lib/gate';
import { currentIdentity } from '@/lib/gm/identity';
import { loadCurrentRecord } from '@/lib/gm/load';

export const metadata: Metadata = {
  title: 'Genius Mining questionnaire | CampusQuest',
};

export const dynamic = 'force-dynamic';

export default async function QuestionnairePage() {
  const access = await requireGeniusMiningAccess();
  if (!access.allowed) return <AgeLocked reason={access.reason} />;

  const identity = await currentIdentity();
  const record = await loadCurrentRecord();

  // Consent comes before storage, so no record means no consent yet.
  if (!record?.consent) {
    redirect('/genius-mining');
  }

  const everySectionDone = SECTION_IDS.every((id) =>
    record.progress.completed_sections.includes(id)
  );

  if (everySectionDone) {
    redirect('/genius-mining/profile');
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <GmHeader participantCode={record.participant_code} />

      <main className="mx-auto w-full max-w-3xl px-5 pb-8 pt-8 sm:px-8">
        <QuestionnaireForm
          initialValues={record.responses}
          initialSection={record.progress.current_section}
          completedSections={record.progress.completed_sections}
          isDevIdentity={identity?.isDev ?? false}
        />
      </main>
    </div>
  );
}
