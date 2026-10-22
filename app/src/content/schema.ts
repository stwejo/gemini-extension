import { z } from 'zod';

/**
 * Schema du contenu pedagogique. Le contenu vit dans des fichiers JSON
 * (src/content/{niveau}/{unite}.json) et n'est jamais code en dur dans l'UI.
 * Toute incoherence fait echouer `npm run validate:content`.
 */

export const LEVELS = ['A0', 'A1', 'A2', 'B1'] as const;
export const LevelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof LevelSchema>;

export const VARIANTS = ['nl-NL', 'nl-BE'] as const;
export const VariantSchema = z.enum(VARIANTS);
export type Variant = z.infer<typeof VariantSchema>;

const Id = z
  .string()
  .min(2)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'identifiant en minuscules, chiffres et tirets');
const Text = z.string().min(1);

/** Couple neerlandais / francais, utilise partout. */
export const PairSchema = z.object({
  nl: Text,
  fr: Text,
  note_fr: z.string().optional(),
});
export type Pair = z.infer<typeof PairSchema>;

/** Difference nl-NL / nl-BE quand elle est pertinente. */
export const VariantNoteSchema = z.object({
  nlNL: z.string().optional(),
  nlBE: z.string().optional(),
  note_fr: z.string().optional(),
});

export const POS = [
  'nom',
  'nom-propre',
  'verbe',
  'adjectif',
  'adverbe',
  'pronom',
  'preposition',
  'conjonction',
  'numeral',
  'expression',
  'interjection',
] as const;

export const VocabItemSchema = z
  .object({
    id: Id,
    nl: Text,
    fr: Text,
    pos: z.enum(POS),
    /** Obligatoire pour les noms : de / het. */
    article: z.enum(['de', 'het']).optional(),
    plural: z.string().optional(),
    examples: z.array(PairSchema).default([]),
    variant: VariantNoteSchema.optional(),
    /** Aide de prononciation en francais, approximative et signalee comme telle dans l'UI. */
    pronHint_fr: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /** true = element a faire relire par un locuteur natif avant publication. */
    needsReview: z.boolean().default(false),
  })
  .superRefine((item, ctx) => {
    if (item.pos === 'nom' && !item.article) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `le nom "${item.nl}" doit porter son article (de/het)`,
        path: ['article'],
      });
    }
  });
export type VocabItem = z.infer<typeof VocabItemSchema>;

/** QCM texte, utilise pour la comprehension et la decouverte inductive. */
export const McqSchema = z
  .object({
    id: Id,
    question_fr: Text,
    choices: z.array(Text).min(2),
    answerIndex: z.number().int().min(0),
    explain_fr: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    if (q.answerIndex >= q.choices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'answerIndex hors de la liste des choix',
        path: ['answerIndex'],
      });
    }
  });
export type Mcq = z.infer<typeof McqSchema>;

const ExerciseBase = {
  id: Id,
  /** Regle concernee : sert a renvoyer vers l'explication en cas d'erreur. */
  ruleId: z.string().optional(),
  /** Etiquettes d'erreur, exploitees par la revision espacee (phase 2). */
  errorTags: z.array(z.string()).default([]),
  hint_fr: z.string().optional(),
  explain_fr: z.string().optional(),
};

/** Ecoute puis choix d'une traduction / d'une reponse. */
export const McqAudioExerciseSchema = z.object({
  ...ExerciseBase,
  type: z.literal('mcqAudio'),
  audioNl: Text,
  question_fr: Text,
  choices: z.array(Text).min(2),
  choicesLang: z.enum(['fr', 'nl']).default('fr'),
  answerIndex: z.number().int().min(0),
});

/** Ecoute puis ecriture de la phrase entendue. */
export const DictationExerciseSchema = z.object({
  ...ExerciseBase,
  type: z.literal('dictation'),
  audioNl: Text,
  fr: Text,
  /** Tolerance imposee par le contenu ; sinon celle des reglages s'applique. */
  tolerance: z.enum(['strict', 'souple']).optional(),
});

/** Remettre les mots dans l'ordre (ordre des mots neerlandais). */
export const WordOrderExerciseSchema = z.object({
  ...ExerciseBase,
  type: z.literal('wordOrder'),
  /** Phrase correcte ; les jetons proposes en sont deduits. */
  target: Text,
  fr: Text,
  /** Autres ordres acceptes (le neerlandais en autorise plusieurs). */
  alsoAccept: z.array(Text).default([]),
  /** Jetons supplementaires servant de distracteurs. */
  extraTokens: z.array(Text).default([]),
});

