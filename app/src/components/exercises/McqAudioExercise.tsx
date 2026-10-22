import { useState } from 'react';
import { PlayButton, WordByWordButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import type { Exercise } from '@/content/schema';

type McqAudio = Extract<Exercise, { type: 'mcqAudio' }>;

interface Props {
  exercise: McqAudio;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

/** Ecoute puis choix de la bonne reponse. */
export function McqAudioExercise({ exercise, onAnswer }: Props) {
  const [chosen, setChosen] = useState<number | null>(null);
  const answered = chosen !== null;
  const correct = chosen === exercise.answerIndex;

  const choose = (index: number) => {
    if (answered) return;
    setChosen(index);
    onAnswer(index === exercise.answerIndex, exercise.choices[index]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <PlayButton text={exercise.audioNl} variant="primary" size="lg">
          Écouter
        </PlayButton>
        <WordByWordButton text={exercise.audioNl} />
      </div>
      <p className="text-lg font-medium">{exercise.question_fr}</p>
      <ul className="space-y-2">
        {exercise.choices.map((choice, index) => {
          const isAnswer = index === exercise.answerIndex;
          const isChosen = index === chosen;
          let tone = 'border-slate-300 bg-white';
          if (answered && isAnswer) tone = 'border-emerald-400 bg-emerald-50';
          else if (answered && isChosen) tone = 'border-rose-400 bg-rose-50';
          return (
            <li key={choice}>
              <button
                type="button"
                onClick={() => choose(index)}
                disabled={answered}
                aria-pressed={isChosen}
                className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 py-3 text-left disabled:opacity-100 ${tone}`}
              >
                <span lang={exercise.choicesLang === 'nl' ? 'nl' : 'fr'}>{choice}</span>
                {answered && isAnswer ? <span aria-hidden="true">✓</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {answered ? (
        <Feedback
          tone={correct ? 'correct' : 'incorrect'}
          title={correct ? 'Correct !' : 'Ce n’est pas la bonne réponse.'}
          expected={correct ? undefined : exercise.choices[exercise.answerIndex]}
          reasons={exercise.explain_fr ? [exercise.explain_fr] : []}
          ruleId={correct ? null : exercise.ruleId}
        >
          <p className="mt-2 flex items-center gap-2 text-sm">
            <PlayButton text={exercise.audioNl} size="sm" />
            <span lang="nl" className="font-medium">
              {exercise.audioNl}
            </span>
          </p>
        </Feedback>
      ) : null}
    </div>
  );
}
