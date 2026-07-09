import { useState } from 'react';
import { useAppStore } from '../state/store';
import { TemplateEditorModal } from '../features/template/TemplateEditorModal';
import './OnboardingScreen.css';

export interface OnboardingScreenProps {
  onStartMapping: () => void;
}

export function OnboardingScreen({ onStartMapping }: OnboardingScreenProps): React.JSX.Element {
  const [templateOpen, setTemplateOpen] = useState(false);
  const fieldCount = useAppStore((state) => state.template.fields.length);
  const canStart = fieldCount > 0;

  return (
    <div className="onboarding">
      <h1 className="onboarding__title">Hex Crawl Builder</h1>
      <p className="onboarding__description">
        Before you can place hexes on the map, you need to define a template — the checklist of
        fields that every hex will carry. Start by creating your template, then begin mapping.
      </p>
      <div className="onboarding__actions">
        <button
          type="button"
          onClick={() => {
            setTemplateOpen(true);
          }}
        >
          Create Template
        </button>
        <button type="button" onClick={onStartMapping} disabled={!canStart}>
          Start Mapping
        </button>
      </div>
      <TemplateEditorModal
        isOpen={templateOpen}
        onClose={() => {
          setTemplateOpen(false);
        }}
      />
    </div>
  );
}
