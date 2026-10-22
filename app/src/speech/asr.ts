/**
 * Reconnaissance vocale via l'API Web Speech (SpeechRecognition).
 *
 * A savoir, et dit tel quel dans l'interface :
 * - Firefox ne l'implemente pas ;
 * - sur Chrome / Edge, la reconnaissance passe par un service en ligne :
 *   elle ne fonctionne pas hors connexion ;
 * - le resultat est une transcription en texte : la comparaison avec la phrase
 *   cible est une estimation orthographique, pas une evaluation phonetique.
 */

export interface SpeechRecognitionResultLike {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => RecognitionLike;

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as RecognitionConstructor | null;
}

export function isAsrSupported(): boolean {
  return getConstructor() !== null;
}

export type AsrErrorCode =
  | 'non-supporte'
  | 'micro-refuse'
  | 'pas-de-son'
  | 'reseau'
  | 'interrompu'
  | 'inconnu';

/** Traduit les codes d'erreur de l'API en messages affichables. */
export function asrErrorMessage(code: AsrErrorCode): string {
  switch (code) {
    case 'non-supporte':
      return "Ce navigateur ne propose pas la reconnaissance vocale. Firefox, par exemple, ne l'implémente pas.";
    case 'micro-refuse':
      return "L'accès au microphone a été refusé. Autorise-le dans les réglages du navigateur.";
    case 'pas-de-son':
      return "Rien n'a été entendu. Parle un peu plus fort, plus près du micro.";
    case 'reseau':
      return 'La reconnaissance vocale a besoin d’une connexion internet sur ce navigateur.';
    case 'interrompu':
      return 'Écoute interrompue.';
    default:
      return "La reconnaissance vocale n'a pas fonctionné.";
  }
}

function mapError(raw: string): AsrErrorCode {
  switch (raw) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'micro-refuse';
    case 'no-speech':
      return 'pas-de-son';
    case 'network':
      return 'reseau';
    case 'aborted':
      return 'interrompu';
    default:
      return 'inconnu';
  }
}

export interface ListenOptions {
  /** Langue attendue, par exemple nl-NL. */
  lang: string;
  /** Transcriptions intermediaires puis finale. */
  onResult: (result: SpeechRecognitionResultLike) => void;
  onError: (code: AsrErrorCode) => void;
  onEnd: () => void;
}

export interface AsrSession {
  stop: () => void;
  abort: () => void;
}

/** Demarre une ecoute. Renvoie null si l'API n'existe pas sur ce navigateur. */
export function listen(options: ListenOptions): AsrSession | null {
  const Constructor = getConstructor();
  if (!Constructor) {
    options.onError('non-supporte');
    return null;
  }

  const recognition = new Constructor();
  recognition.lang = options.lang;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const result = event.results[event.results.length - 1];
    options.onResult({
      transcript: String(result[0]?.transcript ?? '').trim(),
      confidence: Number(result[0]?.confidence ?? 0),
      isFinal: Boolean(result.isFinal),
    });
  };
  recognition.onerror = (event: any) => options.onError(mapError(String(event?.error ?? '')));
  recognition.onend = () => options.onEnd();

  try {
    recognition.start();
  } catch {
    options.onError('inconnu');
    return null;
  }

  return {
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}
