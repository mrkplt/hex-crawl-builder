import { describe, it, expect } from 'vitest';
import { FIELD_TYPES, FIELD_TYPE_LIST, getFieldTypeDef } from './fieldTypes';
import type { FieldType } from './types';

describe('field-type registry', () => {
  it('registers both v1 types', () => {
    expect(Object.keys(FIELD_TYPES).sort()).toEqual(['long_text', 'short_text']);
    expect(FIELD_TYPE_LIST).toHaveLength(2);
  });

  it('each def has an empty default value and a blank-detecting isEmpty', () => {
    for (const def of FIELD_TYPE_LIST) {
      expect(def.defaultValue).toBe('');
      expect(def.isEmpty(def.defaultValue)).toBe(true);
      expect(def.isEmpty('   ')).toBe(true);
      expect(def.isEmpty('x')).toBe(false);
    }
  });

  it('getFieldTypeDef returns the matching entry', () => {
    expect(getFieldTypeDef('short_text').id).toBe('short_text');
    expect(getFieldTypeDef('long_text').id).toBe('long_text');
  });

  it('is a lookup, not a switch: consumers read by key structurally', () => {
    // A hypothetical third type would only need a new entry — consumers that
    // read FIELD_TYPES[type] need no edits. Prove the access pattern is total.
    const types: FieldType[] = ['short_text', 'long_text'];
    for (const type of types) {
      expect(FIELD_TYPES[type]).toBeDefined();
      expect(FIELD_TYPES[type].id).toBe(type);
    }
  });
});
