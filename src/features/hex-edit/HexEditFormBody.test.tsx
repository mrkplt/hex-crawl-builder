import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HexEditFormBody } from './HexEditFormBody';
import { makeField, makeHex, makeTemplate } from '../../test/factories';

describe('HexEditFormBody', () => {
  it('renders one input per live field in order, pre-filled from the buffer', () => {
    const name = makeField({ label: 'Name', type: 'short_text', order: 0 });
    const notes = makeField({ label: 'Notes', type: 'long_text', order: 1 });
    const template = makeTemplate([name, notes]);
    const hex = makeHex({ q: 0, r: 0 });

    render(
      <HexEditFormBody
        hex={hex}
        template={template}
        buffer={{ [name.id]: 'Old Mill', [notes.id]: '' }}
        onFieldChange={() => {}}
        onSave={() => {}}
        onRequestClose={() => {}}
      />,
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.map((el) => el.getAttribute('aria-label'))).toEqual(['Name', 'Notes']);
    expect(screen.getByLabelText('Name')).toHaveValue('Old Mill');
    expect(screen.getByLabelText('Notes')).toHaveValue('');
  });

  it('renders short_text as an input and long_text as a textarea (registry-driven)', () => {
    const name = makeField({ label: 'Name', type: 'short_text', order: 0 });
    const notes = makeField({ label: 'Notes', type: 'long_text', order: 1 });
    const template = makeTemplate([name, notes]);
    const hex = makeHex({ q: 0, r: 0 });

    render(
      <HexEditFormBody
        hex={hex}
        template={template}
        buffer={{}}
        onFieldChange={() => {}}
        onSave={() => {}}
        onRequestClose={() => {}}
      />,
    );

    expect(screen.getByLabelText('Name').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA');
  });

  it('marks required fields informationally without blocking', () => {
    const name = makeField({ label: 'Name', type: 'short_text', order: 0, required: true });
    const notes = makeField({ label: 'Notes', type: 'long_text', order: 1, required: false });
    const template = makeTemplate([name, notes]);
    const hex = makeHex({ q: 0, r: 0 });

    render(
      <HexEditFormBody
        hex={hex}
        template={template}
        buffer={{}}
        onFieldChange={() => {}}
        onSave={() => {}}
        onRequestClose={() => {}}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-required', 'false');
  });

  it('calls onFieldChange as the user types (controlled, no internal buffer)', async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    const name = makeField({ label: 'Name', type: 'short_text', order: 0 });
    const template = makeTemplate([name]);
    const hex = makeHex({ q: 0, r: 0 });

    render(
      <HexEditFormBody
        hex={hex}
        template={template}
        buffer={{ [name.id]: '' }}
        onFieldChange={onFieldChange}
        onSave={() => {}}
        onRequestClose={() => {}}
      />,
    );

    await user.type(screen.getByLabelText('Name'), 'K');
    expect(onFieldChange).toHaveBeenCalledWith(name.id, 'K');
  });

  it('calls onFieldChange as the user types into a long_text (textarea) field', async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    const notes = makeField({ label: 'Notes', type: 'long_text', order: 0 });
    const template = makeTemplate([notes]);
    const hex = makeHex({ q: 0, r: 0 });

    render(
      <HexEditFormBody
        hex={hex}
        template={template}
        buffer={{ [notes.id]: '' }}
        onFieldChange={onFieldChange}
        onSave={() => {}}
        onRequestClose={() => {}}
      />,
    );

    await user.type(screen.getByLabelText('Notes'), 'A');
    expect(onFieldChange).toHaveBeenCalledWith(notes.id, 'A');
  });

  it('Save and Close call their respective callbacks', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onRequestClose = vi.fn();
    const template = makeTemplate([]);
    const hex = makeHex({ q: 0, r: 0 });

    render(
      <HexEditFormBody
        hex={hex}
        template={template}
        buffer={{}}
        onFieldChange={() => {}}
        onSave={onSave}
        onRequestClose={onRequestClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('omits the legacy section when there are no orphans', () => {
    const template = makeTemplate([makeField({ id: 'a', order: 0 })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: 'kept' } });

    render(
      <HexEditFormBody
        hex={hex}
        template={template}
        buffer={{}}
        onFieldChange={() => {}}
        onSave={() => {}}
        onRequestClose={() => {}}
      />,
    );

    expect(screen.queryByText(/legacy fields/i)).not.toBeInTheDocument();
  });

  it('shows orphaned values read-only in a legacy section', () => {
    const template = makeTemplate([makeField({ id: 'a', order: 0 })]);
    const hex = makeHex({ q: 0, r: 0 }, { fieldValues: { a: 'kept', ghost: 'preserved' } });

    render(
      <HexEditFormBody
        hex={hex}
        template={template}
        buffer={{}}
        onFieldChange={() => {}}
        onSave={() => {}}
        onRequestClose={() => {}}
      />,
    );

    expect(screen.getByText(/legacy fields/i)).toBeInTheDocument();
    const legacyInput = screen.getByLabelText('Legacy value for ghost');
    expect(legacyInput).toHaveValue('preserved');
    expect(legacyInput).toHaveAttribute('readonly');
  });
});
