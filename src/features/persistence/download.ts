import type { SaveFile } from './format';

/**
 * Trigger a browser download of the save file (Blob + object URL + anchor
 * click) — the client-only pattern, no backend.
 */
export function downloadSaveFile(file: SaveFile, filename = 'hex-crawl.json'): void {
  const json = JSON.stringify(file, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
