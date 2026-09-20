/** Promotion only: no assessment, checkout, waitlist consent or launch promise. */
export default function GeniusMiningTeaser() {
  return (
    <aside aria-label="Genius Mining coming soon" className="mt-6 rounded-2xl border border-gold-500/30 bg-brand-950 p-5 text-white sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-gold-400">Coming soon · Genius Mining</p>
      <h3 className="mt-2 text-lg font-extrabold">Find your interests. Discover more of your potential.</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/80">
        Your interests are a great starting point. Genius Mining is our planned next step:
        guided reflection on real experiences to explore how you approach challenges,
        what energizes you and new ways you could contribute on campus.
      </p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-gold-400">Why go beyond an interest list?</summary>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          Two students can both love music, but one may enjoy performing while another
          loves organizing the show. Our goal is to help you explore those differences
          and discover opportunities you might not have thought to choose.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-white/70">
          In development, not part of today&apos;s interest matching. Launch timing,
          availability and pricing will be announced. No upgrade is needed to use your current interest choices.
        </p>
      </details>
    </aside>
  );
}
