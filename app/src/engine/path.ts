import { LEVELS, type Lesson, type Level, type Unit } from '@/content/schema';
import type { LessonProgressRow } from '@/db/db';

export type LessonStatus = 'termine' | 'en-cours' | 'disponible' | 'verrouille';

export interface PathLesson {
  lesson: Lesson;
  status: LessonStatus;
  bestScore: number;
}

export interface PathUnit {
  unit: Unit;
  unlocked: boolean;
  lessons: PathLesson[];
  /** Nombre de lecons terminees. */
  done: number;
  total: number;
}

export interface PathLevel {
  level: Level;
  units: PathUnit[];
  done: number;
  total: number;
}

/**
 * Construit le parcours : quelles unites et quelles lecons sont accessibles.
 *
 * Regle de la phase 1 : une unite s'ouvre quand toutes les lecons de l'unite
 * precedente sont terminees, et une lecon s'ouvre quand la precedente de la
 * meme unite est terminee. Le test de fin d'unite (seuil 80 %) viendra
 * remplacer cette condition en phase 3.
 */
export function buildPath(course: Unit[], progress: LessonProgressRow[]): PathLevel[] {
  const byLesson = new Map(progress.map((row) => [row.lessonId, row]));
  const levels: PathLevel[] = [];
  let previousUnitComplete: boolean = true;

  // Les unites s'enchainent par niveau (A0 puis A1...), puis par ordre interne.
  const ordered = [...course].sort(
    (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.order - b.order,
  );

  for (const unit of ordered) {
    const unitUnlocked: boolean = previousUnitComplete;
    const lessons = [...unit.lessons].sort((a, b) => a.order - b.order);
    const pathLessons: PathLesson[] = [];
    let previousLessonDone = true;

    for (const lesson of lessons) {
      const row = byLesson.get(lesson.id);
      const isDone = row?.status === 'termine';
      let status: LessonStatus;
      if (!unitUnlocked) status = isDone ? 'termine' : 'verrouille';
      else if (isDone) status = 'termine';
      else if (!previousLessonDone) status = 'verrouille';
      else if (row) status = 'en-cours';
      else status = 'disponible';

      pathLessons.push({ lesson, status, bestScore: row?.bestScore ?? 0 });
      previousLessonDone = isDone;
    }

    const done = pathLessons.filter((l) => l.status === 'termine').length;
    const pathUnit: PathUnit = {
      unit,
      unlocked: unitUnlocked,
      lessons: pathLessons,
      done,
      total: pathLessons.length,
    };

    const existing = levels.find((l) => l.level === unit.level);
    if (existing) existing.units.push(pathUnit);
    else levels.push({ level: unit.level, units: [pathUnit], done: 0, total: 0 });

    previousUnitComplete = unitUnlocked && done === pathLessons.length;
  }

  for (const level of levels) {
    level.done = level.units.reduce((sum, unit) => sum + unit.done, 0);
    level.total = level.units.reduce((sum, unit) => sum + unit.total, 0);
  }
  return levels;
}

/** Premiere lecon a faire : celle en cours, sinon la premiere disponible. */
export function findNextLesson(levels: PathLevel[]): { unit: Unit; lesson: Lesson } | null {
  for (const level of levels) {
    for (const unit of level.units) {
      const inProgress = unit.lessons.find((l) => l.status === 'en-cours');
      if (inProgress) return { unit: unit.unit, lesson: inProgress.lesson };
    }
  }
  for (const level of levels) {
    for (const unit of level.units) {
      const available = unit.lessons.find((l) => l.status === 'disponible');
      if (available) return { unit: unit.unit, lesson: available.lesson };
    }
  }
  return null;
}
