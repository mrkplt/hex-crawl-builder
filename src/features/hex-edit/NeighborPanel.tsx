import { useState } from 'react';
import type { Hex, Template } from '../../domain/types';
import { Direction, DIRECTION_LABELS } from '../../domain/directions';
import { isIncomplete } from '../../domain/completeness';
import { orphanedEntries } from '../../domain/orphans';
import './NeighborPanel.css';

export interface NeighborPanelProps {
  direction: Direction;
  neighbor: Hex | null;
  template: Template;
  onCreate: (direction: Direction) => void;
  onEdit: (hexId: string) => void;
}

/**
 * One read-only neighbor panel in the hex focus view. An empty edge renders
 * as a single large `+` create button filling the panel; a populated edge
 * shows a collapsed, truncated preview that expands to full live fields plus
 * orphaned legacy values, with an Edit action that re-centers the view.
 * Purely presentational — mutation always flows through the two callbacks,
 * never the store.
 */
export function NeighborPanel({
  direction,
  neighbor,
  template,
  onCreate,
  onEdit,
}: NeighborPanelProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const label = DIRECTION_LABELS[direction];

  if (neighbor === null) {
    return (
      <button
        type="button"
        className="neighbor-panel neighbor-panel--empty"
        aria-label={`Create hex to the ${label}`}
        onClick={() => {
          onCreate(direction);
        }}
      >
        <span className="neighbor-panel__create-icon" aria-hidden="true">
          +
        </span>
      </button>
    );
  }

  const orderedFields = [...template.fields].sort((a, b) => a.order - b.order);
  const incomplete = isIncomplete(neighbor, template);
  const orphans = orphanedEntries(neighbor, template);
  const className = [
    'neighbor-panel',
    incomplete ? 'neighbor-panel--incomplete' : '',
    expanded ? 'neighbor-panel--expanded' : '',
  ]
    .filter((part) => part.length > 0)
    .join(' ');

  return (
    <div className={className}>
      <button
        type="button"
        className="neighbor-panel__toggle"
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((previous) => !previous);
        }}
      >
        <span className="neighbor-panel__toggle-label">
          <span className="neighbor-panel__disclosure" aria-hidden="true">
            ▶
          </span>
          <span className="neighbor-panel__direction">{label}</span>
        </span>
        {incomplete ? (
          <span className="neighbor-panel__marker" role="img" aria-label="Incomplete">
            !
          </span>
        ) : null}
      </button>

      <div className="neighbor-panel__preview">
        {orderedFields.map((field) => (
          <div className="neighbor-panel__field" key={field.id}>
            <span className="neighbor-panel__label">{field.label}:</span>
            <span className="neighbor-panel__value">{neighbor.fieldValues[field.id] ?? ''}</span>
          </div>
        ))}
      </div>

      {expanded ? (
        <>
          {orphans.length > 0 ? (
            <div className="neighbor-panel__legacy">
              <p className="neighbor-panel__legacy-note">Legacy fields ({orphans.length})</p>
              <ul className="neighbor-panel__legacy-list">
                {orphans.map((entry) => (
                  <li key={entry.id}>
                    {entry.id}: {entry.value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            className="neighbor-panel__edit"
            onClick={() => {
              onEdit(neighbor.id);
            }}
          >
            Edit
          </button>
        </>
      ) : null}
    </div>
  );
}
