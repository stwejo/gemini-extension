import { useState } from 'react';
import { PlayButton, WordByWordButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import { TokenDiffView } from './TokenDiffView';
import { gradeText, type TextGrade } from '@/engine/grading/gradeText';
import { useApp } from '@/context/AppContext';
import type { Exercise } from '@/content/schema';

type Dictation = Extract<Exercise, { type: 'dictation' }>;

interface Props {
  exercise: Dictation;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

/** Ecoute puis ecriture de la phrase entendue. */
export function DictationExercise({ exercise, onAnswer }: Props) {
  const { settings } = useApp();
  const [value, setValue] = useState('');
  const [grade, setGrade] = useState<TextGrade | null>(null);

  const tolerance = exercise.tolerance ?? settings.tolerance;

  const check = () => {
    if (grade) return;
    const result = gradeText(value, [exercise.audioNl], { tolerance });
    setGrade(result);
    onAnswer(result.accepted, value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PlayButton text={exercise.audioNl} variant="primary" size="lg">
          Écouter
        </PlayButton>
        <PlayButton text={exercise.audioNl} rate={0.6} size="sm">
          Lent
        </PlayButton>
        <WordByWordButton text={exercise.audioNl} />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          check();
        }}
        className="space-y-3"
      >
        <label className="label" htmlFor={`dictation-${exercise.id}`}>
          Écris ce que tu entends
        </label>
        <input
          id={`dictation-${exercise.id}`}
          className="input"
          lang="nl"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          disabled={grade !== null}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="text-sm text-slate-600">
          Sens : {exercise.fr}
          {tolerance === 'souple' ? ' · accents et majuscules tolérés' : ' · orthographe exacte exigée'}
        </p>
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
          expected={grade.verdict === 'correct' ? undefined : exercise.audioNl}
          reasons={[...grade.reasons_fr, ...(exercise.explain_fr ? [exercise.explain_fr] : [])]}
          ruleId={grade.accepted ? null : exercise.ruleId}
        >
          <TokenDiffView words={grade.words} />
        </Feedback>
      ) : null}
    </div>
  );
}
