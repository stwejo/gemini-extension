import type { Lesson, Step } from '@/content/schema';

/**
 * Etat d'une lecon en cours. Volontairement serialisable : il peut etre
 * sauvegarde puis repris.
 */
export interface LessonState {
  lessonId: string;
  stepIndex: number;
  /** Resultat de la PREMIERE reponse a chaque item note. */
  results: Record<string, boolean>;
  finished: boolean;
}

export type LessonAction =
  | { type: 'answer'; itemId: string; correct: boolean }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goto'; index: number }
  | { type: 'finish' }
  | { type: 'restart' };

export function initLessonState(lessonId: string, stepIndex = 0): LessonState {
  return { lessonId, stepIndex, results: {}, finished: false };
}

/** Nombre d'items notes dans une lecon (comprehension, decouverte, pratique, production). */
export function countGradedItems(lesson: Lesson): number {
  return lesson.steps.reduce((total, step) => total + gradedItemsOfStep(step).length, 0);
}

/** Identifiants des items notes d'un step, prefixes par le step pour rester uniques. */
export function gradedItemsOfStep(step: Step): string[] {
  switch (step.type) {
    case 'comprehension':
      return step.items.map((item) => `${step.id}:${item.id}`);
    case 'discover':
      return [`${step.id}:${step.question.id}`];
    case 'practice':
      return step.exercises.map((exercise) => `${step.id}:${exercise.id}`);
    case 'production':
      // Les consignes libres (acceptAny) sont en auto-evaluation : elles ne comptent pas.
      return step.prompts.filter((p) => !p.acceptAny).map((p) => `${step.id}:${p.id}`);
    default:
      return [];
  }
}

export interface GradedItemMeta {
  /** Type d'item : sert aux statistiques et aux erreurs frequentes. */
  type: string;
  ruleId: string | null;
  errorTags: string[];
}

/** Metadonnees de chaque item note, indexees par identifiant prefixe. */
export function gradedItemMeta(lesson: Lesson): Record<string, GradedItemMeta> {
  const meta: Record<string, GradedItemMeta> = {};
  for (const step of lesson.steps) {
    switch (step.type) {
      case 'comprehension':
        for (const item of step.items) {
          meta[`${step.id}:${item.id}`] = { type: 'comprehension', ruleId: null, errorTags: [] };
        }
        break;
      case 'discover':
        meta[`${step.id}:${step.question.id}`] = { type: 'discover', ruleId: null, errorTags: [] };
        break;
      case 'practice':
        for (const exercise of step.exercises) {
          meta[`${step.id}:${exercise.id}`] = {
            type: exercise.type,
            ruleId: exercise.ruleId ?? null,
            errorTags: exercise.errorTags,
          };
        }
        break;
      case 'production':
        for (const prompt of step.prompts) {
          if (prompt.acceptAny) continue;
          meta[`${step.id}:${prompt.id}`] = { type: 'production', ruleId: null, errorTags: [] };
        }
        break;
      default:
        break;
    }
  }
  return meta;
}

export interface LessonScore {
  correct: number;
  answered: number;
  total: number;
  /** Pourcentage sur l'ensemble des items notes de la lecon. */
  percent: number;
}

export function scoreLesson(state: LessonState, totalGraded: number): LessonScore {
  const values = Object.values(state.results);
  const correct = values.filter(Boolean).length;
  return {
    correct,
    answered: values.length,
    total: totalGraded,
    percent: totalGraded === 0 ? 100 : Math.round((correct / totalGraded) * 100),
  };
}

export function lessonReducer(
  state: LessonState,
  action: LessonAction,
  stepCount: number,
): LessonState {
  switch (action.type) {
    case 'answer':
      // Seule la premiere reponse compte : reessayer n'augmente pas le score.
      if (action.itemId in state.results) return state;
      return { ...state, results: { ...state.results, [action.itemId]: action.correct } };
    case 'next':
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, stepCount - 1) };
    case 'prev':
      return { ...state, stepIndex: Math.max(state.stepIndex - 1, 0) };
    case 'goto':
      return { ...state, stepIndex: Math.min(Math.max(action.index, 0), stepCount - 1) };
    case 'finish':
      return { ...state, finished: true };
    case 'restart':
      return initLessonState(state.lessonId, 0);
    default:
      return state;
  }
}
