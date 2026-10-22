import { useApp } from '@/context/AppContext';

interface PlayButtonProps {
  text: string;
  /** Libelle lu par les lecteurs d'ecran. */
  label?: string;
  /** Vitesse imposee pour cette lecture (sinon celle des reglages). */
  rate?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  children?: string;
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1Zm13.5 2a4.5 4.5 0 0 0-2-3.74v7.48A4.5 4.5 0 0 0 16.5 12Zm-2-8.9v2.06A7 7 0 0 1 14.5 19v2.06A9 9 0 0 0 14.5 3.1Z" />
    </svg>
  );
}

/** Bouton d'ecoute. Le son n'est jamais declenche sans action de l'utilisateur. */
export function PlayButton({
  text,
  label,
  rate,
  size = 'md',
  variant = 'secondary',
  children,
}: PlayButtonProps) {
  const { speech } = useApp();
  const iconSize = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <button
      type="button"
      className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
      onClick={() => speech.say(text, rate)}
      disabled={!speech.supported}
      aria-label={label ?? `Écouter : ${text}`}
      title={speech.supported ? undefined : 'Synthèse vocale non disponible sur ce navigateur'}
    >
      <SpeakerIcon className={iconSize} />
      {children ? <span>{children}</span> : null}
    </button>
  );
}

/** Lecture mot par mot, utile pour les phrases longues. */
export function WordByWordButton({ text }: { text: string }) {
  const { speech } = useApp();
  return (
    <button
      type="button"
      className="btn-ghost text-sm"
      onClick={() => speech.sayWordByWord(text)}
      disabled={!speech.supported}
      aria-label={`Écouter mot par mot : ${text}`}
    >
      Mot par mot
    </button>
  );
}

/** Sélecteur de vitesse, mémorisé dans les réglages. */
export function RateSelector() {
  const { settings, update } = useApp();
  const rates: Array<0.6 | 0.8 | 1> = [0.6, 0.8, 1];
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Vitesse de lecture">
      {rates.map((rate) => (
        <button
          key={rate}
          type="button"
          onClick={() => update({ ttsRate: rate })}
          aria-pressed={settings.ttsRate === rate}
          className={`min-h-9 rounded-lg px-2 py-1 text-sm ${
            settings.ttsRate === rate
              ? 'bg-brand-600 text-white'
              : 'border border-slate-300 bg-white text-slate-700'
          }`}
        >
          {rate}×
        </button>
      ))}
    </div>
  );
}

/** Avertissement honnête quand aucune voix néerlandaise n'est installée. */
export function TtsStatus() {
  const { speech } = useApp();
  if (!speech.supported) {
    return (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        Ce navigateur ne propose pas de synthèse vocale. Les leçons restent utilisables : le texte
        néerlandais est toujours affiché.
      </p>
    );
  }
  if (!speech.activeVoice) {
    return (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        Aucune voix néerlandaise n'est installée sur cet appareil. La lecture utilisera une voix par
        défaut, dont la prononciation sera fausse. Installe une voix néerlandaise dans les réglages
        de ton système pour un son correct.
      </p>
    );
  }
  return null;
}
