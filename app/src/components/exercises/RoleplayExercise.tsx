import { useEffect, useState } from 'react';
import { PlayButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import { gradeText } from '@/engine/grading/gradeText';
import { gradeSpeech, SPEECH_DISCLAIMER_FR } from '@/engine/grading/gradeSpeech';
import { useApp } from '@/context/AppContext';
import { useAsr } from '@/hooks/useAsr';
import type { Exercise } from '@/content/schema';

type Roleplay = Extract<Exercise, { type: 'roleplay' }>;

interface Props {
  exercise: Roleplay;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

interface TurnResult {
  index: number;
  answer: string;
  accepted: boolean;
  expected: string;
  reasons: string[];
  spoken: boolean;
}

/** Dialogue a roles : l'application tient un role, l'utilisateur repond. */
export function RoleplayExercise({ exercise, onAnswer }: Props) {
  const { settings, speech } = useApp();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [results, setResults] = useState<TurnResult[]>([]);
  const [finished, setFinished] = useState(false);

  const turn = exercise.turns[index];
  const isUserTurn = turn?.speaker === 'user';
  const currentResult = results.find((r) => r.index === index);

  const asr = useAsr(settings.variant, (transcript) => {
    if (!isUserTurn || currentResult) return;
    const grade = gradeSpeech(transcript, turn.expected[0]);
    // On accepte aussi une formulation differente mais correcte.
    const best = turn.expected.reduce(
      (acc, candidate) => {
        const g = gradeSpeech(transcript, candidate);
        return g.wordScore > acc.wordScore ? g : acc;
      },
      grade,
    );
    record(transcript, best.accepted, best.target, [
      `Mots reconnus : ${Math.round(best.wordScore * 100)} %`,
      SPEECH_DISCLAIMER_FR,
    ], true);
  });

  // L'application lit sa replique quand c'est son tour.
  useEffect(() => {
    if (!turn || turn.speaker !== 'app') return;
    speech.say(turn.nl);
    // Une seule lecture automatique par replique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function record(answer: string, accepted: boolean, expected: string, reasons: string[], spoken: boolean) {
    setResults((previous) => [...previous, { index, answer, accepted, expected, reasons, spoken }]);
  }

  function checkTyped() {
    if (!isUserTurn || currentResult) return;
    const grade = gradeText(typed, turn.expected, { tolerance: settings.tolerance });
    record(typed, grade.accepted, grade.bestTarget, grade.reasons_fr, false);
  }

  function next() {
    const nextIndex = index + 1;
    setTyped('');
    asr.reset();
    if (nextIndex >= exercise.turns.length) {
      const userTurns = exercise.turns.filter((t) => t.speaker === 'user').length;
      const accepted = results.filter((r) => r.accepted).length;
      setFinished(true);
      onAnswer(
        accepted === userTurns,
        results.map((r) => r.answer).join(' | '),
      );
      return;
    }
    setIndex(nextIndex);
  }

  if (finished) {
    const ok = results.filter((r) => r.accepted).length;
    return (
      <div className="space-y-3">
        <p className="text-lg font-medium">Dialogue terminé</p>
        <Feedback
          tone={ok === results.length ? 'correct' : ok > 0 ? 'presque' : 'incorrect'}
          title={`${ok} / ${results.length} répliques correctes`}
          reasons={results.filter((r) => !r.accepted).map((r) => `Attendu : ${r.expected}`)}
          ruleId={exercise.ruleId}
        />
        <ol className="space-y-2">
          {exercise.turns.map((t, i) => (
            <li key={`${t.nl}-${i}`} className="card">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t.speaker === 'app' ? 'L’application' : 'Toi'}
              </p>
              <div className="flex items-start gap-2">
                <PlayButton text={t.nl} size="sm" />
                <div>
                  <p lang="nl" className="font-medium">
                    {t.nl}
                  </p>
                  <p className="text-sm text-slate-600">{t.fr}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-medium">Dialogue à rôles</p>
        <p className="text-slate-700">{exercise.situation_fr}</p>
        <p className="text-sm text-slate-600">Ton rôle : {exercise.userRole_fr}</p>
      </div>

      <ol className="space-y-2">
        {exercise.turns.slice(0, index).map((t, i) => (
          <li key={`${t.nl}-${i}`} className={t.speaker === 'app' ? 'card' : 'card bg-brand-50'}>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t.speaker === 'app' ? 'L’application' : 'Toi'}
            </p>
            <p lang="nl">{t.speaker === 'app' ? t.nl : (results.find((r) => r.index === i)?.answer ?? t.nl)}</p>
          </li>
        ))}
      </ol>

      {turn.speaker === 'app' ? (
        <div className="card">
          <p className="text-xs uppercase tracking-wide text-slate-500">L'application dit</p>
          <div className="mt-1 flex items-start gap-2">
            <PlayButton text={turn.nl} size="sm" />
            <div>
              <p lang="nl" className="text-lg font-medium">
                {turn.nl}
              </p>
              <p className="text-sm text-slate-600">{turn.fr}</p>
            </div>
          </div>
          <button type="button" className="btn-primary mt-3 w-full" onClick={next}>
            À toi de répondre
          </button>
        </div>
      ) : (
        <div className="card space-y-3">
          <p className="font-medium">À toi : {turn.fr}</p>
          {currentResult ? (
            <>
              <Feedback
                tone={currentResult.accepted ? 'correct' : 'incorrect'}
                title={currentResult.accepted ? 'Bonne réponse !' : 'Pas tout à fait.'}
                expected={currentResult.accepted ? undefined : currentResult.expected}
                reasons={currentResult.reasons}
              >
                <p className="mt-1 text-sm">
                  Ta réponse {currentResult.spoken ? '(entendue)' : ''} : {currentResult.answer}
                </p>
              </Feedback>
              <button type="button" className="btn-primary w-full" onClick={next}>
                Continuer
              </button>
            </>
          ) : (
            <>
              {asr.supported ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    className={asr.listening ? 'btn-secondary w-full' : 'btn-primary w-full'}
                    onClick={() => (asr.listening ? asr.stop() : asr.start())}
                  >
                    {asr.listening ? '● J’écoute…' : '🎤 Répondre à voix haute'}
                  </button>
                  {asr.transcript ? (
                    <p className="rounded-xl bg-slate-100 p-2 text-sm" aria-live="polite">
                      Entendu : <span lang="nl">{asr.transcript}</span>
                    </p>
                  ) : null}
                  {asr.error ? (
                    <p className="rounded-xl bg-amber-50 p-2 text-sm text-amber-900">{asr.error}</p>
                  ) : null}
                </div>
              ) : null}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  checkTyped();
                }}
                className="space-y-2"
              >
                <label className="label" htmlFor={`rp-${exercise.id}-${index}`}>
                  {asr.supported ? 'Ou écris ta réponse' : 'Écris ta réponse'}
                </label>
                <input
                  id={`rp-${exercise.id}-${index}`}
                  className="input"
                  lang="nl"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                />
                <button type="submit" className="btn-secondary w-full" disabled={typed.trim().length === 0}>
                  Vérifier
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
