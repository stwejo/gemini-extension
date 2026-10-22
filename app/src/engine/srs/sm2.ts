import type { SrsCardRow, SrsKind } from '@/db/db';
import { shiftDateKey, todayKey } from '@/db/db';

/**
 * Parametres SM-2 (Piotr Wozniak, SuperMemo 2).
 * La fonction de replanification des cartes arrive en phase 2 ; la phase 1
 * cree les cartes a la fin de chaque lecon avec leur etat initial.
 */
export const SM2_INITIAL_EASE = 2.5;
export const SM2_MIN_EASE = 1.3;
export const SM2_FIRST_INTERVAL_DAYS = 1;

export interface NewCardInput {
  id: string;
  kind: SrsKind;
  prompt: string;
  answer: string;
  lessonId: string;
  ruleId?: string | null;
  /** Date de reference, utile pour les tests. */
  today?: string;
}

/** Etat initial d'une carte : premiere revision le lendemain. */
export function createCard(input: NewCardInput): SrsCardRow {
  const now = Date.now();
  const today = input.today ?? todayKey();
  return {
    id: input.id,
    kind: input.kind,
    prompt: input.prompt,
    answer: input.answer,
    lessonId: input.lessonId,
    ruleId: input.ruleId ?? null,
    ease: SM2_INITIAL_EASE,
    intervalDays: SM2_FIRST_INTERVAL_DAYS,
    reps: 0,
    lapses: 0,
    due: shiftDateKey(today, SM2_FIRST_INTERVAL_DAYS),
    suspended: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Une carte est due si son echeance est aujourd'hui ou deja passee. */
export function isDue(card: SrsCardRow, today = todayKey()): boolean {
  return !card.suspended && card.due <= today;
}
