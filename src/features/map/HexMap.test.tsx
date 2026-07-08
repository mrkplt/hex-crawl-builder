import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HexMap } from './HexMap';
import { useAppStore } from '../../state/store';
import { CoordinateIndex } from '../../domain/coordinates';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

function paletteDataTransfer(): DataTransfer {
  return {
    getData: (type: string) => (type === 'application/hex-crawl' ? 'new-hex' : ''),
    setData: () => {},
    dropEffect: 'none',
    effectAllowed: 'all',
  } as unknown as DataTransfer;
}

describe('HexMap', () => {
  beforeEach(reset);

  it('renders the palette tile and the trash zone', () => {
    render(<HexMap />);
    expect(screen.getByRole('button', { name: /new hex/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/delete zone/i)).toBeInTheDocument();
  });

  it('places a hex when the palette tile is dropped on an empty canvas', () => {
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');
    expect(canvas).not.toBeNull();

    const dataTransfer = paletteDataTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: /new hex/i }), { dataTransfer });
    fireEvent.dragOver(canvas!, { dataTransfer });
    fireEvent.drop(canvas!, { dataTransfer, clientX: 120, clientY: 120 });

    expect(Object.keys(useAppStore.getState().hexes)).toHaveLength(1);
  });

  it('ignores drops that are not the palette tile', () => {
    const { container } = render(<HexMap />);
    const canvas = container.querySelector('.hex-map__canvas');
    const empty = {
      getData: () => '',
      setData: () => {},
      dropEffect: 'none',
      effectAllowed: 'all',
    } as unknown as DataTransfer;

    fireEvent.drop(canvas!, { dataTransfer: empty, clientX: 10, clientY: 10 });
    expect(Object.keys(useAppStore.getState().hexes)).toHaveLength(0);
  });
});
