import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A minimal accessible confirmation modal. Used for the one destructive action
 * in the app — deleting a hex.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <div className="confirm-dialog__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 className="confirm-dialog__title">{title}</h2>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-dialog__confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
