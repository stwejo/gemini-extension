import { db, shiftDateKey, todayKey, type DailyActivityRow } from '../db';

export interface ActivityDelta {
  seconds?: number;
  exercisesDone?: number;
  reviewsDone?: number;
  lessonsDone?: number;
}

/** Cumule l'activite du jour (temps passe, exercices faits...). */
export async function addActivity(delta: ActivityDelta, date = todayKey()): Promise<void> {
  await db.transaction('rw', db.dailyActivity, async () => {
    const existing = await db.dailyActivity.get(date);
    await db.dailyActivity.put({
      date,
      seconds: (existing?.seconds ?? 0) + (delta.seconds ?? 0),
      exercisesDone: (existing?.exercisesDone ?? 0) + (delta.exercisesDone ?? 0),
      reviewsDone: (existing?.reviewsDone ?? 0) + (delta.reviewsDone ?? 0),
      lessonsDone: (existing?.lessonsDone ?? 0) + (delta.lessonsDone ?? 0),
    });
  });
}

export async function getActivity(date = todayKey()): Promise<DailyActivityRow> {
  const row = await db.dailyActivity.get(date);
  return row ?? { date, seconds: 0, exercisesDone: 0, reviewsDone: 0, lessonsDone: 0 };
}

export async function getRecentActivity(days = 30): Promise<DailyActivityRow[]> {
  const from = shiftDateKey(todayKey(), -days);
  return db.dailyActivity.where('date').aboveOrEqual(from).toArray();
}

/** Un jour compte dans la serie des qu'au moins un exercice y a ete fait. */
export function dayCounts(row: DailyActivityRow | undefined): boolean {
  if (!row) return false;
  return row.exercisesDone > 0 || row.reviewsDone > 0 || row.lessonsDone > 0;
}

/**
 * Serie de jours consecutifs, en partant d'aujourd'hui.
 * Si rien n'a encore ete fait aujourd'hui, la serie de la veille reste affichee
 * (elle n'est pas encore perdue).
 */
export function computeStreak(rows: DailyActivityRow[], today = todayKey()): number {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  let streak = 0;
  let cursor = today;
  if (!dayCounts(byDate.get(cursor))) {
    cursor = shiftDateKey(cursor, -1);
  }
  while (dayCounts(byDate.get(cursor))) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}
