import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ExternalLink, Minus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BuyQr from '@/components/book/BuyQr';
import {
  AUTHOR_DISCLOSURE,
  BOOK,
  MAPPING,
  TRACKS,
  bookUrl,
  commerceEnabled,
} from '@/lib/book';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Where Genius Mining comes from | CampusQuest',
  description:
    'Genius Mining implements Tool 7 of The Business of Life: Student Edition. What the book is, what the instrument does with it, and the one step it does not do yet.',
  alternates: siteUrl ? { canonical: `${siteUrl}/method` } : undefined,
};

/**
 * The provenance page.
 *
 * Deliberately not a sales page. It exists because an instrument that asks a
 * student to write at length about their life and then tells them something
 * about themselves should be able to say where the method came from — and
 * because a university evaluating this will ask, and having a published
 * methodology to point at is worth more than any book royalty.
 *
 * The buy link is at the bottom, after the honest account of what the book
 * does and does not cover, and it disappears entirely for an institutional
 * deployment. The provenance never disappears.
 */
export default async function MethodPage() {
  const url = bookUrl();
  const selling = commerceEnabled();

  return (
    <>
      <Navbar appearance="dark" />

      <main className="min-h-screen bg-brand-950 text-white">
        {/* Header */}
        <section className="border-b border-white/10 px-5 py-14 sm:py-20">
          <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-gold-400">
                Where this comes from
              </p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                Genius Mining is Tool {BOOK.tool.number} of a book.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-white/60 sm:text-lg">
                The questionnaire did not come out of nowhere. It implements the{' '}
                {BOOK.tool.name} from <em>{BOOK.title}: {BOOK.edition}</em>, written by{' '}
                {BOOK.author}. This page is the full account of that: what the book is, what
                the instrument does with it, and the one step it does not do yet.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/40">
                You do not need the book. Genius Mining is complete on its own and nothing in
                the questionnaire assumes you have read anything.
              </p>
            </div>

            <div className="justify-self-start lg:justify-self-end">
              <Image
                src={BOOK.coverFront}
                alt={`Front cover of ${BOOK.title}: ${BOOK.edition} by ${BOOK.author}`}
                width={602}
                height={904}
                priority
                sizes="(min-width: 640px) 240px, 208px"
                className="w-52 rounded-lg shadow-2xl ring-1 ring-white/10 sm:w-60"
              />
            </div>
          </div>
        </section>

        {/* What the book is */}
        <section className="px-5 py-14 sm:py-20">
          <div className="mx-auto w-full max-w-5xl">
            <h2 className="text-2xl font-extrabold sm:text-3xl">What the book is</h2>
            <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
              <div className="space-y-4 text-base leading-relaxed text-white/60">
                <p>
                  Eight tools for the part of life nobody hands you a manual for: money, work,
                  health, relationships, and the business of deciding what you are actually
                  doing. It is written for {BOOK.audience.toLowerCase().replace('for ', '')} and
                  it does not assume you are on a campus.
                </p>
                <p>
                  That last part matters here. The book opens with four tracks, and only one of
                  them is college. A student who is heading into a trade, going straight to work,
                  or has no idea yet is not an afterthought in it — the last of those is the
                  reader it was really written for.
                </p>
                <p className="text-white/40">
                  It is not a personality test and Genius Mining is not one either. Both are
                  diagnostics: they work from things you have actually done, and they tell you
                  when the read is thin rather than filling the gap with confidence.
                </p>
              </div>

              <Image
                src={BOOK.coverBack}
                alt={`Back cover of ${BOOK.title}, describing the eight tools and the four tracks`}
                width={628}
                height={904}
                sizes="(min-width: 1024px) 384px, 100vw"
                className="w-full max-w-sm rounded-lg shadow-2xl ring-1 ring-white/10"
              />
            </div>

            {/* Tracks */}
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TRACKS.map((track) => (
                <div
                  key={track.name}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  <p className="text-sm font-bold text-gold-400">{track.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{track.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The mapping */}
        <section className="border-t border-white/10 bg-white/[0.02] px-5 py-14 sm:py-20">
          <div className="mx-auto w-full max-w-5xl">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              What the instrument does with it
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/60">
              The {BOOK.tool.name} is four steps on paper. Genius Mining implements three of
              them closely and one of them only in part. Here is the whole mapping, including
              the gap.
            </p>

            <div className="mt-8 space-y-3">
              {MAPPING.map((row) => (
                <div
                  key={row.step}
                  className={`rounded-xl border p-5 ${
                    row.covered
                      ? 'border-white/10 bg-white/5'
                      : 'border-gold-500/30 bg-gold-500/[0.08]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        row.covered ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gold-500/25 text-gold-300'
                      }`}
                    >
                      {row.covered ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : (
                        <Minus className="h-3 w-3" strokeWidth={3} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">
                        {row.step}
                        <span className="ml-2 font-normal text-white/50">{row.book}</span>
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/45">
                        {row.instrument}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 max-w-2xl space-y-4 text-base leading-relaxed text-white/60">
              <p>
                <strong className="text-white">The gap is Step 3, and we are open about it.</strong>{' '}
                The book asks you to write five to nine operating rules in your own language.
                The instrument collapses that into a single working word.
              </p>
              <p>
                The word is the right anchor for the analysis — it is countable, it can be
                audited, and it is what makes the result a computation rather than an opinion.
                But the rules are the part you can actually use on a Tuesday, and the part an
                advisor can work from in a twenty-minute appointment. That step lives in the
                book and not yet in the questionnaire.
              </p>
            </div>
          </div>
        </section>

        {/* Getting a copy */}
        <section className="border-t border-white/10 px-5 py-14 sm:py-20">
          <div className="mx-auto w-full max-w-5xl">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Getting a copy</h2>

            {selling && url ? (
              <div className="mt-6 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:p-8">
                <Image
                  src={BOOK.coverFront}
                  alt=""
                  width={602}
                  height={904}
                  sizes="96px"
                  className="w-24 shrink-0 rounded-md shadow-lg ring-1 ring-white/10"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-extrabold">
                    {BOOK.title}: {BOOK.edition}
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {BOOK.subtitle} · {BOOK.author}
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold mt-5 inline-flex"
                  >
                    Find it on Amazon
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <p className="mt-4 max-w-xl text-xs leading-relaxed text-white/40">
                    {AUTHOR_DISCLOSURE}
                  </p>
                </div>

                <div className="hidden shrink-0 flex-col items-center gap-2 sm:flex">
                  <BuyQr url={url} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                    Scan to open
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/50">
                {selling
                  ? 'A link is not configured yet.'
                  : 'Purchase links are switched off on this deployment. The method and the mapping above are unchanged.'}
              </p>
            )}

            <p className="mt-10 text-sm text-white/40">
              <Link href="/genius-mining" className="text-gold-400 hover:text-gold-500">
                Back to Genius Mining
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
