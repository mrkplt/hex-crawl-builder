import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as localStorageModule from '../features/persistence/localStorage';
import { useAppStore } from './store';
import { CoordinateIndex, neighborCoord } from '../domain/coordinates';
import { Direction } from '../domain/directions';
import { expectIndexMatches, expectReciprocal } from '../test/invariants';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

function graph() {
  const s = useAppStore.getState();
  return { hexes: s.hexes, index: s.index };
}

describe('store — template actions', () => {
  beforeEach(reset);

  it('addField assigns a stable id and incrementing order, returning the field', () => {
    const a = useAppStore
      .getState()
      .addField({ label: 'Name', type: 'short_text', required: true });
    const b = useAppStore
      .getState()
      .addField({ label: 'Notes', type: 'long_text', required: false });

    expect(a.id).not.toBe(b.id);
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    expect(useAppStore.getState().template.fields).toHaveLength(2);
  });

  it('editField applies only the provided keys', () => {
    const a = useAppStore
      .getState()
      .addField({ label: 'Name', type: 'short_text', required: false });
    useAppStore.getState().editField(a.id, { required: true });
    const edited = useAppStore.getState().template.fields[0];
    expect(edited?.required).toBe(true);
    expect(edited?.label).toBe('Name');
    expect(edited?.type).toBe('short_text');
  });

  it('editField can change label and type independently', () => {
    const a = useAppStore
      .getState()
      .addField({ label: 'Name', type: 'short_text', required: false });
    useAppStore.getState().editField(a.id, { label: 'Title', type: 'long_text' });
    const edited = useAppStore.getState().template.fields[0];
    expect(edited?.label).toBe('Title');
    expect(edited?.type).toBe('long_text');
  });

  it('editField ignores an unknown id', () => {
    const a = useAppStore
      .getState()
      .addField({ label: 'Name', type: 'short_text', required: false });
    useAppStore.getState().editField('missing', { label: 'X' });
    expect(useAppStore.getState().template.fields[0]?.label).toBe(a.label);
  });

  it('reorderFields reorders and reassigns order indices', () => {
    const a = useAppStore.getState().addField({ label: 'A', type: 'short_text', required: false });
    const b = useAppStore.getState().addField({ label: 'B', type: 'short_text', required: false });
    const c = useAppStore.getState().addField({ label: 'C', type: 'short_text', required: false });

    useAppStore.getState().reorderFields([c.id, a.id, b.id]);
    const fields = useAppStore.getState().template.fields;
    expect(fields.map((f) => f.label)).toEqual(['C', 'A', 'B']);
    expect(fields.map((f) => f.order)).toEqual([0, 1, 2]);
  });

  it('reorderFields tolerates unknown ids and preserves fields it did not name', () => {
    const a = useAppStore.getState().addField({ label: 'A', type: 'short_text', required: false });
    const b = useAppStore.getState().addField({ label: 'B', type: 'short_text', required: false });
    const c = useAppStore.getState().addField({ label: 'C', type: 'short_text', required: false });

    // Name only B (with a bogus id mixed in); A and C must survive, appended.
    useAppStore.getState().reorderFields(['ghost', b.id]);
    const fields = useAppStore.getState().template.fields;
    expect(fields[0]?.id).toBe(b.id);
    expect(fields.map((f) => f.label).sort()).toEqual(['A', 'B', 'C']);
    expect(fields.map((f) => f.order)).toEqual([0, 1, 2]);
    expect([a.id, c.id].every((id) => fields.some((f) => f.id === id))).toBe(true);
  });

  it('deleteField removes the field but never touches a hex stored value', () => {
    const a = useAppStore
      .getState()
      .addField({ label: 'Terrain', type: 'short_text', required: true });
    const hex = useAppStore.getState().placeHex({ q: 0, r: 0 });
    useAppStore.getState().setHexFieldValues(hex.id, { [a.id]: 'forest' });

    useAppStore.getState().deleteField(a.id);

    expect(useAppStore.getState().template.fields).toHaveLength(0);
    // Non-destructive: the value survives as an orphan.
    expect(useAppStore.getState().hexes[hex.id]?.fieldValues[a.id]).toBe('forest');
  });
});

