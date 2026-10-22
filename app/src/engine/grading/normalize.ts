/** Niveau de tolerance applique a la comparaison des reponses ecrites. */
export type Tolerance = 'strict' | 'souple';

const CURLY_QUOTES = /[‘’ʼ´`]/g;
const DASHES = /[‐-―]/g;
/** Ponctuation retiree en mode souple (les apostrophes sont traitees a part). */
const PUNCTUATION = /[.,;:!?"()[\]{}<>/\\|*_~+=#%&@$^]/g;

/** Nettoyage commun aux deux modes : espaces, guillemets, tirets exotiques. */
function baseClean(input: string): string {
  return input
    .normalize('NFC')
    .replace(CURLY_QUOTES, "'")
    .replace(DASHES, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Supprime les diacritiques : "één" -> "een", "café" -> "cafe". */
export function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Normalise une reponse avant comparaison.
 * - strict  : respecte majuscules, accents et ponctuation.
 * - souple  : ignore majuscules, accents, ponctuation et tirets.
 */
export function normalize(input: string, tolerance: Tolerance = 'souple'): string {
  const cleaned = baseClean(input);
  if (tolerance === 'strict') return cleaned;
  return stripDiacritics(cleaned)
    .toLowerCase()
    .replace(PUNCTUATION, ' ')
    .replace(/'/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Decoupe en mots apres normalisation. */
export function tokenize(input: string, tolerance: Tolerance = 'souple'): string[] {
  const normalized = normalize(input, tolerance);
  return normalized.length === 0 ? [] : normalized.split(' ');
}
