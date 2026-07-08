import { describe, it, expect } from 'vitest';
import { orphanedEntries } from './orphans';
import { makeHex, makeField, makeTemplate } from '../test/factories';

describe('orphanedEntries', () => {
  it('returns only ids absent from the template', () => {
    const template = makeTemplate([makeField({ id: 'a' })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: 'kept', gone: 'orphan' } });
    expect(orphanedEntries(hex, template)).toEqual([{ id: 'gone', value: 'orphan' }]);
  });

  it('is empty when values and template are in sync', () => {
    const template = makeTemplate([makeField({ id: 'a' }), makeField({ id: 'b' })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: '1', b: '2' } });
    expect(orphanedEntries(hex, template)).toEqual([]);
  });

  it('is empty for a hex with no stored values', () => {
    const template = makeTemplate([makeField({ id: 'a' })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: {} });
    expect(orphanedEntries(hex, template)).toEqual([]);
  });
});
