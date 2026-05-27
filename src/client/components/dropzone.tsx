import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

export type DropzoneState = 'idle' | 'uploading' | 'parsing' | 'error';

export interface DropzoneProps {
  onFile: (file: File) => void;
  state?: DropzoneState;
  error?: string | null;
  /** Override accepted MIME / extensions. Defaults to JSON + YAML. */
  accept?: Record<string, string[]>;
}

const DEFAULT_ACCEPT: Record<string, string[]> = {
  'application/json': ['.json'],
  'application/x-yaml': ['.yaml', '.yml'],
  'text/yaml': ['.yaml', '.yml'],
  'text/plain': ['.yaml', '.yml', '.json'],
};

const HINT = 'Drop your API description here, or pick a file (.json, .yaml).';

export function Dropzone({
  onFile,
  state = 'idle',
  error = null,
  accept = DEFAULT_ACCEPT,
}: DropzoneProps) {
  const disabled = state === 'uploading' || state === 'parsing';

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps({
        className: cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-8 py-12 text-center transition-colors',
          'border-border bg-card/40',
          isDragActive && 'border-primary bg-[var(--slice-highlight)]',
          state === 'error' && 'border-destructive bg-destructive/5',
          disabled && 'cursor-not-allowed opacity-70'
        ),
        role: 'button',
        'aria-disabled': disabled,
      })}
    >
      <input {...getInputProps()} disabled={disabled} />

      {state === 'idle' && (
        <p className="font-mono text-sm text-muted-foreground">{HINT}</p>
      )}

      {state === 'uploading' && (
        <p className="font-mono text-sm text-muted-foreground">Uploading…</p>
      )}

      {state === 'parsing' && (
        <p className="font-mono text-sm text-muted-foreground">Parsing…</p>
      )}

      {state === 'error' && (
        <>
          <p className="font-mono text-sm font-semibold text-destructive">
            {error ?? 'Something went wrong.'}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{HINT}</p>
        </>
      )}
    </div>
  );
}
