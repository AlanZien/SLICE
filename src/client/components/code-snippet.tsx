/**
 * A code block with a "Copy" button. Calls the global toast on success so
 * the user gets feedback even when the button itself isn't in their viewport
 * (long snippets push the button off-screen).
 */
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from './toast';

export interface CodeSnippetProps {
  code: string;
  /** Short label shown in the toolbar (e.g. "JSON", "shell"). */
  label?: string;
}

export function CodeSnippet({ code, label }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);
  const { push } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      push({ variant: 'success', message: 'Copied' });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      push({ variant: 'error', message: 'Copy failed' });
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label ?? 'snippet'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy'}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
