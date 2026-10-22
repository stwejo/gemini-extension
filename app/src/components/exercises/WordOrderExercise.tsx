import { useMemo, useState } from 'react';
import { PlayButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import {
  buildTokenPool,
  gradeWordOrder,
  type WordOrderGrade,
} from '@/engine/grading/gradeWordOrder';
import type { Exercise } from '@/content/schema';

type WordOrder = Extract<Exercise, { type: 'wordOrder' }>;

interface Props {
  exercise: WordOrder;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

interface Token {
  key: string;
  word: string;
}

/** Remettre les mots dans l'ordre : exercice cle pour l'ordre des mots neerlandais. */
export function WordOrderExercise({ exercise, onAnswer }: Props) {
  // Graine stable par exercice : l'ordre propose ne change pas a chaque rendu.
  const pool = useMemo<Token[]>(() => {
    const seed = exercise.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 7);
    return buildTokenPool(exercise.target, exercise.extraTokens, seed).map((word, index) => ({
      key: `${word}-${index}`,
      word,
    }));
  }, [exercise.id, exercise.target, exercise.extraTokens]);

  const [chosen, setChosen] = useState<Token[]>([]);
  const [grade, setGrade] = useState<WordOrderGrade | null>(null);

  const remaining = pool.filter((token) => !chosen.some((c) => c.key === token.key));

  const check = () => {
    if (grade) return;
    const result = gradeWordOrder(
      chosen.map((token) => token.word),
      exercise.target,
      exercise.alsoAccept,
    );
    setGrade(result);
    onAnswer(result.accepted, chosen.map((token) => token.word).join(' '));
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">Remets les mots dans l'ordre</p>
      <p className="text-slate-700">{exercise.fr}</p>

      <div
        className="min-h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white p-2"
        aria-label="Ta phrase"
      >
        <div className="flex flex-wrap gap-2">
          {chosen.length === 0 ? (
            <span className="p-1 text-sm text-slate-400">Touche les mots ci-dessous</span>
          ) : null}
          {chosen.map((token, index) => {
            const isError = grade !== null && !grade.accepted && index === grade.firstErrorIndex;
            return (
              <button
                key={token.key}
                type="button"
                disabled={grade !== null}
                onClick={() => setChosen(chosen.filter((c) => c.key !== token.key))}
                className={`chip min-h-10 ${isError ? 'border-rose-400 bg-rose-50' : 'bg-brand-50'}`}
                aria-label={`Retirer ${token.word}`}
                lang="nl"
              >
                {token.word}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Mots disponibles">
        {remaining.map((token) => (
          <button
            key={token.key}
            type="button"
            disabled={grade !== null}
            onClick={() => setChosen([...chosen, token])}
            className="chip min-h-10 hover:bg-slate-100"
            lang="nl"
          >
            {token.word}
          </button>
        ))}
      </div>

      {grade === null ? (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setChosen([])}
            disabled={chosen.length === 0}
          >
            Effacer
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={check}
            disabled={chosen.length === 0}
          >
            Vérifier
          </button>
        </div>
      ) : null}

      {exercise.hint_fr && grade === null ? (
        <details className="text-sm text-slate-600">
          <summary className="cursor-pointer underline">Indice</summary>
          <p className="mt-1">{exercise.hint_fr}</p>
        </details>
      ) : null}

      {grade ? (
        <Feedback
          tone={grade.accepted ? 'correct' : 'incorrect'}
          title={grade.accepted ? 'Correct !' : 'L’ordre n’est pas bon.'}
          expected={grade.accepted ? undefined : grade.bestTarget}
          reasons={[...grade.reasons_fr, ...(exercise.explain_fr ? [exercise.explain_fr] : [])]}
          ruleId={grade.accepted ? null : exercise.ruleId}
        >
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
