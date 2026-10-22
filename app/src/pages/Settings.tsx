import { useRef, useState } from 'react';
import { PlayButton, RateSelector, TtsStatus } from '@/components/audio/PlayButton';
import { useApp } from '@/context/AppContext';
import { db } from '@/db/db';

const PHRASE_TEST = 'Goedemorgen! Hoe gaat het met jou?';

export function SettingsPage() {
  const { settings, update, speech } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportData = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: await db.settings.toArray(),
      lessonProgress: await db.lessonProgress.toArray(),
      unitProgress: await db.unitProgress.toArray(),
      srsCards: await db.srsCards.toArray(),
      reviewLog: await db.reviewLog.toArray(),
      attempts: await db.attempts.toArray(),
      dailyActivity: await db.dailyActivity.toArray(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nederlands-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Sauvegarde téléchargée.');
  };

  const importData = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as Record<string, unknown>;
      await db.transaction(
        'rw',
        [db.settings, db.lessonProgress, db.unitProgress, db.srsCards, db.reviewLog, db.attempts, db.dailyActivity],
        async () => {
          for (const [table, rows] of Object.entries(raw)) {
            if (!Array.isArray(rows)) continue;
            const target = (db as unknown as Record<string, { bulkPut: (r: unknown[]) => Promise<unknown> }>)[table];
            if (target?.bulkPut) await target.bulkPut(rows);
          }
        },
      );
      setMessage('Sauvegarde restaurée.');
    } catch {
      setMessage('Fichier illisible : rien n’a été modifié.');
    }
  };

  const resetAll = async () => {
    if (!window.confirm('Effacer toute ta progression ? Cette action est définitive.')) return;
    await db.delete();
    window.location.reload();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Réglages</h1>
        <p className="text-slate-600">Tout est enregistré sur cet appareil uniquement.</p>
      </header>

      <TtsStatus />

      <section className="card space-y-3">
        <h2 className="font-semibold">Variante du néerlandais</h2>
        <div className="flex gap-2">
          {(['nl-NL', 'nl-BE'] as const).map((variant) => (
            <button
              key={variant}
              type="button"
              onClick={() => void update({ variant })}
              aria-pressed={settings.variant === variant}
              className={`chip flex-1 justify-center ${
                settings.variant === variant ? 'border-brand-600 bg-brand-50' : ''
              }`}
            >
              {variant === 'nl-NL' ? 'Pays-Bas (nl-NL)' : 'Flandre (nl-BE)'}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          Ce choix sélectionne la voix de lecture et met en avant les différences de vocabulaire
          signalées dans les fiches.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Voix et vitesse</h2>
        <div>
          <span className="label">Vitesse de lecture</span>
          <div className="mt-1">
            <RateSelector />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="voix">
            Voix néerlandaise
          </label>
          <select
            id="voix"
            className="input mt-1"
            value={settings.voiceURI ?? ''}
            onChange={(event) => void update({ voiceURI: event.target.value || null })}
          >
            <option value="">Choix automatique</option>
            {speech.dutchVoices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang}){voice.localService ? ' — hors ligne' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-slate-600">
            {speech.dutchVoices.length === 0
              ? 'Aucune voix néerlandaise détectée sur cet appareil.'
              : `${speech.dutchVoices.length} voix néerlandaise(s) détectée(s). Voix utilisée : ${
                  speech.activeVoice?.name ?? 'aucune'
                }.`}
          </p>
        </div>
        <PlayButton text={PHRASE_TEST}>Tester la voix</PlayButton>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Correction</h2>
        <div className="flex gap-2">
          {(['souple', 'strict'] as const).map((tolerance) => (
            <button
              key={tolerance}
              type="button"
              onClick={() => void update({ tolerance })}
              aria-pressed={settings.tolerance === tolerance}
              className={`chip flex-1 justify-center ${
                settings.tolerance === tolerance ? 'border-brand-600 bg-brand-50' : ''
              }`}
            >
              {tolerance === 'souple' ? 'Souple' : 'Strict'}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          Souple : majuscules, accents, ponctuation et une faute de frappe sont tolérés. Strict :
          l'orthographe doit être exacte.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Objectif quotidien</h2>
        <div className="flex gap-2">
          {([5, 10, 20] as const).map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => void update({ dailyGoalMin: goal })}
              aria-pressed={settings.dailyGoalMin === goal}
              className={`chip flex-1 justify-center ${
                settings.dailyGoalMin === goal ? 'border-brand-600 bg-brand-50' : ''
              }`}
            >
              {goal} min
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Confort de lecture</h2>
        <div>
          <span className="label">Taille du texte</span>
          <div className="mt-1 flex gap-2">
            {([0.9, 1, 1.15, 1.3] as const).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => void update({ fontScale: scale })}
                aria-pressed={settings.fontScale === scale}
                className={`chip flex-1 justify-center ${
                  settings.fontScale === scale ? 'border-brand-600 bg-brand-50' : ''
                }`}
              >
                {Math.round(scale * 100)} %
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="font-medium">Mode calme</span>
            <span className="block text-sm text-slate-600">
              Supprime les animations et les transitions.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-6 w-6"
            checked={settings.calmMode}
            onChange={(event) => void update({ calmMode: event.target.checked })}
          />
        </label>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Mes données</h2>
        <p className="text-sm text-slate-600">
          Ta progression est stockée dans le navigateur (IndexedDB). Vider les données du site
          l'efface définitivement : exporte une sauvegarde de temps en temps.
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" className="btn-secondary" onClick={() => void exportData()}>
            Exporter une sauvegarde
          </button>
          <button type="button" className="btn-secondary" onClick={() => fileInput.current?.click()}>
            Importer une sauvegarde
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importData(file);
              event.target.value = '';
            }}
          />
          <button type="button" className="btn-secondary text-rose-700" onClick={() => void resetAll()}>
            Tout effacer
          </button>
        </div>
        {message ? (
          <p className="text-sm text-brand-800" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className="card">
        <h2 className="font-semibold">À propos</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>Application gratuite, sans compte, sans serveur et sans publicité.</li>
          <li>
            Audio produit par la synthèse vocale du navigateur : la qualité dépend des voix
            installées sur ton appareil.
          </li>
          <li>Contenu rédigé pour cette application ; les points incertains sont signalés « à vérifier ».</li>
        </ul>
      </section>
    </div>
  );
}
