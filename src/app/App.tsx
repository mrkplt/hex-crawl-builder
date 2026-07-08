import { TemplateEditor } from '../features/template/TemplateEditor';
import { HexMap } from '../features/map/HexMap';
import './App.css';

/**
 * App shell. Lays out the three product surfaces named in the product vision.
 * Template builder (plan 02) and hex map (plan 03) are live; the hex-edit
 * region is a placeholder wired up in plan 04.
 */
function App(): React.JSX.Element {
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
          <HexMap />
        </div>
        <section className="app-shell__panel" aria-label="Hex edit form">
          <h2>Hex</h2>
          <p>Fill out the selected hex.</p>
        </section>
      </main>
    </div>
  );
}

export default App;
