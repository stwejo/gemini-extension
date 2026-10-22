import { describe, expect, it } from 'vitest';
import type { SrsCardRow } from '@/db/db';
import { buildSession, countDue, nextDueDate } from './scheduler';

function card(over: Partial<SrsCardRow> & { id: string }): SrsCardRow {
  return {
    kind: 'vocab',
    prompt: 'p',
    answer: 'a',
    lessonId: 'l',
    ruleId: null,
    ease: 2.5,
    intervalDays: 1,
    reps: 0,
    lapses: 0,
    due: '2026-10-22',
    suspended: false,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

const today = '2026-10-22';

describe('buildSession', () => {
  it('ne retient que les cartes dues', () => {
    const cards = [card({ id: 'a' }), card({ id: 'b', due: '2026-10-30' })];
    expect(buildSession(cards, { today }).map((c) => c.id)).toEqual(['a']);
  });

  it('fait passer devant les cartes le plus souvent ratées', () => {
    const cards = [
      card({ id: 'facile', lapses: 0 }),
      card({ id: 'difficile', lapses: 3 }),
      card({ id: 'moyenne', lapses: 1 }),
    ];
    expect(buildSession(cards, { today }).map((c) => c.id)).toEqual(['difficile', 'moyenne', 'facile']);
  });

  it('à rechutes égales, les plus en retard d abord', () => {
    const cards = [
      card({ id: 'hier', due: '2026-10-21' }),
      card({ id: 'avant-hier', due: '2026-10-20' }),
      card({ id: 'aujourdhui', due: '2026-10-22' }),
    ];
    expect(buildSession(cards, { today }).map((c) => c.id)).toEqual([
      'avant-hier',
      'hier',
      'aujourdhui',
    ]);
  });

  it('limite la taille de la session', () => {
    const cards = Array.from({ length: 30 }, (_, i) => card({ id: `c${i}` }));
    expect(buildSession(cards, { today, limit: 5 })).toHaveLength(5);
    expect(buildSession(cards, { today })).toHaveLength(20);
  });

  it('ignore les cartes suspendues', () => {
    const cards = [card({ id: 'a', suspended: true }), card({ id: 'b' })];
    expect(buildSession(cards, { today }).map((c) => c.id)).toEqual(['b']);
  });
});

describe('countDue et nextDueDate', () => {
  it('compte les cartes dues sans limite', () => {
    const cards = Array.from({ length: 25 }, (_, i) => card({ id: `c${i}` }));
    expect(countDue(cards, today)).toBe(25);
  });

  it('donne la prochaine échéance', () => {
    const cards = [card({ id: 'a', due: '2026-11-02' }), card({ id: 'b', due: '2026-10-25' })];
    expect(nextDueDate(cards)).toBe('2026-10-25');
    expect(nextDueDate([])).toBeNull();
  });
});
