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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../state/store';
import type { GraphState } from '../../domain/graph';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HexNode } from './HexNode';
import { HIDDEN_EDGE_STYLE, buildHexEdges, buildHexNodes, type HexFlowNode } from './nodes';
import { hexDimensions, hexPolygonPoints, pixelToAxial } from './geometry';
import { decidePaletteDrop, isOverTrash, resolveDragStop } from './placement';
import { isOccupied } from '../../domain/graph';
import './HexMap.css';

/** Hex circumradius in flow pixels. React Flow's own zoom scales this visually. */
const HEX_SIZE = 40;
/** MIME payload marking a drag that originates from the palette "New hex" tile. */
const PALETTE_MIME = 'application/hex-crawl';
/** MIME payload carrying the id of an existing hex being dragged (move/delete). */
const HEX_MIME = 'application/hex-crawl-move';

const nodeTypes = { hex: HexNode };

export interface HexMapProps {
  /** Fired when a placed hex is clicked. Plan 04 wires this to the edit form. */
  onHexClick?: (hexId: string) => void;
}

/** Build an off-screen SVG element to use as the drag image for the palette tile. */
function buildDragImage(size: number): SVGSVGElement {
  const { width, height } = hexDimensions(size);
  const pad = 4;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(width + pad));
  svg.setAttribute('height', String(height + pad));
  svg.setAttribute(
    'viewBox',
    `${-(width + pad) / 2} ${-(height + pad) / 2} ${width + pad} ${height + pad}`,
  );
  svg.style.position = 'fixed';
  svg.style.top = '-9999px';
  svg.style.left = '-9999px';
  svg.style.pointerEvents = 'none';

  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', hexPolygonPoints(size));
  poly.setAttribute('fill', '#cdddec');
  poly.setAttribute('stroke', '#5a78a0');
  poly.setAttribute('stroke-width', '2');
  svg.appendChild(poly);
  return svg;
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
  const [isDragging, setIsDragging] = useState(false);
  // The id of the hex currently being dragged (null when dragging the palette
  // tile or nothing). Drives the source hex's dimmed ghost styling.
  const [draggingHexId, setDraggingHexId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<'not-adjacent' | 'occupied' | null>(null);
  const rejectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragImageRef = useRef<SVGSVGElement | null>(null);

  const currentGraphState = (): GraphState => ({
    hexes: useAppStore.getState().hexes,
    index: useAppStore.getState().index,
  });

  const clearDragImage = useCallback((): void => {
    if (dragImageRef.current) {
      dragImageRef.current.remove();
      dragImageRef.current = null;
    }
  }, []);

  /** Attach a hex-shaped ghost image to the drag, centered under the pointer. */
  const attachDragGhost = useCallback((event: React.DragEvent): void => {
    const img = buildDragImage(HEX_SIZE);
    document.body.appendChild(img);
    dragImageRef.current = img;
    const { width, height } = hexDimensions(HEX_SIZE);
    event.dataTransfer.setDragImage(img, (width + 4) / 2, (height + 4) / 2);
  }, []);

  const flashRejection = useCallback(
    (reason: 'not-adjacent' | 'occupied'): void => {
      if (rejectionTimerRef.current !== null) {
        clearTimeout(rejectionTimerRef.current);
      }
      setRejectionReason(reason);
      rejectionTimerRef.current = setTimeout(() => {
        setRejectionReason(null);
        rejectionTimerRef.current = null;
      }, 800);
    },
    [],
  );

  // ── Hex drag (move / delete via the HTML5 drag API) ──────────────────────────
  // React Flow's native node drag is disabled; a hex is dragged like the palette
  // tile. The source hex dims and a ghost follows the pointer; the node never
  // moves, so a cancelled/rejected drag leaves it exactly in place.
  const onHexDragStart = useCallback(
    (hexId: string, event: React.DragEvent): void => {
      setIsDragging(true);
      setDraggingHexId(hexId);
      event.dataTransfer.setData(HEX_MIME, hexId);
      event.dataTransfer.effectAllowed = 'move';
      attachDragGhost(event);
    },
    [attachDragGhost],
  );

  const onHexDragEnd = useCallback((): void => {
    setIsDragging(false);
    setDraggingHexId(null);
    clearDragImage();
  }, [clearDragImage]);

  const handleHexDrop = useCallback(
    (hexId: string, event: React.DragEvent): void => {
      const pointerScreen = { x: event.clientX, y: event.clientY };
      // Trash hit-test first — it needs only screen coords, so a drop on the
      // trash resolves to delete without depending on the flow-space transform.
      if (isOverTrash(pointerScreen, trashRef.current?.getBoundingClientRect() ?? null)) {
        setPendingDelete(hexId);
        return;
      }
      const state = currentGraphState();
      const flowPoint = screenToFlowPosition(pointerScreen);
      const outcome = resolveDragStop({
        hexId,
        pointerScreen,
        nodePixel: flowPoint,
        trashRect: trashRef.current?.getBoundingClientRect() ?? null,
        state,
        size: HEX_SIZE,
      });

      if (outcome.kind === 'delete') {
        setPendingDelete(outcome.hexId);
      } else if (outcome.kind === 'move') {
        moveHex(outcome.hexId, outcome.destination);
      } else {
        const destination = pixelToAxial(flowPoint, HEX_SIZE);
        const occupantId = state.index.get(destination);
        if (occupantId !== undefined && occupantId !== hexId) {
          flashRejection('occupied');
        } else {
          flashRejection('not-adjacent');
        }
      }
    },
    [screenToFlowPosition, moveHex, flashRejection],
  );

  // ── Palette drag (place a new hex) ───────────────────────────────────────────
  const onPaletteDragStart = useCallback(
    (event: React.DragEvent): void => {
      setIsDragging(true);
      setDraggingHexId(null);
      event.dataTransfer.setData(PALETTE_MIME, 'new-hex');
      event.dataTransfer.effectAllowed = 'copy';
      attachDragGhost(event);
    },
    [attachDragGhost],
  );

  const onPaletteDragEnd = useCallback((): void => {
    setIsDragging(false);
    clearDragImage();
  }, [clearDragImage]);

  const handlePaletteDrop = useCallback(
    (event: React.DragEvent): void => {
      // Palette drop on the trash zone is a no-op — nothing placed or deleted.
      if (
        isOverTrash(
          { x: event.clientX, y: event.clientY },
          trashRef.current?.getBoundingClientRect() ?? null,
        )
      ) {
        return;
      }
      const flowPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const coordinate = pixelToAxial(flowPoint, HEX_SIZE);
      const state = currentGraphState();
      const decision = decidePaletteDrop(state, coordinate);
      if (decision.kind === 'place') {
        placeHex(decision.coordinate);
      } else if (isOccupied(state, coordinate)) {
        flashRejection('occupied');
      } else {
        flashRejection('not-adjacent');
      }
    },
    [screenToFlowPosition, placeHex, flashRejection],
  );

  // ── Canvas drop dispatch ─────────────────────────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      setIsDragging(false);
      setDraggingHexId(null);
      clearDragImage();

      const movedHexId = event.dataTransfer.getData(HEX_MIME);
      if (movedHexId !== '') {
        handleHexDrop(movedHexId, event);
        return;
      }
      if (event.dataTransfer.getData(PALETTE_MIME) === 'new-hex') {
        handlePaletteDrop(event);
      }
    },
    [clearDragImage, handleHexDrop, handlePaletteDrop],
  );

  // Dropping directly on the trash zone (which sits in the toolbar, outside the
  // canvas drop area) needs its own handler: a hex drop here opens the delete
  // confirmation; a palette drop here is a no-op.
  const onTrashDrop = useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      setDraggingHexId(null);
      clearDragImage();
      const movedHexId = event.dataTransfer.getData(HEX_MIME);
      if (movedHexId !== '') {
        setPendingDelete(movedHexId);
      }
    },
    [clearDragImage],
  );

  const nodeCallbacks = useMemo(
    () => ({ onHexClick: handleHexClick, onHexDragStart, onHexDragEnd, draggingId: draggingHexId }),
    [handleHexClick, onHexDragStart, onHexDragEnd, draggingHexId],
  );

  const resetFromStore = useCallback(() => {
    setNodes(buildHexNodes(hexes, template, HEX_SIZE, nodeCallbacks));
    setEdges(buildHexEdges(hexes));
  }, [hexes, template, nodeCallbacks, setNodes, setEdges]);

  useEffect(() => {
    resetFromStore();
  }, [resetFromStore]);

  const trashClass = isDragging
    ? 'hex-map__trash hex-map__trash--active'
    : 'hex-map__trash';

  // Palette tile SVG dimensions
  const { width: pWidth, height: pHeight } = hexDimensions(HEX_SIZE);
  const pPad = 8;

  return (
    <section className="hex-map" aria-label="Hex map">
      <div className="hex-map__toolbar">
        <div
          className="hex-map__palette-tile"
          draggable
          aria-label="New hex — drag onto the map"
          onDragStart={onPaletteDragStart}
          onDragEnd={onPaletteDragEnd}
        >
          <svg
            className="hex-map__palette-svg"
            width={pWidth + pPad}
            height={pHeight + pPad}
            viewBox={`${-(pWidth + pPad) / 2} ${-(pHeight + pPad) / 2} ${pWidth + pPad} ${pHeight + pPad}`}
            aria-hidden="true"
            focusable="false"
          >
            <polygon points={hexPolygonPoints(HEX_SIZE)} className="hex-tile__shape" />
          </svg>
          <span className="hex-map__palette-label">New hex</span>
        </div>
        <div
          ref={trashRef}
          className={trashClass}
          aria-label="Delete zone"
          onDragOver={onDragOver}
          onDrop={onTrashDrop}
        >
          🗑 Trash
        </div>
        <span className="hex-map__version">v{__APP_VERSION__}</span>
      </div>

      <div
        className={
          rejectionReason !== null
            ? `hex-map__canvas hex-map__canvas--rejected-${rejectionReason}`
            : 'hex-map__canvas'
        }
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          nodesDraggable={false}
          nodeOrigin={[0.5, 0.5]}
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
