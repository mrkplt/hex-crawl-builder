import { TemplateEditor } from '../features/template/TemplateEditor';
import './App.css';

/**
 * App shell. Lays out the three product surfaces named in the product vision.
 * Template builder is live (plan 02); the map and hex-edit regions remain
 * placeholders filled in by later plans:
 *  - Hex map / grid    → plan 03
 *  - Hex edit form     → plan 04
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
        <section className="app-shell__panel app-shell__panel--map" aria-label="Hex map">
          <h2>Map</h2>
          <p>Place and arrange hexes on the grid.</p>
        </section>
        <section className="app-shell__panel" aria-label="Hex edit form">
          <h2>Hex</h2>
          <p>Fill out the selected hex.</p>
        </section>
      </main>
    </div>
  );
}

export default App;
