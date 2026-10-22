import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useSettings, type UseSettings } from '@/hooks/useSettings';
import { useSpeech, type UseSpeech } from '@/hooks/useSpeech';

interface AppContextValue extends UseSettings {
  speech: UseSpeech;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Reglages + synthese vocale partages par toute l'application. */
export function AppProvider({ children }: { children: ReactNode }) {
  const { settings, loading, update } = useSettings();
  const speech = useSpeech(settings);

  // Les reglages d'affichage s'appliquent a la racine du document.
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(settings.fontScale));
    document.documentElement.classList.toggle('calm', settings.calmMode);
    document.documentElement.lang = 'fr';
  }, [settings.fontScale, settings.calmMode]);

  return (
    <AppContext.Provider value={{ settings, loading, update, speech }}>{children}</AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp doit etre utilise dans AppProvider');
  return value;
}
