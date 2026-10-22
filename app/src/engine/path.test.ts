import { describe, expect, it } from 'vitest';
import { getCourse } from '@/content';
import type { LessonProgressRow } from '@/db/db';
import { buildPath, findNextLesson } from './path';

const course = getCourse();

function progressFor(lessonIds: string[], status: 'termine' | 'en-cours' = 'termine'): LessonProgressRow[] {
  return lessonIds.map((lessonId) => ({
    lessonId,
    unitId: lessonId.split('-').slice(0, 2).join('-'),
    level: 'A0' as const,
    status,
    bestScore: status === 'termine' ? 90 : 0,
    attempts: 1,
    lastStepIndex: 2,
    updatedAt: 0,
  }));
}

describe('buildPath', () => {
  it('ouvre la premiere unite et verrouille les suivantes au depart', () => {
    const [levelA0] = buildPath(course, []);
    expect(levelA0.units[0].unlocked).toBe(true);
    expect(levelA0.units[1].unlocked).toBe(false);
  });

  it('n ouvre que la premiere lecon d une unite neuve', () => {
    const [levelA0] = buildPath(course, []);
    const statuses = levelA0.units[0].lessons.map((l) => l.status);
    expect(statuses[0]).toBe('disponible');
    expect(statuses.slice(1).every((s) => s === 'verrouille')).toBe(true);
  });

  it('ouvre la lecon suivante quand la precedente est terminee', () => {
    const [levelA0] = buildPath(course, progressFor(['a0-u1-l1']));
    const statuses = levelA0.units[0].lessons.map((l) => l.status);
    expect(statuses[0]).toBe('termine');
    expect(statuses[1]).toBe('disponible');
    expect(statuses[2]).toBe('verrouille');
  });

  it('ouvre l unite suivante quand toute l unite precedente est terminee', () => {
    const unit1 = course[0].lessons.map((l) => l.id);
    const [levelA0] = buildPath(course, progressFor(unit1));
    expect(levelA0.units[0].done).toBe(levelA0.units[0].total);
    expect(levelA0.units[1].unlocked).toBe(true);
    expect(levelA0.units[1].lessons[0].status).toBe('disponible');
  });

  it('compte l avancement du niveau', () => {
    const [levelA0] = buildPath(course, progressFor(['a0-u1-l1', 'a0-u1-l2']));
    expect(levelA0.done).toBe(2);
    expect(levelA0.total).toBe(
      course.filter((u) => u.level === 'A0').reduce((sum, u) => sum + u.lessons.length, 0),
    );
  });

  it('marque en-cours une lecon commencee mais pas terminee', () => {
    const [levelA0] = buildPath(course, progressFor(['a0-u1-l1'], 'en-cours'));
    expect(levelA0.units[0].lessons[0].status).toBe('en-cours');
    expect(levelA0.units[0].lessons[1].status).toBe('verrouille');
  });
});

describe('findNextLesson', () => {
  it('propose la premiere lecon quand rien n est commence', () => {
    const next = findNextLesson(buildPath(course, []));
    expect(next?.lesson.id).toBe('a0-u1-l1');
  });

  it('propose en priorite une lecon commencee', () => {
    const levels = buildPath(course, [
      ...progressFor(['a0-u1-l1']),
      ...progressFor(['a0-u1-l2'], 'en-cours'),
    ]);
    expect(findNextLesson(levels)?.lesson.id).toBe('a0-u1-l2');
  });

  it('renvoie null quand tout le cours est termine', () => {
    const all = course.flatMap((unit) => unit.lessons.map((l) => l.id));
    expect(findNextLesson(buildPath(course, progressFor(all)))).toBeNull();
  });
});

describe('enchaînement des niveaux', () => {
  it('classe les unités par niveau puis par ordre', () => {
    const levels = buildPath(course, []);
    expect(levels.map((l) => l.level)).toEqual(['A0', 'A1']);
    for (const level of levels) {
      expect(level.units.map((u) => u.unit.order)).toEqual(
        [...level.units.map((u) => u.unit.order)].sort((a, b) => a - b),
      );
    }
  });

  it('verrouille le niveau A1 tant que le A0 n est pas terminé', () => {
    const [, levelA1] = buildPath(course, []);
    expect(levelA1.units[0].unlocked).toBe(false);
  });

  it('ouvre la première unité A1 quand tout le A0 est terminé', () => {
    const allA0 = course
      .filter((unit) => unit.level === 'A0')
      .flatMap((unit) => unit.lessons.map((l) => l.id));
    const [, levelA1] = buildPath(course, progressFor(allA0));
    expect(levelA1.units[0].unlocked).toBe(true);
    expect(levelA1.units[0].lessons[0].status).toBe('disponible');
  });
});
