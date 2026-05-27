import { useState } from 'react';
import type { ParsedSpec } from '@shared/types';
import { Dropzone, type DropzoneState } from '@/components/dropzone';
import { ApiError, uploadSpec } from '@/lib/api';

export interface UploadScreenProps {
  onParsed: (spec: ParsedSpec) => void;
}

/**
 * Screen 1 — upload. Owns the file lifecycle (idle → uploading → parsing →
 * success/error) and hands the parsed spec to the parent on success.
 */
export function UploadScreen({ onParsed }: UploadScreenProps) {
  const [state, setState] = useState<DropzoneState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    // Reject concurrent uploads at the entry point — Dropzone's `disabled`
    // prop only takes effect after a re-render, so a fast double-drop could
    // otherwise launch two requests whose responses race and overwrite each
    // other (last-resolved wins, possibly the wrong spec).
    if (state === 'uploading' || state === 'parsing') return;
    setError(null);
    setState('uploading');
    try {
      // We can't distinguish upload vs parsing reliably from the client,
      // but flipping to "parsing" once the request hits the server keeps the
      // affordance honest for big files.
      setState('parsing');
      const parsed = await uploadSpec(file);
      setState('idle');
      onParsed(parsed);
    } catch (err) {
      setState('error');
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Impossible de joindre le serveur.');
      }
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-6 py-16 text-center">
      <header className="space-y-3">
        <p className="eyebrow">Étape 1 — Upload</p>
        <h1 className="h1">Curated MCP servers for AI agents</h1>
        <p className="font-mono text-sm text-muted-foreground">
          Ta description d'API devient un serveur MCP fidèle. On ne réécrit rien que tu
          n'aies écrit toi-même.
        </p>
      </header>

      <div className="w-full">
        <Dropzone onFile={handleFile} state={state} error={error} />
      </div>

      <footer className="font-mono text-xs text-muted-foreground">
        JSON ou YAML, jusqu'à 10&nbsp;Mo. Aucune donnée stockée.
      </footer>
    </section>
  );
}
