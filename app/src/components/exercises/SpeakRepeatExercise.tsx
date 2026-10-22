import { useState } from 'react';
import { PlayButton, WordByWordButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import { TokenDiffView } from './TokenDiffView';
import { gradeSpeech, SPEECH_DISCLAIMER_FR, type SpeechGrade } from '@/engine/grading/gradeSpeech';
import { useApp } from '@/context/AppContext';
import { useAsr } from '@/hooks/useAsr';
import type { Exercise } from '@/content/schema';

type SpeakRepeat = Extract<Exercise, { type: 'speakRepeat' }>;

interface Props {
  exercise: SpeakRepeat;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

/**
 * Repetition orale. Avec reconnaissance vocale quand le navigateur la propose,
 * sinon auto-evaluation apres ecoute : dans les deux cas l'UI dit ce qu'elle fait.
 */
export function SpeakRepeatExercise({ exercise, onAnswer }: Props) {
  const { settings } = useApp();
  const [grade, setGrade] = useState<SpeechGrade | null>(null);
  const [selfRated, setSelfRated] = useState<boolean | null>(null);

  const asr = useAsr(settings.variant, (transcript) => {
    if (grade) return;
    const result = gradeSpeech(transcript, exercise.nl);
    setGrade(result);
    onAnswer(result.accepted, transcript);
  });

  const done = grade !== null || selfRated !== null;

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">Répète cette phrase à voix haute</p>
      <div className="card bg-slate-50">
        <p lang="nl" className="text-xl font-semibold">
          {exercise.nl}
        </p>
        <p className="text-slate-600">{exercise.fr}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PlayButton text={exercise.nl} variant="primary">
            Écouter
          </PlayButton>
          <PlayButton text={exercise.nl} rate={0.6} size="sm">
            Lent
          </PlayButton>
          <WordByWordButton text={exercise.nl} />
        </div>
      </div>

      {asr.supported ? (
        <div className="space-y-2">
          {!done ? (
            <button
              type="button"
              className={asr.listening ? 'btn-secondary w-full' : 'btn-primary w-full'}
              onClick={() => (asr.listening ? asr.stop() : asr.start())}
            >
              {asr.listening ? '● J’écoute… toucher pour arrêter' : '🎤 Parler'}
            </button>
          ) : null}
          {asr.transcript ? (
            <p className="rounded-xl bg-slate-100 p-3" aria-live="polite">
              Entendu : <span lang="nl">{asr.transcript}</span>
            </p>
          ) : null}
          {asr.error ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">
              {asr.error}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">{SPEECH_DISCLAIMER_FR}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Ce navigateur ne propose pas la reconnaissance vocale (c'est le cas de Firefox).
            Écoute le modèle, répète à voix haute, puis évalue-toi toi-même.
          </p>
          {!done ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  setSelfRated(true);
                  onAnswer(true, '(auto-évaluation : réussi)');
                }}
              >
                J'y arrive
              </button>
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  setSelfRated(false);
                  onAnswer(false, '(auto-évaluation : à retravailler)');
                }}
              >
                À retravailler
              </button>
            </div>
          ) : null}
        </div>
      )}

      {grade ? (
        <Feedback
          tone={grade.accepted ? 'correct' : grade.verdict === 'partiel' ? 'presque' : 'incorrect'}
          title={
            grade.accepted
              ? 'La transcription correspond.'
              : grade.verdict === 'partiel'
                ? 'Une partie seulement a été reconnue.'
                : 'La transcription ne correspond pas.'
          }
          expected={grade.accepted ? undefined : exercise.nl}
          reasons={[`Mots reconnus : ${Math.round(grade.wordScore * 100)} %`]}
          ruleId={exercise.ruleId}
        >
          <TokenDiffView words={grade.words} />
          <p className="mt-2 text-xs">{grade.disclaimer_fr}</p>
          <button
            type="button"
            className="btn-ghost mt-1 text-sm"
            onClick={() => {
              setGrade(null);
              asr.reset();
            }}
          >
            Réessayer (sans changer le score)
          </button>
        </Feedback>
      ) : null}

      {selfRated !== null ? (
        <Feedback
          tone={selfRated ? 'correct' : 'presque'}
          title={selfRated ? 'Noté comme réussi.' : 'Noté comme à retravailler.'}
          reasons={["Auto-évaluation : l'application n'a pas pu écouter ta prononciation."]}
        />
      ) : null}
    </div>
  );
}
