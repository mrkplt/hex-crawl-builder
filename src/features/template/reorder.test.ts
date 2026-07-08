import { describe, it, expect } from 'vitest';
import { fieldOrderAfterDragEnd, moveField } from './reorder';

describe('moveField', () => {
  const ids = ['a', 'b', 'c', 'd'];

  it('moves first to last', () => {
    expect(moveField(ids, 'a', 'd')).toEqual(['b', 'c', 'd', 'a']);
  });

  it('moves last to first', () => {
    expect(moveField(ids, 'd', 'a')).toEqual(['d', 'a', 'b', 'c']);
  });

  it('moves a middle item forward', () => {
    expect(moveField(ids, 'b', 'c')).toEqual(['a', 'c', 'b', 'd']);
  });

  it('returns the list unchanged when active equals over', () => {
    expect(moveField(ids, 'b', 'b')).toBe(ids);
  });

  it('returns the list unchanged for unknown ids', () => {
    expect(moveField(ids, 'x', 'a')).toBe(ids);
    expect(moveField(ids, 'a', 'x')).toBe(ids);
  });
});

describe('fieldOrderAfterDragEnd', () => {
  const ids = ['a', 'b', 'c'];

  it('returns null when dropped outside any target', () => {
    expect(fieldOrderAfterDragEnd(ids, 'a', null)).toBeNull();
  });

  it('returns null when dropped back onto itself', () => {
    expect(fieldOrderAfterDragEnd(ids, 'b', 'b')).toBeNull();
  });

  it('returns the reordered ids for a real move', () => {
    expect(fieldOrderAfterDragEnd(ids, 'a', 'c')).toEqual(['b', 'c', 'a']);
  });
});
