import { db, todayKey, type SrsCardRow } from '../db';
import { createCard, isDue, type NewCardInput } from '@/engine/srs/sm2';

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

/** Cartes dues aujourd'hui (la session de revision elle-meme arrive en phase 2). */
export async function getDueCards(today = todayKey()): Promise<SrsCardRow[]> {
  const cards = await db.srsCards.toArray();
  return cards.filter((c) => isDue(c, today));
}
