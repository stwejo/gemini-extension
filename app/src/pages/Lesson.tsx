import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLesson } from '@/content';
import {
  countGradedItems,
  gradedItemMeta,
  initLessonState,
  lessonReducer,
  scoreLesson,
  type LessonAction,
  type LessonState,
} from '@/engine/lessonMachine';
import { isStepComplete, StepView } from '@/components/steps/StepViews';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { completeLesson, getLessonProgress, saveLessonStep } from '@/db/repositories/progress';
import { logAttempt } from '@/db/repositories/attempts';
import { addActivity } from '@/db/repositories/activity';
import { addCards } from '@/db/repositories/srs';
import type { Lesson as LessonType, Unit } from '@/content/schema';

/** Intervalle de comptage du temps passe, en secondes. */
const TICK_SECONDS = 5;

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const found = getLesson(lessonId);

  if (!found) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Leçon introuvable</h1>
        <p className="text-slate-700">Cette leçon n'existe pas (ou plus).</p>
        <Link to="/parcours" className="btn-primary">
          Retour au parcours
        </Link>
      </div>
    );
  }

  return <LessonRunner key={lessonId} unit={found.unit} lesson={found.lesson} />;
}

function LessonRunner({ unit, lesson }: { unit: Unit; lesson: LessonType }) {
  const stepCount = lesson.steps.length;
  const totalGraded = useMemo(() => countGradedItems(lesson), [lesson]);
  const meta = useMemo(() => gradedItemMeta(lesson), [lesson]);

  const [state, dispatch] = useReducer(
    (current: LessonState, action: LessonAction) => lessonReducer(current, action, stepCount),
    initLessonState(lesson.id),
  );
  const [restored, setRestored] = useState(false);

  // Reprise : on repart du step atteint la derniere fois, si la lecon n'est pas finie.
  useEffect(() => {
    let cancelled = false;
    getLessonProgress(lesson.id).then((row) => {
      if (cancelled) return;
      if (row && row.status !== 'termine' && row.lastStepIndex > 0) {
        dispatch({ type: 'goto', index: row.lastStepIndex });
      }
      setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, [lesson.id]);

  // Comptage du temps passe : en pause quand l'onglet n'est pas visible.
  const pending = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) pending.current += TICK_SECONDS;
    }, TICK_SECONDS * 1000);
    const flush = () => {
      const seconds = pending.current;
      pending.current = 0;
      if (seconds > 0) void addActivity({ seconds });
    };
    const onHide = () => {
      if (document.hidden) flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, []);

  const step = lesson.steps[state.stepIndex];
  const stepReady = isStepComplete(step, state.results);
  const isLastStep = state.stepIndex === stepCount - 1;
  const score = scoreLesson(state, totalGraded);

  const answer = useCallback(
    (itemId: string, correct: boolean, userAnswer?: string) => {
      if (itemId in state.results) return;
      dispatch({ type: 'answer', itemId, correct });
      const info = meta[itemId];
      void logAttempt({
        exerciseId: itemId,
        lessonId: lesson.id,
        type: info?.type ?? 'inconnu',
        correct,
        userAnswer: userAnswer ?? '',
        errorTags: correct ? [] : (info?.errorTags ?? []),
        ruleId: info?.ruleId ?? null,
      });
      void addActivity({ exercisesDone: 1 });
    },
    [lesson.id, meta, state.results],
  );

  const goNext = () => {
    const nextIndex = Math.min(state.stepIndex + 1, stepCount - 1);
    dispatch({ type: 'next' });
    void saveLessonStep({ lessonId: lesson.id, unitId: unit.id, level: unit.level }, nextIndex);
  };

  const finish = async () => {
    dispatch({ type: 'finish' });
    await completeLesson({ lessonId: lesson.id, unitId: unit.id, level: unit.level }, score.percent);
    await addActivity({ lessonsDone: 1 });

    // Le bilan de la lecon alimente la liste de revision.
    const wrapups = lesson.steps.filter((s) => s.type === 'wrapup');
    const vocabById = new Map(
      lesson.steps.flatMap((s) => (s.type === 'vocab' ? s.items.map((i) => [i.id, i] as const) : [])),
    );
    const inputs = wrapups.flatMap((wrapup) => {
      if (wrapup.type !== 'wrapup') return [];
      const vocab = wrapup.addVocabIds.flatMap((id) => {
        const item = vocabById.get(id);
        if (!item) return [];
        return [
          {
            id: `vocab:${item.id}`,
            kind: 'vocab' as const,
            prompt: item.fr,
            answer: item.nl,
            lessonId: lesson.id,
          },
        ];
      });
      const structures = wrapup.addStructures.map((structure) => ({
        id: `structure:${structure.id}`,
        kind: 'structure' as const,
        prompt: structure.fr,
        answer: structure.nl,
        lessonId: lesson.id,
        ruleId: structure.ruleId ?? null,
      }));
      return [...vocab, ...structures];
    });
    await addCards(inputs);
  };

  if (!restored) {
    return <p className="text-slate-600">Chargement…</p>;
  }

  if (state.finished) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Leçon terminée</h1>
        <div className="card">
          <p className="text-4xl font-bold">{score.percent} %</p>
          <p className="mt-1 text-slate-700">
            {score.correct} bonnes réponses sur {score.total} items notés.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {score.percent >= 80
              ? 'Très bien : tu peux passer à la leçon suivante.'
              : 'Tu peux refaire la leçon pour consolider : seule la première réponse de chaque exercice compte dans le score.'}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/parcours" className="btn-primary">
            Retour au parcours
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => dispatch({ type: 'restart' })}
          >
            Refaire cette leçon
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {unit.level} · {unit.title_fr}
            </p>
            <h1 className="text-xl font-bold">{lesson.title_fr}</h1>
          </div>
          <Link to="/parcours" className="btn-ghost text-sm" aria-label="Quitter la leçon">
            Quitter
          </Link>
        </div>
        <ProgressBar
          value={state.stepIndex + 1}
          max={stepCount}
          label={`Étape ${state.stepIndex + 1} sur ${stepCount}`}
        />
        <p className="text-xs text-slate-500">
          Étape {state.stepIndex + 1} / {stepCount}
          {totalGraded > 0 ? ` · ${score.answered} / ${totalGraded} items répondus` : ''}
        </p>
      </header>

      <StepView step={step} answer={answer} results={state.results} />

      <div className="flex gap-2 pt-2">
        {state.stepIndex > 0 ? (
          <button type="button" className="btn-secondary" onClick={() => dispatch({ type: 'prev' })}>
            Précédent
          </button>
        ) : null}
        {isLastStep ? (
          <button type="button" className="btn-primary flex-1" onClick={() => void finish()}>
            Terminer la leçon
          </button>
        ) : (
          <div className="flex-1">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={goNext}
              disabled={!stepReady}
              aria-describedby={stepReady ? undefined : `hint-${step.id}`}
            >
              Continuer
            </button>
            {!stepReady ? (
              <p id={`hint-${step.id}`} className="mt-1 text-center text-sm text-slate-600">
                Réponds à tous les exercices de cette étape pour continuer.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
