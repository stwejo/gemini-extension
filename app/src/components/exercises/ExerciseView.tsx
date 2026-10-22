import { ClozeExercise } from './ClozeExercise';
import { DictationExercise } from './DictationExercise';
import { ErrorCorrectionExercise } from './ErrorCorrectionExercise';
import { McqAudioExercise } from './McqAudioExercise';
import { RoleplayExercise } from './RoleplayExercise';
import { SpeakRepeatExercise } from './SpeakRepeatExercise';
import { TranslateExercise } from './TranslateExercise';
import { WordOrderExercise } from './WordOrderExercise';
import type { Exercise } from '@/content/schema';

interface Props {
  exercise: Exercise;
  onAnswer: (correct: boolean, userAnswer?: string) => void;
}

/**
 * Aiguillage vers le composant d'exercice. Les types non implementes sont
 * rejetes a la validation du contenu : ce switch est donc exhaustif.
 */
export function ExerciseView({ exercise, onAnswer }: Props) {
  switch (exercise.type) {
    case 'mcqAudio':
      return <McqAudioExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'dictation':
      return <DictationExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'wordOrder':
      return <WordOrderExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'speakRepeat':
      return <SpeakRepeatExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'cloze':
      return <ClozeExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'translate':
      return <TranslateExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'errorCorrection':
      return <ErrorCorrectionExercise exercise={exercise} onAnswer={onAnswer} />;
    case 'roleplay':
      return <RoleplayExercise exercise={exercise} onAnswer={onAnswer} />;
  }
}
