import { normalize, tokenize } from './normalize';

export interface WordOrderGrade {
  accepted: boolean;
  /** Index du premier jeton mal place, -1 si tout est correct. */
  firstErrorIndex: number;
  /** Phrase modele la plus proche de la proposition. */
  bestTarget: string;
  /** Jetons attendus, dans l'ordre. */
  expectedTokens: string[];
  reasons_fr: string[];
}

/** Decoupe la phrase cible en jetons affichables (ponctuation conservee). */
export function targetTokens(target: string): string[] {
  return target.trim().split(/\s+/);
}

/**
 * Melange deterministe : la meme graine donne toujours le meme ordre.
 * Evite un test instable et permet de rejouer un exercice a l'identique.
 */
export function shuffleTokens<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Pool de jetons propose a l'utilisateur : phrase cible + distracteurs, melanges. */
export function buildTokenPool(target: string, extraTokens: string[], seed: number): string[] {
  const pool = [...targetTokens(target), ...extraTokens];
  const shuffled = shuffleTokens(pool, seed);
  // Si le hasard redonne l'ordre correct, on decale d'un cran.
  if (shuffled.join(' ') === targetTokens(target).join(' ') && shuffled.length > 1) {
    return shuffleTokens(pool, seed + 7);
  }
  return shuffled;
}

/**
 * Corrige une phrase reconstruite a partir de jetons.
 * Majuscules et ponctuation sont ignorees : seul l'ordre compte.
 */
export function gradeWordOrder(
  chosen: string[],
  target: string,
  alsoAccept: string[] = [],
): WordOrderGrade {
  const candidates = [target, ...alsoAccept];
  const answerTokens = tokenize(chosen.join(' '), 'souple');

  let best: { target: string; tokens: string[]; firstErrorIndex: number } | null = null;

  for (const candidate of candidates) {
    const expected = tokenize(candidate, 'souple');
    let firstErrorIndex = -1;
    const length = Math.max(expected.length, answerTokens.length);
    for (let i = 0; i < length; i += 1) {
      if (expected[i] !== answerTokens[i]) {
        firstErrorIndex = i;
        break;
      }
    }
    if (firstErrorIndex === -1) {
      return {
        accepted: true,
        firstErrorIndex: -1,
        bestTarget: candidate,
        expectedTokens: targetTokens(candidate),
        reasons_fr: [],
      };
    }
    if (best === null || firstErrorIndex > best.firstErrorIndex) {
      best = { target: candidate, tokens: expected, firstErrorIndex };
    }
  }

  const chosenBest = best!;
  const reasons_fr: string[] = [];
  const expectedWord = chosenBest.tokens[chosenBest.firstErrorIndex];
  const gotWord = answerTokens[chosenBest.firstErrorIndex];

  if (gotWord === undefined) {
    reasons_fr.push(`Il manque un mot a la position ${chosenBest.firstErrorIndex + 1} : « ${expectedWord} ».`);
  } else if (expectedWord === undefined) {
    reasons_fr.push(`La phrase est trop longue : « ${gotWord} » est en trop.`);
  } else {
    reasons_fr.push(
      `Position ${chosenBest.firstErrorIndex + 1} : on attend « ${expectedWord} », pas « ${gotWord} ».`,
    );
  }

  const normalizedSet = new Set(tokenize(chosenBest.target, 'souple'));
  const unusedExpected = chosenBest.tokens.filter((t) => !answerTokens.includes(t));
  const notInSentence = answerTokens.filter((t) => !normalizedSet.has(t));
  if (unusedExpected.length > 0) {
    reasons_fr.push(`Mot(s) non utilise(s) : ${unusedExpected.join(', ')}`);
  }
  if (notInSentence.length > 0) {
    reasons_fr.push(`Mot(s) qui ne font pas partie de la phrase : ${notInSentence.join(', ')}`);
  }

  return {
    accepted: false,
    firstErrorIndex: chosenBest.firstErrorIndex,
    bestTarget: chosenBest.target,
    expectedTokens: targetTokens(chosenBest.target),
    reasons_fr,
  };
}

/** Normalise une phrase pour comparaison directe (utilitaire de test/debogage). */
export function sameSentence(a: string, b: string): boolean {
  return normalize(a, 'souple') === normalize(b, 'souple');
}
