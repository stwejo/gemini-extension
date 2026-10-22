import { alignTokens, levenshtein, similarity, type TokenDiff } from './levenshtein';
import { normalize, tokenize, type Tolerance } from './normalize';

export type TextVerdict = 'correct' | 'presque' | 'incorrect';

export interface TextGrade {
  verdict: TextVerdict;
  /** true = la reponse compte comme reussie. */
  accepted: boolean;
  /** Reponse modele la plus proche de ce qu'a ecrit l'utilisateur. */
  bestTarget: string;
  similarity: number;
  distance: number;
  /** Retour mot par mot, pour colorer la correction. */
  words: TokenDiff[];
  /** Raisons lisibles en francais, affichees sous la correction. */
  reasons_fr: string[];
}

export interface GradeTextOptions {
  tolerance?: Tolerance;
  /** En mode souple, accepte une reponse a une faute de frappe pres. */
  acceptTypos?: boolean;
}

/** Nombre de caracteres de difference encore consideres comme une faute de frappe. */
function typoBudget(target: string): number {
  return target.length <= 12 ? 1 : Math.floor(target.length * 0.08) + 1;
}

/**
 * Corrige une reponse ecrite (dictee, traduction, texte a trous, production)
 * contre une ou plusieurs reponses modeles.
 */
export function gradeText(
  answer: string,
  targets: string[],
  options: GradeTextOptions = {},
): TextGrade {
  const tolerance: Tolerance = options.tolerance ?? 'souple';
  const acceptTypos = options.acceptTypos ?? true;

  if (targets.length === 0) {
    throw new Error('gradeText : au moins une reponse modele est requise');
  }

  const normalizedAnswer = normalize(answer, tolerance);

  let best = {
    target: targets[0],
    normalizedTarget: normalize(targets[0], tolerance),
    distance: Number.POSITIVE_INFINITY,
    score: -1,
  };

  for (const target of targets) {
    const normalizedTarget = normalize(target, tolerance);
    const distance = levenshtein(normalizedAnswer, normalizedTarget);
    const score = similarity(normalizedAnswer, normalizedTarget);
    if (distance < best.distance) {
      best = { target, normalizedTarget, distance, score };
    }
  }

  const words = alignTokens(
    tokenize(best.target, tolerance),
    tokenize(answer, tolerance),
  );

  const reasons_fr: string[] = [];
  let verdict: TextVerdict;
  /** En mode strict : memes mots, mais majuscules ou accents differents. */
  const onlyCaseOrAccents =
    tolerance === 'strict' &&
    best.distance > 0 &&
    normalize(answer, 'souple') === normalize(best.target, 'souple');

  if (best.distance === 0) {
    verdict = 'correct';
  } else if (onlyCaseOrAccents) {
    verdict = 'presque';
  } else if (acceptTypos && best.distance <= typoBudget(best.normalizedTarget)) {
    verdict = 'presque';
  } else {
    verdict = 'incorrect';
  }

  if (onlyCaseOrAccents) {
    reasons_fr.push('Majuscules ou accents a corriger.');
  } else if (verdict !== 'correct') {
    const missing = words.filter((w) => w.status === 'manquant').map((w) => w.expected);
    const extra = words.filter((w) => w.status === 'superflu').map((w) => w.got);
    const wrong = words.filter((w) => w.status === 'faux' || w.status === 'proche');

    if (missing.length > 0) reasons_fr.push(`Mot(s) manquant(s) : ${missing.join(', ')}`);
    if (extra.length > 0) reasons_fr.push(`Mot(s) en trop : ${extra.join(', ')}`);
    for (const w of wrong) {
      reasons_fr.push(`« ${w.got} » → « ${w.expected} »`);
    }
    if (reasons_fr.length === 0 && verdict === 'presque') {
      reasons_fr.push('Orthographe presque correcte (accent, majuscule ou lettre).');
    }
  }

  return {
    verdict,
    accepted: verdict === 'correct' || (verdict === 'presque' && tolerance === 'souple'),
    bestTarget: best.target,
    similarity: Math.max(0, best.score),
    distance: best.distance,
    words,
    reasons_fr,
  };
}
