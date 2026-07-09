import type { Template } from '../../domain/types';
import type { GraphState } from '../../domain/graph';
import { buildHexNode, type HexFlowNode } from './nodes';

/**
 * Reconcile the node list after a drag that did NOT result in a committed move
 * (i.e. a delete-pending or a rejected move). React Flow mutates a node's
 * position live during a drag; when the drag doesn't produce a store change,
 * the node is left visually displaced. This forces the single affected node
 * back to the position derived from its axial coordinate in the store — the
 * hex-flower principle that a dragged element's position is always derived from
 * the data model, never from where the drag left it.
 *
 * The affected node is rebuilt with a FRESH object identity so React Flow drops
 * its internal drag-measured position and honours the store-derived one.
 * All other nodes keep their identity (React Flow skips re-reconciling them).
 *
 * Pure and framework-free, so the snap-back invariant is unit-testable without
 * a real drag.
 */
export function reconcileDragStop(
  nodes: HexFlowNode[],
  hexId: string,
  state: GraphState,
  size: number,
  onHexClick: (hexId: string) => void,
  template: Template,
): HexFlowNode[] {
  const hex = state.hexes[hexId];
  if (hex === undefined) {
    // The hex isn't in the store (e.g. already deleted) — nothing to snap.
    return nodes;
  }
  const fresh = buildHexNode(hex, template, size, onHexClick);
  return nodes.map((n) => (n.id === hexId ? fresh : n));
}
