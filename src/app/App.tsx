import './App.css';

/**
 * App shell. Lays out the three product surfaces named in the product vision
 * as placeholder regions; each is filled in by a later plan:
 *  - Template builder  → plan 02
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
        <section className="app-shell__panel" aria-label="Template builder">
          <h2>Template</h2>
          <p>Define the per-hex checklist schema.</p>
        </section>
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
