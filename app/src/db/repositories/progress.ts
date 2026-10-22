import { db, type LessonProgressRow } from '../db';
import type { Level } from '@/content/types';

export interface LessonRef {
  lessonId: string;
  unitId: string;
  level: Level;
}

export async function getLessonProgress(lessonId: string): Promise<LessonProgressRow | undefined> {
  return db.lessonProgress.get(lessonId);
}

export async function getAllLessonProgress(): Promise<LessonProgressRow[]> {
  return db.lessonProgress.toArray();
}

/** Memorise l'avancement dans la lecon pour pouvoir la reprendre. */
export async function saveLessonStep(ref: LessonRef, stepIndex: number): Promise<void> {
  const existing = await db.lessonProgress.get(ref.lessonId);
  await db.lessonProgress.put({
    lessonId: ref.lessonId,
    unitId: ref.unitId,
    level: ref.level,
    status: existing?.status === 'termine' ? 'termine' : 'en-cours',
    bestScore: existing?.bestScore ?? 0,
    attempts: existing?.attempts ?? 0,
    lastStepIndex: stepIndex,
    updatedAt: Date.now(),
  });
}

/** Marque la lecon comme terminee et conserve le meilleur score. */
export async function completeLesson(ref: LessonRef, score: number): Promise<void> {
  const existing = await db.lessonProgress.get(ref.lessonId);
  await db.lessonProgress.put({
    lessonId: ref.lessonId,
    unitId: ref.unitId,
    level: ref.level,
    status: 'termine',
    bestScore: Math.max(existing?.bestScore ?? 0, Math.round(score)),
    attempts: (existing?.attempts ?? 0) + 1,
    lastStepIndex: existing?.lastStepIndex ?? 0,
    updatedAt: Date.now(),
  });
}

/** Remet une lecon a zero (bouton "recommencer"). */
export async function resetLesson(lessonId: string): Promise<void> {
  await db.lessonProgress.delete(lessonId);
}
