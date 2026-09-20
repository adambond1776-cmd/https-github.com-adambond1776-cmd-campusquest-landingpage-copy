import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { pathwaySet } from '@hiddengeniuslabs/genius-mining';
import AdvisorPrintout from '@/components/gm/AdvisorPrintout';
import AgeLocked from '@/components/gm/AgeLocked';
import PrintBar from '@/components/gm/PrintBar';
import { requireGeniusMiningAccess } from '@/lib/gate';
import { loadCurrentRecord } from '@/lib/gm/load';

export const metadata: Metadata = {
  title: 'Genius Profile — advisor copy | CampusQuest',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdvisorPage() {
  const access = await requireGeniusMiningAccess();
  if (!access.allowed) return <AgeLocked reason={access.reason} />;

  const record = await loadCurrentRecord();

  if (!record?.consent) redirect('/genius-mining');
  if (!record.profile) redirect('/genius-mining/profile');

  return (
    <div className="min-h-screen bg-cream-200 py-0 print:bg-white">
      <PrintBar />
      <div className="mx-auto max-w-[46rem] px-4 pb-16 pt-6 print:p-0">
        <div className="shadow-lift print:shadow-none">
          <AdvisorPrintout
            profile={record.profile}
            d3Sentence={record.responses.D3 ?? ''}
            campusName={pathwaySet(record.campus_id).campus_name}
          />
        </div>
      </div>
    </div>
  );
}
