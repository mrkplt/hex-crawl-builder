import { describe, it, expect } from 'vitest';
import { HIDDEN_EDGE_STYLE, buildHexEdges, buildHexNodes, type HexNodeCallbacks } from './nodes';
import { placeHex, type GraphState } from '../../domain/graph';
import { CoordinateIndex, neighborCoord } from '../../domain/coordinates';
import { Direction } from '../../domain/directions';
import { makeField, makeTemplate } from '../../test/factories';
import { axialToPixel } from './geometry';

const size = 40;

const cb: HexNodeCallbacks = {
  onHexClick: () => undefined,
  onHexDragStart: () => undefined,
  onHexDragEnd: () => undefined,
  draggingId: null,
};

function emptyState(): GraphState {
  return { hexes: {}, index: new CoordinateIndex() };
}

describe('buildHexNodes', () => {
  it('positions each node from its axial coordinate', () => {
    const { state, hex } = placeHex(emptyState(), { q: 2, r: -1 }, makeTemplate([]));
    const nodes = buildHexNodes(Object.values(state.hexes), makeTemplate([]), size, cb);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.id).toBe(hex.id);
    expect(nodes[0]?.position).toEqual(axialToPixel({ q: 2, r: -1 }, size));
    expect(nodes[0]?.type).toBe('hex');
  });

  it('marks a node incomplete against the live template', () => {
    const { state } = placeHex(emptyState(), { q: 0, r: 0 }, makeTemplate([]));
    const template = makeTemplate([makeField({ id: 'a', required: true })]);
    const nodes = buildHexNodes(Object.values(state.hexes), template, size, cb);
    expect(nodes[0]?.data.incomplete).toBe(true);
  });

  it('marks a node complete when no required field is empty', () => {
    const { state } = placeHex(emptyState(), { q: 0, r: 0 }, makeTemplate([]));
    const template = makeTemplate([makeField({ id: 'a', required: false })]);
    const nodes = buildHexNodes(Object.values(state.hexes), template, size, cb);
    expect(nodes[0]?.data.incomplete).toBe(false);
  });
});

describe('buildHexEdges', () => {
  it('creates one invisible edge per neighbor pair', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, makeTemplate([]));
    const east = placeHex(state, neighborCoord({ q: 0, r: 0 }, Direction.E), makeTemplate([]));
    state = east.state;

    const edges = buildHexEdges(Object.values(state.hexes));
    expect(edges).toHaveLength(1); // A↔B deduped to a single edge
    expect(edges[0]?.style).toEqual(HIDDEN_EDGE_STYLE);
    expect(edges[0]?.selectable).toBe(false);
  });

  it('uses transparent, zero-width styling (no visible connector)', () => {
    expect(HIDDEN_EDGE_STYLE.stroke).toBe('transparent');
    expect(HIDDEN_EDGE_STYLE.strokeWidth).toBe(0);
  });

  it('returns no edges for isolated hexes', () => {
    let { state } = placeHex(emptyState(), { q: 0, r: 0 }, makeTemplate([]));
    const far = placeHex(state, { q: 9, r: 9 }, makeTemplate([]));
    state = far.state;
    expect(buildHexEdges(Object.values(state.hexes))).toHaveLength(0);
  });
});
