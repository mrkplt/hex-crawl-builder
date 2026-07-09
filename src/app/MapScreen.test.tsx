import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import * as localStorageModule from '../features/persistence/localStorage';
import { MapScreen } from './MapScreen';

vi.mock('../features/persistence/localStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof localStorageModule>();
  return { ...actual };
});

function renderMapScreen(onNewCampaign = vi.fn()): void {
  render(<MapScreen onNewCampaign={onNewCampaign} />);
}

describe('MapScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the app title', () => {
    renderMapScreen();
    expect(screen.getByRole('heading', { level: 1, name: /hex crawl builder/i })).toBeInTheDocument();
  });

  it('renders the hex map', () => {
    renderMapScreen();
    expect(screen.getByRole('region', { name: /hex map/i })).toBeInTheDocument();
  });

  it('renders Template, Save, Load, and New Campaign buttons', () => {
    renderMapScreen();
    expect(screen.getByRole('button', { name: /^template$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^load$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new campaign/i })).toBeInTheDocument();
  });

  it('opens template editor modal when Template is clicked', async () => {
    const user = userEvent.setup();
    renderMapScreen();
    await user.click(screen.getByRole('button', { name: /^template$/i }));
    expect(screen.getByRole('dialog', { name: /template editor/i })).toBeInTheDocument();
  });

  it('closes template editor modal when Done is clicked', async () => {
    const user = userEvent.setup();
    renderMapScreen();
    await user.click(screen.getByRole('button', { name: /^template$/i }));
    await user.click(screen.getByRole('button', { name: /done/i }));
    expect(screen.queryByRole('dialog', { name: /template editor/i })).not.toBeInTheDocument();
  });

  it('shows confirm dialog when New Campaign is clicked', async () => {
    const user = userEvent.setup();
    renderMapScreen();
    await user.click(screen.getByRole('button', { name: /new campaign/i }));
    expect(screen.getByRole('dialog', { name: /start a new campaign/i })).toBeInTheDocument();
  });

  it('dismisses confirm dialog on Cancel', async () => {
    const user = userEvent.setup();
    renderMapScreen();
    await user.click(screen.getByRole('button', { name: /new campaign/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog', { name: /start a new campaign/i })).not.toBeInTheDocument();
  });

  it('calls onNewCampaign after confirming new campaign', async () => {
    const user = userEvent.setup();
    vi.spyOn(localStorageModule, 'clearLocalStorage').mockReturnValue(undefined);
    const onNewCampaign = vi.fn();
    renderMapScreen(onNewCampaign);
    await user.click(screen.getByRole('button', { name: /new campaign/i }));
    // Dialog opens: two "New Campaign" buttons now present — first is header, second is dialog confirm
    const buttons = screen.getAllByRole('button', { name: /new campaign/i });
    const confirmButton = buttons[buttons.length - 1];
    if (confirmButton === undefined) throw new Error('confirm button not found');
    await user.click(confirmButton);
    expect(onNewCampaign).toHaveBeenCalledOnce();
  });
});
