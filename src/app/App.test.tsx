import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import * as localStorageModule from '../features/persistence/localStorage';
import App from './App';

vi.mock('../features/persistence/localStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof localStorageModule>();
  return { ...actual };
});

describe('App router', () => {
  beforeEach(() => {
    vi.spyOn(localStorageModule, 'loadFromLocalStorage').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows onboarding when localStorage is empty', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start mapping/i })).toBeInTheDocument();
    });
  });

  it('shows map when localStorage has saved state', async () => {
    vi.spyOn(localStorageModule, 'loadFromLocalStorage').mockReturnValue({
      template: { fields: [] },
      hexes: [],
    });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /hex map/i })).toBeInTheDocument();
    });
  });
});
