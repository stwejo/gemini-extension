import { describe, expect, it } from 'vitest';
import { isDutchVoice, pickVoice, splitWords, type VoiceLike } from './tts';

const voice = (over: Partial<VoiceLike>): VoiceLike => ({
  voiceURI: over.name ?? 'v',
  name: 'v',
  lang: 'nl-NL',
  localService: true,
  default: false,
  ...over,
});

describe('isDutchVoice', () => {
  it('reconnait les variantes d ecriture de la langue', () => {
    expect(isDutchVoice(voice({ lang: 'nl-NL' }))).toBe(true);
    expect(isDutchVoice(voice({ lang: 'nl_BE' }))).toBe(true);
    expect(isDutchVoice(voice({ lang: 'nl' }))).toBe(true);
    expect(isDutchVoice(voice({ lang: 'fr-FR' }))).toBe(false);
  });
});

describe('pickVoice', () => {
  const nlNL = voice({ name: 'Xander', voiceURI: 'nl-nl-1', lang: 'nl-NL' });
  const nlBE = voice({ name: 'Ellen', voiceURI: 'nl-be-1', lang: 'nl-BE' });
  const fr = voice({ name: 'Thomas', voiceURI: 'fr-1', lang: 'fr-FR' });

  it('renvoie null si aucune voix neerlandaise n est installee', () => {
    expect(pickVoice([fr], 'nl-NL')).toBeNull();
    expect(pickVoice([], 'nl-NL')).toBeNull();
  });

  it('prefere la variante demandee', () => {
    expect(pickVoice([fr, nlBE, nlNL], 'nl-BE')?.voiceURI).toBe('nl-be-1');
    expect(pickVoice([fr, nlBE, nlNL], 'nl-NL')?.voiceURI).toBe('nl-nl-1');
  });

  it('se rabat sur l autre variante neerlandaise', () => {
    expect(pickVoice([fr, nlBE], 'nl-NL')?.voiceURI).toBe('nl-be-1');
  });

  it('prefere une voix locale (disponible hors ligne) a qualite egale', () => {
    const remote = voice({ voiceURI: 'remote', lang: 'nl-NL', localService: false });
    const local = voice({ voiceURI: 'local', lang: 'nl-NL', localService: true });
    expect(pickVoice([remote, local], 'nl-NL')?.voiceURI).toBe('local');
  });

  it('respecte la voix choisie dans les reglages', () => {
    expect(pickVoice([nlNL, nlBE], 'nl-NL', 'nl-be-1')?.voiceURI).toBe('nl-be-1');
  });

  it('ignore une voix choisie qui a disparu de l appareil', () => {
    expect(pickVoice([nlNL], 'nl-NL', 'voix-supprimee')?.voiceURI).toBe('nl-nl-1');
  });
});

describe('splitWords', () => {
  it('retire la ponctuation et garde les apostrophes internes', () => {
    expect(splitWords('Hoe gaat het, Jan?')).toEqual(['Hoe', 'gaat', 'het', 'Jan']);
    expect(splitWords("'s ochtends -- altijd!")).toEqual(["'s", 'ochtends', 'altijd']);
  });

  it('renvoie une liste vide pour une chaine vide', () => {
    expect(splitWords('   ')).toEqual([]);
  });
});
