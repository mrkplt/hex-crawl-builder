import { describe, it, expect } from 'vitest';
import { reconcileDragStop } from './dragReconcile';
import { buildHexNodes, type HexFlowNode } from './nodes';
import { axialToPixel } from './geometry';
import { placeHex, type GraphState } from '../../domain/graph';
import { CoordinateIndex } from '../../domain/coordinates';
import { makeTemplate } from '../../test/factories';

const template = makeTemplate([]);
const SIZE = 40;
const noop = (): void => {};

function emptyState(): GraphState {
  return { hexes: {}, index: new CoordinateIndex() };
}

/** Simulate React Flow having displaced a node to an arbitrary pixel position. */
function displaceNode(nodes: HexFlowNode[], id: string, x: number, y: number): HexFlowNode[] {
  return nodes.map((n: HexFlowNode) => (n.id === id ? { ...n, position: { x, y }, dragging: true } : n));
}

describe('reconcileDragStop', () => {
  it('snaps a rejected node back to its store-derived home position', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const nodes = buildHexNodes([hex], template, SIZE, noop);
    // React Flow left the node displaced far from home.
    const displaced = displaceNode(nodes, hex.id, 999, 999);

    const next = reconcileDragStop(displaced, hex.id, state, SIZE, noop, template);

    const home = axialToPixel(hex.coordinate, SIZE);
    const node = next.find((n) => n.id === hex.id);
    expect(node?.position).toEqual(home);
  });

  it('clears the dragging flag on the reconciled node', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const nodes = buildHexNodes([hex], template, SIZE, noop);
    const displaced = displaceNode(nodes, hex.id, 500, 500);

    const next = reconcileDragStop(displaced, hex.id, state, SIZE, noop, template);

    const node = next.find((n) => n.id === hex.id);
    expect(node?.dragging).toBe(false);
  });

  it('gives the reconciled node a fresh object identity so React Flow re-syncs', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const nodes = buildHexNodes([hex], template, SIZE, noop);
    const displaced = displaceNode(nodes, hex.id, 500, 500);
    const before = displaced.find((n) => n.id === hex.id);

    const next = reconcileDragStop(displaced, hex.id, state, SIZE, noop, template);
    const after = next.find((n) => n.id === hex.id);

    expect(after).not.toBe(before);
  });

  it('leaves other nodes untouched', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const second = placeHex(state, { q: 1, r: 0 }, template);
    state = second.state;
    const hexes = Object.values(state.hexes);
    const movingId = hexes[0]!.id;
    const otherId = hexes[1]!.id;

    const nodes = buildHexNodes(hexes, template, SIZE, noop);
    const displaced = displaceNode(nodes, movingId, 500, 500);
    const otherBefore = displaced.find((n) => n.id === otherId);

    const next = reconcileDragStop(displaced, movingId, state, SIZE, noop, template);
    const otherAfter = next.find((n) => n.id === otherId);

    // Untouched node keeps identity and position.
    expect(otherAfter).toBe(otherBefore);
  });

  it('returns nodes unchanged if the hex no longer exists in the store', () => {
    const { state, hex } = placeHex(emptyState(), { q: 0, r: 0 }, template);
    const nodes = buildHexNodes([hex], template, SIZE, noop);
    const displaced = displaceNode(nodes, hex.id, 500, 500);

    // Ask to reconcile a hex id not present in state.
    const next = reconcileDragStop(displaced, 'ghost-id', state, SIZE, noop, template);
    expect(next).toBe(displaced);
  });
});
