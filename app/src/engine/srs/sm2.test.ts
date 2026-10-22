import { describe, expect, it } from 'vitest';
import { createCard, GRADES, isDue, reviewCard, SM2_INITIAL_EASE } from './sm2';

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

describe('reviewCard (SM-2)', () => {
  const card = createCard({
    id: 'c1',
    kind: 'vocab',
    prompt: 'bonjour',
    answer: 'hallo',
    lessonId: 'l1',
    today: '2026-10-22',
  });

  it('première réussite : revue le lendemain', () => {
    const r = reviewCard(card, GRADES.correct, '2026-10-23');
    expect(r.reps).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.due).toBe('2026-10-24');
  });

  it('deuxième réussite : six jours', () => {
    const first = reviewCard(card, GRADES.correct, '2026-10-23');
    const second = reviewCard(first, GRADES.correct, '2026-10-24');
    expect(second.reps).toBe(2);
    expect(second.intervalDays).toBe(6);
    expect(second.due).toBe('2026-10-30');
  });

  it('ensuite : intervalle multiplié par le facteur de facilité', () => {
    let c = reviewCard(card, GRADES.correct, '2026-10-23');
    c = reviewCard(c, GRADES.correct, '2026-10-24');
    const third = reviewCard(c, GRADES.correct, '2026-10-30');
    expect(third.intervalDays).toBe(Math.round(6 * third.ease));
    expect(third.intervalDays).toBeGreaterThan(6);
  });

  it('un oubli remet la carte à zéro et compte une rechute', () => {
    let c = reviewCard(card, GRADES.correct, '2026-10-23');
    c = reviewCard(c, GRADES.correct, '2026-10-24');
    const forgotten = reviewCard(c, GRADES.oublie, '2026-10-30');
    expect(forgotten.reps).toBe(0);
    expect(forgotten.intervalDays).toBe(1);
    expect(forgotten.lapses).toBe(1);
    expect(forgotten.due).toBe('2026-10-31');
  });

  it('« facile » augmente le facteur de facilité, « difficile » le diminue', () => {
    expect(reviewCard(card, GRADES.facile).ease).toBeGreaterThan(card.ease);
    expect(reviewCard(card, GRADES.difficile).ease).toBeLessThan(card.ease);
    expect(reviewCard(card, GRADES.correct).ease).toBe(card.ease);
  });

  it('le facteur de facilité ne descend jamais sous 1,3', () => {
    let c = card;
    for (let i = 0; i < 20; i += 1) c = reviewCard(c, GRADES.oublie, '2026-10-23');
    expect(c.ease).toBe(1.3);
    expect(c.lapses).toBe(20);
  });
});
