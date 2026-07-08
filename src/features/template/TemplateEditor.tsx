import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useAppStore } from '../../state/store';
import { FieldRow } from './FieldRow';
import { fieldOrderAfterDragEnd } from './reorder';
import './TemplateEditor.css';

/**
 * The Template editor surface: add / edit / delete / reorder the fields that
 * define the per-hex schema. Wired entirely through the store so schema edits
 * update completeness everywhere live.
 */
export function TemplateEditor(): React.JSX.Element {
  const fields = useAppStore((state) => state.template.fields);
  const addField = useAppStore((state) => state.addField);
  const reorderFields = useAppStore((state) => state.reorderFields);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    const nextOrder = fieldOrderAfterDragEnd(
      fields.map((field) => field.id),
      String(active.id),
      over === null ? null : String(over.id),
    );
    if (nextOrder !== null) {
      reorderFields(nextOrder);
    }
  };

  const handleAdd = (): void => {
    addField({ label: 'New field', type: 'short_text', required: false });
  };

  return (
    <section className="template-editor" aria-label="Template builder">
      <header className="template-editor__header">
        <h2>Template</h2>
        <button type="button" onClick={handleAdd}>
          Add field
        </button>
      </header>

      {fields.length === 0 ? (
        <p className="template-editor__empty">
          No fields yet. Add your first field to define what each hex tracks.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="template-editor__list">
              {fields.map((field) => (
                <FieldRow key={field.id} field={field} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
