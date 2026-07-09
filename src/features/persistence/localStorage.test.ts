import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveToLocalStorage, loadFromLocalStorage, clearLocalStorage } from './localStorage';
import type { CampaignSnapshot } from '../../state/store';
import type { Hex } from '../../domain/types';

const emptySnapshot: CampaignSnapshot = {
  template: { fields: [] },
  hexes: [],
};

const hexA: Hex = {
  id: 'hex-a',
  coordinate: { q: 0, r: 0 },
  neighbors: [null, null, null, null, null, null],
  fieldValues: { 'field-1': 'forest' },
  createdAt: 1000,
};

const snapshotWithData: CampaignSnapshot = {
  template: {
    fields: [
      { id: 'field-1', label: 'Terrain', type: 'short_text', required: true, order: 0 },
    ],
  },
  hexes: [hexA],
};

describe('saveToLocalStorage / loadFromLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a snapshot with fields and hexes', () => {
    saveToLocalStorage(snapshotWithData);
    const result = loadFromLocalStorage();
    expect(result).not.toBeNull();
    expect(result?.template.fields).toHaveLength(1);
    expect(result?.template.fields[0]?.label).toBe('Terrain');
    expect(result?.hexes).toHaveLength(1);
    expect(result?.hexes[0]?.id).toBe('hex-a');
    expect(result?.hexes[0]?.fieldValues['field-1']).toBe('forest');
  });

  it('round-trips an empty snapshot', () => {
    saveToLocalStorage(emptySnapshot);
    const result = loadFromLocalStorage();
    expect(result).not.toBeNull();
    expect(result?.template.fields).toHaveLength(0);
    expect(result?.hexes).toHaveLength(0);
  });

  it('returns null when nothing is stored', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('hex-crawl-builder:campaign', 'not-json{{{');
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null on wrong version', () => {
    localStorage.setItem(
      'hex-crawl-builder:campaign',
      JSON.stringify({ version: 999, template: { fields: [] }, hexes: [] }),
    );
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null when template key is missing', () => {
    localStorage.setItem(
      'hex-crawl-builder:campaign',
      JSON.stringify({ version: 1, hexes: [] }),
    );
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null when hexes key is missing', () => {
    localStorage.setItem(
      'hex-crawl-builder:campaign',
      JSON.stringify({ version: 1, template: { fields: [] } }),
    );
    expect(loadFromLocalStorage()).toBeNull();
  });
});

describe('clearLocalStorage', () => {
  it('causes a subsequent load to return null', () => {
    saveToLocalStorage(snapshotWithData);
    clearLocalStorage();
    expect(loadFromLocalStorage()).toBeNull();
  });
});

describe('saveToLocalStorage error handling', () => {
  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveToLocalStorage(emptySnapshot)).not.toThrow();
    vi.restoreAllMocks();
  });
});
