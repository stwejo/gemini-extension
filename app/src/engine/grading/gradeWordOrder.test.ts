import { describe, expect, it } from 'vitest';
import {
  buildTokenPool,
  gradeWordOrder,
  shuffleTokens,
  targetTokens,
} from './gradeWordOrder';

describe('gradeWordOrder', () => {
  it('accepte l ordre correct en ignorant majuscules et ponctuation', () => {
    const r = gradeWordOrder(['ik', 'woon', 'in', 'Luik'], 'Ik woon in Luik.');
    expect(r.accepted).toBe(true);
    expect(r.firstErrorIndex).toBe(-1);
  });

  it('signale la position de la premiere erreur', () => {
    const r = gradeWordOrder(['Ik', 'in', 'woon', 'Luik'], 'Ik woon in Luik.');
    expect(r.accepted).toBe(false);
    expect(r.firstErrorIndex).toBe(1);
    expect(r.reasons_fr[0]).toContain('Position 2');
  });

  it('accepte un ordre alternatif declare dans le contenu', () => {
    const r = gradeWordOrder(
      ['Morgen', 'ga', 'ik', 'naar', 'Amsterdam'],
      'Ik ga morgen naar Amsterdam.',
      ['Morgen ga ik naar Amsterdam.'],
    );
    expect(r.accepted).toBe(true);
    expect(r.bestTarget).toBe('Morgen ga ik naar Amsterdam.');
  });

  it('signale un mot manquant', () => {
    const r = gradeWordOrder(['Ik', 'woon', 'Luik'], 'Ik woon in Luik.');
    expect(r.accepted).toBe(false);
    expect(r.reasons_fr.join(' ')).toContain('in');
  });

  it('signale un mot en trop', () => {
    const r = gradeWordOrder(['Ik', 'woon', 'in', 'Luik', 'niet'], 'Ik woon in Luik.');
    expect(r.accepted).toBe(false);
    expect(r.reasons_fr.join(' ')).toContain('trop');
  });

  it('garde la phrase alternative la plus proche pour expliquer l erreur', () => {
    const r = gradeWordOrder(
      ['Ik', 'ga', 'naar', 'morgen', 'Amsterdam'],
      'Ik ga morgen naar Amsterdam.',
      ['Morgen ga ik naar Amsterdam.'],
    );
    expect(r.bestTarget).toBe('Ik ga morgen naar Amsterdam.');
    expect(r.firstErrorIndex).toBe(2);
  });
});

describe('pool de jetons', () => {
  it('targetTokens decoupe sur les espaces', () => {
    expect(targetTokens('Ik woon in Luik.')).toEqual(['Ik', 'woon', 'in', 'Luik.']);
  });

  it('shuffleTokens est deterministe pour une meme graine', () => {
    const a = shuffleTokens([1, 2, 3, 4, 5], 42);
    const b = shuffleTokens([1, 2, 3, 4, 5], 42);
    expect(a).toEqual(b);
    expect(a).not.toEqual([1, 2, 3, 4, 5]);
  });

  it('buildTokenPool contient tous les mots et les distracteurs', () => {
    const pool = buildTokenPool('Ik woon in Luik.', ['niet'], 3);
    expect(pool).toHaveLength(5);
    expect([...pool].sort()).toEqual(['Ik', 'Luik.', 'in', 'niet', 'woon'].sort());
  });

  it('buildTokenPool ne rend jamais la phrase deja dans le bon ordre', () => {
    for (let seed = 1; seed < 60; seed += 1) {
      const pool = buildTokenPool('Ik woon in Luik.', [], seed);
      expect(pool.join(' ')).not.toBe('Ik woon in Luik.');
    }
  });
});
