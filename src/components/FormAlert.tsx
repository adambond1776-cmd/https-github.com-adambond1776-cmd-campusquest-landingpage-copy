import { AlertCircle } from 'lucide-react';

export default function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-400/30 animate-fade-in"
    >
      <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
      <p className="text-sm text-red-100">{message}</p>
    </div>
  );
}
