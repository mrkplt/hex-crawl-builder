import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NodeProps } from '@xyflow/react';
import { HexNode } from './HexNode';
import type { HexFlowNode, HexNodeData } from './nodes';

/** Minimal NodeProps for the wrapper, which only reads `data`. */
function nodeProps(data: HexNodeData): NodeProps<HexFlowNode> {
  return { data } as unknown as NodeProps<HexFlowNode>;
}

describe('HexNode', () => {
  it('maps node data onto a HexTile and forwards clicks with the hex id', async () => {
    const user = userEvent.setup();
    const onHexClick = vi.fn();
    render(
      <HexNode
        {...nodeProps({
          hexId: 'h1',
          label: 'Hex at 1,2',
          size: 40,
          incomplete: true,
          onHexClick,
          onHexDragStart: vi.fn(),
          onHexDragEnd: vi.fn(),
          dragging: false,
        })}
      />,
    );

    expect(screen.getByRole('img', { name: /incomplete/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hex at 1,2' }));
    expect(onHexClick).toHaveBeenCalledWith('h1');
  });
});
