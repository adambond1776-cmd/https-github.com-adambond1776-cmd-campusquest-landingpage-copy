'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

export default function PrintBar() {
  return (
    <div className="sticky top-0 z-10 border-b border-cream-400 bg-white/90 backdrop-blur-sm print:hidden">
      <div className="mx-auto flex max-w-[46rem] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/genius-mining/profile"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to your profile
        </Link>

        <button type="button" onClick={() => window.print()} className="btn-primary px-5 py-2.5 text-xs">
          <Printer className="h-3.5 w-3.5" />
          Print or save as PDF
        </button>
      </div>
    </div>
  );
}
