import { partnershipEmail } from '@/lib/env';

/**
 * Drafts a message to the public support mailbox. An explicit
 * CQ_PARTNERSHIP_EMAIL overrides that address. No message is sent by the site.
 */

export default function LaunchContact({ subject, label }: { subject: string; label: string }) {
  const email = partnershipEmail();
  if (!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) {
    return (
      <p className="rounded-xl border border-cream-300 bg-white p-4 text-sm text-ink/70">
        We are still setting up the contact mailbox for this program. Nothing has
        been submitted from this page yet. A working contact option will appear before the program opens.
      </p>
    );
  }
  return <a className="btn-primary" href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>{label}</a>;
}
