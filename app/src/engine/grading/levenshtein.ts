/** Distance d'edition entre deux chaines (insertion, suppression, substitution). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1, // insertion
        previous[j] + 1, // suppression
        previous[j - 1] + cost, // substitution
      );
    }
    [previous, current] = [current, previous];
  }
  return previous[b.length];
}

/** Similarite 0..1 : 1 = identique. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

export type TokenStatus = 'ok' | 'proche' | 'faux' | 'manquant' | 'superflu';

export interface TokenDiff {
  /** Mot attendu, absent si l'utilisateur a ajoute un mot. */
  expected?: string;
  /** Mot fourni, absent si l'utilisateur a oublie un mot. */
  got?: string;
  status: TokenStatus;
}

/**
 * Aligne deux listes de mots (Levenshtein au niveau du mot) et qualifie chaque
 * position. Sert au retour mot par mot (vert / orange / rouge) de la dictee et,
 * en phase 2, de la repetition orale.
 */
export function alignTokens(
  expected: string[],
  got: string[],
  closeThreshold = 0.7,
): TokenDiff[] {
  const n = expected.length;
  const m = got.length;
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = 0; i <= n; i += 1) cost[i][0] = i;
  for (let j = 0; j <= m; j += 1) cost[0][j] = j;

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const sub = expected[i - 1] === got[j - 1] ? 0 : 1;
      cost[i][j] = Math.min(cost[i - 1][j] + 1, cost[i][j - 1] + 1, cost[i - 1][j - 1] + sub);
    }
  }

  const diff: TokenDiff[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const sub = i > 0 && j > 0 ? (expected[i - 1] === got[j - 1] ? 0 : 1) : Number.POSITIVE_INFINITY;
    if (i > 0 && j > 0 && cost[i][j] === cost[i - 1][j - 1] + sub) {
      const exp = expected[i - 1];
      const actual = got[j - 1];
      const status: TokenStatus =
        exp === actual ? 'ok' : similarity(exp, actual) >= closeThreshold ? 'proche' : 'faux';
      diff.push({ expected: exp, got: actual, status });
      i -= 1;
      j -= 1;
    } else if (i > 0 && cost[i][j] === cost[i - 1][j] + 1) {
      diff.push({ expected: expected[i - 1], status: 'manquant' });
      i -= 1;
    } else {
      diff.push({ got: got[j - 1], status: 'superflu' });
      j -= 1;
    }
  }
  return diff.reverse();
}
