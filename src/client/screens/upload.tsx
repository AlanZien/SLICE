import { useState } from 'react';
import type { ParsedSpec } from '@shared/types';
import { Dropzone, type DropzoneState } from '@/components/dropzone';
import { ApiError, uploadSpec, uploadSpecFromUrl } from '@/lib/api';

export interface UploadScreenProps {
  onParsed: (spec: ParsedSpec, rawSpec: string) => void;
}

type Mode = 'file' | 'url';

export function UploadScreen({ onParsed }: UploadScreenProps) {
  const [mode, setMode] = useState<Mode>('file');
  const [state, setState] = useState<DropzoneState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState('');

  const handleFile = async (file: File) => {
    if (state === 'uploading' || state === 'parsing') return;
    setError(null);
    setState('parsing');
    try {
      const [parsed, rawSpec] = await Promise.all([uploadSpec(file), file.text()]);
      setState('idle');
      onParsed(parsed, rawSpec);
    } catch (err) {
      setState('error');
      setError(err instanceof ApiError ? err.message : 'Impossible de joindre le serveur.');
    }
  };

  const handleUrl = async () => {
    if (!urlValue.trim() || state === 'parsing') return;
    setError(null);
    setState('parsing');
    try {
      const { spec, rawSpec } = await uploadSpecFromUrl(urlValue.trim());
      setState('idle');
      onParsed(spec, rawSpec);
    } catch (err) {
      setState('error');
      setError(err instanceof ApiError ? err.message : 'Impossible de joindre le serveur.');
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-12 px-6 py-12 text-center">
      <header className="space-y-5">
        <h1 className="h1">Curated MCP servers for AI agents</h1>
        <p className="font-mono text-sm text-muted-foreground">
          Your API description becomes a faithful MCP server. We never rewrite anything
          you didn't write yourself.
        </p>
      </header>

      <div className="w-full space-y-4">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode('file'); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'file' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Drop a file
          </button>
          <button
            type="button"
            onClick={() => { setMode('url'); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'url' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Paste a URL
          </button>
        </div>

        {mode === 'file' ? (
          <Dropzone onFile={handleFile} state={state} error={error} />
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="url"
              placeholder="https://api.example.com/openapi.json"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrl()}
              disabled={state === 'parsing'}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleUrl}
              disabled={!urlValue.trim() || state === 'parsing'}
              className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-40"
            >
              {state === 'parsing' ? 'Fetching…' : 'Fetch'}
            </button>
            {error && (
              <p className="font-mono text-sm text-destructive">{error}</p>
            )}
          </div>
        )}
      </div>

      <footer className="font-mono text-xs text-muted-foreground">
        JSON or YAML, up to 10&nbsp;MB · https:// only · No data stored.
      </footer>
    </section>
  );
}
