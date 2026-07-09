import { useEffect, useRef } from 'react';
import { TemplateEditor } from './TemplateEditor';
import './TemplateEditorModal.css';

export interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateEditorModal({ isOpen, onClose }: TemplateEditorModalProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="template-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Template editor"
    >
      <div className="template-modal-panel" ref={panelRef}>
        <div className="template-modal-panel__header">
          <h2>Edit Template</h2>
        </div>
        <div className="template-modal-panel__body">
          <TemplateEditor />
        </div>
        <div className="template-modal-panel__footer">
          <button type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