export const ExerciseSchema = z
  .discriminatedUnion('type', [
    McqAudioExerciseSchema,
    DictationExerciseSchema,
    WordOrderExerciseSchema,
  ])
  .superRefine((ex, ctx) => {
    if (ex.type === 'mcqAudio' && ex.answerIndex >= ex.choices.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'answerIndex hors de la liste des choix',
        path: ['answerIndex'],
      });
    }
  });
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseType = Exercise['type'];

/** Types d'exercices reellement implementes par l'UI (verifie par la validation). */
export const IMPLEMENTED_EXERCISE_TYPES = ['mcqAudio', 'dictation', 'wordOrder'] as const;

const StepBase = { id: Id };

export const ListenStepSchema = z.object({
  ...StepBase,
  type: z.literal('listen'),
  situation_fr: Text,
  lines: z
    .array(
      z.object({
        speaker: Text,
        nl: Text,
        fr: Text,
        note_fr: z.string().optional(),
      }),
    )
    .min(2),
});

export const ComprehensionStepSchema = z.object({
  ...StepBase,
  type: z.literal('comprehension'),
  items: z.array(McqSchema).min(1),
});

export const RepeatStepSchema = z.object({
  ...StepBase,
  type: z.literal('repeat'),
  instructions_fr: z.string().optional(),
  chunks: z
    .array(
      z.object({
        nl: Text,
        fr: Text,
        hint_fr: z.string().optional(),
      }),
    )
    .min(1),
});

export const VocabStepSchema = z.object({
  ...StepBase,
  type: z.literal('vocab'),
  items: z.array(VocabItemSchema).min(1).max(10),
});

/** Decouverte inductive : on observe des exemples deja entendus avant de nommer la regle. */
export const DiscoverStepSchema = z.object({
  ...StepBase,
  type: z.literal('discover'),
  intro_fr: z.string().optional(),
  examples: z
    .array(
      z.object({
        nl: Text,
        fr: Text,
        /** Fragments a mettre en evidence dans la phrase neerlandaise. */
        highlight: z.array(Text).default([]),
      }),
    )
    .min(2),
  question: McqSchema,
  reveal_fr: Text,
});

export const RuleStepSchema = z.object({
  ...StepBase,
  type: z.literal('rule'),
  /** Identifiant stable : reference par les exercices et les fiches de grammaire. */
  ruleId: Id,
  title_fr: Text,
  body_fr: Text,
  examples: z.array(PairSchema).min(1),
  /** Exceptions : toujours explicitees quand la regle en a. */
  exceptions_fr: z.array(Text).default([]),
  needsReview: z.boolean().default(false),
});

export const PracticeStepSchema = z.object({
  ...StepBase,
  type: z.literal('practice'),
  exercises: z.array(ExerciseSchema).min(1),
});

export const ProductionStepSchema = z.object({
  ...StepBase,
  type: z.literal('production'),
  prompts: z
    .array(
      z.object({
        id: Id,
        task_fr: Text,
        /** Reponses modeles ; la premiere sert de correction affichee. */
        expected: z.array(Text).min(1),
        /** true = on accepte toute production et on montre un modele (auto-evaluation). */
        acceptAny: z.boolean().default(false),
        tip_fr: z.string().optional(),
      }),
    )
    .min(1),
});

export const WrapupStepSchema = z.object({
  ...StepBase,
  type: z.literal('wrapup'),
  summary_fr: Text,
  /** Ajoute a la revision espacee : ids de vocabulaire et structures a retenir. */
  addVocabIds: z.array(Id).default([]),
  addStructures: z
    .array(
      z.object({
        id: Id,
        nl: Text,
        fr: Text,
        ruleId: z.string().optional(),
      }),
    )
    .default([]),
});

export const StepSchema = z.discriminatedUnion('type', [
  ListenStepSchema,
  ComprehensionStepSchema,
  RepeatStepSchema,
  VocabStepSchema,
  DiscoverStepSchema,
  RuleStepSchema,
  PracticeStepSchema,
  ProductionStepSchema,
  WrapupStepSchema,
]);
export type Step = z.infer<typeof StepSchema>;
export type StepType = Step['type'];

export const LessonSchema = z.object({
  id: Id,
  order: z.number().int().min(1),
  title_fr: Text,
  title_nl: z.string().optional(),
  goals_fr: z.array(Text).min(1),
  minutes: z.number().int().min(5).max(25),
  steps: z.array(StepSchema).min(3),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const UnitSchema = z.object({
  id: Id,
  level: LevelSchema,
  order: z.number().int().min(1),
  theme: Text,
  title_fr: Text,
  description_fr: Text,
  lessons: z.array(LessonSchema).min(1),
});
export type Unit = z.infer<typeof UnitSchema>;
