import type { Variant } from '@/content/types';

/**
 * Synthese vocale via l'API Web Speech (speechSynthesis) : gratuite, native,
 * aucune cle API. Les voix disponibles dependent entierement de l'appareil :
 * si aucune voix neerlandaise n'est installee, l'UI doit le dire clairement.
 */

/** Forme minimale d'une voix, pour pouvoir tester la selection sans navigateur. */
export interface VoiceLike {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Normalise "nl_NL", "nl-nl" -> "nl-NL". */
function normalizeLang(lang: string): string {
  const [base, region] = lang.replace('_', '-').split('-');
  return region ? `${base.toLowerCase()}-${region.toUpperCase()}` : base.toLowerCase();
}

export function isDutchVoice(voice: VoiceLike): boolean {
  return normalizeLang(voice.lang).startsWith('nl');
}

/**
 * Choisit la meilleure voix disponible :
 * 1. la voix explicitement choisie dans les reglages,
 * 2. la variante demandee (nl-NL ou nl-BE),
 * 3. l'autre variante neerlandaise,
 * 4. rien (l'appelant affiche un message de repli).
 * A score egal, une voix locale (donc disponible hors ligne) passe devant.
 */
export function pickVoice<T extends VoiceLike>(
  voices: T[],
  variant: Variant,
  preferredURI?: string | null,
): T | null {
  if (preferredURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredURI);
    if (chosen) return chosen;
  }
  const dutch = voices.filter(isDutchVoice);
  if (dutch.length === 0) return null;

  const score = (voice: T): number => {
    const lang = normalizeLang(voice.lang);
    let value = 0;
    if (lang === variant) value += 100;
    else if (lang.startsWith('nl')) value += 50;
    if (voice.localService) value += 10;
    if (voice.default) value += 2;
    return value;
  };

  return [...dutch].sort((a, b) => score(b) - score(a))[0];
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isTtsSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Les voix arrivent de facon asynchrone sur la plupart des navigateurs.
 * Renvoie une fonction de desabonnement.
 */
export function onVoicesChanged(callback: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (!isTtsSupported()) return () => {};
  const handler = () => callback(getVoices());
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  // Certains navigateurs ont deja la liste au premier appel.
  if (getVoices().length > 0) callback(getVoices());
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
}

export interface SpeakOptions {
  variant: Variant;
  rate: number;
  voiceURI?: string | null;
  onEnd?: () => void;
  onError?: () => void;
}

export function cancelSpeech(): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
}

/** Lit un texte neerlandais. Renvoie false si la synthese est indisponible. */
export function speak(text: string, options: SpeakOptions): boolean {
  if (!isTtsSupported() || text.trim().length === 0) return false;
  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(getVoices(), options.variant, options.voiceURI);
  if (voice) utterance.voice = voice;
  // Meme sans voix neerlandaise, on demande la bonne langue : certains
  // navigateurs telechargent alors une voix adaptee.
  utterance.lang = voice?.lang ?? options.variant;
  utterance.rate = options.rate;
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onError?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

/** Decoupe une phrase en mots lisibles un par un (ponctuation retiree). */
export function splitWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ''))
    .filter((word) => word.length > 0);
}

export interface SpeakWordsOptions extends SpeakOptions {
  /** Appele avant chaque mot, avec son index dans la liste renvoyee. */
  onWord?: (index: number) => void;
  /** Pause entre deux mots, en millisecondes. */
  gapMs?: number;
}

/**
 * Lecture mot par mot : chaque mot est prononce separement, avec une pause.
 * Renvoie une fonction d'annulation.
 */
export function speakWords(text: string, options: SpeakWordsOptions): () => void {
  const words = splitWords(text);
  if (!isTtsSupported() || words.length === 0) {
    options.onEnd?.();
    return () => {};
  }
  let index = 0;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const next = () => {
    if (cancelled) return;
    if (index >= words.length) {
      options.onEnd?.();
      return;
    }
    const current = index;
    index += 1;
    options.onWord?.(current);
    speak(words[current], {
      ...options,
      onEnd: () => {
        timer = setTimeout(next, options.gapMs ?? 250);
      },
      onError: () => {
        options.onError?.();
      },
    });
  };

  next();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    cancelSpeech();
  };
}
