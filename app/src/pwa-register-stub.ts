/**
 * Remplacant de `virtual:pwa-register` quand le service worker est desactive
 * (VITE_PWA=false), par exemple pour une previsualisation en fichier unique.
 */
export function registerSW(_options?: unknown): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}
