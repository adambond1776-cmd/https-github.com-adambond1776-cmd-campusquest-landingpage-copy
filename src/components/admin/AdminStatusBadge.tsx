const STYLES = {
  Pending: 'bg-gold-400 text-brand-950',
  Approved: 'bg-emerald-100 text-emerald-900',
  Rejected: 'bg-rose-100 text-rose-900',
} as const;

export default function AdminStatusBadge({
  status,
}: {
  status: 'pending' | 'approved' | 'rejected' | string;
}) {
  const label = status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${STYLES[label]}`}>
      {label}
    </span>
  );
}
