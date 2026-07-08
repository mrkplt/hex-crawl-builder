import type { NodeProps } from '@xyflow/react';
import { HexTile } from './HexTile';
import type { HexFlowNode } from './nodes';

/**
 * React Flow custom node wrapper. Thin adapter: maps node `data` onto the
 * presentational HexTile, which owns the shape, marker, and click.
 */
export function HexNode({ data }: NodeProps<HexFlowNode>): React.JSX.Element {
  return (
    <HexTile
      size={data.size}
      incomplete={data.incomplete}
      label={data.label}
      onClick={() => {
        data.onHexClick(data.hexId);
      }}
    />
  );
}
