import Link from 'next/link';
import GmHeader from '@/components/gm/GmHeader';

export default function AgeLocked({ reason }: { reason: string }) {
  return (
    <>
      <GmHeader />
      <main className="min-h-[70vh] bg-brand-950 px-5 py-20 text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <h1 className="text-xl font-extrabold sm:text-2xl">Not yet</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{reason}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            The rest of CampusQuest is open to you. The directory is where most of it is.
          </p>
          <Link href="/activities" className="btn-gold mt-6 inline-flex">
            Find something to do
          </Link>
        </div>
      </main>
    </>
  );
}
