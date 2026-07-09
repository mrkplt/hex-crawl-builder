import { useState } from 'react';
import { useAppStore } from '../state/store';
import { HexMap } from '../features/map/HexMap';
import { HexFocusView } from '../features/hex-edit/HexFocusView';
import { PersistenceBar } from '../features/persistence/PersistenceBar';
import { TemplateEditorModal } from '../features/template/TemplateEditorModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { clearLocalStorage } from '../features/persistence/localStorage';

export interface MapScreenProps {
  onNewCampaign: () => void;
}

export function MapScreen({ onNewCampaign }: MapScreenProps): React.JSX.Element {
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [confirmingNewCampaign, setConfirmingNewCampaign] = useState(false);
  const replaceAll = useAppStore((state) => state.replaceAll);

  const handleNewCampaignConfirm = (): void => {
    clearLocalStorage();
    replaceAll({ template: { fields: [] }, hexes: [] });
    onNewCampaign();
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>Hex Crawl Builder</h1>
        <button
          type="button"
          onClick={() => {
            setTemplateOpen(true);
          }}
        >
          Template
        </button>
        <PersistenceBar />
        <button
          type="button"
          onClick={() => {
            setConfirmingNewCampaign(true);
          }}
        >
          New Campaign
        </button>
      </header>
      <main className="app-shell__body">
        <HexMap onHexClick={setSelectedHexId} />
      </main>
      <TemplateEditorModal
        isOpen={templateOpen}
        onClose={() => {
          setTemplateOpen(false);
        }}
      />
      {selectedHexId !== null ? (
        <HexFocusView
          hexId={selectedHexId}
          onClose={() => {
            setSelectedHexId(null);
          }}
        />
      ) : null}
      {confirmingNewCampaign ? (
        <ConfirmDialog
          title="Start a new campaign?"
          message="This will permanently discard your current template and all placed hexes. This cannot be undone."
          confirmLabel="New Campaign"
          cancelLabel="Cancel"
          onConfirm={handleNewCampaignConfirm}
          onCancel={() => {
            setConfirmingNewCampaign(false);
          }}
        />
      ) : null}
    </div>
  );
}
