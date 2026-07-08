import { describe, it, expect, beforeEach } from 'vitest';
import { migrate, parseSaveFile } from './parse';
import { toSaveFile } from './format';
import { placeHex, type GraphState } from '../../domain/graph';
import { CoordinateIndex, neighborCoord } from '../../domain/coordinates';
import { Direction } from '../../domain/directions';
import { useAppStore } from '../../state/store';
import { makeField, makeTemplate } from '../../test/factories';
import { expectIndexMatches, expectReciprocal } from '../../test/invariants';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

/** Build a small linked campaign with an orphaned value, as a save-file string. */
function sampleSaveText(): { text: string; aId: string; bId: string } {
  const template = makeTemplate([
    makeField({ id: 'name', label: 'Name', required: true, order: 0 }),
    makeField({ id: 'notes', label: 'Notes', required: false, order: 1 }),
  ]);
  let state: GraphState = { hexes: {}, index: new CoordinateIndex() };
  const a = placeHex(state, { q: 0, r: 0 }, template);
  state = a.state;
  const b = placeHex(state, neighborCoord({ q: 0, r: 0 }, Direction.E), template);
  state = b.state;

  // Attach an orphaned value (a field not in the template) to hex A.
  const hexA = state.hexes[a.hex.id]!;
  state = {
    ...state,
    hexes: {
      ...state.hexes,
      [a.hex.id]: { ...hexA, fieldValues: { ...hexA.fieldValues, ghost: 'legacy' } },
    },
  };

  const file = toSaveFile({ template, hexes: Object.values(state.hexes) });
  return { text: JSON.stringify(file), aId: a.hex.id, bId: b.hex.id };
}

describe('parseSaveFile round-trip', () => {
  beforeEach(reset);

  it('reproduces template, hexes, reciprocal links, index, and orphaned values', () => {
    const { text, aId, bId } = sampleSaveText();
    const result = parseSaveFile(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    useAppStore.getState().replaceAll({
      template: result.value.template,
      hexes: result.value.hexes,
    });
    const store = useAppStore.getState();

    expect(store.template.fields.map((f) => f.id)).toEqual(['name', 'notes']);
    expect(Object.keys(store.hexes)).toHaveLength(2);
    expectReciprocal({ hexes: store.hexes, index: store.index });
    expectIndexMatches({ hexes: store.hexes, index: store.index });
    expect(store.hexes[aId]?.neighbors[Direction.E]).toBe(bId);
    expect(store.hexes[bId]?.neighbors[Direction.W]).toBe(aId);
    // Orphaned value survives the round-trip.
    expect(store.hexes[aId]?.fieldValues.ghost).toBe('legacy');
  });

  it('rebuilds the index so adjacency queries work after load', () => {
    const { text, bId } = sampleSaveText();
    const result = parseSaveFile(text);
    if (!result.ok) throw new Error('expected ok');
    useAppStore.getState().replaceAll({
      template: result.value.template,
      hexes: result.value.hexes,
    });

    // Place a new hex east of B (which sits at (1,0)); the link must form.
    const newHex = useAppStore.getState().placeHex(neighborCoord({ q: 1, r: 0 }, Direction.E));
    expect(useAppStore.getState().hexes[bId]?.neighbors[Direction.E]).toBe(newHex.id);
  });
});

describe('version validation and migration seam', () => {
  it('accepts the current version', () => {
    const { text } = sampleSaveText();
    expect(parseSaveFile(text).ok).toBe(true);
  });

  it('rejects an unknown version cleanly', () => {
    const result = migrate({ version: 999, template: { fields: [] }, hexes: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unsupported save version/i);
  });

  it('rejects a non-object top level', () => {
    expect(migrate(42).ok).toBe(false);
    expect(migrate(null).ok).toBe(false);
  });
});

describe('malformed input is rejected with a clear error', () => {
  it('rejects non-JSON', () => {
    const result = parseSaveFile('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid json/i);
  });

  it('rejects a missing template.fields array', () => {
    const result = parseSaveFile(JSON.stringify({ version: 1, hexes: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/template\.fields/i);
  });

  it('rejects a missing hexes array', () => {
    const result = parseSaveFile(JSON.stringify({ version: 1, template: { fields: [] } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/hexes/i);
  });

  it('rejects a field with an unknown type', () => {
    const result = parseSaveFile(
      JSON.stringify({
        version: 1,
        template: {
          fields: [{ id: 'a', label: 'A', type: 'checkbox', required: false, order: 0 }],
        },
        hexes: [],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unknown type/i);
  });

  it('rejects a hex with a bad neighbors array', () => {
    const result = parseSaveFile(
      JSON.stringify({
        version: 1,
        template: { fields: [] },
        hexes: [
          {
            id: 'h',
            coordinate: { q: 0, r: 0 },
            neighbors: [null, null, null], // wrong length
            fieldValues: {},
            createdAt: 1,
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/neighbors/i);
  });

  it('rejects a hex with an invalid coordinate', () => {
    const result = parseSaveFile(
      JSON.stringify({
        version: 1,
        template: { fields: [] },
        hexes: [
          {
            id: 'h',
            coordinate: { q: 'x', r: 0 },
            neighbors: [null, null, null, null, null, null],
            fieldValues: {},
            createdAt: 1,
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/coordinate/i);
  });

  it('rejects a field that is not an object', () => {
    const result = parseSaveFile(
      JSON.stringify({ version: 1, template: { fields: [42] }, hexes: [] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/field 0 is not an object/i);
  });

  it('rejects neighbors containing a non-string, non-null slot', () => {
    const result = parseSaveFile(
      JSON.stringify({
        version: 1,
        template: { fields: [] },
        hexes: [
          {
            id: 'h',
            coordinate: { q: 0, r: 0 },
            neighbors: [5, null, null, null, null, null],
            fieldValues: {},
            createdAt: 1,
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/neighbors/i);
  });

  it('rejects fieldValues that is not an object', () => {
    const result = parseSaveFile(
      JSON.stringify({
        version: 1,
        template: { fields: [] },
        hexes: [
          {
            id: 'h',
            coordinate: { q: 0, r: 0 },
            neighbors: [null, null, null, null, null, null],
            fieldValues: 'nope',
            createdAt: 1,
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/fieldValues/i);
  });

  it('rejects a hex with non-string fieldValues', () => {
    const result = parseSaveFile(
      JSON.stringify({
        version: 1,
        template: { fields: [] },
        hexes: [
          {
            id: 'h',
            coordinate: { q: 0, r: 0 },
            neighbors: [null, null, null, null, null, null],
            fieldValues: { a: 5 },
            createdAt: 1,
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/fieldValues/i);
  });
});
