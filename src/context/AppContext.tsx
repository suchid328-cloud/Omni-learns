import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ActiveModule, UserProgress, VoiceSettings, PendingVoiceAction } from '../types';
import { checkGeminiStatus, GeminiStatus } from '../services/geminiService';
import { classifyVoiceCommand, speakText } from '../services/speechService';

interface AppContextType {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  geminiStatus: GeminiStatus;
  refreshGeminiStatus: () => Promise<void>;
  userProgress: UserProgress;
  incrementQuizStats: (answered: number, correct: number) => void;
  incrementMathStats: () => void;
  updateArcadeStats: (updater: (prev: UserProgress['arcadeStats']) => UserProgress['arcadeStats']) => void;
  isKeyModalOpen: boolean;
  setIsKeyModalOpen: (open: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  // Voice Controls & Features
  voiceSettings: VoiceSettings;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  isVoiceModalOpen: boolean;
  setIsVoiceModalOpen: (open: boolean) => void;
  isVoiceActive: boolean;
  setIsVoiceActive: (active: boolean) => void;
  pendingVoiceAction: PendingVoiceAction | null;
  setPendingVoiceAction: (action: PendingVoiceAction | null) => void;
  executeVoiceCommand: (transcript: string) => { intent: string; message: string };
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  ttsEnabled: false,
  language: 'en-US',
  autoSend: true,
};

const DEFAULT_PROGRESS: UserProgress = {
  totalQuizzesTaken: 0,
  totalQuestionsAnswered: 0,
  totalCorrectAnswers: 0,
  mathProblemsSolved: 0,
  arcadeGamesPlayed: 0,
  arcadeStats: {
    numberGuessWins: 0,
    numberGuessBestAttempts: 0,
    sprintHighScore: 0,
    enigmaSolvedCount: 0,
    quantumMemoryHighLevel: 0,
    elementClashHighScore: 0,
    mathBlitzHighScore: 0,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('quiz');
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('omni_custom_api_key') || '';
  });
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatus>({
    hasEnvKey: false,
    model: 'gemini-1.5-pro',
    status: 'checking',
  });
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Voice States
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('omni_voice_settings');
      return saved ? { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_VOICE_SETTINGS;
    } catch {
      return DEFAULT_VOICE_SETTINGS;
    }
  });
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [pendingVoiceAction, setPendingVoiceAction] = useState<PendingVoiceAction | null>(null);

  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    try {
      const saved = localStorage.getItem('omni_user_progress');
      return saved ? JSON.parse(saved) : DEFAULT_PROGRESS;
    } catch {
      return DEFAULT_PROGRESS;
    }
  });

  const refreshGeminiStatus = useCallback(async () => {
    const status = await checkGeminiStatus();
    setGeminiStatus(status);
  }, []);

  useEffect(() => {
    refreshGeminiStatus();
  }, [refreshGeminiStatus]);

  useEffect(() => {
    localStorage.setItem('omni_custom_api_key', customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    localStorage.setItem('omni_user_progress', JSON.stringify(userProgress));
  }, [userProgress]);

  useEffect(() => {
    localStorage.setItem('omni_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  const updateVoiceSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setVoiceSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const incrementQuizStats = useCallback((answered: number, correct: number) => {
    setUserProgress((prev) => ({
      ...prev,
      totalQuizzesTaken: prev.totalQuizzesTaken + 1,
      totalQuestionsAnswered: prev.totalQuestionsAnswered + answered,
      totalCorrectAnswers: prev.totalCorrectAnswers + correct,
    }));
  }, []);

  const incrementMathStats = useCallback(() => {
    setUserProgress((prev) => ({
      ...prev,
      mathProblemsSolved: prev.mathProblemsSolved + 1,
    }));
  }, []);

  const updateArcadeStats = useCallback((updater: (prev: UserProgress['arcadeStats']) => UserProgress['arcadeStats']) => {
    setUserProgress((prev) => ({
      ...prev,
      arcadeGamesPlayed: prev.arcadeGamesPlayed + 1,
      arcadeStats: updater(prev.arcadeStats),
    }));
  }, []);

  // Voice Command Dispatcher
  const executeVoiceCommand = useCallback((transcript: string) => {
    const classified = classifyVoiceCommand(transcript);

    switch (classified.type) {
      case 'NAVIGATE':
        if (classified.targetModule) {
          setActiveModule(classified.targetModule);
          return {
            intent: 'Navigation',
            message: `Switched to ${classified.targetModule.toUpperCase()}`,
          };
        }
        break;

      case 'MATH_SOLVE':
        setActiveModule('math');
        setPendingVoiceAction({
          type: 'solve-math',
          payload: classified.cleanedQuery,
        });
        return {
          intent: 'Math Derivation',
          message: `Solving: "${classified.cleanedQuery}"`,
        };

      case 'QUIZ_TOPIC':
        setActiveModule('quiz');
        setPendingVoiceAction({
          type: 'start-quiz',
          payload: classified.cleanedQuery,
        });
        return {
          intent: 'Quiz Generator',
          message: `Generating quiz on "${classified.cleanedQuery}"`,
        };

      case 'QUIZ_ANSWER':
        if (typeof classified.quizAnswerIndex === 'number') {
          setActiveModule('quiz');
          setPendingVoiceAction({
            type: 'select-quiz-option',
            optionIndex: classified.quizAnswerIndex,
          });
          return {
            intent: 'Quiz Answer',
            message: `Selected Option ${(classified.quizAnswerIndex + 1).toString()}`,
          };
        }
        break;

      case 'KNOWLEDGE_QUESTION':
      default:
        setActiveModule('mentor');
        setPendingVoiceAction({
          type: 'ask-mentor',
          payload: classified.cleanedQuery,
        });
        return {
          intent: 'Knowledge Mentor',
          message: `Inquiring: "${classified.cleanedQuery}"`,
        };
    }

    return {
      intent: 'Recognized',
      message: transcript,
    };
  }, []);

  return (
    <AppContext.Provider
      value={useMemo(() => ({
        activeModule,
        setActiveModule,
        customApiKey,
        setCustomApiKey,
        geminiStatus,
        refreshGeminiStatus,
        userProgress,
        incrementQuizStats,
        incrementMathStats,
        updateArcadeStats,
        isKeyModalOpen,
        setIsKeyModalOpen,
        soundEnabled,
        setSoundEnabled,
        voiceSettings,
        updateVoiceSettings,
        isVoiceModalOpen,
        setIsVoiceModalOpen,
        isVoiceActive,
        setIsVoiceActive,
        pendingVoiceAction,
        setPendingVoiceAction,
        executeVoiceCommand,
      }), [
        activeModule,
        customApiKey,
        geminiStatus,
        refreshGeminiStatus,
        userProgress,
        incrementQuizStats,
        incrementMathStats,
        updateArcadeStats,
        isKeyModalOpen,
        soundEnabled,
        voiceSettings,
        updateVoiceSettings,
        isVoiceModalOpen,
        isVoiceActive,
        pendingVoiceAction,
        executeVoiceCommand,
      ])}
    >
      {children}
    </AppContext.Provider>
  );
};


export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
