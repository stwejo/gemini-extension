import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, type SettingsRow } from '@/db/db';
import { getSettings, updateSettings } from '@/db/repositories/settings';

export interface UseSettings {
  settings: SettingsRow;
  /** true tant que la lecture d'IndexedDB n'a pas abouti. */
  loading: boolean;
  update: (patch: Partial<Omit<SettingsRow, 'id'>>) => Promise<void>;
}

/** Reglages, relus automatiquement a chaque modification. */
export function useSettings(): UseSettings {
  const settings = useLiveQuery(getSettings, [], undefined);
  return {
    settings: settings ?? DEFAULT_SETTINGS,
    loading: settings === undefined,
    update: async (patch) => {
      await updateSettings(patch);
    },
  };
}
