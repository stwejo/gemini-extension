import { describe, expect, it } from 'vitest';
import { gradeText } from './gradeText';

describe('gradeText', () => {
  it('accepte une reponse exacte', () => {
    const r = gradeText('Ik ben Jan.', ['Ik ben Jan.'], { tolerance: 'strict' });
    expect(r.verdict).toBe('correct');
    expect(r.accepted).toBe(true);
    expect(r.distance).toBe(0);
    expect(r.reasons_fr).toEqual([]);
  });

  it('mode souple : ignore majuscules, accents et ponctuation', () => {
    const r = gradeText('ik ben jan', ['Ik ben Jan.'], { tolerance: 'souple' });
    expect(r.verdict).toBe('correct');
  });

  it('mode strict : refuse une difference de majuscule mais la signale comme faute de frappe', () => {
    const r = gradeText('ik ben jan.', ['Ik ben Jan.'], { tolerance: 'strict' });
    expect(r.verdict).toBe('presque');
    expect(r.accepted).toBe(false);
  });

  it('accepte une faute de frappe en mode souple', () => {
    const r = gradeText('Goedemorgn', ['Goedemorgen'], { tolerance: 'souple' });
    expect(r.verdict).toBe('presque');
    expect(r.accepted).toBe(true);
  });

  it('refuse les fautes de frappe quand acceptTypos est desactive', () => {
    const r = gradeText('Goedemorgn', ['Goedemorgen'], {
      tolerance: 'souple',
      acceptTypos: false,
    });
    expect(r.verdict).toBe('incorrect');
    expect(r.accepted).toBe(false);
  });

  it('choisit la reponse modele la plus proche', () => {
    const r = gradeText('Ik kom uit Belgie', ['Ik kom uit Nederland', 'Ik kom uit Belgie']);
    expect(r.bestTarget).toBe('Ik kom uit Belgie');
    expect(r.verdict).toBe('correct');
  });

  it('explique un mot manquant', () => {
    const r = gradeText('Hoe het', ['Hoe gaat het']);
    expect(r.verdict).toBe('incorrect');
    expect(r.reasons_fr.join(' ')).toContain('gaat');
  });

  it('explique un mot remplace', () => {
    const r = gradeText('Ik woon in Nederland', ['Ik woon in Belgie']);
    expect(r.verdict).toBe('incorrect');
    expect(r.reasons_fr.some((m) => m.includes('belgie'))).toBe(true);
  });

  it('renvoie un retour mot par mot utilisable pour la couleur', () => {
    const r = gradeText('ik ben nu jan', ['ik ben jan']);
    expect(r.words.map((w) => w.status)).toEqual(['ok', 'ok', 'superflu', 'ok']);
  });

  it('refuse une liste de reponses modeles vide', () => {
    expect(() => gradeText('test', [])).toThrow();
  });
});

describe('tolérance aux fautes de frappe', () => {
  it('n accepte aucune approximation sur une réponse courte', () => {
    // La différence woon / woont est grammaticale : elle ne doit jamais passer.
    expect(gradeText('woont', ['woon']).accepted).toBe(false);
    expect(gradeText('het', ['de']).accepted).toBe(false);
    expect(gradeText('ben', ['bent']).accepted).toBe(false);
  });

  it('tolère une faute de frappe sur un mot long', () => {
    expect(gradeText('goedemorgn', ['goedemorgen']).accepted).toBe(true);
    expect(gradeText('alstubliefd', ['alstublieft']).accepted).toBe(true);
  });

  it('reste strict sur une phrase courte entière', () => {
    expect(gradeText('ik ben moe', ['ik ben moe']).accepted).toBe(true);
    expect(gradeText('ik bent moe', ['ik ben moe']).accepted).toBe(false);
  });
});
