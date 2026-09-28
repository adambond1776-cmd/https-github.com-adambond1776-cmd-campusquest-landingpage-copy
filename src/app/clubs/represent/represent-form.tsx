'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { requestRepresentativeAccess, searchOrganizations, startFoundingClubCheckout, type DirectoryOrganization } from '@/app/clubs/represent/actions';

const ROLES = ['President', 'Vice President', 'Treasurer', 'Secretary', 'Club Officer', 'Advisor', 'Other'] as const;

export function OrgMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-xl object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-extrabold text-brand-700">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function OrganizationSearch({
  initialQuery,
  initialResults,
}: {
  initialQuery: string;
  initialResults: DirectoryOrganization[];
}) {
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(initialResults);
  const [searching, setSearching] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState(initialQuery.trim().length >= 2 ? initialQuery.trim() : '');
  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setSearching(true);
      void searchOrganizations(term).then((rows) => {
        if (cancelled) return;
        setResults(rows);
        setSearchedTerm(term);
        setSearching(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term]);

  function runNow() {
    const term = query.trim();
    if (term.length < 2) return;
    setSearching(true);
    void searchOrganizations(term).then((rows) => {
      setResults(rows);
      setSearchedTerm(term);
      setSearching(false);
    });
  }

  return (
    <div>
      <label className="text-sm font-bold text-ink" htmlFor="org-search">Find your organization</label>
      <p className="mt-1 text-sm text-ink/65">Search the CampusQuest directory for the club or organization you represent.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
          <input
            id="org-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                runNow();
              }
            }}
            placeholder="Organization name"
            autoComplete="off"
            aria-controls={listId}
            className="min-h-12 w-full rounded-2xl border border-cream-300 bg-cream-50 py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink/40"
          />
        </div>
        <button type="button" onClick={runNow} className="btn-primary w-full sm:w-auto">Search</button>
      </div>
      <div id={listId} aria-live="polite" className="mt-4">
        {searching ? <p className="text-sm text-ink/60">Searching…</p> : null}
        {!searching && term.length > 0 && term.length < 2 ? (
          <p className="text-sm text-ink/60">Type at least two letters.</p>
        ) : null}
        {!searching && searchedTerm === term && term.length >= 2 && results.length === 0 ? (
          <p className="text-sm text-ink/60">No organizations match that search.</p>
        ) : null}
        {searchedTerm === term && results.length > 0 ? (
          <ul className="space-y-3">
            {results.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/clubs/represent?organization=${org.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-cream-200 bg-cream-50 p-4 transition-colors hover:border-brand-300 focus-visible:ring-2 focus-visible:ring-brand-500 sm:flex-row sm:items-center"
                >
                  <OrgMark name={org.name} logoUrl={org.logoUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">{org.name}</span>
                    {org.category ? <span className="mt-1 block text-xs font-semibold text-brand-700">{org.category}</span> : null}
                    {org.description ? <span className="mt-1 block line-clamp-2 text-sm text-ink/70">{org.description}</span> : null}
                  </span>
                  <span className="text-sm font-bold text-brand-700">Select organization</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function RepresentativeRequestForm({
  organizationId,
  rejected,
}: {
  organizationId: string;
  rejected: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const noteId = useId();
  const hasProof = officialEmail.trim().length > 0 || verificationUrl.trim().length > 0 || proof !== null;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        if (!hasProof) {
          setMessage('Provide at least one form of verification.');
          return;
        }
        const data = new FormData();
        data.set('organizationId', organizationId);
        data.set('role', role);
        data.set('officialEmail', officialEmail);
        data.set('verificationUrl', verificationUrl);
        data.set('note', note);
        if (proof) data.set('proof', proof);
        startTransition(async () => {
          const result = await requestRepresentativeAccess(data);
          if (!result.ok) {
            setMessage(result.message);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div>
        <label className="text-sm font-bold text-ink" htmlFor="representative-role">Your role</label>
        <p className="mt-1 text-sm text-ink/60">Optional. Choose the closest match.</p>
        <select
          id="representative-role"
          name="role"
          value={role}
          disabled={pending}
          onChange={(event) => setRole(event.target.value)}
          className="mt-3 min-h-12 w-full rounded-2xl border border-cream-300 bg-white px-4 text-sm text-ink disabled:opacity-60"
        >
          <option value="">Select a role</option>
          {ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <section className="rounded-2xl border border-cream-200 bg-cream-50 p-4 sm:p-5">
        <h3 className="text-base font-extrabold">Provide proof of your role</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Help us confirm that you’re authorized to represent this organization. Provide at least one form of verification.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-bold text-ink" htmlFor="official-email">Official club or organization email</label>
            <input
              id="official-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={officialEmail}
              disabled={pending}
              onChange={(event) => setOfficialEmail(event.target.value)}
              placeholder="clubname@uri.edu"
              className="mt-2 min-h-12 w-full rounded-2xl border border-cream-300 bg-white px-4 text-sm text-ink placeholder:text-ink/40 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-ink" htmlFor="verification-url">Officer or organization page</label>
            <input
              id="verification-url"
              type="url"
              inputMode="url"
              value={verificationUrl}
              disabled={pending}
              onChange={(event) => setVerificationUrl(event.target.value)}
              placeholder="https://..."
              className="mt-2 min-h-12 w-full rounded-2xl border border-cream-300 bg-white px-4 text-sm text-ink placeholder:text-ink/40 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-ink" htmlFor="proof-file">Upload proof</label>
            <p className="mt-1 text-sm text-ink/60">PNG, JPG, or PDF. A screenshot of an officer listing, an official roster, or an organization document.</p>
            <input
              id="proof-file"
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg,.pdf,application/pdf"
              disabled={pending}
              onChange={(event) => setProof(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-ink file:mr-3 file:rounded-xl file:border-0 file:bg-brand-700 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-ink" htmlFor={noteId}>Anything else that helps us verify your role?</label>
            <textarea
              id={noteId}
              value={note}
              maxLength={500}
              disabled={pending}
              onChange={(event) => setNote(event.target.value)}
              placeholder="A verified representative can confirm you, or add any other supporting detail."
              className="mt-2 min-h-28 w-full rounded-2xl border border-cream-300 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/40 disabled:opacity-60"
            />
          </div>
        </div>
      </section>
      {message ? <p role="alert" className="text-sm font-semibold text-brand-800">{message}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={pending || !hasProof} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1">
          {pending ? 'Sending request…' : rejected ? 'Request review again' : 'Submit verification request'}
        </button>
        <Link href="/activities" className="btn-secondary w-full justify-center sm:w-auto">Cancel</Link>
      </div>
    </form>
  );
}

export function FoundingClubPurchaseButton({ organizationId }: { organizationId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await startFoundingClubCheckout(organizationId);
            if (!result.ok) {
              setMessage(result.message);
              return;
            }
            window.location.assign(result.url);
          });
        }}
        className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending ? 'Opening checkout…' : 'Get Founding Club — $99'}
      </button>
      {message ? <p role="alert" className="mt-3 text-sm text-ink/80">{message}</p> : null}
    </div>
  );
}
