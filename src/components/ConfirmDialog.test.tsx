import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Delete hex?"
      message="This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('renders the title and message', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: /delete hex/i })).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('confirms via the confirm button', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels via the cancel button', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels when the backdrop is clicked but not when the dialog body is', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.click(screen.getByRole('dialog').parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledTimes(1); // unchanged — click did not bubble
  });

  it('uses default labels when none are provided', () => {
    render(
      <ConfirmDialog title="Proceed?" message="Sure?" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
