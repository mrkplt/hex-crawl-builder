import { useEffect, useState } from 'react';
import { useAppStore } from '../../state/store';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { directionalNeighbors } from '../../domain/neighbors';
import { Direction } from '../../domain/directions';
import { neighborCoord } from '../../domain/coordinates';
import { HexEditFormBody } from './HexEditFormBody';
import { NeighborPanel } from './NeighborPanel';
import { hasUnsavedChanges, initialFieldValues } from './buffer';
import './HexFocusView.css';

export interface HexFocusViewProps {
  hexId: string;
  onClose: () => void;
}

type PendingAction = { kind: 'close' } | { kind: 'navigate'; targetId: string };

/** Right column, top → bottom. */
const RIGHT_COLUMN: readonly Direction[] = [Direction.NE, Direction.E, Direction.SE];
/** Left column, top → bottom. */
const LEFT_COLUMN: readonly Direction[] = [Direction.NW, Direction.W, Direction.SW];

/**
 * Evolves the hex edit modal into a focus view: the editable hex sits in the
 * center, flanked by its six directional neighbors (read-only). Owns the
 * buffer/dirty state and the discard guard so both Close and neighbor
 * navigation ("Edit") share the same confirm flow — navigation never saves,
 * and creating a hex from an empty edge never moves focus off the center.
 */
export function HexFocusView({ hexId, onClose }: HexFocusViewProps): React.JSX.Element | null {
  const hexes = useAppStore((state) => state.hexes);
  const template = useAppStore((state) => state.template);
  const setHexFieldValues = useAppStore((state) => state.setHexFieldValues);
  const placeHex = useAppStore((state) => state.placeHex);

  const [centerId, setCenterId] = useState(hexId);
  const centerHex = hexes[centerId];

  const [buffer, setBuffer] = useState<Record<string, string>>(() =>
    centerHex ? initialFieldValues(centerHex, template) : {},
  );
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (centerHex !== undefined) {
      setBuffer(initialFieldValues(centerHex, template));
    }
    // Reset the buffer only when navigating to a different center hex — live
    // edits flow through handleFieldChange, not this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  if (centerHex === undefined) {
    return null;
  }

  const dirty = hasUnsavedChanges(buffer, centerHex, template);
  const neighbors = directionalNeighbors(centerHex, hexes);

  const handleFieldChange = (fieldId: string, value: string): void => {
    setBuffer((previous) => ({ ...previous, [fieldId]: value }));
  };

  const handleSave = (): void => {
    setHexFieldValues(centerId, buffer);
    onClose();
  };

  const navigateTo = (targetId: string): void => {
    setCenterId(targetId);
  };

  const requestClose = (): void => {
    if (dirty) {
      setPending({ kind: 'close' });
    } else {
      onClose();
    }
  };

  const requestNavigate = (targetId: string): void => {
    if (dirty) {
      setPending({ kind: 'navigate', targetId });
    } else {
      navigateTo(targetId);
    }
  };

  const handleCreate = (direction: Direction): void => {
    placeHex(neighborCoord(centerHex.coordinate, direction));
  };

  const handleConfirmDiscard = (): void => {
    if (pending?.kind === 'close') {
      onClose();
    } else if (pending?.kind === 'navigate') {
      navigateTo(pending.targetId);
    }
    setPending(null);
  };

  return (
    <div className="hex-focus__backdrop" role="presentation" onClick={requestClose}>
      <div
        className="hex-focus"
        role="dialog"
        aria-modal="true"
        aria-label="Edit hex"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="hex-focus__column hex-focus__column--left">
          {LEFT_COLUMN.map((direction) => (
            <NeighborPanel
              key={`${centerId}-${direction}`}
              direction={direction}
              neighbor={neighbors[direction] ?? null}
              template={template}
              onCreate={handleCreate}
              onEdit={requestNavigate}
            />
          ))}
        </div>

        <div className="hex-focus__center">
          <HexEditFormBody
            hex={centerHex}
            template={template}
            buffer={buffer}
            onFieldChange={handleFieldChange}
            onSave={handleSave}
            onRequestClose={requestClose}
          />
        </div>

        <div className="hex-focus__column hex-focus__column--right">
          {RIGHT_COLUMN.map((direction) => (
            <NeighborPanel
              key={`${centerId}-${direction}`}
              direction={direction}
              neighbor={neighbors[direction] ?? null}
              template={template}
              onCreate={handleCreate}
              onEdit={requestNavigate}
            />
          ))}
        </div>
      </div>

      {pending !== null ? (
        <ConfirmDialog
          title="Discard changes?"
          message="You have unsaved edits. Discard them?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={handleConfirmDiscard}
          onCancel={() => {
            setPending(null);
          }}
        />
      ) : null}
    </div>
  );
}
