import { getRule } from '@/content';
import { PlayButton } from '@/components/audio/PlayButton';

export type FeedbackTone = 'correct' | 'presque' | 'incorrect';

interface FeedbackProps {
  tone: FeedbackTone;
  title: string;
  /** Explications : pourquoi la reponse est fausse. */
  reasons?: string[];
  /** Reponse attendue, affichee quand c'est faux. */
  expected?: string;
  /** Regle concernee : son explication est rappelee sous la correction. */
  ruleId?: string | null;
  children?: React.ReactNode;
}

const TONES: Record<FeedbackTone, { box: string; icon: string }> = {
  correct: { box: 'bg-emerald-50 text-emerald-900 border-emerald-200', icon: '✓' },
  presque: { box: 'bg-amber-50 text-amber-900 border-amber-200', icon: '≈' },
  incorrect: { box: 'bg-rose-50 text-rose-900 border-rose-200', icon: '✗' },
};

/** Retour immediat apres une reponse : verdict, raison, correction, lien vers la regle. */
export function Feedback({ tone, title, reasons = [], expected, ruleId, children }: FeedbackProps) {
  const style = TONES[tone];
  return (
    <div className={`rounded-xl border p-3 ${style.box}`} role="status" aria-live="polite">
      <p className="font-semibold">
        <span aria-hidden="true" className="mr-2">
          {style.icon}
        </span>
        {title}
      </p>
      {expected ? (
        <p className="mt-1">
          Réponse attendue : <span className="font-semibold">{expected}</span>
        </p>
      ) : null}
      {reasons.length > 0 ? (
        <ul className="mt-1 list-inside list-disc text-sm">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {children}
      {ruleId ? <RuleReminder ruleId={ruleId} /> : null}
    </div>
  );
}

/** Rappel de la regle concernee, replie par defaut. */
function RuleReminder({ ruleId }: { ruleId: string }) {
  const rule = getRule(ruleId);
  if (!rule) return null;
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-medium underline">Revoir la règle : {rule.title_fr}</summary>
      <p className="mt-2 whitespace-pre-line">{rule.body_fr}</p>
      <ul className="mt-2 space-y-1">
        {rule.examples.map((example) => (
          <li key={example.nl} className="flex items-center gap-2">
            <PlayButton text={example.nl} size="sm" />
            <span>
              <span className="font-medium">{example.nl}</span> — {example.fr}
            </span>
          </li>
        ))}
      </ul>
      {rule.exceptions_fr.length > 0 ? (
        <>
          <p className="mt-2 font-medium">Exceptions et précisions</p>
          <ul className="list-inside list-disc">
            {rule.exceptions_fr.map((exception) => (
              <li key={exception}>{exception}</li>
            ))}
          </ul>
        </>
      ) : null}
    </details>
  );
}
