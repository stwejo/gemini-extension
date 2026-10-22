import { useMemo, useState } from 'react';
import { PlayButton, WordByWordButton } from '@/components/audio/PlayButton';
import { ExerciseView } from '@/components/exercises/ExerciseView';
import { TokenDiffView } from '@/components/exercises/TokenDiffView';
import { Feedback } from '@/components/ui/Feedback';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { gradeText, type TextGrade } from '@/engine/grading/gradeText';
import { gradedItemsOfStep } from '@/engine/lessonMachine';
import { useApp } from '@/context/AppContext';
import type { Step } from '@/content/schema';

export interface StepViewProps {
  step: Step;
  /** Enregistre la reponse a un item note (identifiant prefixe par le step). */
  answer: (itemId: string, correct: boolean, userAnswer?: string) => void;
  results: Record<string, boolean>;
}

/** Un step est franchissable quand tous ses items notes ont recu une reponse. */
export function isStepComplete(step: Step, results: Record<string, boolean>): boolean {
  return gradedItemsOfStep(step).every((id) => id in results);
}

function NlLine({ nl, fr, note }: { nl: string; fr: string; note?: string }) {
  return (
    <div className="flex items-start gap-2">
      <PlayButton text={nl} size="sm" />
      <div>
        <p lang="nl" className="font-medium">
          {nl}
        </p>
        <p className="text-sm text-slate-600">{fr}</p>
        {note ? <p className="mt-1 text-sm text-brand-800">{note}</p> : null}
      </div>
    </div>
  );
}

export function StepView(props: StepViewProps) {
  switch (props.step.type) {
    case 'listen':
      return <ListenStepView {...props} step={props.step} />;
    case 'comprehension':
      return <ComprehensionStepView {...props} step={props.step} />;
    case 'repeat':
      return <RepeatStepView step={props.step} />;
    case 'vocab':
      return <VocabStepView step={props.step} />;
    case 'discover':
      return <DiscoverStepView {...props} step={props.step} />;
    case 'rule':
      return <RuleStepView step={props.step} />;
    case 'practice':
      return <PracticeStepView {...props} step={props.step} />;
    case 'production':
      return <ProductionStepView {...props} step={props.step} />;
    case 'wrapup':
      return <WrapupStepView step={props.step} />;
  }
}

type StepOf<T extends Step['type']> = Extract<Step, { type: T }>;

