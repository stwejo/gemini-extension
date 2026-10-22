import { db, todayKey, type SrsCardRow } from '../db';
import { createCard, isDue, reviewCard, type NewCardInput } from '@/engine/srs/sm2';
import { buildSession, countDue, nextDueDate } from '@/engine/srs/scheduler';
import { addActivity } from './activity';

/** Ajoute les cartes manquantes ; une carte deja connue garde son historique. */
export async function addCards(inputs: NewCardInput[]): Promise<number> {
  if (inputs.length === 0) return 0;
  const ids = inputs.map((i) => i.id);
  const existing = await db.srsCards.bulkGet(ids);
  const known = new Set(existing.filter(Boolean).map((c) => (c as SrsCardRow).id));
  const toAdd = inputs.filter((i) => !known.has(i.id)).map((i) => createCard(i));
  if (toAdd.length > 0) await db.srsCards.bulkPut(toAdd);
  return toAdd.length;
}

export async function getAllCards(): Promise<SrsCardRow[]> {
  return db.srsCards.toArray();
}

export async function countCards(): Promise<number> {
  return db.srsCards.count();
}

/** Cartes dues aujourd'hui. */
export async function getDueCards(today = todayKey()): Promise<SrsCardRow[]> {
  const cards = await db.srsCards.toArray();
  return cards.filter((c) => isDue(c, today));
}

/** Session de revision du jour, erreurs frequentes en tete. */
export async function getTodaySession(limit = 20): Promise<SrsCardRow[]> {
  return buildSession(await db.srsCards.toArray(), { limit });
}

export async function getDueCount(): Promise<number> {
  return countDue(await db.srsCards.toArray());
}

export async function getNextDueDate(): Promise<string | null> {
  return nextDueDate(await db.srsCards.toArray());
}

/** Enregistre une revision : replanifie la carte et journalise la note. */
export async function applyReview(cardId: string, grade: number): Promise<SrsCardRow | null> {
  const card = await db.srsCards.get(cardId);
  if (!card) return null;
  const updated = reviewCard(card, grade);
  await db.transaction('rw', [db.srsCards, db.reviewLog], async () => {
    await db.srsCards.put(updated);
    await db.reviewLog.add({ cardId, grade, ts: Date.now() });
  });
  await addActivity({ reviewsDone: 1 });
  return updated;
}
