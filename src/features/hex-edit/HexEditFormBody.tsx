import { useMemo } from 'react';
import type { Hex, Template } from '../../domain/types';
import { orphanedEntries } from '../../domain/orphans';
import { getFieldInput } from './fieldInputs';
import './HexEditFormBody.css';

export interface HexEditFormBodyProps {
  hex: Hex;
  template: Template;
  buffer: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
  onSave: () => void;
  onRequestClose: () => void;
}

/**
 * The editable center pane of the hex focus view: one input per live-template
 * field (registry-driven, in order), buffered by the parent and committed only
 * on explicit Save. Orphaned values appear read-only in a collapsed "Legacy
 * fields" section. Purely presentational — the buffer and the discard guard
 * live in HexFocusView so both Close and neighbor navigation can share them.
 */
export function HexEditFormBody({
  hex,
  template,
  buffer,
  onFieldChange,
  onSave,
  onRequestClose,
}: HexEditFormBodyProps): React.JSX.Element {
  const orderedFields = useMemo(
    () => [...template.fields].sort((a, b) => a.order - b.order),
    [template.fields],
  );
  const orphans = orphanedEntries(hex, template);

  return (
    <div className="hex-edit">
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
                    onFieldChange(field.id, value);
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
        <button type="button" onClick={onRequestClose}>
          Close
        </button>
        <button type="button" className="hex-edit__save" onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}
