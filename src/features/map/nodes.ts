import type { Edge, Node } from '@xyflow/react';
import type { Hex, Template } from '../../domain/types';
import { isIncomplete } from '../../domain/completeness';
import { coordKey } from '../../domain/coordinates';
import { axialToPixel } from './geometry';

/** Data carried by each hex node into the custom node renderer. */
export interface HexNodeData extends Record<string, unknown> {
  hexId: string;
  label: string;
  size: number;
  incomplete: boolean;
  onHexClick: (hexId: string) => void;
  /** Begin an HTML5 drag of this hex (sets ghost + drag payload). */
  onHexDragStart: (hexId: string, event: React.DragEvent) => void;
  /** End the HTML5 drag (clears dragging visuals). */
  onHexDragEnd: () => void;
  /** Whether this hex is currently the drag source (drives ghost opacity). */
  dragging: boolean;
}

export type HexFlowNode = Node<HexNodeData, 'hex'>;

/**
 * Edges exist only to carry the neighbor-graph structure for the future
 * traversal feature; they must never render a visible connector. Adjacency is
 * shown by hexagons sharing a border.
 */
export const HIDDEN_EDGE_STYLE = { stroke: 'transparent', strokeWidth: 0 } as const;

/** Callbacks and drag state threaded into every hex node. */
export interface HexNodeCallbacks {
  onHexClick: (hexId: string) => void;
  onHexDragStart: (hexId: string, event: React.DragEvent) => void;
  onHexDragEnd: () => void;
  /** The hex id currently being dragged, if any (drives ghost opacity). */
  draggingId: string | null;
}

/**
 * Build a single positioned React Flow node. `draggable: false` because we do
 * NOT use React Flow's native node drag — a hex is dragged via the HTML5 drag
 * API (hex-flower model: the source hex dims, a ghost follows the pointer, and
 * the node's own position never moves). Position is always derived from the
 * store, so displacement is structurally impossible.
 */
export function buildHexNode(
  hex: Hex,
  template: Template,
  size: number,
  callbacks: HexNodeCallbacks,
): HexFlowNode {
  return {
    id: hex.id,
    type: 'hex',
    position: axialToPixel(hex.coordinate, size),
    draggable: false,
    data: {
      hexId: hex.id,
      label: `Hex at ${coordKey(hex.coordinate)}`,
      size,
      incomplete: isIncomplete(hex, template),
      onHexClick: callbacks.onHexClick,
      onHexDragStart: callbacks.onHexDragStart,
      onHexDragEnd: callbacks.onHexDragEnd,
      dragging: callbacks.draggingId === hex.id,
    },
  };
}

/** Map each hex to a positioned React Flow node with live completeness. */
export function buildHexNodes(
  hexes: Hex[],
  template: Template,
  size: number,
  callbacks: HexNodeCallbacks,
): HexFlowNode[] {
  return hexes.map((hex) => buildHexNode(hex, template, size, callbacks));
}

/**
 * One invisible edge per neighbor link. The `hex.id < neighborId` guard dedupes
 * the reciprocal pair (A↔B) to a single edge.
 */
export function buildHexEdges(hexes: Hex[]): Edge[] {
  const edges: Edge[] = [];
  for (const hex of hexes) {
    for (const neighborId of hex.neighbors) {
      if (neighborId !== null && hex.id < neighborId) {
        edges.push({
          id: `${hex.id}--${neighborId}`,
          source: hex.id,
          target: neighborId,
          style: { ...HIDDEN_EDGE_STYLE },
          selectable: false,
          focusable: false,
          deletable: false,
        });
      }
    }
  }
  return edges;
}
