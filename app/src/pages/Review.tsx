import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayButton } from '@/components/audio/PlayButton';
import { Feedback } from '@/components/ui/Feedback';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { gradeText, type TextGrade } from '@/engine/grading/gradeText';
import { GRADES } from '@/engine/srs/sm2';
import { applyReview, getNextDueDate, getTodaySession } from '@/db/repositories/srs';
import { useApp } from '@/context/AppContext';
import type { SrsCardRow } from '@/db/db';

type Phase = 'question' | 'correction' | 'note';

/** Session de revision espacee : rappel actif, puis note SM-2. */
export function ReviewPage() {
  const { settings } = useApp();
  const [cards, setCards] = useState<SrsCardRow[] | null>(null);
  const [nextDue, setNextDue] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [grade, setGrade] = useState<TextGrade | null>(null);
  const [phase, setPhase] = useState<Phase>('question');
  const [stats, setStats] = useState({ ok: 0, ko: 0 });

  useEffect(() => {
    void getTodaySession().then(setCards);
    void getNextDueDate().then(setNextDue);
  }, []);

  const card = cards?.[index];
  const finished = cards !== null && index >= cards.length;
  const total = cards?.length ?? 0;

  const kindLabel = useMemo(() => {
    if (!card) return '';
    return card.kind === 'vocab' ? 'Mot' : card.kind === 'structure' ? 'Phrase' : 'Orthographe';
  }, [card]);

  if (cards === null) return <p className="text-slate-600">Chargement…</p>;

  if (total === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Révision</h1>
        <p className="card text-slate-700">
          Rien à réviser aujourd'hui.
          {nextDue ? ` Prochaine révision prévue le ${nextDue}.` : ' Termine une leçon pour alimenter ta liste.'}
        </p>
        <Link to="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Révision terminée</h1>
        <div className="card">
          <p className="text-3xl font-bold">
            {stats.ok} / {total}
          </p>
          <p className="mt-1 text-slate-700">
            {stats.ko === 0
              ? 'Tout est retenu : ces éléments reviendront plus tard.'
              : `${stats.ko} élément(s) à revoir : ils reviendront dès demain.`}
          </p>
        </div>
        <Link to="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const currentCard = card as SrsCardRow;

  const check = () => {
    const result = gradeText(value, [currentCard.answer], { tolerance: settings.tolerance });
    setGrade(result);
    setPhase(result.accepted ? 'note' : 'correction');
    if (!result.accepted) {
      setStats((s) => ({ ...s, ko: s.ko + 1 }));
      void applyReview(currentCard.id, GRADES.oublie);
    }
  };

  const giveUp = () => {
    setGrade(null);
    setPhase('correction');
    setStats((s) => ({ ...s, ko: s.ko + 1 }));
    void applyReview(currentCard.id, GRADES.oublie);
  };

  const rate = (quality: number) => {
    void applyReview(currentCard.id, quality);
    setStats((s) => ({ ...s, ok: s.ok + 1 }));
    advance();
  };

  const advance = () => {
    setValue('');
    setGrade(null);
    setPhase('question');
    setIndex(index + 1);
  };

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between">
          <h1 className="text-xl font-bold">Révision du jour</h1>
          <Link to="/" className="btn-ghost text-sm">
            Quitter
          </Link>
        </div>
        <ProgressBar value={index} max={total} label={`Carte ${index + 1} sur ${total}`} />
        <p className="text-xs text-slate-500">
          Carte {index + 1} / {total} · {kindLabel}
          {currentCard.lapses > 0 ? ` · ratée ${currentCard.lapses} fois` : ''}
        </p>
      </header>

      <div className="card space-y-3">
        <p className="text-sm text-slate-600">Comment dit-on en néerlandais ?</p>
        <p className="text-xl font-semibold">{currentCard.prompt}</p>

        {phase === 'question' ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              check();
            }}
            className="space-y-2"
          >
            <label className="label" htmlFor="reponse-revision">
              Ta réponse
            </label>
            <input
              id="reponse-revision"
              className="input"
              lang="nl"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={giveUp}>
                Je ne sais pas
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={value.trim().length === 0}>
                Vérifier
              </button>
            </div>
          </form>
        ) : null}

        {phase !== 'question' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PlayButton text={currentCard.answer} />
              <p lang="nl" className="text-xl font-semibold">
                {currentCard.answer}
              </p>
            </div>

            {phase === 'correction' ? (
              <>
                <Feedback
                  tone="incorrect"
                  title="À revoir"
                  expected={currentCard.answer}
                  reasons={grade ? grade.reasons_fr : ['Réponse non donnée.']}
                  ruleId={currentCard.ruleId}
                />
                <button type="button" className="btn-primary w-full" onClick={advance}>
                  Carte suivante
                </button>
              </>
            ) : (
              <>
                <Feedback tone="correct" title="Correct !" />
                <p className="text-sm text-slate-600">Dans combien de temps veux-tu la revoir ?</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => rate(GRADES.difficile)}>
                    Difficile
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => rate(GRADES.correct)}>
                    Correct
                  </button>
                  <button type="button" className="btn-primary flex-1" onClick={() => rate(GRADES.facile)}>
                    Facile
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
