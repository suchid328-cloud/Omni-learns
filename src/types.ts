export type ActiveModule = 'quiz' | 'math' | 'arcade' | 'mentor';

export type QuizCategory = 'Science' | 'Space' | 'Technology' | 'History' | 'Mixed';

export interface QuizQuestion {
  id: string;
  category: QuizCategory | string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  funFact?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizSessionState {
  category: QuizCategory | string;
  questions: QuizQuestion[];
  currentIndex: number;
  selectedOption: number | null;
  isAnswered: boolean;
  score: number;
  streak: number;
  highestStreak: number;
  usedQuestionIds: string[];
  history: Array<{
    question: QuizQuestion;
    userAnswer: number;
    isCorrect: boolean;
  }>;
  isCompleted: boolean;
  startTime: number;
}

export interface MathPreset {
  title: string;
  category: string;
  problem: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface MentorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  field?: string;
  suggestedFollowUps?: string[];
  elapsedMs?: number;
  modelUsed?: string;
}

export type ArcadeGame = 'number-guess' | 'science-sprint' | 'concept-enigma' | 'quantum-memory' | 'element-clash' | 'math-blitz';

export interface ArcadeStats {
  numberGuessWins: number;
  numberGuessBestAttempts: number;
  sprintHighScore: number;
  enigmaSolvedCount: number;
  quantumMemoryHighLevel: number;
  elementClashHighScore: number;
  mathBlitzHighScore: number;
}

export interface UserProgress {
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  mathProblemsSolved: number;
  arcadeGamesPlayed: number;
  arcadeStats: ArcadeStats;
}

export type PendingVoiceAction = 
  | { type: 'solve-math'; payload: string }
  | { type: 'ask-mentor'; payload: string }
  | { type: 'start-quiz'; payload: string }
  | { type: 'select-quiz-option'; optionIndex: number };

export interface VoiceSettings {
  enabled: boolean;
  ttsEnabled: boolean;
  language: string;
  autoSend: boolean;
}

