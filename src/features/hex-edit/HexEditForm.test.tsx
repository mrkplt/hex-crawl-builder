import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HexEditForm } from './HexEditForm';
import { useAppStore } from '../../state/store';
import { CoordinateIndex } from '../../domain/coordinates';
import { isIncomplete } from '../../domain/completeness';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

interface Seed {
  hexId: string;
  nameId: string;
  notesId: string;
}

/** Seed a template (required Name / optional Notes) and one placed hex. */
function seed(): Seed {
  const name = useAppStore.getState().addField({
    label: 'Name',
    type: 'short_text',
    required: true,
  });
  const notes = useAppStore.getState().addField({
    label: 'Notes',
    type: 'long_text',
    required: false,
  });
  const hex = useAppStore.getState().placeHex({ q: 0, r: 0 });
  return { hexId: hex.id, nameId: name.id, notesId: notes.id };
}

describe('HexEditForm', () => {
  beforeEach(reset);

  it('renders one input per live field in order, pre-filled', () => {
    const { hexId, nameId } = seed();
    useAppStore.getState().setHexFieldValues(hexId, { [nameId]: 'Old Mill' });
    render(<HexEditForm hexId={hexId} onClose={() => {}} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.map((el) => el.getAttribute('aria-label'))).toEqual(['Name', 'Notes']);
    expect(screen.getByLabelText('Name')).toHaveValue('Old Mill');
    expect(screen.getByLabelText('Notes')).toHaveValue('');
  });

  it('renders short_text as an input and long_text as a textarea (registry-driven)', () => {
    const { hexId } = seed();
    render(<HexEditForm hexId={hexId} onClose={() => {}} />);
    expect(screen.getByLabelText('Name').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA');
  });

  it('marks required fields informationally without blocking', () => {
    const { hexId } = seed();
    render(<HexEditForm hexId={hexId} onClose={() => {}} />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-required', 'false');
  });

  it('buffers edits: Save commits to the store', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { hexId, nameId } = seed();
    render(<HexEditForm hexId={hexId} onClose={onClose} />);

    await user.type(screen.getByLabelText('Name'), 'Keep');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(useAppStore.getState().hexes[hexId]?.fieldValues[nameId]).toBe('Keep');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('edits and saves the long_text (textarea) field', async () => {
    const user = userEvent.setup();
    const { hexId, notesId } = seed();
    render(<HexEditForm hexId={hexId} onClose={() => {}} />);

    await user.type(screen.getByLabelText('Notes'), 'A ruined watchtower.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(useAppStore.getState().hexes[hexId]?.fieldValues[notesId]).toBe('A ruined watchtower.');
  });

  it('closing with no edits closes immediately without a prompt', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { hexId } = seed();
    render(<HexEditForm hexId={hexId} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: /discard/i })).not.toBeInTheDocument();
  });

  it('discard guard: closing with edits prompts; confirming discards', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { hexId, nameId } = seed();
    render(<HexEditForm hexId={hexId} onClose={onClose} />);

    await user.type(screen.getByLabelText('Name'), 'Temp');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByRole('dialog', { name: /discard changes/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().hexes[hexId]?.fieldValues[nameId]).toBe('');
  });

  it('discard guard: cancelling keeps the form open with edits intact', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { hexId } = seed();
    render(<HexEditForm hexId={hexId} onClose={onClose} />);

    await user.type(screen.getByLabelText('Name'), 'Temp');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /discard/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Temp');
  });

  it('omits the legacy section when there are no orphans', () => {
    const { hexId } = seed();
    render(<HexEditForm hexId={hexId} onClose={() => {}} />);
    expect(screen.queryByText(/legacy fields/i)).not.toBeInTheDocument();
  });

  it('shows orphaned values read-only in a legacy section', () => {
    const { hexId } = seed();
    useAppStore.getState().setHexFieldValues(hexId, { ghost: 'preserved' });
    render(<HexEditForm hexId={hexId} onClose={() => {}} />);

    expect(screen.getByText(/legacy fields/i)).toBeInTheDocument();
    const legacyInput = screen.getByLabelText('Legacy value for ghost');
    expect(legacyInput).toHaveValue('preserved');
    expect(legacyInput).toHaveAttribute('readonly');
  });

  it('save-driven completeness: filling the required field flips isIncomplete', async () => {
    const user = userEvent.setup();
    const { hexId } = seed();

    const before = useAppStore.getState();
    expect(isIncomplete(before.hexes[hexId]!, before.template)).toBe(true);

    render(<HexEditForm hexId={hexId} onClose={() => {}} />);
    await user.type(screen.getByLabelText('Name'), 'Filled');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const after = useAppStore.getState();
    expect(isIncomplete(after.hexes[hexId]!, after.template)).toBe(false);
  });

  it('returns null when the hex no longer exists', () => {
    const { hexId } = seed();
    useAppStore.getState().deleteHex(hexId);
    const { container } = render(<HexEditForm hexId={hexId} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
