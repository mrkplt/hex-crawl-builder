import { useState } from 'react';
import { HexMap } from '../features/map/HexMap';
import { HexFocusView } from '../features/hex-edit/HexFocusView';
import { PersistenceBar } from '../features/persistence/PersistenceBar';
import { TemplateEditorModal } from '../features/template/TemplateEditorModal';
import './App.css';

function App(): React.JSX.Element {
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>Hex Crawl Builder</h1>
        <button type="button" onClick={() => { setTemplateOpen(true); }}>
          Template
        </button>
        <PersistenceBar />
      </header>
      <main className="app-shell__body">
        <HexMap onHexClick={setSelectedHexId} />
      </main>
      <TemplateEditorModal
        isOpen={templateOpen}
        onClose={() => { setTemplateOpen(false); }}
      />
      {selectedHexId !== null ? (
        <HexFocusView
          hexId={selectedHexId}
          onClose={() => {
            setSelectedHexId(null);
          }}
        />
      ) : null}
    </div>
  );
}

export default App;
