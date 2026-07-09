import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HexMap } from './HexMap';
import { useAppStore } from '../../state/store';
import { CoordinateIndex } from '../../domain/coordinates';
import * as placement from './placement';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

function paletteDataTransfer(): DataTransfer {
  return {
    getData: (type: string) => (type === 'application/hex-crawl' ? 'new-hex' : ''),
    setData: vi.fn(),
    setDragImage: vi.fn(),
    dropEffect: 'none',
    effectAllowed: 'all',
  } as unknown as DataTransfer;
}

/** A dataTransfer that reports a hex-move drag carrying `hexId`. */
function hexMoveDataTransfer(hexId: string): DataTransfer {
  return {
    getData: (type: string) => (type === 'application/hex-crawl-move' ? hexId : ''),
    setData: vi.fn(),
    setDragImage: vi.fn(),
    dropEffect: 'none',
    effectAllowed: 'all',
  } as unknown as DataTransfer;
}

/** Seed a single hex at the origin and return its id. */
function seedOneHex(): string {
  const hex = useAppStore.getState().placeHex({ q: 0, r: 0 });
  return hex.id;
}

describe('HexMap', () => {
  beforeEach(reset);

  it('renders the palette tile as a draggable hex SVG', () => {
    render(<HexMap />);
    const palette = screen.getByLabelText(/new hex/i);
    expect(palette).toHaveAttribute('draggable', 'true');
    expect(palette.querySelector('svg')).not.toBeNull();
    expect(palette.querySelector('polygon')).not.toBeNull();
  });

  it('palette tile has no role=button', () => {
    render(<HexMap />);
    const palette = screen.getByLabelText(/new hex/i);
    expect(palette).not.toHaveAttribute('role', 'button');
  });

  it('renders the trash zone', () => {
    render(<HexMap />);
    expect(screen.getByLabelText(/delete zone/i)).toBeInTheDocument();
  });

  it('palette drag and canvas dragOver use compatible drag effects', () => {
    // A copy/move mismatch between effectAllowed (set on dragStart) and
    // dropEffect (set on dragOver) makes real browsers reject the drop and never
    // fire the drop event — the palette-place regression. Guard the invariant.
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');
    const dt = {
      _effectAllowed: 'uninitialized',
      _dropEffect: 'uninitialized',
      setData: vi.fn(),
      getData: (t: string) => (t === 'application/hex-crawl' ? 'new-hex' : ''),
      setDragImage: vi.fn(),
      get effectAllowed() {
        return this._effectAllowed;
      },
      set effectAllowed(v: string) {
        this._effectAllowed = v;
      },
      get dropEffect() {
        return this._dropEffect;
      },
      set dropEffect(v: string) {
        this._dropEffect = v;
      },
    };
    fireEvent.dragStart(screen.getByLabelText(/new hex/i), { dataTransfer: dt });
    fireEvent.dragOver(canvas!, { dataTransfer: dt });
    // effectAllowed 'move' is compatible with dropEffect 'move'.
    expect(dt._effectAllowed).toBe('move');
    expect(dt._dropEffect).toBe('move');
  });

  it('places a hex when the palette tile is dropped on an empty canvas', () => {
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');
    expect(canvas).not.toBeNull();

    const dataTransfer = paletteDataTransfer();
    fireEvent.dragStart(screen.getByLabelText(/new hex/i), { dataTransfer });
    fireEvent.dragOver(canvas!, { dataTransfer });
    fireEvent.drop(canvas!, { dataTransfer, clientX: 120, clientY: 120 });

    expect(Object.keys(useAppStore.getState().hexes)).toHaveLength(1);
  });

  it('ignores drops that are not the palette tile', () => {
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');
    const empty = {
      getData: () => '',
      setData: vi.fn(),
      dropEffect: 'none',
      effectAllowed: 'all',
    } as unknown as DataTransfer;

    fireEvent.drop(canvas!, { dataTransfer: empty, clientX: 10, clientY: 10 });
    expect(Object.keys(useAppStore.getState().hexes)).toHaveLength(0);
  });

  it('calls setDragImage in onPaletteDragStart', () => {
    render(<HexMap />);
    const dataTransfer = paletteDataTransfer();
    fireEvent.dragStart(screen.getByLabelText(/new hex/i), { dataTransfer });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setDragImageMock = vi.mocked(dataTransfer.setDragImage);
    expect(setDragImageMock).toHaveBeenCalledTimes(1);
    const firstCall = setDragImageMock.mock.calls[0] as unknown as [Element, number, number];
    const el = firstCall[0];
    expect(el.tagName.toLowerCase()).toBe('svg');
  });

  it('trash zone gets active class while dragging and loses it after drag end', () => {
    render(<HexMap />);
    const palette = screen.getByLabelText(/new hex/i);
    const trash = screen.getByLabelText(/delete zone/i);
    const dataTransfer = paletteDataTransfer();

    fireEvent.dragStart(palette, { dataTransfer });
    expect(trash).toHaveClass('hex-map__trash--active');

    fireEvent.dragEnd(palette, { dataTransfer });
    expect(trash).not.toHaveClass('hex-map__trash--active');
  });

  it('palette drop on the trash zone does not create a hex', () => {
    // Make isOverTrash always return true to simulate a drop on the trash zone.
    const spy = vi.spyOn(placement, 'isOverTrash').mockReturnValue(true);
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');

    const dataTransfer = paletteDataTransfer();
    fireEvent.dragStart(screen.getByLabelText(/new hex/i), { dataTransfer });
    fireEvent.drop(canvas!, { dataTransfer, clientX: 50, clientY: 50 });

    expect(Object.keys(useAppStore.getState().hexes)).toHaveLength(0);
    spy.mockRestore();
  });

  it('dropping a hex on the trash zone opens the delete confirmation', () => {
    const spy = vi.spyOn(placement, 'isOverTrash').mockReturnValue(true);
    const id = seedOneHex();
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');

    const dataTransfer = hexMoveDataTransfer(id);
    fireEvent.drop(canvas!, { dataTransfer, clientX: 50, clientY: 50 });

    expect(screen.getByRole('dialog', { name: /delete hex/i })).toBeInTheDocument();
    // The hex is NOT yet deleted — deletion waits for confirmation.
    expect(Object.keys(useAppStore.getState().hexes)).toHaveLength(1);
    spy.mockRestore();
  });

  it('confirming the delete of a trashed hex removes it from the store', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(placement, 'isOverTrash').mockReturnValue(true);
    const id = seedOneHex();
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');

    fireEvent.drop(canvas!, { dataTransfer: hexMoveDataTransfer(id), clientX: 50, clientY: 50 });
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(Object.keys(useAppStore.getState().hexes)).toHaveLength(0);
    spy.mockRestore();
  });

  it('cancelling the delete of a trashed hex keeps it in the store', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(placement, 'isOverTrash').mockReturnValue(true);
    const id = seedOneHex();
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');

    fireEvent.drop(canvas!, { dataTransfer: hexMoveDataTransfer(id), clientX: 50, clientY: 50 });
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog', { name: /delete hex/i })).not.toBeInTheDocument();
    expect(Object.keys(useAppStore.getState().hexes)).toHaveLength(1);
    spy.mockRestore();
  });
});
