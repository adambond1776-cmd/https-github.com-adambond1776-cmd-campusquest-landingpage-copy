'use client';

import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

/**
 * A growing textarea for the long answers.
 *
 * The dictation hint points at the microphone already on the phone keyboard
 * rather than shipping speech capture of our own. Students write C3 on a phone,
 * it is the heaviest input in the instrument, and thumbs make for short answers —
 * but recording audio to solve that would mean sending a student's voice
 * somewhere, which is a worse trade than a short answer.
 */
export default function LongAnswer({
  id,
  value,
  onChange,
  placeholder,
  minRows = 4,
  showDictationHint = true,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  showDictationHint?: boolean;
  invalid?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  return (
    <div>
      <textarea
        ref={ref}
        id={id}
        name={id}
        rows={minRows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-brand-900 shadow-sm transition-colors placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          invalid ? 'border-red-400' : 'border-cream-400'
        }`}
      />

      {showDictationHint ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-500 sm:hidden">
          <Mic className="h-3.5 w-3.5" aria-hidden />
          On a phone, the microphone on your keyboard is quicker than thumbs.
        </p>
      ) : null}
    </div>
  );
}
