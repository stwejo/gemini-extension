import { useState } from 'react';
import { PlayButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import { TokenDiffView } from './TokenDiffView';
import { gradeText, type TextGrade } from '@/engine/grading/gradeText';
import { useApp } from '@/context/AppContext';
import type { Exercise } from '@/content/schema';

type Translate = Extract<Exercise, { type: 'translate' }>;

interface Props {
  exercise: Translate;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

/** Traduction FR -> NL ou NL -> FR. */
export function TranslateExercise({ exercise, onAnswer }: Props) {
  const { settings } = useApp();
  const [value, setValue] = useState('');
  const [grade, setGrade] = useState<TextGrade | null>(null);

  const toDutch = exercise.direction === 'fr-nl';

  const check = () => {
    if (grade) return;
    // Le francais accepte plus de variantes : on reste souple dans ce sens.
    const result = gradeText(value, exercise.expected, {
      tolerance: toDutch ? settings.tolerance : 'souple',
    });
    setGrade(result);
    onAnswer(result.accepted, value);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">
        {toDutch ? 'Traduis en néerlandais' : 'Traduis en français'}
      </p>
      <div className="card bg-slate-50">
        <div className="flex items-start gap-2">
          {toDutch ? null : <PlayButton text={exercise.prompt} size="sm" />}
          <p lang={toDutch ? 'fr' : 'nl'} className="text-lg">
            {exercise.prompt}
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          check();
        }}
        className="space-y-2"
      >
        <label className="label" htmlFor={`translate-${exercise.id}`}>
          Ta traduction
        </label>
        <textarea
          id={`translate-${exercise.id}`}
          className="input min-h-20"
          lang={toDutch ? 'nl' : 'fr'}
          value={value}
          disabled={grade !== null}
          onChange={(event) => setValue(event.target.value)}
        />
        {grade === null ? (
          <button type="submit" className="btn-primary w-full" disabled={value.trim().length === 0}>
            Vérifier
          </button>
        ) : null}
      </form>

      {grade ? (
        <Feedback
          tone={grade.verdict}
          title={
            grade.verdict === 'correct'
              ? 'Correct !'
              : grade.accepted
                ? 'Accepté, à un détail près.'
                : 'Pas encore.'
          }
          expected={grade.verdict === 'correct' ? undefined : grade.bestTarget}
          reasons={[...grade.reasons_fr, ...(exercise.explain_fr ? [exercise.explain_fr] : [])]}
          ruleId={grade.accepted ? null : exercise.ruleId}
        >
          <TokenDiffView words={grade.words} />
          {exercise.expected.length > 1 ? (
            <p className="mt-2 text-sm">
              Autres traductions acceptées : {exercise.expected.slice(1).join(' · ')}
            </p>
          ) : null}
          {toDutch ? (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <PlayButton text={grade.bestTarget} size="sm" />
              <span lang="nl" className="font-medium">
                {grade.bestTarget}
              </span>
            </p>
          ) : null}
        </Feedback>
      ) : null}
    </div>
  );
}
