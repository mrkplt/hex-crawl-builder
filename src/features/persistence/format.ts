import type { Field, Hex } from '../../domain/types';
import type { CampaignSnapshot } from '../../state/store';

/**
 * The whole campaign round-trips through one versioned JSON file (client-only,
 * no backend). `version` and the reserved templateId/campaignId hooks (plan 01)
 * let a future multi-template/campaign format detect and migrate old files
 * rather than break on them.
 */
export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  template: { fields: Field[] };
  hexes: Hex[];
}

/**
 * Build the SaveFile from an in-memory snapshot. The coordinate index is derived
 * (plan 01) and deliberately NOT serialized — it is rebuilt on load.
 */
export function toSaveFile(snapshot: CampaignSnapshot): SaveFile {
  return {
    version: SAVE_VERSION,
    template: snapshot.template,
    hexes: snapshot.hexes,
  };
}
