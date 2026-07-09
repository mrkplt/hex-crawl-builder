import type { CampaignSnapshot } from '../../state/store';
import { SAVE_VERSION, toSaveFile } from './format';
import { migrate } from './parse';

const STORAGE_KEY = 'hex-crawl-builder:campaign';

export function saveToLocalStorage(snapshot: CampaignSnapshot): void {
  try {
    const payload = JSON.stringify(toSaveFile(snapshot));
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Fail soft: quota exceeded, storage disabled, etc. App continues in-memory.
  }
}

/**
 * Read and validate the stored campaign. Returns the snapshot on success, null
 * if nothing is stored, the payload is corrupt, wrong version, or storage is
 * unavailable.
 */
export function loadFromLocalStorage(): CampaignSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const result = migrate(JSON.parse(raw));
    if (!result.ok) return null;
    const { value } = result;
    if (value.version !== SAVE_VERSION) return null;
    return { template: value.template, hexes: value.hexes };
  } catch {
    return null;
  }
}

export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fail soft.
  }
}
