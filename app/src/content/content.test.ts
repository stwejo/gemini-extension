import { describe, expect, it } from 'vitest';
import { validateContent } from './index';
import { IMPLEMENTED_EXERCISE_TYPES, type Unit, type VocabItem } from './schema';

const { units, issues } = validateContent();

function allVocab(unit: Unit): VocabItem[] {
  return unit.lessons.flatMap((lesson) =>
    lesson.steps.flatMap((step) => (step.type === 'vocab' ? step.items : [])),
  );
}

describe('contenu pedagogique', () => {
  it('respecte le schema zod', () => {
    expect(issues).toEqual([]);
  });

  it('contient au moins une unite', () => {
    expect(units.length).toBeGreaterThan(0);
  });

  it('a des identifiants d unite et de lecon uniques', () => {
    const unitIds = units.map((u) => u.id);
    expect(new Set(unitIds).size).toBe(unitIds.length);

    const lessonIds = units.flatMap((u) => u.lessons.map((l) => l.id));
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
  });

  it('prefixe chaque lecon par l identifiant de son unite', () => {
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        expect(lesson.id.startsWith(`${unit.id}-`)).toBe(true);
      }
    }
  });

  it('numerote les lecons de 1 a n sans trou', () => {
    for (const unit of units) {
      const orders = unit.lessons.map((l) => l.order).sort((a, b) => a - b);
      expect(orders).toEqual(orders.map((_, i) => i + 1));
    }
  });

  it('a des identifiants de vocabulaire uniques dans tout le cours', () => {
    const ids = units.flatMap((u) => allVocab(u).map((v) => v.id));
    const seen = new Set<string>();
    const duplicates = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(duplicates).toEqual([]);
  });

  it('donne son article a chaque nom', () => {
    const missing = units
      .flatMap(allVocab)
      .filter((v) => v.pos === 'nom' && !v.article)
      .map((v) => v.nl);
    expect(missing).toEqual([]);
  });

  it('n utilise que des types d exercices implementes par l UI', () => {
    const used = new Set<string>();
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        for (const step of lesson.steps) {
          if (step.type === 'practice') step.exercises.forEach((e) => used.add(e.type));
        }
      }
    }
    for (const type of used) {
      expect(IMPLEMENTED_EXERCISE_TYPES as readonly string[]).toContain(type);
    }
  });

  it('ne met en revision que du vocabulaire present dans la lecon', () => {
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        const known = new Set(
          lesson.steps.flatMap((step) => (step.type === 'vocab' ? step.items.map((i) => i.id) : [])),
        );
        const wrapups = lesson.steps.filter((s) => s.type === 'wrapup');
        for (const wrapup of wrapups) {
          if (wrapup.type !== 'wrapup') continue;
          for (const id of wrapup.addVocabIds) {
            expect(known, `${lesson.id} -> ${id}`).toContain(id);
          }
        }
      }
    }
  });

  it('ne reference que des regles definies dans le cours', () => {
    const ruleIds = new Set(
      units.flatMap((u) =>
        u.lessons.flatMap((l) => l.steps.flatMap((s) => (s.type === 'rule' ? [s.ruleId] : []))),
      ),
    );
    const referenced: string[] = [];
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        for (const step of lesson.steps) {
          if (step.type === 'practice') {
            step.exercises.forEach((e) => e.ruleId && referenced.push(e.ruleId));
          }
          if (step.type === 'wrapup') {
            step.addStructures.forEach((s) => s.ruleId && referenced.push(s.ruleId));
          }
        }
      }
    }
    for (const id of referenced) {
      expect([...ruleIds]).toContain(id);
    }
  });

  it('suit la sequence pedagogique : ecoute avant regle, pratique avant bilan', () => {
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        const types = lesson.steps.map((s) => s.type);
        const firstListen = types.indexOf('listen');
        const firstRule = types.indexOf('rule');
        const firstPractice = types.indexOf('practice');
        const wrapup = types.indexOf('wrapup');

        expect(firstListen, `${lesson.id} commence par une ecoute`).toBe(0);
        if (firstRule !== -1) {
          // La regle explicite arrive apres l'ecoute et apres la decouverte inductive.
          expect(firstRule).toBeGreaterThan(firstListen);
          const discover = types.indexOf('discover');
          if (discover !== -1) expect(discover).toBeLessThan(firstRule);
        }
        if (firstPractice !== -1 && firstRule !== -1) {
          expect(firstPractice).toBeGreaterThan(firstRule);
        }
        expect(wrapup, `${lesson.id} finit par un bilan`).toBe(types.length - 1);
      }
    }
  });

  it('limite le vocabulaire nouveau a 10 items par lecon', () => {
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        const count = lesson.steps
          .filter((s) => s.type === 'vocab')
          .reduce((sum, s) => (s.type === 'vocab' ? sum + s.items.length : sum), 0);
        expect(count, lesson.id).toBeLessThanOrEqual(10);
      }
    }
  });

  it('declare une phrase cible coherente dans les exercices de remise en ordre', () => {
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        for (const step of lesson.steps) {
          if (step.type !== 'practice') continue;
          for (const exercise of step.exercises) {
            if (exercise.type !== 'wordOrder') continue;
            const tokens = exercise.target.trim().split(/\s+/);
            expect(tokens.length, `${exercise.id} : au moins 3 mots`).toBeGreaterThanOrEqual(3);
            for (const alternative of exercise.alsoAccept) {
              expect(
                alternative.trim().split(/\s+/).length,
                `${exercise.id} : ordre alternatif de meme longueur`,
              ).toBe(tokens.length);
            }
          }
        }
      }
    }
  });
});
