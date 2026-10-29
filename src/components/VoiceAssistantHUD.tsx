import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Send, 
  X, 
  RotateCcw, 
  Settings2, 
  Zap, 
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Calculator,
  BrainCircuit,
  Compass,
  Radio,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognition, 
  classifyVoiceCommand,
  convertSpeechToMath,
  requestMicrophoneAccess 
} from '../services/speechService';

export const VoiceAssistantHUD: React.FC = () => {
  const { 
    voiceSettings, 
    isVoiceActive, 
    setIsVoiceActive, 
    setIsVoiceModalOpen,
    executeVoiceCommand 
  } = useApp();

  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isPermissionBlocked, setIsPermissionBlocked] = useState<boolean>(false);
  const [isRequestingPrompt, setIsRequestingPrompt] = useState<boolean>(false);
  const [autoSendCountdown, setAutoSendCountdown] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  const isSupported = isSpeechRecognitionSupported();

  // Global hotkey Alt+V or Ctrl+Shift+V to toggle Voice Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.altKey && (e.key === 'v' || e.key === 'V')) || (e.ctrlKey && e.shiftKey && (e.key === 'v' || e.key === 'V'))) {
        e.preventDefault();
        if (isVoiceActive) {
          stopListening();
          setIsVoiceActive(false);
        } else {
          setIsVoiceActive(true);
        }
      } else if (e.key === 'Escape' && isVoiceActive) {
        stopListening();
        setIsVoiceActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoiceActive, setIsVoiceActive]);

  // When isVoiceActive turns true, automatically start listening
  useEffect(() => {
    if (isVoiceActive && voiceSettings.enabled) {
      startListening();
    } else {
      stopListening();
    }
  }, [isVoiceActive, voiceSettings.enabled]);

  const startListening = () => {
    if (!isSupported) {
      setErrorStatus('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = createSpeechRecognition(voiceSettings.language);
      if (!recognition) {
        setErrorStatus('Unable to initialize speech recognition engine.');
        return;
      }

      recognitionRef.current = recognition;
      setTranscript('');
      setInterimText('');
      setErrorStatus(null);
      setAutoSendCountdown(null);

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const full = final || interim;
        setTranscript(full);
        setInterimText(interim);

        // If final sentence and auto-send is enabled
        if (final.trim() && voiceSettings.autoSend) {
          triggerAutoSend(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setIsPermissionBlocked(true);
          setErrorStatus('Microphone permission blocked in browser. Allow microphone in browser site settings.');
        } else if (event.error === 'no-speech') {
          // Normal silence, don't show heavy error unless prolonged
        } else {
          setErrorStatus(`Audio error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start recognition:', err);
      setErrorStatus(err?.message || 'Failed to start microphone.');
      setIsListening(false);
    }
  };

  const handlePromptPermissionNow = async () => {
    setIsRequestingPrompt(true);
    const result = await requestMicrophoneAccess();
    setIsRequestingPrompt(false);
    if (result.granted) {
      setIsPermissionBlocked(false);
      setErrorStatus(null);
      startListening();
    } else {
      setIsPermissionBlocked(true);
      setErrorStatus(result.error || 'Microphone is blocked. Click "Voice Settings" to view the address bar unblock guide.');
    }
  };

  const stopListening = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  const triggerAutoSend = (text: string) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    let secondsLeft = 2;
    setAutoSendCountdown(secondsLeft);

    countdownTimerRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setAutoSendCountdown(null);
        handleSubmit(text);
      } else {
        setAutoSendCountdown(secondsLeft);
      }
    }, 1000);
  };

  const handleSubmit = (overrideText?: string) => {
    const query = (overrideText || transcript || interimText).trim();
    if (!query) return;

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    stopListening();
    setIsVoiceActive(false);
    executeVoiceCommand(query);
  };

  const handleClear = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoSendCountdown(null);
    setTranscript('');
    setInterimText('');
    startListening();
  };

  const classified = transcript ? classifyVoiceCommand(transcript) : null;

  const getIntentBadge = () => {
    if (!classified) return null;
    switch (classified.type) {
      case 'MATH_SOLVE':
        return {
          label: 'Math Derivation',
          icon: Calculator,
          color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
        };
      case 'QUIZ_TOPIC':
        return {
          label: 'Quiz Generator',
          icon: BrainCircuit,
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
      case 'QUIZ_ANSWER':
        return {
          label: 'Quiz Answer Option',
          icon: CheckCircle2Icon,
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'NAVIGATE':
        return {
          label: 'App Navigation',
          icon: Compass,
          color: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
        };
      case 'KNOWLEDGE_QUESTION':
      default:
        return {
          label: 'Knowledge Scholar',
          icon: Sparkles,
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    }
  };

  const intentBadge = getIntentBadge();

  return (
    <>
      {/* Floating Voice Assistant Action Button (Always Accessible on bottom-right) */}
      {!isVoiceActive && voiceSettings.enabled && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
          <button
            id="floating-voice-btn"
            onClick={() => setIsVoiceActive(true)}
            className="relative p-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-slate-950 font-bold shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center border border-cyan-300/40"
            title="Ask a question or give voice commands (Alt + V)"
          >
            {/* Animated radiant pulse rings */}
            <span className="absolute inset-0 rounded-2xl bg-cyan-400 opacity-20 animate-ping pointer-events-none" />
            <Mic className="w-6 h-6 fill-slate-950 text-slate-950 relative z-10" />
            <span className="hidden sm:inline-block ml-2 text-xs font-black tracking-wide pr-1">
              Voice Command
            </span>
          </button>
        </div>
      )}

      {/* Active Voice Assistant HUD Floating Bar / Overlay */}
      {isVoiceActive && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-6 duration-300">
          <div className="w-full max-w-3xl bg-[#090e1d]/95 border-2 border-cyan-500/50 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl shadow-cyan-500/20 space-y-4">
            {/* Top Bar inside HUD */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isListening 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' 
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                }`}>
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {isListening ? 'Omni Voice Listening...' : 'Speech Paused'}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {voiceSettings.language}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Speak your question naturally, e.g. &ldquo;Explain Fleming&apos;s rule&rdquo; or &ldquo;Solve integral of x dx&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Voice Settings & Options"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    stopListening();
                    setIsVoiceActive(false);
                  }}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Close Voice Command (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Audio Waves and Live Transcription Display */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1 space-y-2 w-full">
                {/* Audio Equalizer animation bars */}
                <div className="flex items-center gap-1 h-5">
                  <div className={`w-1 bg-cyan-400 rounded-full transition-all duration-150 ${isListening ? 'h-5 animate-bounce' : 'h-2'}`} />
                  <div className={`w-1 bg-teal-400 rounded-full transition-all duration-150 ${isListening ? 'h-4 animate-bounce delay-75' : 'h-1.5'}`} />
                  <div className={`w-1 bg-fuchsia-400 rounded-full transition-all duration-150 ${isListening ? 'h-6 animate-bounce delay-150' : 'h-2'}`} />
                  <div className={`w-1 bg-amber-400 rounded-full transition-all duration-150 ${isListening ? 'h-3 animate-bounce delay-100' : 'h-1.5'}`} />
                  <div className={`w-1 bg-cyan-400 rounded-full transition-all duration-150 ${isListening ? 'h-5 animate-bounce delay-200' : 'h-2'}`} />
                  <span className="text-[11px] font-mono text-cyan-300 ml-2">
                    {isListening ? 'Capturing audio speech...' : 'Press Mic to resume'}
                  </span>
                </div>

                {/* Real-time transcribed text */}
                <div className="min-h-[44px] flex items-center">
                  {transcript || interimText ? (
                    <p className="text-base font-semibold text-white tracking-wide">
                      &ldquo;{transcript || interimText}&rdquo;
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      Start speaking any question... e.g. &ldquo;What is the speed of light?&rdquo;
                    </p>
                  )}
                </div>

                {/* Intent classification badge */}
                {intentBadge && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${intentBadge.color}`}>
                      <intentBadge.icon className="w-3 h-3" />
                      <span>{intentBadge.label}</span>
                    </span>
                    {autoSendCountdown !== null && (
                      <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1 animate-pulse">
                        <Zap className="w-3 h-3" /> Auto-sending in {autoSendCountdown}s...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {isListening ? (
                  <button
                    onClick={stopListening}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white"
                    title="Pause Listening"
                  >
                    <MicOff className="w-5 h-5 text-rose-400" />
                  </button>
                ) : (
                  <button
                    onClick={startListening}
                    className="p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300"
                    title="Resume Listening"
                  >
                    <Mic className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </button>
                )}

                {transcript && (
                  <button
                    onClick={handleClear}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
                    title="Clear and re-speak"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}

                <button
                  id="voice-hud-submit-btn"
                  onClick={() => handleSubmit()}
                  disabled={!transcript.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 disabled:opacity-40 transition-all"
                >
                  <Send className="w-4 h-4 fill-slate-950" />
                  <span>Execute</span>
                </button>
              </div>
            </div>

            {/* Error / Permission Blocked Message */}
            {errorStatus && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorStatus}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isPermissionBlocked && (
                    <button
                      onClick={handlePromptPermissionNow}
                      disabled={isRequestingPrompt}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Mic className="w-3 h-3 fill-slate-950" />
                      <span>{isRequestingPrompt ? 'Prompting...' : 'Prompt Permission'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 font-bold text-white text-[11px] transition-colors"
                  >
                    Open Voice Settings
                  </button>
                  {isPermissionBlocked && (
                    <button
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white"
                      title="Open App in New Tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Fast suggestion chips to tap */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
              <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Or tap phrase:
              </span>
              {[
                "Explain Fleming's Left-Hand Rule",
                "Solve derivative of x^3 * sin(x)",
                "Quiz me on Space & Astronomy",
                "Open Math Tutor",
              ].map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(phrase)}
                  className="shrink-0 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-white transition-colors"
                >
                  &ldquo;{phrase}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper icon
const CheckCircle2Icon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
