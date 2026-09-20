import Link from 'next/link';
import { Compass } from 'lucide-react';
import { INSTRUMENT_VERSION } from '@hiddengeniuslabs/genius-mining';

export default function GmHeader({ participantCode }: { participantCode?: string }) {
  return (
    <header className="border-b border-cream-300 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-brand-900">
          <Compass className="h-5 w-5 text-brand-600" strokeWidth={2.5} aria-hidden />
          CampusQuest
        </Link>

        <p className="text-xs text-brand-600 tabular-nums">
          {participantCode ? (
            <>
              <span className="font-semibold text-brand-800">{participantCode}</span>
              <span className="mx-1.5 text-brand-300">·</span>
            </>
          ) : null}
          Instrument v{INSTRUMENT_VERSION}
        </p>
      </div>
    </header>
  );
}
