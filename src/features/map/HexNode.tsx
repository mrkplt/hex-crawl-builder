import type { NodeProps } from '@xyflow/react';
import { HexTile } from './HexTile';
import type { HexFlowNode } from './nodes';

/**
 * React Flow custom node wrapper. Thin adapter: maps node `data` onto the
 * presentational HexTile. The tile is HTML5-draggable (hex-flower model) — React
 * Flow's own node drag is disabled (`draggable: false` in buildHexNode), so the
 * node position never moves; dragging shows a ghost and dims the source.
 */
export function HexNode({ data }: NodeProps<HexFlowNode>): React.JSX.Element {
  return (
    <HexTile
      size={data.size}
      incomplete={data.incomplete}
      label={data.label}
      dragging={data.dragging}
      onClick={() => {
        data.onHexClick(data.hexId);
      }}
      onDragStart={(event) => {
        data.onHexDragStart(data.hexId, event);
      }}
      onDragEnd={data.onHexDragEnd}
    />
  );
}
