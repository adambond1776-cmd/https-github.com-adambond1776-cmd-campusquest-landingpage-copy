import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function LaunchPageShell({ eyebrow, title, intro, children }: {
  eyebrow: string; title: string; intro: string; children: ReactNode;
}) {
  return (
    <>
      <Navbar appearance="light" />
      <main className="min-h-screen bg-cream-50">
        <header className="border-b border-cream-300 bg-white">
          <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold text-ink text-balance">{title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-ink/70">{intro}</p>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-8">{children}</div>
      </main>
      <Footer />
    </>
  );
}
