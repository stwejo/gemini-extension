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

/**
 * Note donnee a une carte, echelle SM-2 (0 a 5).
 * L'UI n'en expose que quatre : oubli, difficile, correct, facile.
 */
export const GRADES = {
  oublie: 1,
  difficile: 3,
  correct: 4,
  facile: 5,
} as const;

export type GradeLabel = keyof typeof GRADES;

/**
 * Replanifie une carte selon SM-2 (Wozniak, 1987).
 * - note < 3 : la carte repart a zero, revue des le lendemain, lapses + 1 ;
 * - note >= 3 : 1 jour, puis 6 jours, puis intervalle * facteur de facilite.
 * Le facteur de facilite ne descend jamais sous 1,3.
 */
export function reviewCard(card: SrsCardRow, grade: number, today = todayKey()): SrsCardRow {
  const quality = Math.min(5, Math.max(0, Math.round(grade)));
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const ease = Math.max(SM2_MIN_EASE, Number((card.ease + easeDelta).toFixed(4)));

  let reps: number;
  let intervalDays: number;
  let lapses = card.lapses;

  if (quality < 3) {
    reps = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    reps = card.reps + 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(card.intervalDays * ease));
  }

  return {
    ...card,
    ease,
    reps,
    intervalDays,
    lapses,
    due: shiftDateKey(today, intervalDays),
    updatedAt: Date.now(),
  };
}

/** Une carte est due si son echeance est aujourd'hui ou deja passee. */
export function isDue(card: SrsCardRow, today = todayKey()): boolean {
  return !card.suspended && card.due <= today;
}