describe('store — hex actions', () => {
  beforeEach(reset);

  it('placeHex keeps the graph reciprocal and the index consistent', () => {
    const east = useAppStore.getState().placeHex(neighborCoord({ q: 0, r: 0 }, Direction.E));
    const center = useAppStore.getState().placeHex({ q: 0, r: 0 });

    expect(useAppStore.getState().hexes[center.id]?.neighbors[Direction.E]).toBe(east.id);
    expect(useAppStore.getState().hexes[east.id]?.neighbors[Direction.W]).toBe(center.id);
    expectReciprocal(graph());
    expectIndexMatches(graph());
  });

  it('moveHex and deleteHex delegate to the pure ops', () => {
    const hex = useAppStore.getState().placeHex({ q: 0, r: 0 });
    useAppStore.getState().moveHex(hex.id, { q: 3, r: 3 });
    expect(useAppStore.getState().hexes[hex.id]?.coordinate).toEqual({ q: 3, r: 3 });
    expectIndexMatches(graph());

    useAppStore.getState().deleteHex(hex.id);
    expect(useAppStore.getState().hexes[hex.id]).toBeUndefined();
    expectIndexMatches(graph());
  });

  it('setHexFieldValues merges into the existing bag', () => {
    const hex = useAppStore.getState().placeHex({ q: 0, r: 0 });
    useAppStore.getState().setHexFieldValues(hex.id, { a: '1' });
    useAppStore.getState().setHexFieldValues(hex.id, { b: '2' });
    const values = useAppStore.getState().hexes[hex.id]?.fieldValues;
    expect(values).toMatchObject({ a: '1', b: '2' });
  });

  it('setHexFieldValues is a no-op for an unknown hex', () => {
    useAppStore.getState().setHexFieldValues('nope', { a: '1' });
    expect(useAppStore.getState().hexes.nope).toBeUndefined();
  });
});

describe('store — persistence helpers', () => {
  beforeEach(reset);

  it('replaceAll swaps state and rebuilds the index', () => {
    const field = useAppStore
      .getState()
      .addField({ label: 'A', type: 'short_text', required: false });
    const snapshot = {
      template: { fields: [{ ...field }] },
      hexes: [
        {
          id: 'h1',
          coordinate: { q: 2, r: 2 },
          neighbors: [null, null, null, null, null, null] as [null, null, null, null, null, null],
          fieldValues: {},
          createdAt: 1,
        },
      ],
    };

    useAppStore.getState().replaceAll(snapshot);
    expect(useAppStore.getState().hexes.h1?.coordinate).toEqual({ q: 2, r: 2 });
    expect(useAppStore.getState().index.get({ q: 2, r: 2 })).toBe('h1');
    expectIndexMatches(graph());
  });

  it('serialize returns a template + hex-array snapshot', () => {
    useAppStore.getState().addField({ label: 'A', type: 'short_text', required: false });
    const hex = useAppStore.getState().placeHex({ q: 1, r: 1 });
    const snapshot = useAppStore.getState().serialize();
    expect(snapshot.template.fields).toHaveLength(1);
    expect(snapshot.hexes.map((h) => h.id)).toContain(hex.id);
  });
});

describe('store — autosave subscriber', () => {
  beforeEach(() => {
    useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
    localStorage.clear();
  });

  it('autosaves after addField', () => {
    const spy = vi.spyOn(localStorageModule, 'saveToLocalStorage');
    useAppStore.getState().addField({ label: 'X', type: 'short_text', required: false });
    expect(spy).toHaveBeenCalled();
    const call = spy.mock.calls[0]?.[0];
    expect(call?.template.fields).toHaveLength(1);
    spy.mockRestore();
  });

  it('autosaves after placeHex', () => {
    const spy = vi.spyOn(localStorageModule, 'saveToLocalStorage');
    useAppStore.getState().placeHex({ q: 0, r: 0 });
    expect(spy).toHaveBeenCalled();
    const call = spy.mock.calls[0]?.[0];
    expect(call?.hexes).toHaveLength(1);
    spy.mockRestore();
  });

  it('autosaves after deleteHex', () => {
    const hex = useAppStore.getState().placeHex({ q: 0, r: 0 });
    const spy = vi.spyOn(localStorageModule, 'saveToLocalStorage');
    useAppStore.getState().deleteHex(hex.id);
    expect(spy).toHaveBeenCalled();
    const call = spy.mock.calls[0]?.[0];
    expect(call?.hexes).toHaveLength(0);
    spy.mockRestore();
  });

  it('autosaves after setHexFieldValues', () => {
    const hex = useAppStore.getState().placeHex({ q: 0, r: 0 });
    const spy = vi.spyOn(localStorageModule, 'saveToLocalStorage');
    useAppStore.getState().setHexFieldValues(hex.id, { 'f-1': 'value' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('file load (replaceAll) triggers autosave with the loaded data', () => {
    const spy = vi.spyOn(localStorageModule, 'saveToLocalStorage');
    useAppStore.getState().replaceAll({
      template: { fields: [{ id: 'f', label: 'Name', type: 'short_text', required: false, order: 0 }] },
      hexes: [],
    });
    expect(spy).toHaveBeenCalled();
    const call = spy.mock.calls[0]?.[0];
    expect(call?.template.fields).toHaveLength(1);
    spy.mockRestore();
  });
});
