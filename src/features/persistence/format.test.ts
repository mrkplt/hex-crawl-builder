import { describe, it, expect } from 'vitest';
import { SAVE_VERSION, toSaveFile } from './format';
import { placeHex, type GraphState } from '../../domain/graph';
import { CoordinateIndex } from '../../domain/coordinates';
import { makeTemplate } from '../../test/factories';

describe('toSaveFile', () => {
  it('wraps a snapshot with the current version and excludes the coordinate index', () => {
    const state: GraphState = { hexes: {}, index: new CoordinateIndex() };
    const placed = placeHex(state, { q: 1, r: 1 }, makeTemplate([]));
    const snapshot = { template: makeTemplate([]), hexes: Object.values(placed.state.hexes) };

    const file = toSaveFile(snapshot);
    expect(file.version).toBe(SAVE_VERSION);
    expect(file.hexes).toHaveLength(1);
    expect(file).not.toHaveProperty('index');
    expect(JSON.stringify(file)).not.toContain('index');
  });
});
