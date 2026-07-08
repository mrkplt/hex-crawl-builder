import { render, screen } from '@testing-library/react';
import App from './App';

describe('App shell', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /hex crawl builder/i }),
    ).toBeInTheDocument();
  });

  it('renders the three product surfaces', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /template builder/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /hex map/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /hex edit form/i })).toBeInTheDocument();
  });
});
