import { hexDimensions, hexPolygonPoints } from './geometry';

export interface HexTileProps {
  size: number;
  incomplete: boolean;
  label: string;
  onClick: () => void;
}

/**
 * Presentational hex tile: the pointy-top polygon plus an incomplete marker.
 * Framework-only (no store, no React Flow) so it renders and tests in
 * isolation. Clicking it invokes `onClick` (wired to the edit form in plan 04).
 */
export function HexTile({ size, incomplete, label, onClick }: HexTileProps): React.JSX.Element {
  const { width, height } = hexDimensions(size);
  const className = incomplete ? 'hex-tile hex-tile--incomplete' : 'hex-tile';

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={onClick}
      style={{ width, height }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
        aria-hidden="true"
        focusable="false"
      >
        <polygon points={hexPolygonPoints(size)} className="hex-tile__shape" />
      </svg>
      {incomplete ? (
        <span className="hex-tile__marker" role="img" aria-label="Incomplete">
          !
        </span>
      ) : null}
    </button>
  );
}
