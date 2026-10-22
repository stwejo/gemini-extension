import { useCallback, useEffect, useRef, useState } from 'react';
import { asrErrorMessage, isAsrSupported, listen, type AsrErrorCode, type AsrSession } from '@/speech/asr';
import type { Variant } from '@/content/types';

export interface UseAsr {
  supported: boolean;
  listening: boolean;
  /** Transcription en cours (intermediaire) puis finale. */
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Ecoute du micro pour les exercices de repetition orale.
 * `onFinal` est appele une fois la transcription terminee.
 */
export function useAsr(variant: Variant, onFinal: (transcript: string) => void): UseAsr {
  const supported = isAsrSupported();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const session = useRef<AsrSession | null>(null);
  const lastTranscript = useRef('');
  const finalSent = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(
    () => () => {
      session.current?.abort();
    },
    [],
  );

  const start = useCallback(() => {
    if (listening) return;
    setError(null);
    setTranscript('');
    lastTranscript.current = '';
    finalSent.current = false;
    setListening(true);

    session.current = listen({
      lang: variant,
      onResult: (result) => {
        setTranscript(result.transcript);
        lastTranscript.current = result.transcript;
        if (result.isFinal && !finalSent.current) {
          finalSent.current = true;
          onFinalRef.current(result.transcript);
        }
      },
      onError: (code: AsrErrorCode) => {
        setError(asrErrorMessage(code));
        setListening(false);
      },
      onEnd: () => {
        setListening(false);
        // Certains navigateurs terminent sans resultat marque "final".
        if (!finalSent.current && lastTranscript.current.length > 0) {
          finalSent.current = true;
          onFinalRef.current(lastTranscript.current);
        }
      },
    });
  }, [listening, variant]);

  const stop = useCallback(() => {
    session.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    session.current?.abort();
    setListening(false);
    setTranscript('');
    setError(null);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
