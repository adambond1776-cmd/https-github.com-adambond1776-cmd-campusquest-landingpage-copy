import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import BuyQr from '@/components/book/BuyQr';
import { AUTHOR_DISCLOSURE, BOOK, bookUrl, commerceEnabled } from '@/lib/book';

/**
 * The one place on the site that asks a student to buy something.
 *
 * It appears only after a profile has been accepted, which is the one moment
 * where mentioning the book is both useful and harmless: the analysis is
 * finished, so nothing here can influence the answers, and the student has just
 * been handed a working word and is at their most curious about it.
 *
 * The pitch is a real gap rather than a plug. Genius Mining implements three of
 * the four steps of Tool 7 closely and collapses Step 3 — the operating rules in
 * the student's own words — into a single working word. That step genuinely is
 * in the book and genuinely is not in the questionnaire yet.
 */
export default async function RulesStep({ workingWord }: { workingWord: string }) {
  const url = bookUrl();
  if (!commerceEnabled() || !url) return null;

  return (
    <aside className="mt-10 rounded-2xl border border-cream-300 bg-white p-6 shadow-soft sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-500">
        The step this questionnaire skips
      </p>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <Image
          src={BOOK.coverFront}
          alt={`${BOOK.title}: ${BOOK.edition}`}
          width={602}
          height={904}
          sizes="96px"
          className="w-24 shrink-0 self-start rounded-md shadow-md ring-1 ring-brand-900/10"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-brand-900">
            You have your working word. The rules are the other half.
          </h2>

          <div className="mt-3 space-y-3 text-sm leading-relaxed text-brand-700">
            <p>
              Genius Mining is Tool {BOOK.tool.number} of{' '}
              <em>
                {BOOK.title}: {BOOK.edition}
              </em>
              , and it implements most of it. The part it does not do is Step 3: writing out
              five to nine operating rules in your own language, each one starting with
              &ldquo;I&rdquo;.
            </p>
            <p>
              <strong className="text-brand-900">{workingWord}</strong> is the anchor. The rules
              are what you actually use — the sentences you can hold a decision up against next
              week. That step is in the book.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              Find it on Amazon
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              href="/method"
              className="text-sm font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-800"
            >
              How the two line up
            </Link>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-brand-500">{AUTHOR_DISCLOSURE}</p>
        </div>

        <div className="hidden shrink-0 flex-col items-center gap-2 lg:flex">
          <BuyQr url={url} size={112} className="ring-1 ring-brand-900/10" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
            Scan to open
          </p>
        </div>
      </div>
    </aside>
  );
}
