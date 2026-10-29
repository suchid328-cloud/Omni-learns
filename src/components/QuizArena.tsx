import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  BrainCircuit, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Flame, 
  Award, 
  RotateCcw, 
  ArrowRight, 
  HelpCircle, 
  Lightbulb, 
  BookOpen, 
  Zap, 
  Compass, 
  Layers, 
  ChevronRight, 
  Filter, 
  PlusCircle, 
  Loader2,
  Mic,
  MicOff,
  Volume2,
  Square,
  Radio
} from 'lucide-react';
import { INITIAL_QUIZ_BANK } from '../data/quizBank';
import { QuizCategory, QuizQuestion, QuizSessionState } from '../types';
import { generateQuizQuestions } from '../services/geminiService';
import { 
  speakText, 
  stopSpeaking, 
  isSpeaking, 
  createSpeechRecognition, 
  isSpeechRecognitionSupported 
} from '../services/speechService';
import { useApp } from '../context/AppContext';

const CATEGORIES: Array<{ id: QuizCategory | 'All'; label: string; emoji: string; color: string }> = [
  { id: 'All', label: 'All Domains', emoji: '🌌', color: 'from-cyan-500 to-blue-500' },
  { id: 'Science', label: 'Science', emoji: '🔬', color: 'from-emerald-500 to-teal-500' },
  { id: 'Space', label: 'Space & Cosmos', emoji: '🪐', color: 'from-purple-500 to-indigo-500' },
  { id: 'Technology', label: 'Technology', emoji: '💻', color: 'from-cyan-500 to-teal-500' },
  { id: 'History', label: 'History', emoji: '📜', color: 'from-amber-500 to-orange-500' },
];

