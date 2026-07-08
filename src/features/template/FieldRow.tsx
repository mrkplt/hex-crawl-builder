import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Field, FieldType } from '../../domain/types';
import { FIELD_TYPE_LIST } from '../../domain/fieldTypes';
import { useAppStore } from '../../state/store';

interface FieldRowProps {
  field: Field;
}

/**
 * One editable field row: label, registry-driven type picker, required toggle,
 * delete, and a drag handle. All edits go through the store so completeness
 * updates live everywhere.
 */
export function FieldRow({ field }: FieldRowProps): React.JSX.Element {
  const editField = useAppStore((state) => state.editField);
  const deleteField = useAppStore((state) => state.deleteField);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="field-row">
      <button
        type="button"
        className="field-row__handle"
        aria-label={`Reorder ${field.label}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <label className="field-row__control">
        <span className="sr-only">Label</span>
        <input
          type="text"
          aria-label={`Label for field ${field.id}`}
          value={field.label}
          onChange={(event) => {
            editField(field.id, { label: event.target.value });
          }}
        />
      </label>

      <label className="field-row__control">
        <span className="sr-only">Type</span>
        <select
          aria-label={`Type for field ${field.id}`}
          value={field.type}
          onChange={(event) => {
            editField(field.id, { type: event.target.value as FieldType });
          }}
        >
          {FIELD_TYPE_LIST.map((def) => (
            <option key={def.id} value={def.id}>
              {def.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field-row__required">
        <input
          type="checkbox"
          aria-label={`Required for field ${field.id}`}
          checked={field.required}
          onChange={(event) => {
            editField(field.id, { required: event.target.checked });
          }}
        />
        Required
      </label>

      <button
        type="button"
        className="field-row__delete"
        aria-label={`Delete field ${field.label}`}
        onClick={() => {
          deleteField(field.id);
        }}
      >
        Delete
      </button>
    </li>
  );
}
