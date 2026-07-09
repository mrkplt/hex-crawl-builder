import { hexDimensions, hexPolygonPoints } from './geometry';

export interface HexTileProps {
  size: number;
  incomplete: boolean;
  label: string;
  onClick: () => void;
  /** Whether this tile is the current drag source (renders at ~50% opacity). */
  dragging?: boolean;
  /** Begin an HTML5 drag of this tile. When omitted, the tile is not draggable. */
  onDragStart?: (event: React.DragEvent) => void;
  /** End the HTML5 drag. */
  onDragEnd?: () => void;
}

/**
 * Extra room around the hexagon so its border stroke isn't clipped at the SVG
 * viewBox edge (the polygon's vertices sit exactly on the shape bounds). The
 * padding is transparent and symmetric, so the hex center is unchanged and
 * neighbouring tiles still meet edge-to-edge.
 */
const STROKE_PAD = 8;

/**
 * Presentational hex tile: the pointy-top polygon plus an incomplete marker.
 * Framework-only (no store, no React Flow) so it renders and tests in
 * isolation. Clicking it invokes `onClick` (wired to the edit form in plan 04).
 */
export function HexTile({
  size,
  incomplete,
  label,
  onClick,
  dragging = false,
  onDragStart,
  onDragEnd,
}: HexTileProps): React.JSX.Element {
  const { width, height } = hexDimensions(size);
  const boxWidth = width + STROKE_PAD;
  const boxHeight = height + STROKE_PAD;
  const classNames = ['hex-tile'];
  if (incomplete) classNames.push('hex-tile--incomplete');
  if (dragging) classNames.push('hex-tile--dragging');
  const className = classNames.join(' ');

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={onClick}
      draggable={onDragStart !== undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ width: boxWidth, height: boxHeight }}
    >
      <svg
        className="hex-tile__svg"
        width={boxWidth}
        height={boxHeight}
        viewBox={`${-boxWidth / 2} ${-boxHeight / 2} ${boxWidth} ${boxHeight}`}
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
