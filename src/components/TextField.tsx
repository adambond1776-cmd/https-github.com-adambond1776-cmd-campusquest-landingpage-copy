'use client';

import { useId } from 'react';

type TextFieldProps = {
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'email' | 'numeric' | 'text';
  error?: string | null;
  disabled?: boolean;
};

export default function TextField({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  error,
  disabled,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-white/80 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-white/30 text-sm transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 ${
          error
            ? 'border-red-400/70 focus:border-red-400 focus:ring-red-400'
            : 'border-white/15 focus:border-brand-400 focus:ring-brand-400'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
