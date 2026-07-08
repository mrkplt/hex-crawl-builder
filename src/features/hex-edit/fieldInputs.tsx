/*
 * This is a field-type → input-component registry, not a component module, so
 * it intentionally mixes small input components with the lookup table. Fast
 * Refresh's "only export components" rule does not apply to a registry.
 */
/* eslint-disable react-refresh/only-export-components */
import type { FieldType } from '../../domain/types';

export interface FieldInputProps {
  id: string;
  label: string;
  value: string;
  required: boolean;
  onChange: (value: string) => void;
}

/**
 * Per-type input renderers, keyed by FieldType — a registry, not a switch (the
 * render slot the domain field-type registry deliberately left open). Adding a
 * future type's input is a new entry here, not an edit to the form. These live
 * in the feature layer (not src/domain) because they import React.
 */

function ShortTextInput({
  id,
  label,
  value,
  required,
  onChange,
}: FieldInputProps): React.JSX.Element {
  return (
    <input
      id={id}
      type="text"
      className="hex-edit__input"
      aria-label={label}
      aria-required={required}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

function LongTextInput({
  id,
  label,
  value,
  required,
  onChange,
}: FieldInputProps): React.JSX.Element {
  return (
    <textarea
      id={id}
      className="hex-edit__input hex-edit__input--long"
      aria-label={label}
      aria-required={required}
      rows={3}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

export const FIELD_INPUTS: Record<FieldType, (props: FieldInputProps) => React.JSX.Element> = {
  short_text: ShortTextInput,
  long_text: LongTextInput,
};

export function getFieldInput(type: FieldType): (props: FieldInputProps) => React.JSX.Element {
  return FIELD_INPUTS[type];
}
