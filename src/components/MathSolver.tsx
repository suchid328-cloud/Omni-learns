import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  HelpCircle, 
  Lightbulb, 
  BookOpen, 
  Layers, 
  Cpu, 
  RotateCcw, 
  Terminal,
  Zap,
  ArrowRight,
  ListOrdered,
  AlertCircle,
  Mic,
  MicOff,
  Volume2,
  Square
} from 'lucide-react';
import { MATH_PRESETS } from '../data/mathPresets';
import { MathPreset } from '../types';
import { solveMathProblem } from '../services/geminiService';
import { 
  convertSpeechToMath, 
  speakText, 
  stopSpeaking, 
  isSpeaking, 
  createSpeechRecognition, 
  isSpeechRecognitionSupported 
} from '../services/speechService';
import { MarkdownView } from './MarkdownView';
import { useApp } from '../context/AppContext';

const MATH_SYMBOLS = [
  { label: '√x', insert: '\\sqrt{x}' },
  { label: '∫', insert: '\\int_{a}^{b} f(x) \\, dx' },
  { label: '∑', insert: '\\sum_{n=1}^{\\infty}' },
  { label: 'd/dx', insert: '\\frac{d}{dx}' },
  { label: 'π', insert: '\\pi' },
  { label: 'θ', insert: '\\theta' },
  { label: '∞', insert: '\\infty' },
  { label: 'x²', insert: '^2' },
  { label: '±', insert: '\\pm' },
  { label: '≤', insert: '\\le' },
  { label: '≥', insert: '\\ge' },
  { label: 'lim', insert: '\\lim_{x \\to 0}' },
  { label: 'Matrix', insert: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
];

export const MathSolver: React.FC = () => {
  const { 
    customApiKey, 
    incrementMathStats, 
    setIsKeyModalOpen,
    voiceSettings,
    setIsVoiceModalOpen,
    pendingVoiceAction,
    setPendingVoiceAction
  } = useApp();

  const [problemInput, setProblemInput] = useState<string>('');
  const [topicInput, setTopicInput] = useState<string>('Calculus & Higher Math');
  const [detailLevel, setDetailLevel] = useState<string>('Comprehensive Step-by-Step');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);
  const [isSpeakingSolution, setIsSpeakingSolution] = useState<boolean>(false);

  const localRecognitionRef = useRef<any>(null);

  // Handle incoming Voice Command to solve math
  useEffect(() => {
    if (pendingVoiceAction && pendingVoiceAction.type === 'solve-math' && pendingVoiceAction.payload) {
      const mathQuery = pendingVoiceAction.payload;
      setPendingVoiceAction(null);
      setProblemInput(mathQuery);
      handleSolve(mathQuery);
    }
  }, [pendingVoiceAction, setPendingVoiceAction]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (localRecognitionRef.current) {
        try {
          localRecognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const handleToggleVoiceRecord = () => {
    if (isVoiceRecording) {
      if (localRecognitionRef.current) {
        try {
          localRecognitionRef.current.abort();
        } catch {}
      }
      setIsVoiceRecording(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = createSpeechRecognition(voiceSettings.language);
      if (!recognition) return;

      localRecognitionRef.current = recognition;
      setIsVoiceRecording(true);
      setError(null);

      recognition.onresult = (event: any) => {
        let raw = '';
        for (let i = 0; i < event.results.length; i++) {
          raw += event.results[i][0].transcript;
        }

        const mathFormatted = convertSpeechToMath(raw);
        setProblemInput(mathFormatted);

        if (event.results[0]?.isFinal && voiceSettings.autoSend && mathFormatted.trim()) {
          setIsVoiceRecording(false);
          handleSolve(mathFormatted.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Math voice error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission is blocked in your browser. Opening Voice Settings to unblock...');
          setIsVoiceModalOpen(true);
        } else {
          setError(`Voice input issue: ${event.error}`);
        }
        setIsVoiceRecording(false);
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start voice math record:', err);
      setIsVoiceRecording(false);
    }
  };

  const handleSpeakDerivation = () => {
    if (!solution) return;
    if (isSpeakingSolution) {
      stopSpeaking();
      setIsSpeakingSolution(false);
      return;
    }

    setIsSpeakingSolution(true);
    speakText(solution, {
      lang: voiceSettings.language,
      onEnd: () => setIsSpeakingSolution(false),
      onError: () => setIsSpeakingSolution(false),
    });
  };

  const handleSolve = async (overrideProblem?: string) => {
    const textToSolve = (overrideProblem || problemInput).trim();
    if (!textToSolve) return;

    if (isVoiceRecording && localRecognitionRef.current) {
      try {
        localRecognitionRef.current.abort();
      } catch {}
      setIsVoiceRecording(false);
    }

    setIsLoading(true);
    setError(null);
    setSolution(null);
    setIsSpeakingSolution(false);

    try {
      const res = await solveMathProblem(textToSolve, topicInput, detailLevel, customApiKey);
      setSolution(res.result);
      incrementMathStats();

      if (voiceSettings.ttsEnabled) {
        setIsSpeakingSolution(true);
        speakText(res.result, {
          lang: voiceSettings.language,
          onEnd: () => setIsSpeakingSolution(false),
          onError: () => setIsSpeakingSolution(false),
        });
      }
    } catch (err: any) {
      console.error('Math solve failed:', err);
      setError(err?.message || 'Unable to solve problem. Ensure your Gemini API Key is configured.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertSymbol = (symbol: string) => {
    setProblemInput((prev) => prev + ' ' + symbol);
  };

  const handlePresetSelect = (preset: MathPreset) => {
    setProblemInput(preset.problem);
    setTopicInput(preset.category);
    handleSolve(preset.problem);
  };

  const handleCopy = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExplainSimpler = () => {
    if (!problemInput) return;
    const simplifiedPrompt = `Explain the following math problem in very simple, intuitive terms with visual analogies and zero jargon:\n\n${problemInput}`;
    handleSolve(simplifiedPrompt);
  };

  const handleGenerateSimilar = () => {
    if (!problemInput) return;
    const practicePrompt = `Generate a similar practice problem based on: "${problemInput}". First state the new problem clearly, then provide its complete step-by-step solution.`;
    handleSolve(practicePrompt);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Calculator className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                Critical Math Solver &amp; Step-by-Step Tutor
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Google Gemini Pro
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Calculus, Differential Equations, Linear Algebra, Probability, and Complex STEM derivations with LaTeX.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Presets Carousel */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">Curated Challenge Presets:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {MATH_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                id={`math-preset-${idx}`}
                onClick={() => handlePresetSelect(preset)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center gap-2"
              >
                <span className="text-emerald-400 font-bold">{preset.category}:</span>
                <span className="truncate max-w-[180px]">{preset.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Problem Input Area */}
      <div className="p-6 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Enter Equation, Calculus Derivation, or STEM Word Problem:
          </label>
          <div className="flex items-center gap-2">
            <select
              value={detailLevel}
              onChange={(e) => setDetailLevel(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
            >
              <option value="Comprehensive Step-by-Step">Comprehensive Step-by-Step</option>
              <option value="Rigorous Proof & Derivation">Rigorous Proof &amp; Derivation</option>
              <option value="Concise Summary">Concise Summary</option>
            </select>
          </div>
        </div>

        {/* Textarea with relative Voice Microphone button */}
        <div className="relative">
          <textarea
            id="math-problem-input"
            rows={3}
            value={problemInput}
            onChange={(e) => setProblemInput(e.target.value)}
            placeholder={
              isVoiceRecording
                ? 'Listening to your math problem... (e.g. "x squared plus five x equals twenty")'
                : 'e.g. Find the derivative of f(x) = x^3 * ln(x) or solve: \\int_{0}^{1} x^2 e^x dx...'
            }
            className={`w-full p-4 pr-14 rounded-2xl bg-slate-950 border font-mono text-sm text-white placeholder-slate-500 resize-y transition-all ${
              isVoiceRecording
                ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20'
                : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
            }`}
          />
          <button
            type="button"
            id="math-voice-btn"
            onClick={handleToggleVoiceRecord}
            className={`absolute right-3 top-3 p-2.5 rounded-xl transition-all ${
              isVoiceRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40'
                : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40'
            }`}
            title={isVoiceRecording ? 'Stop voice recording' : 'Speak your math problem (Voice Command)'}
          >
            {isVoiceRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Math Symbol Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-500 px-1.5">LaTeX Symbols:</span>
          {MATH_SYMBOLS.map((sym, idx) => (
            <button
              key={idx}
              id={`math-sym-${idx}`}
              onClick={() => handleInsertSymbol(sym.insert)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-emerald-300 font-mono text-xs transition-colors"
            >
              {sym.label}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setProblemInput('')}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Clear Input
            </button>
            <button
              type="button"
              onClick={handleToggleVoiceRecord}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isVoiceRecording
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isVoiceRecording ? 'Listening...' : 'Speak Problem'}</span>
            </button>
          </div>

          <button
            id="solve-math-btn"
            onClick={() => handleSolve()}
            disabled={isLoading || !problemInput.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Cpu className="w-4 h-4 animate-spin text-slate-950" />
                <span>Computing Derivation...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Solve &amp; Explain Steps</span>
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes('microphone') || error.toLowerCase().includes('voice') ? (
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="px-3 py-1 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shrink-0 transition-colors"
              >
                Open Voice Settings
              </button>
            ) : (
              <button
                onClick={() => setIsKeyModalOpen(true)}
                className="underline font-bold hover:text-white shrink-0"
              >
                Attach Gemini Key
              </button>
            )}
          </div>
        )}
      </div>

      {/* Solution Display Card */}
      {solution && (
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/95 border border-emerald-500/30 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Mathematical Solution &amp; Derivation</h3>
                <span className="text-xs text-emerald-400 font-mono">Verified with Google Gemini Pro</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="speak-math-solution-btn"
                onClick={handleSpeakDerivation}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isSpeakingSolution
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 animate-pulse'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                }`}
                title={isSpeakingSolution ? 'Stop voice readout' : 'Listen to solution steps (Text-to-Speech)'}
              >
                {isSpeakingSolution ? (
                  <Square className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{isSpeakingSolution ? 'Stop Audio' : 'Listen Steps'}</span>
              </button>

              <button
                id="copy-math-solution-btn"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Solution'}</span>
              </button>
            </div>
          </div>

          {/* Rendered Solution */}
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <MarkdownView content={solution} />
          </div>

          {/* Interactive Learning Follow-up Prompts */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="math-simpler-terms-btn"
                onClick={handleExplainSimpler}
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                Explain In Simpler Terms
              </button>

              <button
                id="math-similar-problem-btn"
                onClick={handleGenerateSimilar}
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Generate Similar Practice Problem
              </button>
            </div>

            <button
              onClick={() => {
                setSolution(null);
                setProblemInput('');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start New Problem
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
