import { describe, expect, it } from 'vitest';
import { normalize, stripDiacritics, tokenize } from './normalize';

describe('normalize', () => {
  it('reduit les espaces et unifie les apostrophes dans les deux modes', () => {
    expect(normalize("  Hoe   gaat het’s  ", 'strict')).toBe("Hoe gaat het's");
    expect(normalize('  Hoe   gaat het  ', 'souple')).toBe('hoe gaat het');
  });

  it('mode strict : conserve majuscules, accents et ponctuation', () => {
    expect(normalize('Ik ben één keer in België geweest.', 'strict')).toBe(
      'Ik ben één keer in België geweest.',
    );
  });

  it('mode souple : ignore majuscules, accents et ponctuation', () => {
    expect(normalize('Ik ben één keer in België geweest.', 'souple')).toBe(
      'ik ben een keer in belgie geweest',
    );
  });

  it('mode souple : traite les tirets comme des espaces', () => {
    expect(normalize('vijf-en-twintig', 'souple')).toBe('vijf en twintig');
  });

  it('mode souple : retire les apostrophes collees aux mots', () => {
    expect(normalize("'s ochtends", 'souple')).toBe('s ochtends');
  });

  it('stripDiacritics retire les accents sans toucher au reste', () => {
    expect(stripDiacritics('één café')).toBe('een cafe');
  });

  it('tokenize renvoie une liste vide pour une chaine vide', () => {
    expect(tokenize('   ', 'souple')).toEqual([]);
    expect(tokenize('Ik ben Jan.', 'souple')).toEqual(['ik', 'ben', 'jan']);
  });
});
