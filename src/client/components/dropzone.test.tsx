import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropzone } from './dropzone';

function makeFile(name: string, content = 'openapi: "3.0.3"'): File {
  return new File([content], name, { type: 'application/x-yaml' });
}

describe('<Dropzone>', () => {
  it('shows a human-readable hint in idle state', () => {
    render(<Dropzone onFile={() => {}} />);
    expect(
      screen.getByText(/drop|pick a file/i)
    ).toBeInTheDocument();
  });

  it('calls onFile when the user picks a file via the input', async () => {
    const onFile = vi.fn();
    render(<Dropzone onFile={onFile} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    await userEvent.upload(input, makeFile('spec.yaml'));
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile.mock.calls[0][0]).toBeInstanceOf(File);
    expect((onFile.mock.calls[0][0] as File).name).toBe('spec.yaml');
  });

  it('renders the uploading state when state="uploading"', () => {
    render(<Dropzone onFile={() => {}} state="uploading" />);
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });

  it('renders the parsing state when state="parsing"', () => {
    render(<Dropzone onFile={() => {}} state="parsing" />);
    expect(screen.getByText(/parsing/i)).toBeInTheDocument();
  });

  it('renders the error state with the message when error prop is set', () => {
    render(<Dropzone onFile={() => {}} state="error" error="Unsupported file format" />);
    expect(screen.getByText(/unsupported file format/i)).toBeInTheDocument();
  });

  it('is disabled (input not clickable) while uploading or parsing', () => {
    render(<Dropzone onFile={() => {}} state="uploading" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
