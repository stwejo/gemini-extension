import { useState } from 'react';
import { PlayButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import { TokenDiffView } from './TokenDiffView';
import { gradeText, type TextGrade } from '@/engine/grading/gradeText';
import { useApp } from '@/context/AppContext';
import type { Exercise } from '@/content/schema';

type ErrorCorrection = Extract<Exercise, { type: 'errorCorrection' }>;

interface Props {
  exercise: ErrorCorrection;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

/** Une phrase fausse a reecrire correctement. */
export function ErrorCorrectionExercise({ exercise, onAnswer }: Props) {
  const { settings } = useApp();
  const [value, setValue] = useState('');
  const [grade, setGrade] = useState<TextGrade | null>(null);

  const check = () => {
    if (grade) return;
    const result = gradeText(value, exercise.correct, { tolerance: settings.tolerance, acceptTypos: false });
    setGrade(result);
    onAnswer(result.accepted, value);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">Cette phrase contient une erreur. Corrige-la.</p>
      <div className="card border-rose-200 bg-rose-50">
        <p lang="nl" className="text-lg line-through decoration-rose-400">
          {exercise.wrong}
        </p>
        <p className="text-sm text-slate-700">{exercise.fr}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          check();
        }}
        className="space-y-2"
      >
        <label className="label" htmlFor={`fix-${exercise.id}`}>
          Phrase corrigée
        </label>
        <textarea
          id={`fix-${exercise.id}`}
          className="input min-h-20"
          lang="nl"
          value={value}
          disabled={grade !== null}
          onChange={(event) => setValue(event.target.value)}
        />
        {grade === null ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setValue(exercise.wrong)}
              disabled={value.length > 0}
            >
              Copier la phrase
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={value.trim().length === 0}>
              Vérifier
            </button>
          </div>
        ) : null}
      </form>

      {grade ? (
        <Feedback
          tone={grade.verdict}
          title={grade.accepted ? 'Corrigé !' : 'Ce n’est pas encore corrigé.'}
          expected={grade.accepted ? undefined : grade.bestTarget}
          reasons={[...grade.reasons_fr, ...(exercise.explain_fr ? [exercise.explain_fr] : [])]}
          ruleId={grade.accepted ? null : exercise.ruleId}
        >
          <TokenDiffView words={grade.words} />
          <p className="mt-2 flex items-center gap-2 text-sm">
            <PlayButton text={grade.bestTarget} size="sm" />
            <span lang="nl" className="font-medium">
              {grade.bestTarget}
            </span>
          </p>
        </Feedback>
      ) : null}
    </div>
  );
}
