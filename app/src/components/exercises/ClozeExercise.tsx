import { useState } from 'react';
import { PlayButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import { gradeText, type TextGrade } from '@/engine/grading/gradeText';
import { useApp } from '@/context/AppContext';
import type { Exercise } from '@/content/schema';

type Cloze = Extract<Exercise, { type: 'cloze' }>;

interface Props {
  exercise: Cloze;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

/** Texte a trous : de/het, conjugaison, prepositions. */
export function ClozeExercise({ exercise, onAnswer }: Props) {
  const { settings } = useApp();
  const [value, setValue] = useState('');
  const [grade, setGrade] = useState<TextGrade | null>(null);

  const [before, after] = exercise.sentence.split('___');
  const filled = exercise.sentence.replace('___', exercise.answers[0]);

  const check = (answer: string) => {
    if (grade) return;
    const result = gradeText(answer, exercise.answers, { tolerance: settings.tolerance, acceptTypos: false });
    setGrade(result);
    onAnswer(result.accepted, answer);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">Complète la phrase</p>
      <p className="card bg-slate-50 text-lg" lang="nl">
        {before}
        <span className="mx-1 inline-block min-w-20 border-b-2 border-brand-600 px-2 text-center font-semibold">
          {grade ? (grade.accepted ? value : exercise.answers[0]) : value || '…'}
        </span>
        {after}
      </p>
      <p className="text-slate-600">{exercise.fr}</p>

      {exercise.choices.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {exercise.choices.map((choice) => (
            <li key={choice}>
              <button
                type="button"
                disabled={grade !== null}
                onClick={() => {
                  setValue(choice);
                  check(choice);
                }}
                className="chip min-h-11 px-4 text-lg hover:bg-slate-100"
                lang="nl"
              >
                {choice}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            check(value);
          }}
          className="space-y-2"
        >
          <label className="label" htmlFor={`cloze-${exercise.id}`}>
            Mot manquant
          </label>
          <input
            id={`cloze-${exercise.id}`}
            className="input"
            lang="nl"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
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
      )}

      {grade ? (
        <Feedback
          tone={grade.verdict}
          title={grade.accepted ? 'Correct !' : 'Pas encore.'}
          expected={grade.accepted ? undefined : exercise.answers[0]}
          reasons={exercise.explain_fr ? [exercise.explain_fr] : []}
          ruleId={grade.accepted ? null : exercise.ruleId}
        >
          <p className="mt-2 flex items-center gap-2 text-sm">
            <PlayButton text={filled} size="sm" />
            <span lang="nl" className="font-medium">
              {filled}
            </span>
          </p>
        </Feedback>
      ) : null}
    </div>
  );
}
