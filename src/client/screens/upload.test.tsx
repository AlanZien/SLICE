import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ParsedSpec } from '@shared/types';
import { UploadScreen } from './upload';

const VALID_PARSED: ParsedSpec = {
  apiName: 'Demo',
  apiVersion: '1.0',
  baseUrl: 'https://api.demo.test',
  authType: 'none',
  groups: [
    {
      tag: 'Things',
      endpoints: [
        {
          id: 'GET /things',
          method: 'GET',
          path: '/things',
          label: 'list things',
          params: [],
        },
      ],
    },
  ],
};

function mockFetchOnce(init: { status: number; body: unknown }) {
  const res = {
    ok: init.status >= 200 && init.status < 300,
    status: init.status,
    statusText: 'mocked',
    json: async () => init.body,
  };
  globalThis.fetch = vi.fn().mockResolvedValue(res) as unknown as typeof fetch;
}

function makeFile(name: string): File {
  return new File(['openapi: "3.0.3"'], name, { type: 'application/x-yaml' });
}

describe('<UploadScreen>', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders the hero copy and dropzone hint', () => {
    render(<UploadScreen onParsed={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /drop a file/i })).toBeInTheDocument();
  });

  it('uploads the file and calls onParsed with the spec on success', async () => {
    mockFetchOnce({ status: 200, body: VALID_PARSED });
    const onParsed = vi.fn();
    render(<UploadScreen onParsed={onParsed} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('demo.yaml'));

    await waitFor(() => {
      expect(onParsed).toHaveBeenCalledWith(VALID_PARSED, expect.any(String));
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows a URL input field when the URL tab is selected', async () => {
    render(<UploadScreen onParsed={() => {}} />);
    const urlTab = screen.getByRole('button', { name: /paste a url/i });
    await userEvent.click(urlTab);
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
  });

  it('calls uploadSpecFromUrl and onParsed when URL is submitted', async () => {
    mockFetchOnce({ status: 200, body: VALID_PARSED });
    const onParsed = vi.fn();
    render(<UploadScreen onParsed={onParsed} />);
    await userEvent.click(screen.getByRole('button', { name: /paste a url/i }));
    await userEvent.type(screen.getByPlaceholderText(/https:\/\//i), 'https://api.example.com/spec.yaml');
    await userEvent.click(screen.getByRole('button', { name: /fetch/i }));
    await waitFor(() => expect(onParsed).toHaveBeenCalledWith(VALID_PARSED, expect.any(String)));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/upload-url',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('shows the server error message on 4xx', async () => {
    mockFetchOnce({
      status: 415,
      body: { code: 'UNSUPPORTED_FORMAT', message: 'Unsupported file format.' },
    });
    const onParsed = vi.fn();
    render(<UploadScreen onParsed={onParsed} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('demo.txt'));

    await waitFor(() => {
      expect(screen.getByText(/unsupported file format/i)).toBeInTheDocument();
    });
    expect(onParsed).not.toHaveBeenCalled();
  });
});
