import type { TokenDiff } from '@/engine/grading/levenshtein';

const STYLES: Record<TokenDiff['status'], string> = {
  ok: 'bg-emerald-100 text-emerald-900',
  proche: 'bg-amber-100 text-amber-900',
  faux: 'bg-rose-100 text-rose-900',
  manquant: 'bg-rose-100 text-rose-900 line-through decoration-rose-400',
  superflu: 'bg-rose-100 text-rose-900 line-through',
};

const LABELS: Record<TokenDiff['status'], string> = {
  ok: 'correct',
  proche: 'presque correct',
  faux: 'faux',
  manquant: 'manquant',
  superflu: 'en trop',
};

/** Retour mot par mot : vert = correct, orange = presque, rouge = faux. */
export function TokenDiffView({ words }: { words: TokenDiff[] }) {
  return (
    <p className="mt-2 flex flex-wrap gap-1">
      {words.map((word, index) => (
        <span
          key={`${word.expected ?? ''}-${word.got ?? ''}-${index}`}
          className={`rounded px-1.5 py-0.5 ${STYLES[word.status]}`}
          title={LABELS[word.status]}
        >
          {word.status === 'manquant' ? word.expected : (word.got ?? word.expected)}
          <span className="sr-only"> ({LABELS[word.status]})</span>
        </span>
      ))}
    </p>
  );
}
