import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActions } from './bulk-actions';

describe('<BulkActions>', () => {
  it('renders the 3 bulk chips (R1.2.6)', () => {
    render(
      <BulkActions
        onCheckReads={() => {}}
        onCheckWrites={() => {}}
        onUncheckAll={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /check all reads/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check all writes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /uncheck all/i })).toBeInTheDocument();
  });

  it('fires the matching callback for each chip', async () => {
    const reads = vi.fn();
    const writes = vi.fn();
    const uncheck = vi.fn();
    render(
      <BulkActions
        onCheckReads={reads}
        onCheckWrites={writes}
        onUncheckAll={uncheck}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /check all reads/i }));
    await userEvent.click(screen.getByRole('button', { name: /check all writes/i }));
    await userEvent.click(screen.getByRole('button', { name: /uncheck all/i }));
    expect(reads).toHaveBeenCalledOnce();
    expect(writes).toHaveBeenCalledOnce();
    expect(uncheck).toHaveBeenCalledOnce();
  });
});
