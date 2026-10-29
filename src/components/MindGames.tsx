import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gamepad2, 
  Sparkles, 
  Flame, 
  Trophy, 
  Zap, 
  Timer, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Lightbulb, 
  Heart,
  Brain,
  Hash,
  Compass,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  Atom,
  Calculator,
  Grid
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchGameClue, generateArcadeQuestions } from '../services/geminiService';
import { ArcadeGame } from '../types';

export const MindGames: React.FC = () => {
  const { customApiKey, updateArcadeStats, userProgress, setIsKeyModalOpen } = useApp();

  const [activeGame, setActiveGame] = useState<ArcadeGame>('number-guess');

  // ==========================================
  // GAME 1: INTELLIGENT NUMBER GUESS (1-100)
  // ==========================================
  const [secretNumber, setSecretNumber] = useState<number>(() => Math.floor(Math.random() * 100) + 1);
  const [guessInput, setGuessInput] = useState<string>('');
  const [guesses, setGuesses] = useState<Array<{ value: number; diff: number; feedback: 'higher' | 'lower' | 'correct' }>>([]);
  const [minBound, setMinBound] = useState<number>(1);
  const [maxBound, setMaxBound] = useState<number>(100);
  const [isNumberWon, setIsNumberWon] = useState<boolean>(false);
  const [oracleClue, setOracleClue] = useState<string | null>(null);
  const [isFetchingClue, setIsFetchingClue] = useState<boolean>(false);

  const resetNumberGame = () => {
    const num = Math.floor(Math.random() * 100) + 1;
    setSecretNumber(num);
    setGuesses([]);
    setMinBound(1);
    setMaxBound(100);
    setIsNumberWon(false);
    setOracleClue(null);
    setGuessInput('');
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(guessInput.trim(), 10);
    if (isNaN(val) || val < 1 || val > 100 || isNumberWon) return;

    const diff = Math.abs(val - secretNumber);
    let feedback: 'higher' | 'lower' | 'correct' = 'correct';

    if (val < secretNumber) {
      feedback = 'higher';
      setMinBound((prev) => Math.max(prev, val + 1));
    } else if (val > secretNumber) {
      feedback = 'lower';
      setMaxBound((prev) => Math.min(prev, val - 1));
    } else {
      feedback = 'correct';
      setIsNumberWon(true);
      updateArcadeStats((prev) => ({
        ...prev,
        numberGuessWins: prev.numberGuessWins + 1,
        numberGuessBestAttempts:
          prev.numberGuessBestAttempts === 0
            ? guesses.length + 1
            : Math.min(prev.numberGuessBestAttempts, guesses.length + 1),
      }));

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    setGuesses((prev) => [{ value: val, diff, feedback }, ...prev]);
    setGuessInput('');
  };

  const handleAskOracleClue = async () => {
    setIsFetchingClue(true);
    try {
      const clue = await fetchGameClue(
        'number-guess',
        {
          secretNumber,
          guesses: guesses.map((g) => g.value),
        },
        customApiKey
      );
      setOracleClue(clue);
    } catch (err: any) {
      setOracleClue(
        `Dynamic Oracle Hint: The secret number is ${secretNumber % 2 === 0 ? 'EVEN' : 'ODD'}, and the sum of its digits is ${
          Math.floor(secretNumber / 10) + (secretNumber % 10)
        }.`
      );
    } finally {
      setIsFetchingClue(false);
    }
  };

  // Helper properties for secret number hints
  const isPrime = (n: number) => {
    if (n <= 1) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  };

  // ==========================================
  // GAME 2: SCIENCE TRIVIA QUICK-SPRINT (60s)
  // ==========================================
  const [sprintQuestions, setSprintQuestions] = useState<any[]>([

    { q: 'Light travels faster in water than in a vacuum.', a: false, exp: 'Light travels fastest in a vacuum (c ≈ 300,000 km/s).' },
    { q: 'Electrons are significantly less massive than protons.', a: true, exp: 'Protons are ~1,836 times more massive than electrons.' },
    { q: 'Sound waves can propagate through outer space.', a: false, exp: 'Sound is a mechanical wave requiring a physical medium.' },
    { q: 'DNA contains the nitrogenous base Uracil instead of Thymine.', a: false, exp: 'DNA uses Thymine (T); RNA uses Uracil (U).' },
    { q: 'Mitochondria contain their own distinct circular DNA genome.', a: true, exp: 'Mitochondria originated via endosymbiosis and retain mtDNA.' },
    { q: 'Absolute zero (0 K) has never been completely achieved in a lab.', a: true, exp: 'Third law of thermodynamics forbids reaching exact 0 K.' },
    { q: 'Diamond and graphite are allotropes of pure carbon.', a: true, exp: 'Both consist purely of carbon atoms in different lattice arrangements.' },
    { q: 'Venus is the closest planet to the Sun.', a: false, exp: 'Mercury is closest to the Sun; Venus is second.' },
    { q: 'Lasers produce coherent, monochromatic light waves.', a: true, exp: 'LASER stands for Light Amplification by Stimulated Emission of Radiation.' },
    { q: 'Antibiotics are effective against viral infections.', a: false, exp: 'Antibiotics only target bacterial cellular structures.' },
  ]);
  const [isLoadingSprint, setIsLoadingSprint] = useState(false);
  const [isLoadingChem, setIsLoadingChem] = useState(false);

  const [sprintState, setSprintState] = useState<{
    isRunning: boolean;
    timeLeft: number;
    score: number;
    multiplier: number;
    lives: number;
    qIndex: number;
    isFinished: boolean;
  }>({
    isRunning: false,
    timeLeft: 60,
    score: 0,
    multiplier: 1,
    lives: 3,
    qIndex: 0,
    isFinished: false,
  });

  const sprintTimerRef = useRef<any>(null);

  const startSprint = () => {
    setSprintState({
      isRunning: true,
      timeLeft: 60,
      score: 0,
      multiplier: 1,
      lives: 3,
      qIndex: 0,
      isFinished: false,
    });
  };

  useEffect(() => {
    async function loadDynamic() {
      try {
        setIsLoadingSprint(true);
        const sq = await generateArcadeQuestions('sprint', customApiKey);
        if (sq && sq.length > 0) setSprintQuestions(sq);
      } catch(e) {}
      setIsLoadingSprint(false);
      try {
        setIsLoadingChem(true);
        const cq = await generateArcadeQuestions('chemistry', customApiKey);
        if (cq && cq.length > 0) setChemistryQuestions(cq);
      } catch(e) {}
      setIsLoadingChem(false);
    }
    loadDynamic();
  }, [customApiKey]);

  useEffect(() => {
    if (sprintState.isRunning && sprintState.timeLeft > 0 && !sprintState.isFinished) {
      sprintTimerRef.current = setInterval(() => {
        setSprintState((prev) => {
          if (prev.timeLeft <= 1) {
            clearInterval(sprintTimerRef.current);
            updateArcadeStats((astats) => ({
              ...astats,
              sprintHighScore: Math.max(astats.sprintHighScore, prev.score),
            }));
            return { ...prev, timeLeft: 0, isRunning: false, isFinished: true };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      clearInterval(sprintTimerRef.current);
    }
    return () => clearInterval(sprintTimerRef.current);
  }, [sprintState.isRunning, sprintState.timeLeft, sprintState.isFinished]);

  const handleSprintAnswer = (userBool: boolean) => {
    if (!sprintState.isRunning || sprintState.isFinished) return;
    const currentQ = sprintQuestions[sprintState.qIndex % sprintQuestions.length];
    const isCorrect = userBool === currentQ.a;

    if (isCorrect) {
      const addedScore = 100 * sprintState.multiplier;
      const nextMultiplier = Math.min(sprintState.multiplier + 1, 5);
      setSprintState((prev) => ({
        ...prev,
        score: prev.score + addedScore,
        multiplier: nextMultiplier,
        qIndex: prev.qIndex + 1,
      }));
    } else {
      const nextLives = sprintState.lives - 1;
      if (nextLives <= 0) {
        clearInterval(sprintTimerRef.current);
        updateArcadeStats((astats) => ({
          ...astats,
          sprintHighScore: Math.max(astats.sprintHighScore, sprintState.score),
        }));
        setSprintState((prev) => ({
          ...prev,
          lives: 0,
          isRunning: false,
          isFinished: true,
        }));
      } else {
        setSprintState((prev) => ({
          ...prev,
          lives: nextLives,
          multiplier: 1,
          qIndex: prev.qIndex + 1,
        }));
      }
    }
  };

  // ==========================================
  // GAME 3: AI CONCEPT ENIGMA / SCRAMBLE
  // ==========================================
  const ENIGMA_WORDS = [
    { word: 'SUPERNOVA', category: 'Astrophysics', clues: ['A cataclysmic cosmic explosion', 'The violent death of a massive star', 'Synthesizes elements heavier than iron like gold'] },
    { word: 'PHOTOSYNTHESIS', category: 'Biology', clues: ['Converts light into chemical energy', 'Utilizes chlorophyll in chloroplasts', 'Releases molecular oxygen into the atmosphere'] },
    { word: 'ENTROPY', category: 'Thermodynamics', clues: ['A measure of disorder in a closed system', 'Always increases over time (2nd Law)', 'Determines the thermodynamic arrow of time'] },
    { word: 'HEURISTIC', category: 'Computer Science', clues: ['A practical problem-solving shortcut', 'Not guaranteed to be mathematically optimal', 'Used widely in A* search and AI agents'] },
  ];

  const [enigmaIndex, setEnigmaIndex] = useState<number>(0);
  const [enigmaGuess, setEnigmaGuess] = useState<string>('');
  const [revealedClues, setRevealedClues] = useState<number>(1);
  const [isEnigmaSolved, setIsEnigmaSolved] = useState<boolean>(false);
  const [enigmaFeedback, setEnigmaFeedback] = useState<string | null>(null);

  const currentEnigma = ENIGMA_WORDS[enigmaIndex % ENIGMA_WORDS.length];
  const scrambledWord = currentEnigma.word.split('').sort(() => 0.5 - Math.random()).join(' ');

  const handleEnigmaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enigmaGuess.trim().toUpperCase() === currentEnigma.word) {
      setIsEnigmaSolved(true);
      setEnigmaFeedback('Correct! Mind enigma solved!');
      updateArcadeStats((astats) => ({
        ...astats,
        enigmaSolvedCount: astats.enigmaSolvedCount + 1,
      }));
      confetti({ particleCount: 50, spread: 60 });
    } else {
      setEnigmaFeedback('Not quite! Try inspecting the clues or unscrambling the letters.');
    }
  };

  // ==========================================
  // GAME 4: QUANTUM MEMORY MATRIX (SIMON CYBER)
  // ==========================================
  const QUANTUM_NODES = [
    { id: 0, color: 'from-cyan-500 to-blue-600', activeGlow: 'ring-4 ring-cyan-300 shadow-cyan-500/80', label: 'Alpha ⚡' },
    { id: 1, color: 'from-purple-500 to-pink-600', activeGlow: 'ring-4 ring-purple-300 shadow-purple-500/80', label: 'Beta 🔮' },
    { id: 2, color: 'from-emerald-500 to-teal-600', activeGlow: 'ring-4 ring-emerald-300 shadow-emerald-500/80', label: 'Gamma 🧬' },
    { id: 3, color: 'from-amber-500 to-orange-600', activeGlow: 'ring-4 ring-amber-300 shadow-amber-500/80', label: 'Delta ☀️' },
  ];

  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [userSequenceIndex, setUserSequenceIndex] = useState<number>(0);
  const [activeFlashingNode, setActiveFlashingNode] = useState<number | null>(null);
  const [isMemoryPlaying, setIsMemoryPlaying] = useState<boolean>(false);
  const [isShowingSequence, setIsShowingSequence] = useState<boolean>(false);
  const [memoryLevel, setMemoryLevel] = useState<number>(1);
  const [memoryGameOver, setMemoryGameOver] = useState<boolean>(false);

  const startMemoryGame = () => {
    setMemoryLevel(1);
    setMemoryGameOver(false);
    setIsMemoryPlaying(true);
    const initialSeq = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
    setMemorySequence(initialSeq);
    setUserSequenceIndex(0);
    playMemorySequence(initialSeq);
  };

  const playMemorySequence = async (seq: number[]) => {
    setIsShowingSequence(true);
    for (let i = 0; i < seq.length; i++) {
      await new Promise((r) => setTimeout(r, 450));
      setActiveFlashingNode(seq[i]);
      await new Promise((r) => setTimeout(r, 450));
      setActiveFlashingNode(null);
    }
    setIsShowingSequence(false);
    setUserSequenceIndex(0);
  };

  const handleNodeClick = (nodeId: number) => {
    if (!isMemoryPlaying || isShowingSequence || memoryGameOver) return;

    setActiveFlashingNode(nodeId);
    setTimeout(() => setActiveFlashingNode(null), 200);

    if (nodeId === memorySequence[userSequenceIndex]) {
      const nextIndex = userSequenceIndex + 1;
      if (nextIndex === memorySequence.length) {
        const nextLevel = memoryLevel + 1;
        setMemoryLevel(nextLevel);
        updateArcadeStats((astats) => ({
          ...astats,
          quantumMemoryHighLevel: Math.max(astats.quantumMemoryHighLevel, nextLevel),
        }));

        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
        const nextSeq = [...memorySequence, Math.floor(Math.random() * 4)];
        setMemorySequence(nextSeq);
        setTimeout(() => {
          playMemorySequence(nextSeq);
        }, 800);
      } else {
        setUserSequenceIndex(nextIndex);
      }
    } else {
      setMemoryGameOver(true);
      setIsMemoryPlaying(false);
    }
  };

  // ==========================================
  // GAME 5: ELEMENT CLASH & CHEMICAL FUSION
  // ==========================================
  const [chemistryQuestions, setChemistryQuestions] = useState<any[]>([

    {
      q: "What is the chemical symbol for Tungsten?",
      options: ["W", "Tu", "Tn", "Tg"],
      correct: 0,
      fact: "The symbol 'W' comes from 'Wolfram', named after the German mineral wolframite. It has the highest melting point of all elements (3,422°C)."
    },
    {
      q: "Which element has the atomic number 6?",
      options: ["Nitrogen", "Carbon", "Oxygen", "Boron"],
      correct: 1,
      fact: "Carbon is the foundation of organic chemistry and all known life due to its ability to form 4 stable covalent bonds."
    },
    {
      q: "What type of bond is formed when electrons are completely transferred from a metal to a non-metal?",
      options: ["Covalent Bond", "Ionic Bond", "Metallic Bond", "Hydrogen Bond"],
      correct: 1,
      fact: "In Sodium Chloride (NaCl), Sodium donates an electron to Chlorine, creating electrostatic attraction between Na+ and Cl-."
    },
    {
      q: "Which noble gas has the atomic symbol 'Ne' and atomic number 10?",
      options: ["Neon", "Argon", "Helium", "Krypton"],
      correct: 0,
      fact: "Neon glows with a distinct reddish-orange light in high-voltage electrical discharge signs."
    },
    {
      q: "What is the pH value of pure neutral water at 25°C?",
      options: ["0", "7.0", "14.0", "5.5"],
      correct: 1,
      fact: "pH is defined as -log10[H+]. In pure water, [H+] = 10^-7 mol/L, giving exactly pH 7.0."
    },
    {
      q: "Which element is liquid at room temperature alongside Bromine?",
      options: ["Mercury (Hg)", "Gallium (Ga)", "Lead (Pb)", "Cesium (Cs)"],
      correct: 0,
      fact: "Mercury (Hg) has a melting point of -38.83°C, remaining liquid at room temperature."
    }
  ]);

  const [chemIndex, setChemIndex] = useState<number>(0);
  const [chemScore, setChemScore] = useState<number>(0);
  const [chemStreak, setChemStreak] = useState<number>(0);
  const [selectedChemOption, setSelectedChemOption] = useState<number | null>(null);
  const [chemAnswered, setChemAnswered] = useState<boolean>(false);

  const handleChemAnswer = (optionIdx: number) => {
    if (chemAnswered) return;
    setSelectedChemOption(optionIdx);
    setChemAnswered(true);

    const isCorrect = optionIdx === chemistryQuestions[chemIndex % chemistryQuestions.length].correct;
    if (isCorrect) {
      const nextStreak = chemStreak + 1;
      const added = 150 * nextStreak;
      setChemScore((prev) => prev + added);
      setChemStreak(nextStreak);
      updateArcadeStats((astats) => ({
        ...astats,
        elementClashHighScore: Math.max(astats.elementClashHighScore, chemScore + added),
      }));
      confetti({ particleCount: 30, spread: 45 });
    } else {
      setChemStreak(0);
    }
  };

  const nextChemQuestion = () => {
    setChemIndex((prev) => prev + 1);
    setSelectedChemOption(null);
    setChemAnswered(false);
  };

  // ==========================================
  // GAME 6: SPEED MATH BLITZ (45s)
  // ==========================================
  const [mathBlitzRunning, setMathBlitzRunning] = useState<boolean>(false);
  const [mathBlitzTime, setMathBlitzTime] = useState<number>(45);
  const [mathBlitzScore, setMathBlitzScore] = useState<number>(0);
  const [mathBlitzStreak, setMathBlitzStreak] = useState<number>(0);
  const [mathBlitzProblem, setMathBlitzProblem] = useState<{ expr: string; options: number[]; correct: number }>({
    expr: '14 × 6',
    options: [84, 74, 94, 68],
    correct: 0,
  });

  const generateMathBlitzProblem = () => {
    const types = ['mul', 'add', 'sqr', 'sub'];
    const type = types[Math.floor(Math.random() * types.length)];
    let expr = '';
    let correctVal = 0;

    if (type === 'mul') {
      const a = Math.floor(Math.random() * 12) + 4;
      const b = Math.floor(Math.random() * 9) + 3;
      expr = `${a} × ${b}`;
      correctVal = a * b;
    } else if (type === 'sqr') {
      const a = Math.floor(Math.random() * 14) + 6;
      expr = `${a}²`;
      correctVal = a * a;
    } else if (type === 'add') {
      const a = Math.floor(Math.random() * 60) + 25;
      const b = Math.floor(Math.random() * 50) + 15;
      expr = `${a} + ${b}`;
      correctVal = a + b;
    } else {
      const a = Math.floor(Math.random() * 80) + 40;
      const b = Math.floor(Math.random() * 35) + 10;
      expr = `${a} - ${b}`;
      correctVal = a - b;
    }

    const wrong1 = correctVal + (Math.random() > 0.5 ? 10 : -10);
    const wrong2 = correctVal + (Math.random() > 0.5 ? 2 : -2);
    const wrong3 = correctVal + (Math.random() > 0.5 ? 5 : -5);

    const opts = [correctVal, wrong1, wrong2, wrong3].sort(() => 0.5 - Math.random());
    const correctIdx = opts.indexOf(correctVal);

    setMathBlitzProblem({ expr, options: opts, correct: correctIdx });
  };

  const mathBlitzTimerRef = useRef<any>(null);

  useEffect(() => {
    if (mathBlitzRunning && mathBlitzTime > 0) {
      mathBlitzTimerRef.current = setInterval(() => {
        setMathBlitzTime((prev) => {
          if (prev <= 1) {
            clearInterval(mathBlitzTimerRef.current);
            updateArcadeStats((astats) => ({
              ...astats,
              mathBlitzHighScore: Math.max(astats.mathBlitzHighScore, mathBlitzScore),
            }));
            setMathBlitzRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(mathBlitzTimerRef.current);
  }, [mathBlitzRunning, mathBlitzScore]);

  const startMathBlitz = () => {
    setMathBlitzTime(45);
    setMathBlitzScore(0);
    setMathBlitzStreak(0);
    setMathBlitzRunning(true);
    generateMathBlitzProblem();
  };

  const handleMathBlitzAnswer = (idx: number) => {
    if (!mathBlitzRunning || mathBlitzTime === 0) return;
    if (idx === mathBlitzProblem.correct) {
      const nextStreak = mathBlitzStreak + 1;
      const pts = 100 * Math.min(nextStreak, 5);
      setMathBlitzScore((prev) => prev + pts);
      setMathBlitzStreak(nextStreak);
      updateArcadeStats((astats) => ({
        ...astats,
        mathBlitzHighScore: Math.max(astats.mathBlitzHighScore, mathBlitzScore + pts),
      }));
    } else {
      setMathBlitzStreak(0);
    }
    generateMathBlitzProblem();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Mini-Game Tab Selector */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-extrabold text-white">STEM Arcade (6 Mini-Games)</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="game-tab-number-guess"
            onClick={() => setActiveGame('number-guess')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeGame === 'number-guess'
                ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-md shadow-purple-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Matrix Guess</span>
          </button>

          <button
            id="game-tab-science-sprint"
            onClick={() => setActiveGame('science-sprint')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeGame === 'science-sprint'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Science Sprint</span>
          </button>

          <button
            id="game-tab-concept-enigma"
            onClick={() => setActiveGame('concept-enigma')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeGame === 'concept-enigma'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Concept Enigma</span>
          </button>

          <button
            id="game-tab-quantum-memory"
            onClick={() => setActiveGame('quantum-memory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeGame === 'quantum-memory'
                ? 'bg-pink-500/20 border-pink-400 text-pink-200 shadow-md shadow-pink-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Quantum Memory</span>
          </button>

          <button
            id="game-tab-element-clash"
            onClick={() => setActiveGame('element-clash')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeGame === 'element-clash'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Element Clash</span>
          </button>

          <button
            id="game-tab-math-blitz"
            onClick={() => setActiveGame('math-blitz')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              activeGame === 'math-blitz'
                ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200 shadow-md shadow-indigo-500/10'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Speed Math</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* GAME 1: MATRIX NUMBER GUESS */}
      {/* ========================================== */}
      {activeGame === 'number-guess' && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/95 border border-purple-500/30 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                Neon Matrix Number Guess (1–100)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Utilize mathematical reasoning, binary search narrowing, and Gemini AI Oracle Clues.
              </p>
            </div>

            <button
              onClick={resetNumberGame}
              className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Target
            </button>
          </div>

          {/* Narrowing Range Visualizer */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
              <span>Lower Bound: <strong className="text-cyan-400">{minBound}</strong></span>
              <span className="text-purple-400">Binary Range Search</span>
              <span>Upper Bound: <strong className="text-purple-400">{maxBound}</strong></span>
            </div>
            <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden relative border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full transition-all duration-300"
                style={{
                  marginLeft: `${minBound - 1}%`,
                  width: `${Math.max(2, maxBound - minBound + 1)}%`,
                }}
              />
            </div>
          </div>

          {/* Dynamic Mathematical Hint Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 block font-medium">Parity</span>
              <span className="font-bold text-cyan-300">{secretNumber % 2 === 0 ? 'Even Number' : 'Odd Number'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 block font-medium">Prime Status</span>
              <span className="font-bold text-emerald-300">{isPrime(secretNumber) ? 'Prime Number' : 'Composite Number'}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 block font-medium">Divisibility</span>
              <span className="font-bold text-amber-300">
                {secretNumber % 5 === 0 ? 'Divisible by 5' : secretNumber % 3 === 0 ? 'Divisible by 3' : 'Neither 3 nor 5'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 block font-medium">Total Attempts</span>
              <span className="font-bold text-purple-300 font-mono">{guesses.length}</span>
            </div>
          </div>

          {/* Input form */}
          {!isNumberWon ? (
            <form onSubmit={handleGuessSubmit} className="flex gap-3">
              <input
                id="number-guess-input"
                type="number"
                min={1}
                max={100}
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Enter guess between 1 and 100..."
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
              <button
                id="number-guess-submit-btn"
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-purple-500/20 transition-all"
              >
                Submit Guess
              </button>
            </form>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-center space-y-3">
              <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
              <h4 className="text-xl font-extrabold text-white">Target Decrypted: {secretNumber}! 🎯</h4>
              <p className="text-xs text-emerald-300">
                You cracked the matrix in <strong className="font-mono">{guesses.length}</strong> attempts!
              </p>
              <button
                onClick={resetNumberGame}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Play Again with New Number
              </button>
            </div>
          )}

          {/* AI Oracle Clue Section */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-300">Need an intelligent riddle hint?</span>
            </div>
            <button
              id="ask-oracle-btn"
              onClick={handleAskOracleClue}
              disabled={isFetchingClue || isNumberWon}
              className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-xs font-semibold text-purple-200 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isFetchingClue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
              <span>Consult Gemini Oracle</span>
            </button>
          </div>

          {oracleClue && (
            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 text-xs text-purple-200 italic space-y-1">
              <span className="font-bold not-italic text-purple-300 block">🔮 Gemini AI Oracle:</span>
              <p>{oracleClue}</p>
            </div>
          )}

          {/* Guess Log History */}
          {guesses.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guess Log History</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {guesses.map((g, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      g.feedback === 'correct'
                        ? 'bg-emerald-950/30 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-mono font-bold text-sm text-white">Guess: {g.value}</span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        g.feedback === 'higher' ? 'text-amber-400' : g.feedback === 'lower' ? 'text-cyan-400' : 'text-emerald-400'
                      }`}
                    >
                      {g.feedback === 'higher' && <TrendingUp className="w-3.5 h-3.5" />}
                      {g.feedback === 'lower' && <TrendingDown className="w-3.5 h-3.5" />}
                      {g.feedback === 'higher' ? 'Target is Higher' : g.feedback === 'lower' ? 'Target is Lower' : 'Exact Match!'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 2: SCIENCE TRIVIA QUICK-SPRINT */}
      {/* ========================================== */}
      {activeGame === 'science-sprint' && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                ⚡ 60-Second Science Quick-Sprint
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rapid-fire science facts! Build combo multipliers and preserve your 3 lives.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((heart) => (
                  <Heart
                    key={heart}
                    className={`w-5 h-5 ${
                      heart <= sprintState.lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm font-extrabold text-cyan-400 flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-cyan-400" />
                {sprintState.timeLeft}s
              </div>
            </div>
          </div>

          {!sprintState.isRunning && !sprintState.isFinished ? (
            <div className="p-12 text-center rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
              <Timer className="w-12 h-12 text-cyan-400 mx-auto animate-pulse" />
              <h4 className="text-xl font-extrabold text-white">Ready for the Sprint?</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Test your scientific instincts under time pressure. Fast streaks yield up to 5x multiplier!
              </p>
              <button
                id="start-science-sprint-btn"
                onClick={startSprint}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/20"
              >
                START 60s SPRINT ⚡
              </button>
            </div>
          ) : sprintState.isFinished ? (
            <div className="p-10 text-center rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
              <h4 className="text-2xl font-black text-white">Sprint Completed!</h4>
              <div className="text-4xl font-black text-cyan-400 font-mono">{sprintState.score} PTS</div>
              <p className="text-xs text-slate-400">
                Personal High Score: <strong className="text-white font-mono">{userProgress.arcadeStats.sprintHighScore} PTS</strong>
              </p>
              <button
                onClick={startSprint}
                className="px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs shadow-md"
              >
                Play Another Round
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score & Multiplier */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  Question #{sprintState.qIndex + 1}
                </span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {sprintState.multiplier}x Multiplier 🔥
                  </span>
                  <span className="text-base font-extrabold text-cyan-400">
                    {sprintState.score} pts
                  </span>
                </div>
              </div>

              {/* Question card */}
              <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-4">
                <p className="text-lg md:text-xl font-bold text-white leading-relaxed">
                  "{sprintQuestions[sprintState.qIndex % sprintQuestions.length].q}"
                </p>
              </div>

              {/* True / False Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  id="sprint-true-btn"
                  onClick={() => handleSprintAnswer(true)}
                  className="py-5 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-black text-base shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  TRUE
                </button>
                <button
                  id="sprint-false-btn"
                  onClick={() => handleSprintAnswer(false)}
                  className="py-5 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-300 font-black text-base shadow-lg shadow-rose-500/10 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5 text-rose-400" />
                  FALSE
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 3: CONCEPT ENIGMA SCRAMBLE */}
      {/* ========================================== */}
      {activeGame === 'concept-enigma' && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/95 border border-emerald-500/30 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                🧩 AI Concept Enigma &amp; Scramble
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Unscramble the STEM concept keyword using progressive clues.
              </p>
            </div>

            <button
              onClick={() => {
                setEnigmaIndex((prev) => prev + 1);
                setRevealedClues(1);
                setIsEnigmaSolved(false);
                setEnigmaGuess('');
                setEnigmaFeedback(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Next Puzzle
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
            <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-widest">
              Category: {currentEnigma.category}
            </span>
            <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-widest text-emerald-300">
              {scrambledWord}
            </div>
            <p className="text-[11px] text-slate-500">
              Word Length: {currentEnigma.word.length} letters
            </p>
          </div>

          {/* Progressive Clues List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progressive Concept Clues</h4>
            {currentEnigma.clues.slice(0, revealedClues).map((clue, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="text-cyan-300">Clue {idx + 1}:</strong> {clue}</span>
              </div>
            ))}

            {revealedClues < currentEnigma.clues.length && (
              <button
                onClick={() => setRevealedClues((prev) => prev + 1)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 pt-1"
              >
                + Unlock Next Clue ({revealedClues + 1}/{currentEnigma.clues.length})
              </button>
            )}
          </div>

          {/* Guess Submission */}
          {!isEnigmaSolved ? (
            <form onSubmit={handleEnigmaSubmit} className="flex gap-3">
              <input
                id="enigma-guess-input"
                type="text"
                value={enigmaGuess}
                onChange={(e) => setEnigmaGuess(e.target.value)}
                placeholder="Type the unscrambled concept name..."
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 font-mono uppercase focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                id="enigma-submit-btn"
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20"
              >
                Verify
              </button>
            </form>
          ) : (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-lg font-bold text-white">Concept Mastered: {currentEnigma.word}</h4>
              <p className="text-xs text-emerald-200">Enigma puzzle solved with flying colors!</p>
            </div>
          )}

          {enigmaFeedback && !isEnigmaSolved && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              {enigmaFeedback}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 4: QUANTUM MEMORY MATRIX */}
      {/* ========================================== */}
      {activeGame === 'quantum-memory' && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/95 border border-pink-500/30 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                🔮 Quantum Memory Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Observe the quantum node energy sequence and replicate the exact pattern.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-pink-300">
                Highest Level: <strong>Level {userProgress.arcadeStats.quantumMemoryHighLevel || 1}</strong>
              </span>
            </div>
          </div>

          {!isMemoryPlaying && !memoryGameOver ? (
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <Grid className="w-12 h-12 text-pink-400 mx-auto animate-pulse" />
              <h4 className="text-xl font-extrabold text-white">Quantum Sequence Challenge</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Train your working memory and neuro-plasticity by replicating expanding cyber energy paths.
              </p>
              <button
                id="start-memory-btn"
                onClick={startMemoryGame}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-pink-500/20"
              >
                Initialize Matrix (Level 1)
              </button>
            </div>
          ) : memoryGameOver ? (
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <XCircle className="w-12 h-12 text-rose-400 mx-auto" />
              <h4 className="text-2xl font-black text-white">Quantum Collapse!</h4>
              <p className="text-sm text-pink-300">
                You reached <strong className="text-white">Level {memoryLevel}</strong> in sequence mastery.
              </p>
              <button
                onClick={startMemoryGame}
                className="px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Re-engage Matrix
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-sm font-extrabold text-pink-400 font-mono">
                  Level {memoryLevel} ({memorySequence.length} Steps)
                </div>
                <div className="text-xs font-bold text-slate-400">
                  {isShowingSequence ? (
                    <span className="text-amber-400 animate-pulse">⚡ Quantum nodes transmitting sequence...</span>
                  ) : (
                    <span className="text-emerald-400">Your Turn: Step {userSequenceIndex + 1}/{memorySequence.length}</span>
                  )}
                </div>
              </div>

              {/* 4-Node Grid */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {QUANTUM_NODES.map((node) => {
                  const isFlashing = activeFlashingNode === node.id;
                  return (
                    <button
                      key={node.id}
                      id={`quantum-node-${node.id}`}
                      disabled={isShowingSequence}
                      onClick={() => handleNodeClick(node.id)}
                      className={`h-36 rounded-3xl bg-gradient-to-br ${node.color} flex flex-col items-center justify-center p-4 transition-all transform active:scale-95 shadow-xl ${
                        isFlashing ? `${node.activeGlow} scale-105 brightness-125` : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      <Sparkles className="w-6 h-6 text-white mb-2" />
                      <span className="text-sm font-black text-white tracking-wider">{node.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 5: ELEMENT CLASH & CHEMICAL FUSION */}
      {/* ========================================== */}
      {activeGame === 'element-clash' && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/95 border border-amber-500/30 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                🧪 Periodic Element Clash &amp; Chemistry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Identify chemical symbols, atomic properties, bonds, and reaction dynamics.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300">
                Score: <strong>{chemScore} pts</strong>
              </span>
              <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-orange-400">
                Streak: <strong>{chemStreak}x</strong>
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                Reaction Round {chemIndex + 1}
              </span>
              <h4 className="text-xl md:text-2xl font-extrabold text-white">
                {chemistryQuestions[chemIndex % chemistryQuestions.length].q}
              </h4>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {chemistryQuestions[chemIndex % chemistryQuestions.length].options.map((opt, idx) => {
                const isSelected = selectedChemOption === idx;
                const isCorrect = idx === chemistryQuestions[chemIndex % chemistryQuestions.length].correct;

                let btnStyle = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-500/50';
                if (chemAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-950/70 border-rose-500 text-rose-200';
                  } else {
                    btnStyle = 'bg-slate-950/40 border-slate-850 text-slate-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    id={`chem-opt-${idx}`}
                    disabled={chemAnswered}
                    onClick={() => handleChemAnswer(idx)}
                    className={`p-4 rounded-2xl border text-sm font-bold text-left transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {chemAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {chemAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation & Next */}
            {chemAnswered && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-xs text-amber-200 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{chemistryQuestions[chemIndex % chemistryQuestions.length].fact}</span>
                </div>
                <button
                  onClick={nextChemQuestion}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
                >
                  Next Chemical Reaction →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* GAME 6: SPEED MATH BLITZ */}
      {/* ========================================== */}
      {activeGame === 'math-blitz' && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                ⚡ Speed Math Blitz (45 Seconds)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rapid mental arithmetic under time pressure. Multipliers reward continuous correct streaks!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300">
                Record: <strong>{userProgress.arcadeStats.mathBlitzHighScore} pts</strong>
              </span>
            </div>
          </div>

          {!mathBlitzRunning && mathBlitzTime === 45 ? (
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <Calculator className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
              <h4 className="text-xl font-extrabold text-white">45s Mental Calculation Blitz</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Solve fast multiplication, addition, squares, and subtractions to ignite your mental math engine.
              </p>
              <button
                id="start-math-blitz-btn"
                onClick={startMathBlitz}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-500/20"
              >
                Ignite Blitz Timer
              </button>
            </div>
          ) : !mathBlitzRunning && mathBlitzTime === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-4">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
              <h4 className="text-2xl font-black text-white">Blitz Concluded!</h4>
              <p className="text-sm text-indigo-300 font-mono">
                Total Score: <strong>{mathBlitzScore} pts</strong>
              </p>
              <button
                onClick={startMathBlitz}
                className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-md"
              >
                Retry Blitz
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-indigo-400" />
                  <span className="text-base font-extrabold text-white">{mathBlitzTime}s remaining</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    Streak: {mathBlitzStreak}x
                  </span>
                  <span className="text-base font-extrabold text-indigo-400">
                    {mathBlitzScore} pts
                  </span>
                </div>
              </div>

              {/* Equation card */}
              <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <span className="text-xs text-slate-500 font-mono uppercase">Calculate instantly</span>
                <div className="text-4xl md:text-5xl font-black text-white font-mono tracking-wider">
                  {mathBlitzProblem.expr} = ?
                </div>
              </div>

              {/* 4 Math Options */}
              <div className="grid grid-cols-2 gap-3.5">
                {mathBlitzProblem.options.map((opt, idx) => (
                  <button
                    key={idx}
                    id={`math-blitz-opt-${idx}`}
                    onClick={() => handleMathBlitzAnswer(idx)}
                    className="py-5 rounded-2xl bg-slate-950 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/60 text-white font-mono text-xl font-bold transition-all shadow-md active:scale-95"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
