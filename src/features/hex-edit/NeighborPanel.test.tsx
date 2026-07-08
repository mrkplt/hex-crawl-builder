import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NeighborPanel } from './NeighborPanel';
import { Direction } from '../../domain/directions';
import { makeField, makeHex, makeTemplate } from '../../test/factories';

describe('NeighborPanel', () => {
  it('renders a create affordance for an empty edge and calls onCreate with the direction', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const template = makeTemplate([]);

    render(
      <NeighborPanel
        direction={Direction.NE}
        neighbor={null}
        template={template}
        onCreate={onCreate}
        onEdit={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create hex to the NE' }));
    expect(onCreate).toHaveBeenCalledWith(Direction.NE);
  });

  it('previews live fields sorted by order, regardless of template array order', () => {
    const notes = makeField({ id: 'notes', label: 'Notes', order: 1 });
    const name = makeField({ id: 'name', label: 'Name', order: 0 });
    const template = makeTemplate([notes, name]);
    const neighbor = makeHex(
      { q: 1, r: -1 },
      { fieldValues: { name: 'Old Mill', notes: 'A ruin' } },
    );

    render(
      <NeighborPanel
        direction={Direction.NE}
        neighbor={neighbor}
        template={template}
        onCreate={() => {}}
        onEdit={() => {}}
      />,
    );

    const labels = screen.getAllByText(/^(Name|Notes):$/).map((el) => el.textContent);
    expect(labels).toEqual(['Name:', 'Notes:']);
  });

  it('shows a collapsed truncated preview of live fields, without orphans', () => {
    const name = makeField({ id: 'name', label: 'Name', order: 0, required: true });
    const template = makeTemplate([name]);
    const neighbor = makeHex(
      { q: 1, r: -1 },
      { fieldValues: { name: 'Old Mill', ghost: 'orphan-value' } },
    );

    render(
      <NeighborPanel
        direction={Direction.NE}
        neighbor={neighbor}
        template={template}
        onCreate={() => {}}
        onEdit={() => {}}
      />,
    );

    expect(screen.getByText('Old Mill')).toBeInTheDocument();
    expect(screen.queryByText(/orphan-value/)).not.toBeInTheDocument();
    expect(screen.queryByText(/legacy fields/i)).not.toBeInTheDocument();
  });

  it('shows the incomplete marker when the neighbor fails a required field', () => {
    const name = makeField({ id: 'name', label: 'Name', order: 0, required: true });
    const template = makeTemplate([name]);
    const neighbor = makeHex({ q: 1, r: -1 }, { fieldValues: {} });

    render(
      <NeighborPanel
        direction={Direction.NE}
        neighbor={neighbor}
        template={template}
        onCreate={() => {}}
        onEdit={() => {}}
      />,
    );

    expect(screen.getByRole('img', { name: 'Incomplete' })).toBeInTheDocument();
  });

  it('expands to show full fields and legacy values, then Edit calls onEdit; collapsing hides them again', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const name = makeField({ id: 'name', label: 'Name', order: 0 });
    const template = makeTemplate([name]);
    const neighbor = makeHex(
      { q: 1, r: -1 },
      { id: 'neighbor-1', fieldValues: { name: 'Old Mill', ghost: 'orphan-value' } },
    );

    render(
      <NeighborPanel
        direction={Direction.NE}
        neighbor={neighbor}
        template={template}
        onCreate={() => {}}
        onEdit={onEdit}
      />,
    );

    await user.click(screen.getByRole('button', { name: /NE/ }));
    expect(screen.getByText(/legacy fields/i)).toBeInTheDocument();
    expect(screen.getByText(/orphan-value/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith('neighbor-1');

    await user.click(screen.getByRole('button', { name: /NE/ }));
    expect(screen.queryByText(/legacy fields/i)).not.toBeInTheDocument();
  });

  it('renders no editable controls — the panel is read-only', () => {
    const name = makeField({ id: 'name', label: 'Name', order: 0 });
    const template = makeTemplate([name]);
    const neighbor = makeHex({ q: 1, r: -1 }, { fieldValues: { name: 'Old Mill' } });

    render(
      <NeighborPanel
        direction={Direction.NE}
        neighbor={neighbor}
        template={template}
        onCreate={() => {}}
        onEdit={() => {}}
      />,
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
