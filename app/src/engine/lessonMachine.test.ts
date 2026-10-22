import { describe, expect, it } from 'vitest';
import { getLesson } from '@/content';
import {
  countGradedItems,
  gradedItemsOfStep,
  initLessonState,
  lessonReducer,
  scoreLesson,
  type LessonState,
} from './lessonMachine';

const found = getLesson('a0-u1-l1');
if (!found) throw new Error('lecon de test introuvable');
const { lesson } = found;

describe('countGradedItems', () => {
  it('compte comprehension, decouverte, pratique et production notee', () => {
    const expected =
      lesson.steps.filter((s) => s.type === 'comprehension').flatMap((s) => (s.type === 'comprehension' ? s.items : [])).length +
      lesson.steps.filter((s) => s.type === 'discover').length +
      lesson.steps.filter((s) => s.type === 'practice').flatMap((s) => (s.type === 'practice' ? s.exercises : [])).length +
      lesson.steps
        .filter((s) => s.type === 'production')
        .flatMap((s) => (s.type === 'production' ? s.prompts.filter((p) => !p.acceptAny) : [])).length;
    expect(countGradedItems(lesson)).toBe(expected);
  });

  it('ne note pas l ecoute, la repetition, le vocabulaire, la regle ni le bilan', () => {
    for (const step of lesson.steps) {
      if (['listen', 'repeat', 'vocab', 'rule', 'wrapup'].includes(step.type)) {
        expect(gradedItemsOfStep(step)).toEqual([]);
      }
    }
  });

  it('prefixe les identifiants par le step pour eviter les collisions', () => {
    const practice = lesson.steps.find((s) => s.type === 'practice');
    expect(practice).toBeDefined();
    expect(gradedItemsOfStep(practice!)[0]).toMatch(/^s\d+:e1$/);
  });
});

describe('lessonReducer', () => {
  const stepCount = lesson.steps.length;
  const base = initLessonState(lesson.id);

  it('avance et recule sans sortir des bornes', () => {
    let state: LessonState = base;
    state = lessonReducer(state, { type: 'prev' }, stepCount);
    expect(state.stepIndex).toBe(0);

    for (let i = 0; i < stepCount + 3; i += 1) {
      state = lessonReducer(state, { type: 'next' }, stepCount);
    }
    expect(state.stepIndex).toBe(stepCount - 1);
  });

  it('goto borne l index demande', () => {
    expect(lessonReducer(base, { type: 'goto', index: 99 }, stepCount).stepIndex).toBe(stepCount - 1);
    expect(lessonReducer(base, { type: 'goto', index: -5 }, stepCount).stepIndex).toBe(0);
  });

  it('ne retient que la premiere reponse a un item', () => {
    let state = lessonReducer(base, { type: 'answer', itemId: 'a', correct: false }, stepCount);
    state = lessonReducer(state, { type: 'answer', itemId: 'a', correct: true }, stepCount);
    expect(state.results).toEqual({ a: false });
  });

  it('marque la lecon terminee et peut repartir de zero', () => {
    let state = lessonReducer(base, { type: 'answer', itemId: 'a', correct: true }, stepCount);
    state = lessonReducer(state, { type: 'finish' }, stepCount);
    expect(state.finished).toBe(true);

    state = lessonReducer(state, { type: 'restart' }, stepCount);
    expect(state).toEqual(initLessonState(lesson.id));
  });
});

describe('scoreLesson', () => {
  it('calcule le pourcentage sur tous les items notes, pas seulement ceux repondus', () => {
    const state: LessonState = {
      ...initLessonState('x'),
      results: { a: true, b: true, c: false },
    };
    expect(scoreLesson(state, 10)).toEqual({ correct: 2, answered: 3, total: 10, percent: 20 });
  });

  it('renvoie 100 % quand la lecon ne contient aucun item note', () => {
    expect(scoreLesson(initLessonState('x'), 0).percent).toBe(100);
  });

  it('arrondit au plus proche', () => {
    const state: LessonState = { ...initLessonState('x'), results: { a: true, b: false, c: true } };
    expect(scoreLesson(state, 3).percent).toBe(67);
  });
});
