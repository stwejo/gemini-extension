import { describe, expect, it } from 'vitest';
import { alignTokens, levenshtein, similarity } from './levenshtein';

describe('levenshtein', () => {
  it('renvoie 0 pour deux chaines identiques', () => {
    expect(levenshtein('goedemorgen', 'goedemorgen')).toBe(0);
  });

  it('compte insertions, suppressions et substitutions', () => {
    expect(levenshtein('man', 'maan')).toBe(1);
    expect(levenshtein('huis', 'huizen')).toBe(3);
    expect(levenshtein('', 'ja')).toBe(2);
  });

  it('similarity vaut 1 pour deux chaines vides', () => {
    expect(similarity('', '')).toBe(1);
    expect(similarity('man', 'maan')).toBeCloseTo(0.75, 5);
  });
});

describe('alignTokens', () => {
  it('marque tous les mots corrects', () => {
    const diff = alignTokens(['ik', 'ben', 'jan'], ['ik', 'ben', 'jan']);
    expect(diff.map((d) => d.status)).toEqual(['ok', 'ok', 'ok']);
  });

  it('detecte un mot manquant', () => {
    const diff = alignTokens(['hoe', 'gaat', 'het'], ['hoe', 'het']);
    expect(diff.map((d) => d.status)).toEqual(['ok', 'manquant', 'ok']);
    expect(diff[1].expected).toBe('gaat');
  });

  it('detecte un mot en trop', () => {
    const diff = alignTokens(['ik', 'woon', 'in', 'luik'], ['ik', 'woon', 'nu', 'in', 'luik']);
    expect(diff.map((d) => d.status)).toEqual(['ok', 'ok', 'superflu', 'ok', 'ok']);
    expect(diff[2].got).toBe('nu');
  });

  it('qualifie une faute de frappe de "proche" et une erreur de mot de "faux"', () => {
    const typo = alignTokens(['goedemorgen'], ['goedemorgn']);
    expect(typo[0].status).toBe('proche');

    const wrong = alignTokens(['goedemorgen'], ['tot ziens']);
    expect(wrong[0].status).toBe('faux');
  });
});
