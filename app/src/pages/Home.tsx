import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getCourse } from '@/content';
import { buildPath, findNextLesson } from '@/engine/path';
import { getAllLessonProgress } from '@/db/repositories/progress';
import { computeStreak, getActivity, getRecentActivity } from '@/db/repositories/activity';
import { countCards } from '@/db/repositories/srs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TtsStatus } from '@/components/audio/PlayButton';
import { useApp } from '@/context/AppContext';

export function Home() {
  const { settings } = useApp();
  const progress = useLiveQuery(getAllLessonProgress, [], []);
  const today = useLiveQuery(() => getActivity(), [], undefined);
  const recent = useLiveQuery(() => getRecentActivity(60), [], []);
  const cards = useLiveQuery(countCards, [], 0);

  const levels = buildPath(getCourse(), progress);
  const next = findNextLesson(levels);
  const streak = computeStreak(recent);
  const minutesToday = Math.floor((today?.seconds ?? 0) / 60);
  const totalDone = levels.reduce((sum, level) => sum + level.done, 0);
  const totalLessons = levels.reduce((sum, level) => sum + level.total, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Nederlands</h1>
        <p className="text-slate-600">Apprendre le néerlandais, du niveau A0 au niveau B1.</p>
      </header>

      <TtsStatus />

      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Objectif du jour</h2>
          <p className="text-sm text-slate-600">
            {minutesToday} / {settings.dailyGoalMin} min
          </p>
        </div>
        <ProgressBar
          className="mt-2"
          value={minutesToday}
          max={settings.dailyGoalMin}
          label="Objectif quotidien"
        />
        <p className="mt-2 text-sm text-slate-600">
          Série : <span className="font-semibold">{streak}</span>{' '}
          {streak === 1 ? 'jour' : 'jours'} d'affilée
          {streak === 0 ? ' — commence aujourd’hui' : ''}
        </p>
      </section>

      <section className="card">
        <h2 className="font-semibold">{next ? 'Reprendre' : 'Tout est terminé'}</h2>
        {next ? (
          <>
            <p className="mt-1 text-sm text-slate-600">
              {next.unit.title_fr} · {next.lesson.minutes} min
            </p>
            <p className="text-lg font-medium">{next.lesson.title_fr}</p>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
              {next.lesson.goals_fr.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
            <Link to={`/lecon/${next.lesson.id}`} className="btn-primary mt-3 w-full">
              Commencer
            </Link>
          </>
        ) : (
          <p className="mt-1 text-slate-700">
            Tu as terminé tout le contenu disponible ({totalDone} leçons). Les niveaux A1 à B1
            arrivent dans les prochaines étapes du projet.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="font-semibold">Progression</h2>
        <p className="mt-1 text-sm text-slate-600">
          {totalDone} / {totalLessons} leçons terminées
        </p>
        <ProgressBar className="mt-2" value={totalDone} max={totalLessons} label="Progression totale" />
        <Link to="/parcours" className="btn-secondary mt-3 w-full">
          Voir le parcours
        </Link>
      </section>

      <section className="card">
        <h2 className="font-semibold">Ma liste de révision</h2>
        <p className="mt-1 text-slate-700">
          {cards} {cards === 1 ? 'élément enregistré' : 'éléments enregistrés'}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Les sessions de révision espacée (algorithme SM-2) arrivent à l'étape suivante. En
          attendant, tu peux relire et réécouter toute ta liste.
        </p>
        <Link to="/vocabulaire" className="btn-secondary mt-3 w-full">
          Ouvrir ma liste
        </Link>
      </section>
    </div>
  );
}
