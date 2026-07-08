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
}

export type HexFlowNode = Node<HexNodeData, 'hex'>;

/**
 * Edges exist only to carry the neighbor-graph structure for the future
 * traversal feature; they must never render a visible connector. Adjacency is
 * shown by hexagons sharing a border.
 */
export const HIDDEN_EDGE_STYLE = { stroke: 'transparent', strokeWidth: 0 } as const;

/** Map each hex to a positioned React Flow node with live completeness. */
export function buildHexNodes(
  hexes: Hex[],
  template: Template,
  size: number,
  onHexClick: (hexId: string) => void,
): HexFlowNode[] {
  return hexes.map((hex) => ({
    id: hex.id,
    type: 'hex',
    position: axialToPixel(hex.coordinate, size),
    data: {
      hexId: hex.id,
      label: `Hex at ${coordKey(hex.coordinate)}`,
      size,
      incomplete: isIncomplete(hex, template),
      onHexClick,
    },
  }));
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
