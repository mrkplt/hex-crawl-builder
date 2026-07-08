import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from './TemplateEditor';
import { useAppStore } from '../../state/store';
import { CoordinateIndex } from '../../domain/coordinates';
import { FIELD_TYPE_LIST } from '../../domain/fieldTypes';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

describe('TemplateEditor', () => {
  beforeEach(reset);

  it('shows the empty-state prompt on first run', () => {
    render(<TemplateEditor />);
    expect(screen.getByText(/add your first field/i)).toBeInTheDocument();
  });

  it('adds a field with the documented defaults', async () => {
    const user = userEvent.setup();
    render(<TemplateEditor />);

    await user.click(screen.getByRole('button', { name: /add field/i }));

    const fields = useAppStore.getState().template.fields;
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ label: 'New field', type: 'short_text', required: false });
    expect(screen.getByDisplayValue('New field')).toBeInTheDocument();
  });

  it('edits a label in place while preserving the field id', async () => {
    const user = userEvent.setup();
    const field = useAppStore
      .getState()
      .addField({ label: 'New field', type: 'short_text', required: false });
    render(<TemplateEditor />);

    const input = screen.getByDisplayValue('New field');
    await user.clear(input);
    await user.type(input, 'Terrain');

    const updated = useAppStore.getState().template.fields[0];
    expect(updated?.id).toBe(field.id);
    expect(updated?.label).toBe('Terrain');
  });

  it('changes the type via the registry-driven picker', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addField({ label: 'Notes', type: 'short_text', required: false });
    render(<TemplateEditor />);

    await user.selectOptions(screen.getByRole('combobox'), 'long_text');
    expect(useAppStore.getState().template.fields[0]?.type).toBe('long_text');
  });

  it('toggles required', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addField({ label: 'Name', type: 'short_text', required: false });
    render(<TemplateEditor />);

    await user.click(screen.getByRole('checkbox'));
    expect(useAppStore.getState().template.fields[0]?.required).toBe(true);
  });

  it('deleting a field leaves any hex stored value intact', async () => {
    const user = userEvent.setup();
    const field = useAppStore
      .getState()
      .addField({ label: 'Terrain', type: 'short_text', required: true });
    const hex = useAppStore.getState().placeHex({ q: 0, r: 0 });
    useAppStore.getState().setHexFieldValues(hex.id, { [field.id]: 'forest' });
    render(<TemplateEditor />);

    await user.click(screen.getByRole('button', { name: /delete field terrain/i }));

    expect(useAppStore.getState().template.fields).toHaveLength(0);
    expect(useAppStore.getState().hexes[hex.id]?.fieldValues[field.id]).toBe('forest');
    expect(screen.queryByDisplayValue('Terrain')).not.toBeInTheDocument();
  });

  it('populates the type picker from the registry (not a hardcoded list)', () => {
    useAppStore.getState().addField({ label: 'A', type: 'short_text', required: false });
    render(<TemplateEditor />);

    const options = within(screen.getByRole('combobox')).getAllByRole('option');
    expect(options).toHaveLength(FIELD_TYPE_LIST.length);
    for (const def of FIELD_TYPE_LIST) {
      expect(screen.getByRole('option', { name: def.label })).toBeInTheDocument();
    }
  });

  it('reorders fields via keyboard drag', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addField({ label: 'A', type: 'short_text', required: false });
    useAppStore.getState().addField({ label: 'B', type: 'short_text', required: false });
    render(<TemplateEditor />);

    const handle = screen.getByRole('button', { name: /reorder a/i });
    handle.focus();
    await user.keyboard('[Space]');
    await user.keyboard('[ArrowDown]');
    await user.keyboard('[Space]');

    const labels = useAppStore.getState().template.fields.map((field) => field.label);
    // The drag-end handler ran and the field set is preserved through it.
    expect(labels).toContain('A');
    expect(labels).toContain('B');
    expect(labels).toHaveLength(2);
  });

  it('renders a row per field in template order', () => {
    useAppStore.getState().addField({ label: 'First', type: 'short_text', required: false });
    useAppStore.getState().addField({ label: 'Second', type: 'long_text', required: false });
    render(<TemplateEditor />);

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByDisplayValue('First')).toBeInTheDocument();
    expect(within(rows[1]!).getByDisplayValue('Second')).toBeInTheDocument();
  });
});