function ListenStepView({ step }: { step: StepOf<'listen'> }) {
  const [showFr, setShowFr] = useState(false);
  const full = step.lines.map((line) => line.nl).join(' ');
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Écoute</h2>
      <p className="text-slate-700">{step.situation_fr}</p>
      <div className="flex flex-wrap items-center gap-2">
        <PlayButton text={full} variant="primary" size="lg">
          Écouter le dialogue
        </PlayButton>
        <button type="button" className="btn-secondary" onClick={() => setShowFr((v) => !v)}>
          {showFr ? 'Masquer la traduction' : 'Afficher la traduction'}
        </button>
      </div>
      <ol className="space-y-3">
        {step.lines.map((line, index) => (
          <li key={`${line.speaker}-${index}`} className="card">
            <p className="text-xs uppercase tracking-wide text-slate-500">{line.speaker}</p>
            <div className="mt-1 flex items-start gap-2">
              <PlayButton text={line.nl} size="sm" />
              <div>
                <p lang="nl" className="text-lg font-medium">
                  {line.nl}
                </p>
                {showFr ? <p className="text-sm text-slate-600">{line.fr}</p> : null}
                {line.note_fr ? <p className="mt-1 text-sm text-brand-800">{line.note_fr}</p> : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-slate-500">
        Écoute une première fois sans la traduction, puis réécoute en l'affichant.
      </p>
    </section>
  );
}

function ComprehensionStepView({ step, answer, results }: StepViewProps & { step: StepOf<'comprehension'> }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Compréhension</h2>
      {step.items.map((item) => {
        const itemId = `${step.id}:${item.id}`;
        const answered = itemId in results;
        return (
          <div key={item.id} className="card space-y-3">
            <p className="font-medium">{item.question_fr}</p>
            <ul className="space-y-2">
              {item.choices.map((choice, index) => {
                const isAnswer = index === item.answerIndex;
                let tone = 'border-slate-300 bg-white';
                if (answered && isAnswer) tone = 'border-emerald-400 bg-emerald-50';
                else if (answered) tone = 'border-slate-200 bg-slate-50';
                return (
                  <li key={choice}>
                    <button
                      type="button"
                      disabled={answered}
                      onClick={() => answer(itemId, isAnswer, choice)}
                      className={`min-h-12 w-full rounded-xl border px-4 py-3 text-left disabled:opacity-100 ${tone}`}
                    >
                      {choice}
                    </button>
                  </li>
                );
              })}
            </ul>
            {answered ? (
              <Feedback
                tone={results[itemId] ? 'correct' : 'incorrect'}
                title={results[itemId] ? 'Correct !' : 'Mauvaise réponse.'}
                expected={results[itemId] ? undefined : item.choices[item.answerIndex]}
                reasons={item.explain_fr ? [item.explain_fr] : []}
              />
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function RepeatStepView({ step }: { step: StepOf<'repeat'> }) {
  const { speech } = useApp();
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Répète à voix haute</h2>
      <p className="text-slate-700">
        {step.instructions_fr ?? 'Écoute chaque phrase, puis répète-la à voix haute.'}
      </p>
      <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
        La reconnaissance vocale (comparaison automatique de ce que tu prononces) arrive à l'étape
        suivante du projet. Pour l'instant, écoute, répète, puis réécoute pour comparer toi-même.
      </p>
      <ul className="space-y-3">
        {step.chunks.map((chunk, index) => (
          <li key={chunk.nl} className="card">
            <div className="flex items-start justify-between gap-2">
              <NlLine nl={chunk.nl} fr={chunk.fr} note={chunk.hint_fr} />
              <div className="flex flex-col items-end gap-1">
                <PlayButton text={chunk.nl} rate={0.6} size="sm">
                  Lent
                </PlayButton>
                <WordByWordButton text={chunk.nl} />
              </div>
            </div>
            {speech.wordIndex >= 0 && speech.speaking ? (
              <p className="sr-only">Lecture mot par mot en cours, phrase {index + 1}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function VocabStepView({ step }: { step: StepOf<'vocab'> }) {
  const { settings } = useApp();
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Vocabulaire</h2>
      <p className="text-slate-700">{step.items.length} mots ou expressions à retenir.</p>
      <ul className="space-y-3">
        {step.items.map((item) => (
          <li key={item.id} className="card space-y-2">
            <div className="flex items-start gap-2">
              <PlayButton text={item.nl} size="sm" />
              <div className="flex-1">
                <p lang="nl" className="text-lg font-semibold">
                  {item.nl}
                </p>
                <p className="text-slate-700">{item.fr}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {item.pos}
                  {item.plural ? ` · pluriel : ${item.plural}` : ''}
                </p>
                {item.pronHint_fr ? (
                  <p className="text-sm text-brand-800">Prononciation : {item.pronHint_fr}</p>
                ) : null}
              </div>
              {item.needsReview ? (
                <span className="chip border-amber-300 bg-amber-50 text-xs text-amber-900">
                  à vérifier
                </span>
              ) : null}
            </div>
            {item.examples.length > 0 ? (
              <ul className="space-y-2 border-t border-slate-100 pt-2">
                {item.examples.map((example) => (
                  <li key={example.nl}>
                    <NlLine nl={example.nl} fr={example.fr} />
                  </li>
                ))}
              </ul>
            ) : null}
            {item.variant ? (
              <div className="rounded-lg bg-slate-50 p-2 text-sm">
                <p className="font-medium">
                  Variantes {settings.variant === 'nl-BE' ? '(tu as choisi le flamand)' : ''}
                </p>
                {item.variant.nlNL ? <p>nl-NL : {item.variant.nlNL}</p> : null}
                {item.variant.nlBE ? <p>nl-BE : {item.variant.nlBE}</p> : null}
                {item.variant.note_fr ? <p className="text-slate-600">{item.variant.note_fr}</p> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DiscoverStepView({ step, answer, results }: StepViewProps & { step: StepOf<'discover'> }) {
  const itemId = `${step.id}:${step.question.id}`;
  const answered = itemId in results;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Observe</h2>
      {step.intro_fr ? <p className="text-slate-700">{step.intro_fr}</p> : null}
      <ul className="space-y-2">
        {step.examples.map((example) => (
          <li key={example.nl} className="card">
            <div className="flex items-start gap-2">
              <PlayButton text={example.nl} size="sm" />
              <div>
                <p lang="nl" className="text-lg">
                  {highlight(example.nl, example.highlight)}
                </p>
                <p className="text-sm text-slate-600">{example.fr}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="card space-y-3">
        <p className="font-medium">{step.question.question_fr}</p>
        <ul className="space-y-2">
          {step.question.choices.map((choice, index) => {
            const isAnswer = index === step.question.answerIndex;
            let tone = 'border-slate-300 bg-white';
            if (answered && isAnswer) tone = 'border-emerald-400 bg-emerald-50';
            else if (answered) tone = 'border-slate-200 bg-slate-50';
            return (
              <li key={choice}>
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => answer(itemId, isAnswer, choice)}
                  className={`min-h-12 w-full rounded-xl border px-4 py-3 text-left disabled:opacity-100 ${tone}`}
                >
                  {choice}
                </button>
              </li>
            );
          })}
        </ul>
        {answered ? (
          <Feedback
            tone={results[itemId] ? 'correct' : 'incorrect'}
            title={results[itemId] ? 'Bien vu !' : 'Pas tout à fait.'}
            expected={results[itemId] ? undefined : step.question.choices[step.question.answerIndex]}
            reasons={step.question.explain_fr ? [step.question.explain_fr] : []}
          >
            <p className="mt-2">{step.reveal_fr}</p>
          </Feedback>
        ) : null}
      </div>
    </section>
  );
}

/** Met en evidence les fragments cites par le contenu. */
function highlight(text: string, fragments: string[]) {
  if (fragments.length === 0) return text;
  const escaped = fragments.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'g'));
  return parts.map((part, index) =>
    fragments.includes(part) ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-0.5">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function RuleStepView({ step }: { step: StepOf<'rule'> }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">La règle</h2>
      <div className="card space-y-3">
        <h3 className="text-lg font-semibold">{step.title_fr}</h3>
        <p className="whitespace-pre-line text-slate-800">{step.body_fr}</p>
        <ul className="space-y-2 border-t border-slate-100 pt-3">
          {step.examples.map((example) => (
            <li key={example.nl}>
              <NlLine nl={example.nl} fr={example.fr} note={example.note_fr} />
            </li>
          ))}
        </ul>
        {step.exceptions_fr.length > 0 ? (
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="font-medium text-amber-900">Exceptions et précisions</p>
            <ul className="list-inside list-disc text-sm text-amber-900">
              {step.exceptions_fr.map((exception) => (
                <li key={exception}>{exception}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {step.needsReview ? (
          <p className="text-sm text-slate-500">
            Cette fiche contient un point à faire confirmer par un locuteur natif.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PracticeStepView({ step, answer, results }: StepViewProps & { step: StepOf<'practice'> }) {
  const [index, setIndex] = useState(() => {
    const firstUnanswered = step.exercises.findIndex((e) => !(`${step.id}:${e.id}` in results));
    return firstUnanswered === -1 ? step.exercises.length - 1 : firstUnanswered;
  });
  const exercise = step.exercises[index];
  const itemId = `${step.id}:${exercise.id}`;
  const answered = itemId in results;
  const isLast = index === step.exercises.length - 1;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pratique</h2>
        <p className="text-sm text-slate-600">
          Exercice {index + 1} / {step.exercises.length}
        </p>
      </div>
      <ProgressBar value={index} max={step.exercises.length} label="Avancement des exercices" />
      <div className="card">
        <ExerciseView
          key={exercise.id}
          exercise={exercise}
          onAnswer={(correct, userAnswer) => answer(itemId, correct, userAnswer)}
        />
      </div>
      {answered && !isLast ? (
        <button type="button" className="btn-primary w-full" onClick={() => setIndex(index + 1)}>
          Exercice suivant
        </button>
      ) : null}
    </section>
  );
}

function ProductionStepView({ step, answer, results }: StepViewProps & { step: StepOf<'production'> }) {
  const { settings } = useApp();
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">À toi de produire</h2>
      <p className="text-slate-700">
        Écris ta phrase, puis lis-la à voix haute. Tu peux écouter le modèle ensuite.
      </p>
      {step.prompts.map((prompt) => (
        <ProductionPrompt
          key={prompt.id}
          prompt={prompt}
          tolerance={settings.tolerance}
          answered={`${step.id}:${prompt.id}` in results}
          onAnswer={(correct, userAnswer) => answer(`${step.id}:${prompt.id}`, correct, userAnswer)}
        />
      ))}
    </section>
  );
}

interface ProductionPromptProps {
  prompt: StepOf<'production'>['prompts'][number];
  tolerance: 'strict' | 'souple';
  answered: boolean;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

function ProductionPrompt({ prompt, tolerance, answered, onAnswer }: ProductionPromptProps) {
  const [value, setValue] = useState('');
  const [grade, setGrade] = useState<TextGrade | null>(null);
  const [revealed, setRevealed] = useState(false);

  const check = () => {
    if (grade) return;
    const result = gradeText(value, prompt.expected, { tolerance });
    setGrade(result);
    if (!prompt.acceptAny) onAnswer(result.accepted, value);
  };

  const modelAnswer = useMemo(() => prompt.expected[0], [prompt.expected]);

  return (
    <div className="card space-y-3">
      <p className="font-medium">{prompt.task_fr}</p>
      {prompt.tip_fr ? <p className="text-sm text-slate-600">{prompt.tip_fr}</p> : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          check();
        }}
        className="space-y-2"
      >
        <label className="label" htmlFor={`prod-${prompt.id}`}>
          Ta phrase en néerlandais
        </label>
        <textarea
          id={`prod-${prompt.id}`}
          className="input min-h-20"
          lang="nl"
          value={value}
          disabled={grade !== null}
          onChange={(event) => setValue(event.target.value)}
        />
        {grade === null ? (
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={value.trim().length === 0}>
              Vérifier
            </button>
            {prompt.acceptAny ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setRevealed(true);
                  setValue(value);
                }}
              >
                Voir un modèle
              </button>
            ) : null}
          </div>
        ) : null}
      </form>

      {revealed && grade === null ? (
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-sm text-slate-600">Modèle :</p>
          <p className="flex items-center gap-2">
            <PlayButton text={modelAnswer} size="sm" />
            <span lang="nl" className="font-medium">
              {modelAnswer}
            </span>
          </p>
        </div>
      ) : null}

      {grade ? (
        <Feedback
          tone={prompt.acceptAny ? 'presque' : grade.verdict}
          title={
            prompt.acceptAny
              ? 'Compare avec le modèle'
              : grade.verdict === 'correct'
                ? 'Correct !'
                : grade.accepted
                  ? 'Accepté, à un détail près.'
                  : 'Pas encore.'
          }
          expected={grade.verdict === 'correct' ? undefined : grade.bestTarget}
          reasons={prompt.acceptAny ? [] : grade.reasons_fr}
        >
          {prompt.acceptAny ? (
            <p className="mt-1 text-sm">
              Cette consigne dépend de ta situation personnelle : elle n'est pas notée. Vérifie
              toi-même la structure par rapport au modèle.
            </p>
          ) : (
            <TokenDiffView words={grade.words} />
          )}
          <p className="mt-2 flex items-center gap-2 text-sm">
            <PlayButton text={grade.bestTarget} size="sm" />
            <span lang="nl" className="font-medium">
              {grade.bestTarget}
            </span>
          </p>
        </Feedback>
      ) : null}
      {answered ? <p className="sr-only">Réponse enregistrée</p> : null}
    </div>
  );
}

function WrapupStepView({ step }: { step: StepOf<'wrapup'> }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Mini-bilan</h2>
      <p className="text-slate-800">{step.summary_fr}</p>
      {step.addStructures.length > 0 ? (
        <div className="card">
          <p className="font-medium">Phrases clés à retenir</p>
          <ul className="mt-2 space-y-2">
            {step.addStructures.map((structure) => (
              <li key={structure.id}>
                <NlLine nl={structure.nl} fr={structure.fr} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-sm text-slate-600">
        {step.addVocabIds.length} mots et {step.addStructures.length} phrases vont être ajoutés à ta
        liste de révision.
      </p>
    </section>
  );
}
