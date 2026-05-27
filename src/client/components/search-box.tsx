import { useRef } from 'react';
import { Search } from 'lucide-react';
import { useKeyboardShortcut } from '@/lib/keyboard';
import { cn } from '@/lib/utils';

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search endpoints by name or path…',
  className,
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut('cmd+k', () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  });

  return (
    <div
      className={cn(
        'flex h-9 items-center gap-2 rounded-md border border-border bg-card/40 px-3 transition-colors',
        'focus-within:border-primary',
        className
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="font-mono h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <kbd
        aria-hidden
        className="font-mono inline-flex h-5 items-center gap-0.5 rounded border border-border bg-secondary px-1 text-[10px] text-muted-foreground"
      >
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </div>
  );
}
