import { useEffect, useState } from 'react';
import { useAppStore } from '../state/store';
import { loadFromLocalStorage } from '../features/persistence/localStorage';
import { OnboardingScreen } from './OnboardingScreen';
import { MapScreen } from './MapScreen';
import './App.css';

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<'onboarding' | 'map' | null>(null);
  const replaceAll = useAppStore((state) => state.replaceAll);

  useEffect(() => {
    const saved = loadFromLocalStorage();
    if (saved !== null) {
      replaceAll(saved);
      setScreen('map');
    } else {
      setScreen('onboarding');
    }
  }, [replaceAll]);

  if (screen === 'map') {
    return (
      <MapScreen
        onNewCampaign={() => {
          setScreen('onboarding');
        }}
      />
    );
  }
  if (screen === 'onboarding') {
    return (
      <OnboardingScreen
        onStartMapping={() => {
          setScreen('map');
        }}
      />
    );
  }
  return <></>;
}

export default App;
