import type { SrsCardRow } from '@/db/db';
import { todayKey } from '@/db/db';
import { isDue } from './sm2';

export interface SessionOptions {
  /** Nombre maximum de cartes dans la session. */
  limit?: number;
  today?: string;
  /** Cartes deja fautives recemment : elles passent devant. */
  errorTagWeight?: number;
}

/**
 * Construit la session de revision du jour.
 * Ordre : les cartes les plus souvent ratees d'abord, puis les plus en retard,
 * puis les plus anciennes. C'est ce qui fait revenir les erreurs plus souvent.
 */
export function buildSession(cards: SrsCardRow[], options: SessionOptions = {}): SrsCardRow[] {
  const today = options.today ?? todayKey();
  const limit = options.limit ?? 20;

  return cards
    .filter((card) => isDue(card, today))
    .sort((a, b) => {
      if (b.lapses !== a.lapses) return b.lapses - a.lapses;
      if (a.due !== b.due) return a.due.localeCompare(b.due);
      return a.createdAt - b.createdAt;
    })
    .slice(0, limit);
}

/** Combien de cartes sont dues aujourd'hui, sans limite de session. */
export function countDue(cards: SrsCardRow[], today = todayKey()): number {
  return cards.filter((card) => isDue(card, today)).length;
}

/** Prochaine date a laquelle au moins une carte sera due. */
export function nextDueDate(cards: SrsCardRow[]): string | null {
  const dates = cards.filter((card) => !card.suspended).map((card) => card.due).sort();
  return dates[0] ?? null;
}
