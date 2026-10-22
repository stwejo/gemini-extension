import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getCourse } from '@/content';
import { LEVELS } from '@/content/schema';
import { buildPath, type LessonStatus } from '@/engine/path';
import { getAllLessonProgress } from '@/db/repositories/progress';
import { ProgressBar } from '@/components/ui/ProgressBar';

const STATUS_LABEL: Record<LessonStatus, string> = {
  termine: 'Terminée',
  'en-cours': 'En cours',
  disponible: 'À faire',
  verrouille: 'Verrouillée',
};

const LEVEL_TITLE: Record<string, string> = {
  A0: 'A0 — Découverte',
  A1: 'A1 — Bases',
  A2: 'A2 — Autonomie simple',
  B1: 'B1 — Autonomie',
};

export function PathPage() {
  const progress = useLiveQuery(getAllLessonProgress, [], []);
  const levels = buildPath(getCourse(), progress);
  const availableLevels = new Set(levels.map((l) => l.level));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Parcours</h1>
        <p className="text-slate-600">
          Chaque leçon s'appuie sur la précédente : écoute, répétition, vocabulaire, puis règle.
        </p>
      </header>

      {levels.map((level) => (
        <section key={level.level} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{LEVEL_TITLE[level.level] ?? level.level}</h2>
            <p className="text-sm text-slate-600">
              {level.done} / {level.total}
            </p>
          </div>
          <ProgressBar value={level.done} max={level.total} label={`Progression ${level.level}`} />

          {level.units.map(({ unit, unlocked, lessons, done, total }) => (
            <article key={unit.id} className="card space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{unit.title_fr}</h3>
                  <span className="chip text-xs">
                    {done} / {total}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{unit.description_fr}</p>
                {!unlocked ? (
                  <p className="mt-2 text-sm text-amber-800">
                    Termine l'unité précédente pour ouvrir celle-ci.
                  </p>
                ) : null}
              </div>
              <ul className="divide-y divide-slate-100">
                {lessons.map(({ lesson, status, bestScore }) => {
                  const locked = status === 'verrouille';
                  const content = (
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{lesson.title_fr}</p>
                        <p className="text-xs text-slate-500">
                          {STATUS_LABEL[status]}
                          {status === 'termine' ? ` · ${bestScore} %` : ''} · {lesson.minutes} min
                        </p>
                      </div>
                      <span aria-hidden="true" className="text-slate-400">
                        {locked ? '🔒' : status === 'termine' ? '✓' : '›'}
                      </span>
                    </div>
                  );
                  return (
                    <li key={lesson.id}>
                      {locked ? (
                        <div className="opacity-60">{content}</div>
                      ) : (
                        <Link to={`/lecon/${lesson.id}`} className="block hover:bg-slate-50">
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </section>
      ))}

      <section className="card">
        <h2 className="font-semibold">Niveaux à venir</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {LEVELS.filter((level) => !availableLevels.has(level)).map((level) => (
            <li key={level}>{LEVEL_TITLE[level]} — contenu en préparation</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
