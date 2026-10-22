import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Enregistre le service worker et propose la mise a jour.
 * Une fois la premiere visite terminee, l'application fonctionne hors ligne.
 */
export function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [update, setUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
    });
    setUpdate(() => () => void updateSW(true));
  }, []);

  // Le message "prete hors ligne" est une simple confirmation : il disparait seul
  // pour ne pas masquer les boutons de la lecon.
  useEffect(() => {
    if (!offlineReady) return;
    const timer = setTimeout(() => setOfflineReady(false), 6000);
    return () => clearTimeout(timer);
  }, [offlineReady]);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-10 mx-auto max-w-2xl px-4"
      role="status"
      aria-live="polite"
    >
      <div className="card flex items-center justify-between gap-3 shadow-lg">
        {needRefresh ? (
          <>
            <p className="text-sm">Une nouvelle version est disponible.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setNeedRefresh(false)}>
                Plus tard
              </button>
              <button type="button" className="btn-primary" onClick={() => update?.()}>
                Mettre à jour
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm">L'application est prête : elle fonctionne maintenant hors ligne.</p>
            <button type="button" className="btn-secondary" onClick={() => setOfflineReady(false)}>
              OK
            </button>
          </>
        )}
      </div>
    </div>
  );
}
