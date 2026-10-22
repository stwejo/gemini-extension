import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_SETTINGS } from '@/db/db';
import { ExerciseView } from './ExerciseView';
import type { Exercise } from '@/content/schema';

// La synthese vocale et IndexedDB ne sont pas disponibles sous jsdom :
// on remplace le contexte par un double, les exercices restent testables.
const say = vi.fn();
vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    settings: { ...DEFAULT_SETTINGS, tolerance: 'souple' },
    loading: false,
    update: vi.fn(),
    speech: {
      supported: true,
      dutchVoices: [],
      activeVoice: null,
      speaking: false,
      wordIndex: -1,
      say,
      sayWordByWord: vi.fn(),
      stop: vi.fn(),
    },
  }),
}));

const mcq: Exercise = {
  id: 'e1',
  type: 'mcqAudio',
  audioNl: 'Goedemorgen!',
  question_fr: 'Qu’entends-tu ?',
  choices: ['Bonjour (le matin)', 'Bonne nuit'],
  choicesLang: 'fr',
  answerIndex: 0,
  errorTags: [],
};

const dictation: Exercise = {
  id: 'e2',
  type: 'dictation',
  audioNl: 'Dank je wel',
  fr: 'Merci beaucoup',
  errorTags: [],
};

const wordOrder: Exercise = {
  id: 'e3',
  type: 'wordOrder',
  target: 'Ik woon in Luik.',
  fr: 'J’habite à Liège.',
  alsoAccept: [],
  extraTokens: [],
  errorTags: [],
};

describe('QCM audio', () => {
  it('signale la bonne réponse et ne compte qu’une fois', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<ExerciseView exercise={mcq} onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: 'Bonjour (le matin)' }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true, 'Bonjour (le matin)');
    expect(screen.getByRole('status')).toHaveTextContent('Correct');

    await user.click(screen.getByRole('button', { name: 'Bonne nuit' }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('affiche la réponse attendue quand on se trompe', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<ExerciseView exercise={mcq} onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: 'Bonne nuit' }));
    expect(onAnswer).toHaveBeenCalledWith(false, 'Bonne nuit');
    expect(screen.getByRole('status')).toHaveTextContent('Bonjour (le matin)');
  });

  it('déclenche la lecture audio au clic sur Écouter', async () => {
    const user = userEvent.setup();
    render(<ExerciseView exercise={mcq} onAnswer={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Écouter : Goedemorgen!' }));
    expect(say).toHaveBeenCalledWith('Goedemorgen!', undefined);
  });
});

describe('Dictée', () => {
  it('accepte une réponse sans majuscule en mode souple', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<ExerciseView exercise={dictation} onAnswer={onAnswer} />);

    await user.type(screen.getByLabelText('Écris ce que tu entends'), 'dank je wel');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(onAnswer).toHaveBeenCalledWith(true, 'dank je wel');
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
  });

  it('explique le mot manquant quand la réponse est fausse', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<ExerciseView exercise={dictation} onAnswer={onAnswer} />);

    await user.type(screen.getByLabelText('Écris ce que tu entends'), 'dank wel');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(onAnswer).toHaveBeenCalledWith(false, 'dank wel');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Dank je wel');
    expect(status).toHaveTextContent('je');
  });
});

describe('Remise en ordre', () => {
  it('valide la phrase correcte', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<ExerciseView exercise={wordOrder} onAnswer={onAnswer} />);

    for (const word of ['Ik', 'woon', 'in', 'Luik.']) {
      await user.click(screen.getByRole('button', { name: word }));
    }
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(onAnswer).toHaveBeenCalledWith(true, 'Ik woon in Luik.');
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
  });

  it('indique la position de la première erreur', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<ExerciseView exercise={wordOrder} onAnswer={onAnswer} />);

    for (const word of ['Ik', 'in', 'woon', 'Luik.']) {
      await user.click(screen.getByRole('button', { name: word }));
    }
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(onAnswer).toHaveBeenCalledWith(false, 'Ik in woon Luik.');
    expect(screen.getByRole('status')).toHaveTextContent('Position 2');
  });
});
