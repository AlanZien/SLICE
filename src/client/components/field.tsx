import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Optional placeholder / hint shown under the input. */
  hint?: string;
  /** Validation error — turns the input into an error state. */
  error?: string;
  /** Optional leading character (e.g. "@" for namespaced package names). */
  prefix?: string;
  /** Render the input in JetBrains Mono. */
  mono?: boolean;
  /** HTML autocomplete attribute. */
  autoComplete?: string;
  placeholder?: string;
  className?: string;
}

export function Field({
  label,
  value,
  onChange,
  hint,
  error,
  prefix,
  mono = false,
  autoComplete = 'off',
  placeholder,
  className,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <div
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border px-3 transition-colors',
          error
            ? 'border-destructive bg-destructive/5'
            : 'border-border bg-card/40 focus-within:border-primary'
        )}
      >
        {prefix && (
          <span className="font-mono shrink-0 text-xs text-muted-foreground">{prefix}</span>
        )}
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
            mono && 'font-mono',
            error ? 'text-foreground' : 'text-foreground'
          )}
        />
      </div>
      {error ? (
        <span id={errorId} className="font-mono text-[11px] text-destructive">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="font-mono text-[11px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
