'use client';

import { useState } from 'react';
import Image from 'next/image';

/** Banner from canonical event media. A failed load removes the frame instead of leaving a broken image. */
export default function ActivityBanner({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="relative aspect-[16/9] w-full">
      <Image
        src={src}
        alt=""
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
