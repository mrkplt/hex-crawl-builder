import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HexFocusView } from './HexFocusView';
import { useAppStore } from '../../state/store';
import { CoordinateIndex } from '../../domain/coordinates';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

interface Seed {
  centerId: string;
  neId: string;
  nameFieldId: string;
}

/** A required Name field, a center hex, and one NE neighbor with a distinct value. */
function seed(): Seed {
  const name = useAppStore.getState().addField({
    label: 'Name',
    type: 'short_text',
    required: true,
  });
  const center = useAppStore.getState().placeHex({ q: 0, r: 0 });
  const ne = useAppStore.getState().placeHex({ q: 1, r: -1 });
  useAppStore.getState().setHexFieldValues(ne.id, { [name.id]: 'NE Hex' });
  return { centerId: center.id, neId: ne.id, nameFieldId: name.id };
}

describe('HexFocusView', () => {
  beforeEach(reset);

  it('renders the center editor plus six neighbor panels in the correct direction slots', () => {
    const { centerId } = seed();
    const { container } = render(<HexFocusView hexId={centerId} onClose={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Edit hex' })).toBeInTheDocument();

    const rightColumn = container.querySelector('.hex-focus__column--right');
    const leftColumn = container.querySelector('.hex-focus__column--left');
    // NE is populated (visible direction label on its toggle); E and SE are
    // empty edges (direction conveyed via the create button's accessible name).
    expect(within(rightColumn as HTMLElement).getByText('NE')).toBeInTheDocument();
    expect(
      within(rightColumn as HTMLElement).getByRole('button', { name: 'Create hex to the E' }),
    ).toBeInTheDocument();
    expect(
      within(rightColumn as HTMLElement).getByRole('button', { name: 'Create hex to the SE' }),
    ).toBeInTheDocument();
    expect(within(leftColumn as HTMLElement).getAllByRole('button')).toHaveLength(3);
  });

  it('shows the NE neighbor collapsed with its live field preview', () => {
    const { centerId } = seed();
    render(<HexFocusView hexId={centerId} onClose={() => {}} />);
    expect(screen.getByText('NE Hex')).toBeInTheDocument();
  });

  it('"+" on an empty edge places an adjacent, auto-linked hex and leaves focus on the current hex', async () => {
    const user = userEvent.setup();
    const { centerId } = seed();
    render(<HexFocusView hexId={centerId} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Create hex to the SE' }));

    const updatedCenter = useAppStore.getState().hexes[centerId];
    expect(updatedCenter?.neighbors[2]).not.toBeNull(); // 2 = SE
    expect(screen.getByRole('heading', { name: 'Edit hex' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create hex to the SE' })).not.toBeInTheDocument();
  });

  it('Edit on a clean center navigates immediately and renders the new center', async () => {
    const user = userEvent.setup();
    const { centerId, nameFieldId } = seed();
    render(<HexFocusView hexId={centerId} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^NE/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.queryByRole('dialog', { name: /discard/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('NE Hex');
    // The old center is now a neighbor (SW of the new center) rather than gone.
    expect(useAppStore.getState().hexes[centerId]?.fieldValues[nameFieldId]).toBe('');
  });

  it('Edit with unsaved edits prompts; Cancel keeps the current center', async () => {
    const user = userEvent.setup();
    const { centerId } = seed();
    render(<HexFocusView hexId={centerId} onClose={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Dirty');
    await user.click(screen.getByRole('button', { name: /^NE/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('dialog', { name: /discard changes/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));

    expect(screen.getByLabelText('Name')).toHaveValue('Dirty');
  });

  it('Edit with unsaved edits: Confirm discards them and navigates, without saving', async () => {
    const user = userEvent.setup();
    const { centerId, nameFieldId } = seed();
    render(<HexFocusView hexId={centerId} onClose={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Dirty');
    await user.click(screen.getByRole('button', { name: /^NE/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByLabelText('Name')).toHaveValue('NE Hex');
    expect(useAppStore.getState().hexes[centerId]?.fieldValues[nameFieldId]).toBe('');
  });

  it('Save commits only the center hex', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { centerId, neId, nameFieldId } = seed();
    render(<HexFocusView hexId={centerId} onClose={onClose} />);

    await user.type(screen.getByLabelText('Name'), 'Center Value');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(useAppStore.getState().hexes[centerId]?.fieldValues[nameFieldId]).toBe('Center Value');
    expect(useAppStore.getState().hexes[neId]?.fieldValues[nameFieldId]).toBe('NE Hex');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closing with no edits closes immediately without a prompt', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { centerId } = seed();
    render(<HexFocusView hexId={centerId} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: /discard/i })).not.toBeInTheDocument();
  });

  it('discard guard: closing with edits prompts; confirming discards and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { centerId, nameFieldId } = seed();
    render(<HexFocusView hexId={centerId} onClose={onClose} />);

    await user.type(screen.getByLabelText('Name'), 'Temp');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByRole('dialog', { name: /discard changes/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().hexes[centerId]?.fieldValues[nameFieldId]).toBe('');
  });

  it('discard guard: cancelling a close keeps the form open with edits intact', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { centerId } = seed();
    render(<HexFocusView hexId={centerId} onClose={onClose} />);

    await user.type(screen.getByLabelText('Name'), 'Temp');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveValue('Temp');
  });

  it('returns null when the center hex no longer exists', () => {
    const { centerId } = seed();
    useAppStore.getState().deleteHex(centerId);
    const { container } = render(<HexFocusView hexId={centerId} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
