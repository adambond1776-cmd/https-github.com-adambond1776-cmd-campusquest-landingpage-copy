export const CAMPUSQUEST_LOGO_SRC = '/campusquest-logo.png';

type LogoProps = {
  size?: number;
  className?: string;
};

/**
 * Official CampusQuest crest. The source file has padding around the circular
 * artwork; a round clip + slight scale crops that without editing the asset.
 */
export default function Logo({ size = 46, className = '' }: LogoProps) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Native img: the crest file is a JPEG named .png; next/image hydrates it inconsistently. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CAMPUSQUEST_LOGO_SRC}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover scale-[1.18]"
        draggable={false}
      />
    </span>
  );
}

export function BrandLockup({
  size = 46,
  showTagline = true,
  onDark = true,
}: {
  size?: number;
  showTagline?: boolean;
  /** Wordmark colors for a navy bar (`true`) vs a white bar (`false`). */
  onDark?: boolean;
}) {
  return (
    <span className="flex items-center gap-3 min-w-0">
      <Logo size={size} />
      <span className="flex min-w-0 flex-col justify-center">
        <span
          className={`font-extrabold text-[1.15rem] sm:text-[1.25rem] leading-none tracking-tight motion-safe:transition-colors motion-safe:duration-300 ${
            onDark ? 'text-white' : 'text-ink'
          }`}
        >
          Campus
          <span
            className={`motion-safe:transition-colors motion-safe:duration-300 ${
              onDark ? 'text-brand-400' : 'text-brand-500'
            }`}
          >
            Quest
          </span>
        </span>
        {showTagline ? (
          <span
            className={`mt-1 hidden text-[8px] font-semibold uppercase tracking-[0.22em] sm:block motion-safe:transition-colors motion-safe:duration-300 ${
              onDark ? 'text-white/45' : 'text-ink/40'
            }`}
          >
            Discover • Connect • Belong
          </span>
        ) : null}
      </span>
    </span>
  );
}
