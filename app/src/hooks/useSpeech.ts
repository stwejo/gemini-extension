import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelSpeech,
  getVoices,
  isDutchVoice,
  isTtsSupported,
  onVoicesChanged,
  pickVoice,
  speak,
  speakWords,
} from '@/speech/tts';
import type { SettingsRow } from '@/db/db';

export interface UseSpeech {
  supported: boolean;
  /** Voix neerlandaises disponibles sur l'appareil. */
  dutchVoices: SpeechSynthesisVoice[];
  /** Voix retenue pour la lecture, null si aucune voix neerlandaise. */
  activeVoice: SpeechSynthesisVoice | null;
  /** true quand une lecture est en cours. */
  speaking: boolean;
  /** Index du mot en cours en lecture mot par mot, -1 sinon. */
  wordIndex: number;
  say: (text: string, rateOverride?: number) => void;
  sayWordByWord: (text: string) => void;
  stop: () => void;
}

/**
 * Enveloppe la synthese vocale pour l'UI : etat de lecture, voix retenue,
 * et prise en compte des reglages (variante et vitesse).
 */
export function useSpeech(settings: SettingsRow): UseSpeech {
  const supported = isTtsSupported();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getVoices());
  const [speaking, setSpeaking] = useState(false);
  const [wordIndex, setWordIndex] = useState(-1);
  const cancelWords = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!supported) return;
    return onVoicesChanged(setVoices);
  }, [supported]);

  useEffect(
    () => () => {
      cancelWords.current?.();
      cancelSpeech();
    },
    [],
  );

  const dutchVoices = useMemo(() => voices.filter(isDutchVoice), [voices]);
  const activeVoice = useMemo(
    () => pickVoice(voices, settings.variant, settings.voiceURI),
    [voices, settings.variant, settings.voiceURI],
  );

  const stop = useCallback(() => {
    cancelWords.current?.();
    cancelWords.current = null;
    cancelSpeech();
    setSpeaking(false);
    setWordIndex(-1);
  }, []);

  const say = useCallback(
    (text: string, rateOverride?: number) => {
      stop();
      setSpeaking(true);
      const started = speak(text, {
        variant: settings.variant,
        rate: rateOverride ?? settings.ttsRate,
        voiceURI: settings.voiceURI,
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
      if (!started) setSpeaking(false);
    },
    [settings.variant, settings.ttsRate, settings.voiceURI, stop],
  );

  const sayWordByWord = useCallback(
    (text: string) => {
      stop();
      setSpeaking(true);
      cancelWords.current = speakWords(text, {
        variant: settings.variant,
        rate: settings.ttsRate,
        voiceURI: settings.voiceURI,
        onWord: setWordIndex,
        onEnd: () => {
          setSpeaking(false);
          setWordIndex(-1);
        },
        onError: () => {
          setSpeaking(false);
          setWordIndex(-1);
        },
      });
    },
    [settings.variant, settings.ttsRate, settings.voiceURI, stop],
  );

  return { supported, dutchVoices, activeVoice, speaking, wordIndex, say, sayWordByWord, stop };
}
