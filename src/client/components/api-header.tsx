import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ApiHeaderProps {
  apiName: string;
  apiVersion: string;
  baseUrl: string;
  onBaseUrlChange: (next: string) => void;
  className?: string;
}

export function ApiHeader({
  apiName,
  apiVersion,
  baseUrl,
  onBaseUrlChange,
  className,
}: ApiHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(baseUrl);
  // Suppress the next onBlur commit when Escape was just pressed. Without
  // this, blurring the input as a side-effect of Escape would race with the
  // cancel() and re-commit the value we just reverted.
  const cancellingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(baseUrl);
      // Focus + select on next tick to avoid colliding with the click that
      // entered edit mode.
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, baseUrl]);

  const commit = () => {
    if (cancellingRef.current) {
      cancellingRef.current = false;
      return;
    }
    if (draft !== baseUrl) onBaseUrlChange(draft);
    setEditing(false);
  };

  const cancel = () => {
    cancellingRef.current = true;
    setDraft(baseUrl);
    setEditing(false);
  };

  return (
    <header className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-baseline gap-3">
        <h1 className="h1">{apiName}</h1>
        <span className="font-mono text-xs text-muted-foreground">v{apiVersion}</span>
      </div>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') cancel();
          }}
          onBlur={commit}
          className="font-mono inline-block w-full max-w-xl rounded border border-primary bg-background px-2 py-1 text-xs text-foreground outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-mono inline-block max-w-xl truncate rounded border border-transparent px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:bg-[var(--slice-highlight)] hover:text-foreground"
        >
          {baseUrl}
        </button>
      )}
    </header>
  );
}
