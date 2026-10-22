import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PlayButton } from '@/components/audio/PlayButton';
import { getAllCards } from '@/db/repositories/srs';
import type { SrsKind } from '@/db/db';

const KIND_LABEL: Record<SrsKind, string> = {
  vocab: 'Mots',
  structure: 'Phrases clés',
  spelling: 'Orthographe',
};

/** Liste de tout ce qui a ete enregistre en fin de lecon. */
export function VocabPage() {
  const cards = useLiveQuery(getAllCards, [], []);
  const [filter, setFilter] = useState<SrsKind | 'tous'>('tous');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards
      .filter((card) => filter === 'tous' || card.kind === filter)
      .filter(
        (card) =>
          needle.length === 0 ||
          card.answer.toLowerCase().includes(needle) ||
          card.prompt.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.answer.localeCompare(b.answer, 'nl'));
  }, [cards, filter, query]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Ma liste</h1>
        <p className="text-slate-600">
          Tout ce que tu as vu en leçon. La révision espacée pioche ici : chaque élément revient
          juste avant que tu l'oublies.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['tous', 'vocab', 'structure'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`chip ${filter === value ? 'border-brand-600 bg-brand-50' : ''}`}
          >
            {value === 'tous' ? 'Tout' : KIND_LABEL[value]}
          </button>
        ))}
      </div>

      <label className="label" htmlFor="recherche">
        Rechercher
      </label>
      <input
        id="recherche"
        className="input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="un mot en français ou en néerlandais"
      />

      {visible.length === 0 ? (
        <p className="card text-slate-600">
          Rien ici pour le moment. Termine une leçon : son vocabulaire et ses phrases clés
          apparaîtront automatiquement.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((card) => (
            <li key={card.id} className="card flex items-start gap-2">
              <PlayButton text={card.answer} size="sm" />
              <div>
                <p lang="nl" className="font-semibold">
                  {card.answer}
                </p>
                <p className="text-slate-700">{card.prompt}</p>
                <p className="text-xs text-slate-500">
                  {KIND_LABEL[card.kind]} · prochaine révision prévue le {card.due}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
