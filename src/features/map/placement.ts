import type { AxialCoord } from '../../domain/types';
import { isOccupied, type GraphState } from '../../domain/graph';
import { DIRECTION_VECTORS } from '../../domain/directions';
import type { CoordinateIndex } from '../../domain/coordinates';
import { pixelToAxial, type Pixel } from './geometry';

/**
 * Pure placement/move decision logic, split out from the React Flow canvas so
 * the rules are unit-testable without the canvas. The occupied-cell rejection
 * policy lives here (plan 01's placeHex/moveHex assume a validated empty
 * destination).
 */

/**
 * Returns true if `target` is adjacent to at least one occupied cell in
 * `index`, excluding the hex identified by `excludeId` from occupancy.
 * Used for contiguity checks: for moves, the moving hex doesn't count as its
 * own neighbour.
 */
export function isAdjacentToAny(
  target: AxialCoord,
  index: CoordinateIndex,
  excludeId?: string,
): boolean {
  for (const delta of DIRECTION_VECTORS) {
    const neighbor = { q: target.q + delta.q, r: target.r + delta.r };
    const occupantId = index.get(neighbor);
    if (occupantId !== undefined && occupantId !== excludeId) {
      return true;
    }
  }
  return false;
}

export type PlacementDecision =
  { readonly kind: 'place'; readonly coordinate: AxialCoord } | { readonly kind: 'rejected' };

/** Decide whether a palette drop at `coordinate` should place a hex. */
export function decidePaletteDrop(state: GraphState, coordinate: AxialCoord): PlacementDecision {
  if (isOccupied(state, coordinate)) {
    return { kind: 'rejected' };
  }
  // First-hex exception: an empty map accepts any cell.
  if (state.index.size === 0) {
    return { kind: 'place', coordinate };
  }
  if (!isAdjacentToAny(coordinate, state.index)) {
    return { kind: 'rejected' };
  }
  return { kind: 'place', coordinate };
}

export type MoveDecision =
  | { readonly kind: 'move'; readonly hexId: string; readonly destination: AxialCoord }
  | { readonly kind: 'rejected' };

/**
 * Decide whether `hexId` may move to `destination`. Rejected when the target is
 * occupied by another hex, or when it is the hex's own current cell (a no-op),
 * or when the destination would not be adjacent to any other hex (contiguity).
 */
export function decideMove(
  state: GraphState,
  hexId: string,
  destination: AxialCoord,
): MoveDecision {
  const occupantId = state.index.get(destination);
  if (occupantId !== undefined && occupantId !== hexId) {
    return { kind: 'rejected' };
  }
  if (occupantId === hexId) {
    return { kind: 'rejected' };
  }
  // Lone-hex exception: if this is the only hex, it can move freely.
  if (state.index.size === 1) {
    return { kind: 'move', hexId, destination };
  }
  // Contiguity: destination must be adjacent to at least one hex that is not
  // the hex being moved (it is vacating its current cell).
  if (!isAdjacentToAny(destination, state.index, hexId)) {
    return { kind: 'rejected' };
  }
  return { kind: 'move', hexId, destination };
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Whether a screen point falls within the trash zone's bounding rectangle. */
export function isOverTrash(point: { x: number; y: number }, trash: Rect | null): boolean {
  if (trash === null) {
    return false;
  }
  return (
    point.x >= trash.left &&
    point.x <= trash.right &&
    point.y >= trash.top &&
    point.y <= trash.bottom
  );
}

export type DragStopOutcome =
  | { readonly kind: 'delete'; readonly hexId: string }
  | { readonly kind: 'move'; readonly hexId: string; readonly destination: AxialCoord }
  | { readonly kind: 'rejected' };

export interface DragStopInput {
  hexId: string;
  /** Screen point where the drag ended (for the trash hit-test). */
  pointerScreen: { x: number; y: number };
  /** The node's final flow-space pixel position (for cell snapping). */
  nodePixel: Pixel;
  trashRect: Rect | null;
  state: GraphState;
  size: number;
}

/**
 * Resolve what a node-drag release means: drop on trash → delete (pending
 * confirmation), otherwise a move to the snapped destination if empty and
 * contiguous, else rejected (snap back). Pure, so every branch is testable
 * without a real drag.
 */
export function resolveDragStop(input: DragStopInput): DragStopOutcome {
  if (isOverTrash(input.pointerScreen, input.trashRect)) {
    return { kind: 'delete', hexId: input.hexId };
  }
  const destination = pixelToAxial(input.nodePixel, input.size);
  const decision = decideMove(input.state, input.hexId, destination);
  if (decision.kind === 'move') {
    return { kind: 'move', hexId: input.hexId, destination: decision.destination };
  }
  return { kind: 'rejected' };
}
