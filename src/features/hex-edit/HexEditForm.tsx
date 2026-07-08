import { useMemo, useState } from 'react';
import { useAppStore } from '../../state/store';
import { orphanedEntries } from '../../domain/orphans';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { getFieldInput } from './fieldInputs';
import { hasUnsavedChanges, initialFieldValues } from './buffer';
import './HexEditForm.css';

export interface HexEditFormProps {
  hexId: string;
  onClose: () => void;
}

/**
 * Modal opened when a placed hex is clicked. Renders one input per live-template
 * field (registry-driven, in order), buffers edits locally, and commits to the
 * store only on explicit Save. Orphaned values appear read-only in a collapsed
 * "Legacy fields" section.
 */
export function HexEditForm({ hexId, onClose }: HexEditFormProps): React.JSX.Element | null {
  const hex = useAppStore((state) => state.hexes[hexId]);
  const template = useAppStore((state) => state.template);
  const setHexFieldValues = useAppStore((state) => state.setHexFieldValues);

  const orderedFields = useMemo(
    () => [...template.fields].sort((a, b) => a.order - b.order),
    [template.fields],
  );

  const [buffer, setBuffer] = useState<Record<string, string>>(() =>
    hex ? initialFieldValues(hex, template) : {},
  );
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  if (hex === undefined) {
    return null;
  }

  const orphans = orphanedEntries(hex, template);
  const dirty = hasUnsavedChanges(buffer, hex, template);

  const handleFieldChange = (fieldId: string, value: string): void => {
    setBuffer((previous) => ({ ...previous, [fieldId]: value }));
  };

  const handleSave = (): void => {
    setHexFieldValues(hexId, buffer);
    onClose();
  };

  const handleClose = (): void => {
    if (dirty) {
      setConfirmingDiscard(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="hex-edit__backdrop" role="presentation" onClick={handleClose}>
      <div
        className="hex-edit"
        role="dialog"
        aria-modal="true"
        aria-label="Edit hex"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 className="hex-edit__title">Edit hex</h2>

        {orderedFields.length === 0 ? (
          <p className="hex-edit__empty">
            No fields defined yet. Add fields in the Template editor first.
          </p>
        ) : (
          <div className="hex-edit__fields">
            {orderedFields.map((field) => {
              const Input = getFieldInput(field.type);
              return (
                <div className="hex-edit__field" key={field.id}>
                  <label className="hex-edit__label" htmlFor={field.id}>
                    {field.label}
                    {field.required ? (
                      <span className="hex-edit__required" aria-hidden="true">
                        {' *'}
                      </span>
                    ) : null}
                  </label>
                  <Input
                    id={field.id}
                    label={field.label}
                    required={field.required}
                    value={buffer[field.id] ?? ''}
                    onChange={(value) => {
                      handleFieldChange(field.id, value);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {orphans.length > 0 ? (
          <details className="hex-edit__legacy">
            <summary>Legacy fields ({orphans.length})</summary>
            <p className="hex-edit__legacy-note">
              Values kept from fields no longer in the template. Read-only.
            </p>
            <ul className="hex-edit__legacy-list">
              {orphans.map((entry) => (
                <li key={entry.id} className="hex-edit__legacy-item">
                  <span className="hex-edit__legacy-id">{entry.id}</span>
                  <input
                    className="hex-edit__input"
                    aria-label={`Legacy value for ${entry.id}`}
                    value={entry.value}
                    readOnly
                  />
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <div className="hex-edit__actions">
          <button type="button" onClick={handleClose}>
            Close
          </button>
          <button type="button" className="hex-edit__save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>

      {confirmingDiscard ? (
        <ConfirmDialog
          title="Discard changes?"
          message="You have unsaved edits. Close without saving?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => {
            setConfirmingDiscard(false);
            onClose();
          }}
          onCancel={() => {
            setConfirmingDiscard(false);
          }}
        />
      ) : null}
    </div>
  );
}
