import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../state/store';
import { OnboardingScreen } from './OnboardingScreen';
import { makeTemplate, makeField } from '../test/factories';

function renderOnboarding(onStartMapping = vi.fn()): void {
  render(<OnboardingScreen onStartMapping={onStartMapping} />);
}

describe('OnboardingScreen', () => {
  afterEach(() => {
    useAppStore.setState({ template: makeTemplate([]) });
  });

  it('renders the app title', () => {
    renderOnboarding();
    expect(screen.getByRole('heading', { level: 1, name: /hex crawl builder/i })).toBeInTheDocument();
  });

  it('renders Create Template and Start Mapping buttons', () => {
    renderOnboarding();
    expect(screen.getByRole('button', { name: /create template/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start mapping/i })).toBeInTheDocument();
  });

  it('Start Mapping is disabled when template has no fields', () => {
    renderOnboarding();
    expect(screen.getByRole('button', { name: /start mapping/i })).toBeDisabled();
  });

  it('Start Mapping is enabled when template has at least one field', () => {
    useAppStore.setState({ template: makeTemplate([makeField()]) });
    renderOnboarding();
    expect(screen.getByRole('button', { name: /start mapping/i })).toBeEnabled();
  });

  it('calls onStartMapping when Start Mapping is clicked', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ template: makeTemplate([makeField()]) });
    const onStartMapping = vi.fn();
    renderOnboarding(onStartMapping);
    await user.click(screen.getByRole('button', { name: /start mapping/i }));
    expect(onStartMapping).toHaveBeenCalledOnce();
  });

  it('opens the template editor modal when Create Template is clicked', async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await user.click(screen.getByRole('button', { name: /create template/i }));
    expect(screen.getByRole('dialog', { name: /template editor/i })).toBeInTheDocument();
  });

  it('closes the template editor modal when Done is clicked', async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await user.click(screen.getByRole('button', { name: /create template/i }));
    await user.click(screen.getByRole('button', { name: /done/i }));
    expect(screen.queryByRole('dialog', { name: /template editor/i })).not.toBeInTheDocument();
  });
});
