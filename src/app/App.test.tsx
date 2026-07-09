import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App shell', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /hex crawl builder/i }),
    ).toBeInTheDocument();
  });

  it('renders the map surface', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /hex map/i })).toBeInTheDocument();
  });

  it('does not render the permanent template side panel', () => {
    render(<App />);
    expect(screen.queryByRole('region', { name: /template builder/i })).not.toBeInTheDocument();
  });

  it('does not render the "click a hex to edit" placeholder', () => {
    render(<App />);
    expect(screen.queryByRole('region', { name: /hex edit form/i })).not.toBeInTheDocument();
  });

  it('renders a Template button in the header', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^template$/i })).toBeInTheDocument();
  });

  it('opens the template editor modal when Template is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^template$/i }));
    expect(screen.getByRole('dialog', { name: /template editor/i })).toBeInTheDocument();
  });

  it('closes the template modal when Done is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^template$/i }));
    await user.click(screen.getByRole('button', { name: /done/i }));
    expect(screen.queryByRole('dialog', { name: /template editor/i })).not.toBeInTheDocument();
  });
});
