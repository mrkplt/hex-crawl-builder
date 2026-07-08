import { useRef, useState } from 'react';
import { useAppStore } from '../../state/store';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { toSaveFile } from './format';
import { downloadSaveFile } from './download';
import { parseSaveFile } from './parse';
import './PersistenceBar.css';

/**
 * Save / Load toolbar. Save serializes the campaign to a downloaded JSON file.
 * Load is gated by a confirmation modal (it replaces all in-memory state),
 * then validates the picked file before applying it via replaceAll.
 */
export function PersistenceBar(): React.JSX.Element {
  const serialize = useAppStore((state) => state.serialize);
  const replaceAll = useAppStore((state) => state.replaceAll);

  const [confirmingLoad, setConfirmingLoad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (): void => {
    downloadSaveFile(toSaveFile(serialize()));
  };

  const handleConfirmLoad = (): void => {
    setConfirmingLoad(false);
    fileInputRef.current?.click();
  };

  const handleFileChosen = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-picking the same file later
    if (file === undefined) {
      return;
    }
    void file.text().then((text) => {
      const result = parseSaveFile(text);
      if (result.ok) {
        replaceAll({ template: result.value.template, hexes: result.value.hexes });
        setError(null);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="persistence-bar">
      <button type="button" onClick={handleSave}>
        Save
      </button>
      <button
        type="button"
        onClick={() => {
          setConfirmingLoad(true);
        }}
      >
        Load
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="persistence-bar__file"
        aria-label="Load campaign file"
        onChange={handleFileChosen}
      />

      {error !== null ? (
        <span className="persistence-bar__error" role="alert">
          {error}
        </span>
      ) : null}

      {confirmingLoad ? (
        <ConfirmDialog
          title="Load a campaign file?"
          message="Loading replaces the current template, hexes, and neighbor graph, which are only kept in memory until you Save. Continue?"
          confirmLabel="Choose file…"
          cancelLabel="Cancel"
          onConfirm={handleConfirmLoad}
          onCancel={() => {
            setConfirmingLoad(false);
          }}
        />
      ) : null}
    </div>
  );
}
