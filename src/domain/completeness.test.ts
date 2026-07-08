import { describe, it, expect } from 'vitest';
import { isFieldEmpty, isIncomplete } from './completeness';
import { makeHex, makeField, makeTemplate } from '../test/factories';

describe('isFieldEmpty', () => {
  it('treats a missing value as empty', () => {
    expect(isFieldEmpty(undefined, 'short_text')).toBe(true);
  });

  it('treats blank strings as empty and non-blank as filled', () => {
    expect(isFieldEmpty('', 'short_text')).toBe(true);
    expect(isFieldEmpty('  ', 'long_text')).toBe(true);
    expect(isFieldEmpty('forest', 'short_text')).toBe(false);
  });
});

describe('isIncomplete', () => {
  it('is complete when there are no required fields', () => {
    const template = makeTemplate([makeField({ id: 'a', required: false })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: {} });
    expect(isIncomplete(hex, template)).toBe(false);
  });

  it('is incomplete when a required field is empty', () => {
    const template = makeTemplate([makeField({ id: 'a', required: true })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: '' } });
    expect(isIncomplete(hex, template)).toBe(true);
  });

  it('is complete when every required field is filled', () => {
    const template = makeTemplate([makeField({ id: 'a', required: true })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: 'value' } });
    expect(isIncomplete(hex, template)).toBe(false);
  });

  it('ignores empty optional fields', () => {
    const template = makeTemplate([
      makeField({ id: 'a', required: false }),
      makeField({ id: 'b', required: true }),
    ]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: '', b: 'x' } });
    expect(isIncomplete(hex, template)).toBe(false);
  });

  it('flips to incomplete when a new required field is added, without touching the hex', () => {
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: 'x' } });
    const before = makeTemplate([makeField({ id: 'a', required: true })]);
    expect(isIncomplete(hex, before)).toBe(false);

    // Same hex, live template gains a new required field.
    const after = makeTemplate([
      makeField({ id: 'a', required: true }),
      makeField({ id: 'b', required: true }),
    ]);
    expect(isIncomplete(hex, after)).toBe(true);
  });
});
