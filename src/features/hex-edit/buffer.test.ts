import { describe, it, expect } from 'vitest';
import { hasUnsavedChanges, initialFieldValues } from './buffer';
import { makeField, makeHex, makeTemplate } from '../../test/factories';

describe('initialFieldValues', () => {
  it('pre-fills from stored values and defaults for absent fields', () => {
    const template = makeTemplate([
      makeField({ id: 'a', type: 'short_text' }),
      makeField({ id: 'b', type: 'long_text' }),
    ]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: 'stored' } });
    expect(initialFieldValues(hex, template)).toEqual({ a: 'stored', b: '' });
  });

  it('ignores stored values whose field is not in the template', () => {
    const template = makeTemplate([makeField({ id: 'a' })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: 'x', orphan: 'y' } });
    expect(initialFieldValues(hex, template)).toEqual({ a: 'x' });
  });
});

describe('hasUnsavedChanges', () => {
  const template = makeTemplate([makeField({ id: 'a' })]);
  const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: 'stored' } });

  it('is false when the buffer matches stored values', () => {
    expect(hasUnsavedChanges({ a: 'stored' }, hex, template)).toBe(false);
  });

  it('is true when a value differs', () => {
    expect(hasUnsavedChanges({ a: 'edited' }, hex, template)).toBe(true);
  });
});
