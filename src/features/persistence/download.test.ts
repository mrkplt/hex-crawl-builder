import { describe, it, expect, afterEach, vi } from 'vitest';
import { downloadSaveFile } from './download';
import { SAVE_VERSION } from './format';

describe('downloadSaveFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an object URL, clicks an anchor, and revokes the URL', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadSaveFile(
      { version: SAVE_VERSION, template: { fields: [] }, hexes: [] },
      'campaign.json',
    );

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    // The anchor is cleaned up after clicking.
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
