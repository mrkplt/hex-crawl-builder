import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersistenceBar } from './PersistenceBar';
import { useAppStore } from '../../state/store';
import { CoordinateIndex } from '../../domain/coordinates';
import { SAVE_VERSION } from './format';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

/** A fake File whose text() resolves synchronously — avoids Blob.text() gaps. */
function fakeFile(text: string): File {
  return { name: 'campaign.json', text: () => Promise.resolve(text) } as unknown as File;
}

function validSaveText(): string {
  return JSON.stringify({
    version: SAVE_VERSION,
    template: {
      fields: [{ id: 'name', label: 'Name', type: 'short_text', required: false, order: 0 }],
    },
    hexes: [
      {
        id: 'h1',
        coordinate: { q: 0, r: 0 },
        neighbors: [null, null, null, null, null, null],
        fieldValues: {},
        createdAt: 1,
      },
    ],
  });
}

describe('PersistenceBar', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reset();
    createObjectURL = vi.fn(() => 'blob:mock');
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Save downloads a serialized file', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<PersistenceBar />);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('Load is gated by a confirmation modal; Cancel leaves state unchanged', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addField({ label: 'Keep', type: 'short_text', required: false });
    render(<PersistenceBar />);

    await user.click(screen.getByRole('button', { name: 'Load' }));
    expect(screen.getByRole('dialog', { name: /load a campaign file/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // State untouched, picker never applied.
    expect(useAppStore.getState().template.fields).toHaveLength(1);
  });

  it('Confirm then choosing a valid file replaces all state', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addField({ label: 'Old', type: 'short_text', required: false });
    render(<PersistenceBar />);

    await user.click(screen.getByRole('button', { name: 'Load' }));
    await user.click(screen.getByRole('button', { name: /choose file/i }));

    fireEvent.change(screen.getByLabelText('Load campaign file'), {
      target: { files: [fakeFile(validSaveText())] },
    });

    await waitFor(() => {
      const store = useAppStore.getState();
      expect(store.template.fields.map((f) => f.id)).toEqual(['name']);
      expect(store.hexes.h1?.coordinate).toEqual({ q: 0, r: 0 });
      expect(store.index.get({ q: 0, r: 0 })).toBe('h1');
    });
  });

  it('shows an error and leaves state unchanged for a malformed file', async () => {
    useAppStore.getState().addField({ label: 'Keep', type: 'short_text', required: false });
    render(<PersistenceBar />);

    fireEvent.change(screen.getByLabelText('Load campaign file'), {
      target: { files: [fakeFile('{not json')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid json/i);
    expect(useAppStore.getState().template.fields).toHaveLength(1);
  });
});
