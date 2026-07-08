import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../state/store';
import type { GraphState } from '../../domain/graph';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HexNode } from './HexNode';
import { HIDDEN_EDGE_STYLE, buildHexEdges, buildHexNodes, type HexFlowNode } from './nodes';
import { pixelToAxial } from './geometry';
import { decidePaletteDrop, resolveDragStop } from './placement';
import './HexMap.css';

/** Hex circumradius in flow pixels. React Flow's own zoom scales this visually. */
const HEX_SIZE = 40;
const PALETTE_MIME = 'application/hex-crawl';

const nodeTypes = { hex: HexNode };

export interface HexMapProps {
  /** Fired when a placed hex is clicked. Plan 04 wires this to the edit form. */
  onHexClick?: (hexId: string) => void;
}

function HexMapInner({ onHexClick }: HexMapProps): React.JSX.Element {
  const hexesRecord = useAppStore((state) => state.hexes);
  const template = useAppStore((state) => state.template);
  const placeHex = useAppStore((state) => state.placeHex);
  const moveHex = useAppStore((state) => state.moveHex);
  const deleteHex = useAppStore((state) => state.deleteHex);

  const hexes = useMemo(() => Object.values(hexesRecord), [hexesRecord]);

  const handleHexClick = useCallback(
    (hexId: string) => {
      onHexClick?.(hexId);
    },
    [onHexClick],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<HexFlowNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const trashRef = useRef<HTMLDivElement>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Nodes/edges are derived from the store — the graph is the source of truth.
  // Re-syncing here also snaps rejected drags back to their stored positions.
  const resetFromStore = useCallback(() => {
    setNodes(buildHexNodes(hexes, template, HEX_SIZE, handleHexClick));
    setEdges(buildHexEdges(hexes));
  }, [hexes, template, handleHexClick, setNodes, setEdges]);

  useEffect(() => {
    resetFromStore();
  }, [resetFromStore]);

  const currentGraphState = (): GraphState => ({
    hexes: useAppStore.getState().hexes,
    index: useAppStore.getState().index,
  });

  const onDragOver = useCallback((event: React.DragEvent): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      if (event.dataTransfer.getData(PALETTE_MIME) !== 'new-hex') {
        return;
      }
      const flowPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const coordinate = pixelToAxial(flowPoint, HEX_SIZE);
      const decision = decidePaletteDrop(currentGraphState(), coordinate);
      if (decision.kind === 'place') {
        placeHex(decision.coordinate);
      }
    },
    [screenToFlowPosition, placeHex],
  );

  const onNodeDragStop: OnNodeDrag<HexFlowNode> = useCallback(
    (event, node) => {
      const pointerScreen =
        'clientX' in event ? { x: event.clientX, y: event.clientY } : { x: 0, y: 0 };
      const outcome = resolveDragStop({
        hexId: node.id,
        pointerScreen,
        nodePixel: node.position,
        trashRect: trashRef.current?.getBoundingClientRect() ?? null,
        state: currentGraphState(),
        size: HEX_SIZE,
      });

      if (outcome.kind === 'delete') {
        setPendingDelete(outcome.hexId);
        resetFromStore(); // snap back until the deletion is confirmed
      } else if (outcome.kind === 'move') {
        moveHex(outcome.hexId, outcome.destination);
      } else {
        resetFromStore(); // rejected → snap back
      }
    },
    [moveHex, resetFromStore],
  );

  const onPaletteDragStart = useCallback((event: React.DragEvent): void => {
    event.dataTransfer.setData(PALETTE_MIME, 'new-hex');
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <section className="hex-map" aria-label="Hex map">
      <div className="hex-map__toolbar">
        <div
          className="hex-map__palette-tile"
          draggable
          role="button"
          tabIndex={0}
          aria-label="New hex — drag onto the map"
          onDragStart={onPaletteDragStart}
        >
          + New hex
        </div>
        <div ref={trashRef} className="hex-map__trash" aria-label="Delete zone">
          🗑 Trash
        </div>
      </div>

      <div className="hex-map__canvas" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          defaultEdgeOptions={{ style: { ...HIDDEN_EDGE_STYLE }, selectable: false }}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {pendingDelete !== null ? (
        <ConfirmDialog
          title="Delete hex?"
          message="This removes the hex and all of its field values. This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => {
            deleteHex(pendingDelete);
            setPendingDelete(null);
          }}
          onCancel={() => {
            setPendingDelete(null);
          }}
        />
      ) : null}
    </section>
  );
}

/** The hex map surface. Wrapped in a provider so the canvas hooks work. */
export function HexMap(props: HexMapProps): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <HexMapInner {...props} />
    </ReactFlowProvider>
  );
}
