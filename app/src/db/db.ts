import Dexie, { type Table } from 'dexie';
import type { Level, Tolerance, Variant } from '@/content/types';

/**
 * Toutes les donnees restent sur l'appareil (IndexedDB). Aucun serveur.
 * Changer la forme d'une table = ajouter une nouvelle version Dexie ci-dessous,
 * jamais modifier une version existante.
 */

export interface SettingsRow {
  id: 1;
  variant: Variant;
  /** Objectif quotidien en minutes. */
  dailyGoalMin: 5 | 10 | 20;
  ttsRate: 0.6 | 0.8 | 1;
  tolerance: Tolerance;
  /** Facteur de taille de police, 1 = taille par defaut. */
  fontScale: 0.9 | 1 | 1.15 | 1.3;
  /** Mode calme : animations reduites, moins de stimuli. */
  calmMode: boolean;
  /** Voix de synthese choisie (voiceURI), sinon selection automatique. */
  voiceURI: string | null;
  placementLevel: Level | null;
  updatedAt: number;
}

export type LessonStatus = 'en-cours' | 'termine';

export interface LessonProgressRow {
  lessonId: string;
  unitId: string;
  level: Level;
  status: LessonStatus;
  /** Meilleur score en pourcentage (0-100). */
  bestScore: number;
  attempts: number;
  /** Index du dernier step atteint, pour reprendre la lecon. */
  lastStepIndex: number;
  updatedAt: number;
}

export interface UnitProgressRow {
  unitId: string;
  level: Level;
  /** Score du test de fin d'unite (0-100), absent si non passe. */
  testScore: number | null;
  passedAt: number | null;
  updatedAt: number;
}

export type SrsKind = 'vocab' | 'structure' | 'spelling';

export interface SrsCardRow {
  id: string;
  kind: SrsKind;
  /** Face avant (francais ou consigne). */
  prompt: string;
  /** Face arriere (neerlandais attendu). */
  answer: string;
  lessonId: string;
  ruleId: string | null;
  /** Facteur de facilite SM-2. */
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  /** Date d'echeance au format YYYY-MM-DD. */
  due: string;
  suspended: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewLogRow {
  id?: number;
  cardId: string;
  /** Note SM-2 de 0 a 5. */
  grade: number;
  ts: number;
}

export interface AttemptRow {
  id?: number;
  exerciseId: string;
  lessonId: string;
  type: string;
  correct: boolean;
  userAnswer: string;
  errorTags: string[];
  ruleId: string | null;
  ts: number;
}

export interface DailyActivityRow {
  /** Date locale au format YYYY-MM-DD. */
  date: string;
  seconds: number;
  exercisesDone: number;
  reviewsDone: number;
  lessonsDone: number;
}

export interface MetaRow {
  key: string;
  value: string;
}

export class AppDatabase extends Dexie {
  settings!: Table<SettingsRow, number>;
  lessonProgress!: Table<LessonProgressRow, string>;
  unitProgress!: Table<UnitProgressRow, string>;
  srsCards!: Table<SrsCardRow, string>;
  reviewLog!: Table<ReviewLogRow, number>;
  attempts!: Table<AttemptRow, number>;
  dailyActivity!: Table<DailyActivityRow, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'nederlands-db') {
    super(name);
    this.version(1).stores({
      settings: 'id',
      lessonProgress: 'lessonId, unitId, level, status, updatedAt',
      unitProgress: 'unitId, level',
      srsCards: 'id, kind, due, lessonId, suspended',
      reviewLog: '++id, cardId, ts',
      attempts: '++id, lessonId, exerciseId, correct, ts',
      dailyActivity: 'date',
      meta: 'key',
    });
  }
}

export const db = new AppDatabase();

export const DEFAULT_SETTINGS: SettingsRow = {
  id: 1,
  variant: 'nl-NL',
  dailyGoalMin: 10,
  ttsRate: 0.8,
  tolerance: 'souple',
  fontScale: 1,
  calmMode: false,
  voiceURI: null,
  placementLevel: null,
  updatedAt: 0,
};

/** Date locale au format YYYY-MM-DD (pas UTC : la serie suit le fuseau de l'utilisateur). */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Decale une cle de date de n jours. */
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayKey(date);
}
