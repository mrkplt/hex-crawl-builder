import { useState } from 'react';
import { TemplateEditor } from '../features/template/TemplateEditor';
import { HexMap } from '../features/map/HexMap';
import { HexEditForm } from '../features/hex-edit/HexEditForm';
import './App.css';

/**
 * App shell. Lays out the three product surfaces named in the product vision:
 * the template builder (plan 02), the hex map (plan 03), and the hex edit form
 * (plan 04), which opens as a modal when a placed hex is clicked.
 */
function App(): React.JSX.Element {
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>Hex Crawl Builder</h1>
      </header>
      <main className="app-shell__body">
        <div className="app-shell__panel">
          <TemplateEditor />
        </div>
        <div className="app-shell__panel app-shell__panel--map">
          <HexMap onHexClick={setSelectedHexId} />
        </div>
        <section className="app-shell__panel" aria-label="Hex edit form">
          <h2>Hex</h2>
          <p>Click a hex on the map to edit its fields.</p>
        </section>
      </main>
      {selectedHexId !== null ? (
        <HexEditForm
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
