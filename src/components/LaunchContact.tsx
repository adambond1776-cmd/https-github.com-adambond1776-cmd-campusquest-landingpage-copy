/**
 * Use only an explicitly configured public mailbox, never the existing fallback
 * address that has not been confirmed operational. No message is sent by the site.
 */
export default function LaunchContact({ subject, label }: { subject: string; label: string }) {
  const email = process.env.CQ_PARTNERSHIP_EMAIL?.trim();
  if (!email || !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) {
    return (
      <p className="rounded-xl border border-cream-300 bg-white p-4 text-sm text-ink/70">
        We are still setting up the contact mailbox for this program. Nothing has
        been submitted from this page yet. A working contact option will appear before the program opens.
      </p>
    );
  }
  return <a className="btn-primary" href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>{label}</a>;
}
