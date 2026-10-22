import { db, type AttemptRow } from '../db';

/** Enregistre chaque tentative : base des statistiques et des erreurs frequentes. */
export async function logAttempt(attempt: Omit<AttemptRow, 'id' | 'ts'>): Promise<void> {
  await db.attempts.add({ ...attempt, ts: Date.now() });
}

export async function getAttemptsForLesson(lessonId: string): Promise<AttemptRow[]> {
  return db.attempts.where('lessonId').equals(lessonId).toArray();
}

/** Etiquettes d'erreur les plus frequentes, les plus fautives d'abord. */
export async function getFrequentErrorTags(limit = 5): Promise<{ tag: string; count: number }[]> {
  const rows = await db.attempts.filter((a) => !a.correct).toArray();
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.errorTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
