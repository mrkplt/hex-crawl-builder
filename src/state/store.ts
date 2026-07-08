import { create } from 'zustand';
import type { AxialCoord, Field, FieldType, Hex, Template } from '../domain/types';
import { CoordinateIndex, buildIndex } from '../domain/coordinates';
import {
  deleteHex as deleteHexOp,
  moveHex as moveHexOp,
  placeHex as placeHexOp,
  type GraphState,
} from '../domain/graph';

/** Input for creating a new template field (id and order are assigned). */
export interface FieldInput {
  label: string;
  type: FieldType;
  required: boolean;
}

/** Patch for an existing field; only provided keys are applied. */
export interface FieldPatch {
  label?: string;
  type?: FieldType;
  required?: boolean;
}

/** The serialized, index-free snapshot of a campaign. */
export interface CampaignSnapshot {
  template: Template;
  hexes: Hex[];
}

export interface AppState {
  template: Template;
  hexes: Record<string, Hex>;
  index: CoordinateIndex;

  // Template actions
  addField: (input: FieldInput) => Field;
  editField: (id: string, patch: FieldPatch) => void;
  deleteField: (id: string) => void;
  reorderFields: (orderedIds: string[]) => void;

  // Hex actions
  placeHex: (coordinate: AxialCoord) => Hex;
  moveHex: (hexId: string, destination: AxialCoord) => void;
  deleteHex: (hexId: string) => void;
  setHexFieldValues: (hexId: string, values: Record<string, string>) => void;

  // Bulk / persistence
  replaceAll: (snapshot: CampaignSnapshot) => void;
  serialize: () => CampaignSnapshot;
}

/** Apply a partial patch to a field without introducing `undefined` values. */
function applyFieldPatch(field: Field, patch: FieldPatch): Field {
  return {
    ...field,
    ...(patch.label !== undefined ? { label: patch.label } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.required !== undefined ? { required: patch.required } : {}),
  };
}

/**
 * The application store. It holds `{ template, hexes, index }` and wraps the
 * pure domain operations — it contains no domain logic of its own, so the hard
 * parts stay unit-testable without React.
 */
export const useAppStore = create<AppState>((set, get) => ({
  template: { fields: [] },
  hexes: {},
  index: new CoordinateIndex(),

  addField: (input) => {
    const fields = get().template.fields;
    const nextOrder = fields.reduce((max, field) => Math.max(max, field.order), -1) + 1;
    const field: Field = {
      id: crypto.randomUUID(),
      label: input.label,
      type: input.type,
      required: input.required,
      order: nextOrder,
    };
    set((state) => ({ template: { fields: [...state.template.fields, field] } }));
    return field;
  },

  editField: (id, patch) => {
    set((state) => ({
      template: {
        fields: state.template.fields.map((field) =>
          field.id === id ? applyFieldPatch(field, patch) : field,
        ),
      },
    }));
  },

  // Non-destructive: removing a field never touches any hex's stored value.
  deleteField: (id) => {
    set((state) => ({
      template: { fields: state.template.fields.filter((field) => field.id !== id) },
    }));
  },

  reorderFields: (orderedIds) => {
    set((state) => {
      const byId = new Map(state.template.fields.map((field) => [field.id, field]));
      const reordered: Field[] = [];
      // Order is the final sequential position, so skipped/unknown ids never
      // leave gaps.
      for (const id of orderedIds) {
        const field = byId.get(id);
        if (field !== undefined) {
          reordered.push({ ...field, order: reordered.length });
          byId.delete(id);
        }
      }
      // Preserve any ids not named in orderedIds, appended in their prior order.
      for (const field of byId.values()) {
        reordered.push({ ...field, order: reordered.length });
      }
      return { template: { fields: reordered } };
    });
  },

  placeHex: (coordinate) => {
    const graphState: GraphState = { hexes: get().hexes, index: get().index };
    const { state, hex } = placeHexOp(graphState, coordinate, get().template);
    set({ hexes: state.hexes, index: state.index });
    return hex;
  },

  moveHex: (hexId, destination) => {
    const graphState: GraphState = { hexes: get().hexes, index: get().index };
    const next = moveHexOp(graphState, hexId, destination);
    set({ hexes: next.hexes, index: next.index });
  },

  deleteHex: (hexId) => {
    const graphState: GraphState = { hexes: get().hexes, index: get().index };
    const next = deleteHexOp(graphState, hexId);
    set({ hexes: next.hexes, index: next.index });
  },

  setHexFieldValues: (hexId, values) => {
    set((state) => {
      const hex = state.hexes[hexId];
      if (hex === undefined) {
        return state;
      }
      const updated: Hex = { ...hex, fieldValues: { ...hex.fieldValues, ...values } };
      return { hexes: { ...state.hexes, [hexId]: updated } };
    });
  },

  replaceAll: (snapshot) => {
    const hexes: Record<string, Hex> = {};
    for (const hex of snapshot.hexes) {
      hexes[hex.id] = hex;
    }
    set({ template: snapshot.template, hexes, index: buildIndex(snapshot.hexes) });
  },

  serialize: () => {
    const state = get();
    return {
      template: state.template,
      hexes: Object.values(state.hexes),
    };
  },
}));
