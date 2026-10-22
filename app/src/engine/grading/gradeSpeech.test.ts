import { describe, expect, it } from 'vitest';
import { gradeSpeech } from './gradeSpeech';

describe('gradeSpeech', () => {
  it('valide une transcription identique', () => {
    const r = gradeSpeech('Goedemorgen, hoe gaat het?', 'Goedemorgen, hoe gaat het?');
    expect(r.verdict).toBe('proche');
    expect(r.accepted).toBe(true);
    expect(r.wordScore).toBe(1);
  });

  it('ignore majuscules, accents et ponctuation', () => {
    const r = gradeSpeech('goedemorgen hoe gaat het', 'Goedemorgen, hoe gaat het?');
    expect(r.accepted).toBe(true);
  });

  it('accepte une transcription à un mot près', () => {
    const r = gradeSpeech('ik woon in Luik nu', 'Ik woon in Luik.');
    expect(r.wordScore).toBe(1);
    expect(r.accepted).toBe(true);
    expect(r.words.some((w) => w.status === 'superflu')).toBe(true);
  });

  it('refuse quand la moitié des mots manque', () => {
    const r = gradeSpeech('ik woon', 'Ik woon in Luik.');
    expect(r.wordScore).toBe(0.5);
    expect(r.accepted).toBe(false);
    expect(r.verdict).toBe('partiel');
  });

  it('compte un mot presque identique pour la moitié', () => {
    const r = gradeSpeech('goedemorgn', 'goedemorgen');
    expect(r.wordScore).toBe(0.5);
    expect(r.words[0].status).toBe('proche');
  });

  it('signale une phrase totalement différente', () => {
    const r = gradeSpeech('bonjour tout le monde', 'Ik woon in Luik.');
    expect(r.verdict).toBe('eloigne');
    expect(r.accepted).toBe(false);
  });

  it('gère une transcription vide', () => {
    const r = gradeSpeech('', 'Ik woon in Luik.');
    expect(r.wordScore).toBe(0);
    expect(r.accepted).toBe(false);
    expect(r.words.every((w) => w.status === 'manquant')).toBe(true);
  });

  it('respecte un seuil personnalisé', () => {
    const r = gradeSpeech('ik woon in', 'Ik woon in Luik.', { threshold: 0.75 });
    expect(r.wordScore).toBe(0.75);
    expect(r.accepted).toBe(true);
  });

  it('accompagne toujours le résultat d un avertissement honnête', () => {
    expect(gradeSpeech('x', 'y').disclaimer_fr).toContain('estimation');
  });
});