export const QuizArena: React.FC = () => {
  const { 
    customApiKey, 
    incrementQuizStats, 
    setIsKeyModalOpen,
    voiceSettings,
    setIsVoiceModalOpen,
    pendingVoiceAction,
    setPendingVoiceAction
  } = useApp();

  // Full question pool: built-in bank + AI generated additions
  const [questionBank, setQuestionBank] = useState<QuizQuestion[]>(INITIAL_QUIZ_BANK);
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | 'All'>('All');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isRecordingTopic, setIsRecordingTopic] = useState<boolean>(false);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState<boolean>(false);

  const topicRecognitionRef = useRef<any>(null);


  // Session state to guarantee NO question repeats during this session
  const [session, setSession] = useState<QuizSessionState>(() => ({
    category: 'All',
    questions: [],
    currentIndex: 0,
    selectedOption: null,
    isAnswered: false,
    score: 0,
    streak: 0,
    highestStreak: 0,
    usedQuestionIds: [],
    history: [],
    isCompleted: false,
    startTime: Date.now(),
  }));

  // Filter available questions by category
  const filteredPool = useMemo(() => {
    if (selectedCategory === 'All') return questionBank;
    return questionBank.filter((q) => q.category.toLowerCase() === selectedCategory.toLowerCase());
  }, [questionBank, selectedCategory]);

  // Start a new 5-question round from unseen questions
  const startNewRound = (category: QuizCategory | 'All', customQuestions?: QuizQuestion[]) => {
    let sourcePool = customQuestions || (
      category === 'All' 
        ? questionBank 
        : questionBank.filter((q) => q.category.toLowerCase() === category.toLowerCase())
    );

    // Filter out questions already used in this session to NEVER repeat
    let available = sourcePool.filter((q) => !session.usedQuestionIds.includes(q.id));

    // If all questions in pool have been answered, allow resetting used IDs for this category
    if (available.length === 0) {
      available = sourcePool;
    }

    // Shuffle and pick 5
    const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, 5);

    setSession((prev) => ({
      ...prev,
      category,
      questions: shuffled,
      currentIndex: 0,
      selectedOption: null,
      isAnswered: false,
      isCompleted: false,
      startTime: Date.now(),
    }));
  };

  // Initialize on mount
  useEffect(() => {
    if (session.questions.length === 0) {
      startNewRound('All');
    }
  }, []);

  const currentQuestion = session.questions[session.currentIndex];

  // Handle Voice Assistant actions
  useEffect(() => {
    if (pendingVoiceAction) {
      if (pendingVoiceAction.type === 'start-quiz' && pendingVoiceAction.payload) {
        const topic = pendingVoiceAction.payload;
        setPendingVoiceAction(null);
        setCustomTopic(topic);
        handleGenerateAIQuiz(topic);
      } else if (pendingVoiceAction.type === 'select-quiz-option') {
        const optIdx = pendingVoiceAction.optionIndex;
        setPendingVoiceAction(null);
        if (!session.isAnswered && currentQuestion) {
          handleSelectOption(optIdx);
        }
      }
    }
  }, [pendingVoiceAction, setPendingVoiceAction, session.isAnswered, currentQuestion]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (topicRecognitionRef.current) {
        try {
          topicRecognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Read Question and Options Aloud (Text-to-Speech)
  const handleSpeakQuestion = () => {
    if (!currentQuestion) return;
    if (isSpeakingQuestion) {
      stopSpeaking();
      setIsSpeakingQuestion(false);
      return;
    }

    const optionsText = currentQuestion.options
      .map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt}`)
      .join('. ');
    const fullText = `Question: ${currentQuestion.question}. ${optionsText}`;

    setIsSpeakingQuestion(true);
    speakText(fullText, {
      lang: voiceSettings.language,
      onEnd: () => setIsSpeakingQuestion(false),
      onError: () => setIsSpeakingQuestion(false),
    });
  };

  // Automatically read question aloud if TTS is enabled
  useEffect(() => {
    if (voiceSettings.ttsEnabled && currentQuestion && !session.isAnswered) {
      handleSpeakQuestion();
    }
  }, [session.currentIndex, voiceSettings.ttsEnabled]);

  // Voice Topic Recognition
  const handleToggleTopicVoice = () => {
    if (isRecordingTopic) {
      if (topicRecognitionRef.current) {
        try {
          topicRecognitionRef.current.abort();
        } catch {}
      }
      setIsRecordingTopic(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setAiError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = createSpeechRecognition(voiceSettings.language);
      if (!recognition) return;

      topicRecognitionRef.current = recognition;
      setIsRecordingTopic(true);
      setAiError(null);

      recognition.onresult = (event: any) => {
        let topicText = '';
        for (let i = 0; i < event.results.length; i++) {
          topicText += event.results[i][0].transcript;
        }
        setCustomTopic(topicText);

        if (event.results[0]?.isFinal && voiceSettings.autoSend && topicText.trim()) {
          setIsRecordingTopic(false);
          handleGenerateAIQuiz(topicText.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Topic voice error:', event.error);
        if (event.error === 'not-allowed') {
          setAiError('Microphone permission blocked in your browser. Opening Voice Settings to unblock...');
          setIsVoiceModalOpen(true);
        } else {
          setAiError(`Voice topic issue: ${event.error}`);
        }
        setIsRecordingTopic(false);
      };

      recognition.onend = () => {
        setIsRecordingTopic(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start topic voice:', err);
      setIsRecordingTopic(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (session.isAnswered || !currentQuestion) return;

    if (isSpeakingQuestion) {
      stopSpeaking();
      setIsSpeakingQuestion(false);
    }

    const isCorrect = optionIndex === currentQuestion.correctIndex;
    const newStreak = isCorrect ? session.streak + 1 : 0;
    const highestStreak = Math.max(session.highestStreak, newStreak);
    const points = isCorrect ? 100 + newStreak * 25 : 0;

    setSession((prev) => ({
      ...prev,
      selectedOption: optionIndex,
      isAnswered: true,
      score: prev.score + points,
      streak: newStreak,
      highestStreak,
      usedQuestionIds: [...prev.usedQuestionIds, currentQuestion.id],
      history: [
        ...prev.history,
        {
          question: currentQuestion,
          userAnswer: optionIndex,
          isCorrect,
        },
      ],
    }));

    if (isCorrect) {
      // mini celebratory sparkle
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.8 },
      });
    }

    // Speak explanation if TTS enabled
    if (voiceSettings.ttsEnabled) {
      const feedback = isCorrect 
        ? `Correct! ${currentQuestion.explanation}` 
        : `Incorrect. The correct answer was ${currentQuestion.options[currentQuestion.correctIndex]}. ${currentQuestion.explanation}`;
      speakText(feedback, { lang: voiceSettings.language });
    }
  };

  const handleNextQuestion = () => {
    stopSpeaking();
    setIsSpeakingQuestion(false);

    if (session.currentIndex + 1 < session.questions.length) {
      setSession((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedOption: null,
        isAnswered: false,
      }));
    } else {
      // Completed round!
      const correctCount = session.history.filter((h) => h.isCorrect).length;
      incrementQuizStats(session.questions.length, correctCount);

      setSession((prev) => ({
        ...prev,
        isCompleted: true,
      }));

      // Grand celebration confetti
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  // Handle Dynamic AI Question Generation
  const handleGenerateAIQuiz = async (overrideTopic?: string) => {
    const topic = (overrideTopic || customTopic).trim() || selectedCategory || 'Quantum Physics and History of Technology';
    setIsGeneratingAI(true);
    setAiError(null);

    if (isRecordingTopic && topicRecognitionRef.current) {
      try {
        topicRecognitionRef.current.abort();
      } catch {}
      setIsRecordingTopic(false);
    }

    try {
      const generated = await generateQuizQuestions(topic, 5, 'medium', customApiKey);
      if (generated && generated.length > 0) {
        // Tag them with unique IDs
        const formatted: QuizQuestion[] = generated.map((q, idx) => ({
          ...q,
          id: `ai-${Date.now()}-${idx}`,
          category: topic,
        }));

        setQuestionBank((prev) => [...formatted, ...prev]);
        startNewRound(selectedCategory, formatted);
        setCustomTopic('');
      } else {
        throw new Error('No valid questions received from Gemini AI.');
      }
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setAiError(err?.message || 'Could not generate quiz questions. Check your Gemini API key in the sidebar.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Remaining unseen questions calculation
  const unseenCount = useMemo(() => {
    return filteredPool.filter((q) => !session.usedQuestionIds.includes(q.id)).length;
  }, [filteredPool, session.usedQuestionIds]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Category selector & AI Generator Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧠</span>
              <h2 className="text-xl font-extrabold text-white">Dynamic Smart Quiz Arena</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero-repeat adaptive questions with instant analysis, streak multipliers, and AI expansion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              {unseenCount} Fresh Unseen in Pool
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`category-btn-${cat.id.toLowerCase()}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  startNewRound(cat.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic AI Quiz Generator Input with Voice Topic Input */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <input
              id="custom-ai-quiz-input"
              type="text"
              placeholder={
                isRecordingTopic 
                  ? 'Listening for quiz topic... (e.g. "Space Explorations", "Quantum Computing")' 
                  : 'Or enter any custom topic (e.g. Astrophysics, Medieval Architecture, React Internals)...'
              }
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateAIQuiz()}
              className={`w-full pl-4 pr-11 py-2.5 rounded-xl bg-slate-950 border text-xs text-white placeholder-slate-500 transition-all ${
                isRecordingTopic
                  ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20'
                  : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
              }`}
            />
            <button
              type="button"
              id="quiz-voice-topic-btn"
              onClick={handleToggleTopicVoice}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                isRecordingTopic
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
              }`}
              title={isRecordingTopic ? 'Stop voice recording' : 'Speak quiz topic (Voice Command)'}
            >
              {isRecordingTopic ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            id="generate-ai-quiz-btn"
            onClick={() => handleGenerateAIQuiz()}
            disabled={isGeneratingAI}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all shrink-0 disabled:opacity-50"
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Generate AI Questions
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
            <span>{aiError}</span>
            {aiError.toLowerCase().includes('microphone') || aiError.toLowerCase().includes('voice') ? (
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="px-3 py-1 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shrink-0 transition-colors"
              >
                Open Voice Settings
              </button>
            ) : (
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className="underline hover:text-white font-semibold ml-2 shrink-0"
              >
                Configure API Key
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Quiz Arena Card */}
      {!session.isCompleted ? (
        currentQuestion ? (
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
            {/* Top Stat Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-800 text-cyan-300 border border-slate-700">
                  Question {session.currentIndex + 1} of {session.questions.length}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Domain: <span className="text-slate-200">{currentQuestion.category}</span>
                </span>
              </div>

              <div className="flex items-center gap-4">
                {session.streak > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold animate-pulse">
                    <Flame className="w-4 h-4 text-amber-400" />
                    {session.streak}x Streak!
                  </div>
                )}
                <div className="text-sm font-mono font-extrabold text-white">
                  Score: <span className="text-cyan-400">{session.score}</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 h-full transition-all duration-300"
                style={{
                  width: `${((session.currentIndex + (session.isAnswered ? 1 : 0)) / session.questions.length) * 100}%`,
                }}
              />
            </div>

            {/* Question Heading with Voice Read Aloud and Voice Answer Hint */}
            <div className="py-2 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl md:text-2xl font-extrabold text-white leading-snug tracking-tight flex-1">
                  {currentQuestion.question}
                </h3>
                <button
                  id="quiz-speak-question-btn"
                  onClick={handleSpeakQuestion}
                  className={`p-2 rounded-xl border shrink-0 transition-colors ${
                    isSpeakingQuestion
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-cyan-300'
                  }`}
                  title={isSpeakingQuestion ? 'Stop reading question' : 'Read question aloud (Text-to-Speech)'}
                >
                  {isSpeakingQuestion ? (
                    <Square className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  )}
                </button>
              </div>

              {/* Voice Command Answer Hint */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="inline-flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  <Mic className="w-3 h-3" /> Voice Answering:
                </span>
                <span>Say &ldquo;Option A&rdquo;, &ldquo;Option B&rdquo;, &ldquo;Choice 1&rdquo;, or &ldquo;Pick 2&rdquo; to answer hands-free</span>
              </div>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = session.selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctIndex;
                const showFeedback = session.isAnswered;

                let btnStyles = 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-200';
                let iconIndicator = (
                  <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-400">
                    {String.fromCharCode(65 + idx)}
                  </span>
                );

                if (showFeedback) {
                  if (isCorrect) {
                    btnStyles = 'bg-emerald-950/50 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500';
                    iconIndicator = <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />;
                  } else if (isSelected && !isCorrect) {
                    btnStyles = 'bg-rose-950/50 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-1 ring-rose-500';
                    iconIndicator = <XCircle className="w-6 h-6 text-rose-400 shrink-0" />;
                  } else {
                    btnStyles = 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60';
                  }
                } else {
                  btnStyles = 'bg-slate-950/90 border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900 text-slate-200 hover:text-white cursor-pointer';
                }

                return (
                  <button
                    key={idx}
                    id={`quiz-option-${idx}`}
                    onClick={() => handleSelectOption(idx)}
                    disabled={session.isAnswered}
                    className={`p-4 rounded-2xl border text-left font-medium transition-all duration-200 flex items-center justify-between gap-3 ${btnStyles}`}
                  >
                    <span className="text-sm font-semibold leading-snug flex-1">{option}</span>
                    {iconIndicator}
                  </button>
                );
              })}
            </div>

            {/* Answer Explanation & Fun Fact Card */}
            {session.isAnswered && (
              <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-cyan-300">Scientific Breakdown &amp; Analysis</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                </div>

                {currentQuestion.funFact && (
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-200">
                      <span className="font-bold text-purple-300">Mind-Blowing Fact: </span>
                      {currentQuestion.funFact}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    id="quiz-next-btn"
                    onClick={handleNextQuestion}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
                  >
                    <span>{session.currentIndex + 1 < session.questions.length ? 'Next Question' : 'Complete Arena'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
            <BrainCircuit className="w-12 h-12 text-cyan-400 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-white">No questions remaining in this pool</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You've conquered every question in this category for this session!
            </p>
            <button
              onClick={() => startNewRound(selectedCategory)}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              Reset Category Pool
            </button>
          </div>
        )
      ) : (
        /* Celebratory Completion Screen */
        <div className="p-8 md:p-10 rounded-3xl bg-slate-900/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)] text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-1 shadow-xl shadow-cyan-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Award className="w-10 h-10 text-amber-400 animate-bounce" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-white">
              Arena Conquered! 🎉
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Outstanding performance in <span className="text-cyan-300 font-semibold">{session.category}</span>!
            </p>
          </div>

          {/* Stats summary banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Final Score</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">{session.score}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Correct Answers</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {session.history.filter((h) => h.isCorrect).length} / {session.questions.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Peak Streak</span>
              <span className="text-2xl font-black text-amber-400 font-mono">{session.highestStreak}🔥</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Mastery Tier</span>
              <span className="text-sm font-bold text-purple-300 block mt-1">
                {session.history.filter((h) => h.isCorrect).length === session.questions.length
                  ? '🌟 Galactic Scholar'
                  : session.history.filter((h) => h.isCorrect).length >= 3
                  ? '⚡ Master Polymath'
                  : '📘 Keen Learner'}
              </span>
            </div>
          </div>

          {/* Review Previous Answers Accordion */}
          <div className="text-left max-w-2xl mx-auto space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Round Review</h4>
            {session.history.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                  item.isCorrect
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                }`}
              >
                {item.isCorrect ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{item.question.question}</p>
                  <p className="mt-1 text-slate-300">
                    <span className="font-bold">Correct:</span> {item.question.options[item.question.correctIndex]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Next Round Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              id="quiz-continue-round-btn"
              onClick={() => startNewRound(selectedCategory)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Next 5 Unseen Questions</span>
            </button>
            <button
              id="quiz-generate-ai-more-btn"
              onClick={() => handleGenerateAIQuiz()}
              disabled={isGeneratingAI}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate AI Custom Round</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
