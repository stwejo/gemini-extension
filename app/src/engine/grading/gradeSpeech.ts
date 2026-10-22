import { alignTokens, similarity, type TokenDiff } from './levenshtein';
import { normalize, tokenize } from './normalize';

export type SpeechVerdict = 'proche' | 'partiel' | 'eloigne';

export interface SpeechGrade {
  verdict: SpeechVerdict;
  /** true quand la transcription est assez proche pour valider l'exercice. */
  accepted: boolean;
  /** Proportion de mots reconnus tels quels (0 a 1). */
  wordScore: number;
  /** Similarite caractere par caractere (0 a 1), plus indulgente. */
  charScore: number;
  words: TokenDiff[];
  transcript: string;
  target: string;
  /** Rappel affiche a l'utilisateur : ce n'est pas une note de prononciation. */
  disclaimer_fr: string;
}

export interface GradeSpeechOptions {
  /** Part de mots corrects exigee pour valider. */
  threshold?: number;
  /** Un mot presque identique compte comme a moitie reconnu. */
  partialWeight?: number;
}

export const SPEECH_DISCLAIMER_FR =
  "Comparaison faite sur la transcription du navigateur : c'est une estimation, pas une évaluation de ta prononciation.";

/**
 * Compare ce que le navigateur a transcrit a la phrase attendue.
 *
 * La reconnaissance vocale se trompe souvent sur les mots courts et la
 * ponctuation : on compare donc en mode souple (sans accents, majuscules ni
 * ponctuation) et on tolere un mot presque identique.
 */
export function gradeSpeech(
  transcript: string,
  target: string,
  options: GradeSpeechOptions = {},
): SpeechGrade {
  const threshold = options.threshold ?? 0.7;
  const partialWeight = options.partialWeight ?? 0.5;

  const expectedTokens = tokenize(target, 'souple');
  const saidTokens = tokenize(transcript, 'souple');
  const words = alignTokens(expectedTokens, saidTokens);

  const matched = words.reduce((sum, word) => {
    if (word.status === 'ok') return sum + 1;
    if (word.status === 'proche') return sum + partialWeight;
    return sum;
  }, 0);

  const wordScore = expectedTokens.length === 0 ? 0 : Math.min(1, matched / expectedTokens.length);
  const charScore = similarity(normalize(transcript, 'souple'), normalize(target, 'souple'));

  let verdict: SpeechVerdict;
  if (wordScore >= threshold) verdict = 'proche';
  else if (wordScore > 0 || charScore >= 0.5) verdict = 'partiel';
  else verdict = 'eloigne';

  return {
    verdict,
    accepted: verdict === 'proche',
    wordScore,
    charScore,
    words,
    transcript: transcript.trim(),
    target,
    disclaimer_fr: SPEECH_DISCLAIMER_FR,
  };
}
