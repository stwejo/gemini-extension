import { db, DEFAULT_SETTINGS, type SettingsRow } from '../db';

export async function getSettings(): Promise<SettingsRow> {
  const row = await db.settings.get(1);
  return row ?? DEFAULT_SETTINGS;
}

export async function updateSettings(
  patch: Partial<Omit<SettingsRow, 'id'>>,
): Promise<SettingsRow> {
  const current = await getSettings();
  const next: SettingsRow = { ...current, ...patch, id: 1, updatedAt: Date.now() };
  await db.settings.put(next);
  return next;
}
