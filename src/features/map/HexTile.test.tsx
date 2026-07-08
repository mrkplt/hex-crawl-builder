import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HexTile } from './HexTile';

describe('HexTile', () => {
  it('renders the incomplete marker when incomplete', () => {
    render(<HexTile size={40} incomplete label="Hex at 0,0" onClick={() => {}} />);
    expect(screen.getByRole('img', { name: /incomplete/i })).toBeInTheDocument();
  });

  it('renders no marker when complete', () => {
    render(<HexTile size={40} incomplete={false} label="Hex at 0,0" onClick={() => {}} />);
    expect(screen.queryByRole('img', { name: /incomplete/i })).not.toBeInTheDocument();
  });

  it('calls onClick when activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<HexTile size={40} incomplete={false} label="Hex at 0,0" onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Hex at 0,0' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
