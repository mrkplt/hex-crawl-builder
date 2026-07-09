import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(dataTransfer.setDragImage).toHaveBeenCalledTimes(1);
    const [el] = (dataTransfer.setDragImage as ReturnType<typeof vi.fn>).mock.calls[0] as [Element];
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
});
