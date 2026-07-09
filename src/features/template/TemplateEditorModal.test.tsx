import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditorModal } from './TemplateEditorModal';
import { useAppStore } from '../../state/store';
import { CoordinateIndex } from '../../domain/coordinates';

function reset(): void {
  useAppStore.setState({ template: { fields: [] }, hexes: {}, index: new CoordinateIndex() });
}

describe('TemplateEditorModal', () => {
  beforeEach(reset);

  it('renders nothing when isOpen is false', () => {
    render(<TemplateEditorModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/add your first field/i)).not.toBeInTheDocument();
  });

  it('renders the editor when isOpen is true', () => {
    render(<TemplateEditorModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: /template editor/i })).toBeInTheDocument();
    expect(screen.getByText(/add your first field/i)).toBeInTheDocument();
  });

  it('renders the Done button when open', () => {
    render(<TemplateEditorModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
  });

  it('calls onClose when Done is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TemplateEditorModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /done/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<TemplateEditorModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TemplateEditorModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TemplateEditorModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /add field/i }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('adding a field while open updates the store immediately (live edits)', async () => {
    const user = userEvent.setup();
    render(<TemplateEditorModal isOpen={true} onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /add field/i }));
    expect(useAppStore.getState().template.fields).toHaveLength(1);
  });
});
