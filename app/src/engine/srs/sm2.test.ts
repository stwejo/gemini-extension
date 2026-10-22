import { describe, expect, it } from 'vitest';
import { createCard, isDue, SM2_INITIAL_EASE } from './sm2';

describe('createCard', () => {
  it('cree une carte avec l etat SM-2 initial et une echeance au lendemain', () => {
    const card = createCard({
      id: 'vocab-hallo',
      kind: 'vocab',
      prompt: 'bonjour (informel)',
      answer: 'hallo',
      lessonId: 'a0-u2-l1',
      today: '2026-10-22',
    });
    expect(card.ease).toBe(SM2_INITIAL_EASE);
    expect(card.intervalDays).toBe(1);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.due).toBe('2026-10-23');
    expect(card.suspended).toBe(false);
  });

  it('gere le passage de mois', () => {
    const card = createCard({
      id: 'x',
      kind: 'vocab',
      prompt: 'a',
      answer: 'b',
      lessonId: 'l',
      today: '2026-10-31',
    });
    expect(card.due).toBe('2026-11-01');
  });
});

describe('isDue', () => {
  const base = createCard({
    id: 'x',
    kind: 'vocab',
    prompt: 'a',
    answer: 'b',
    lessonId: 'l',
    today: '2026-10-22',
  });

  it('est due le jour de l echeance et apres', () => {
    expect(isDue(base, '2026-10-22')).toBe(false);
    expect(isDue(base, '2026-10-23')).toBe(true);
    expect(isDue(base, '2026-11-05')).toBe(true);
  });

  it('ignore les cartes suspendues', () => {
    expect(isDue({ ...base, suspended: true }, '2026-11-05')).toBe(false);
  });
});
