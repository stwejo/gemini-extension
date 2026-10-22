import { LEVELS, UnitSchema, type Level, type Lesson, type Unit } from './schema';

/**
 * Chargement du contenu. Les JSON sont importes a la compilation (import.meta.glob)
 * puis valides une seule fois contre le schema zod.
 */
const rawUnits = import.meta.glob<{ default: unknown }>('./*/*.json', { eager: true });

export interface ContentIssue {
  file: string;
  message: string;
}

export interface ValidationResult {
  units: Unit[];
  issues: ContentIssue[];
}

function levelRank(level: Level): number {
  return LEVELS.indexOf(level);
}

/** Valide chaque fichier et renvoie les unites triees + la liste des problemes. */
export function validateContent(): ValidationResult {
  const units: Unit[] = [];
  const issues: ContentIssue[] = [];

  for (const [file, module] of Object.entries(rawUnits)) {
    const parsed = UnitSchema.safeParse(module.default);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({ file, message: `${issue.path.join('.') || '(racine)'} : ${issue.message}` });
      }
      continue;
    }
    units.push(parsed.data);
  }

  units.sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.order - b.order);
  return { units, issues };
}

let cache: Unit[] | null = null;

/** Unites valides, triees par niveau puis par ordre. */
export function getCourse(): Unit[] {
  if (cache) return cache;
  const { units, issues } = validateContent();
  if (issues.length > 0 && import.meta.env.DEV) {
    console.error('Contenu invalide :', issues);
  }
  cache = units;
  return cache;
}

export function getUnitsByLevel(level: Level): Unit[] {
  return getCourse().filter((unit) => unit.level === level);
}

export function getUnit(unitId: string): Unit | undefined {
  return getCourse().find((unit) => unit.id === unitId);
}

export interface LessonLocation {
  unit: Unit;
  lesson: Lesson;
}

export function getLesson(lessonId: string): LessonLocation | undefined {
  for (const unit of getCourse()) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) return { unit, lesson };
  }
  return undefined;
}

/** Toutes les lecons du cours, dans l'ordre pedagogique. */
export function getAllLessons(): LessonLocation[] {
  return getCourse().flatMap((unit) =>
    [...unit.lessons]
      .sort((a, b) => a.order - b.order)
      .map((lesson) => ({ unit, lesson })),
  );
}

export * from './schema';
