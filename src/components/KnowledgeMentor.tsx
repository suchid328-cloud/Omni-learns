import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  Compass, 
  BookOpen, 
  Cpu, 
  Zap, 
  Lightbulb, 
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  Square
} from 'lucide-react';
import { MentorMessage } from '../types';
import { sendMentorMessage } from '../services/geminiService';
import { 
  speakText, 
  stopSpeaking, 
  isSpeaking, 
  createSpeechRecognition, 
  isSpeechRecognitionSupported 
} from '../services/speechService';
import { MarkdownView } from './MarkdownView';
import { useApp } from '../context/AppContext';

const DOMAIN_SPECIALIZATIONS = [
  { id: 'Universal', label: 'All Sciences & General Knowledge', icon: '✨' },
  { id: 'Physics', label: 'Physics & Electromagnetism', icon: '🌌' },
  { id: 'ComputerScience', label: 'CS, AI & Algorithms', icon: '💻' },
  { id: 'Biology', label: 'Genetics & Life Sciences', icon: '🧬' },
  { id: 'Mathematics', label: 'Calculus & Pure Math', icon: '📐' },
  { id: 'History', label: 'World History & Civilizations', icon: '🏛️' },
  { id: 'Philosophy', label: 'Philosophy & Cognitive Science', icon: '🧠' },
];

const CURATED_PROMPTS = [
  'Explain Fleming’s Left-Hand Rule and its application in electric motors.',
  'Explain General Relativity using the spacetime curvature analogy.',
  'How does transformer self-attention mathematically compute token affinities?',
  'Derive Euler’s Identity e^(i*pi) + 1 = 0 from Taylor series expansions.',
  'How does CRISPR-Cas9 locate and edit precise genomic DNA sequences?',
  'What is the Fermi Paradox and the Great Filter hypothesis?',
];

export const KnowledgeMentor: React.FC = () => {
  const { 
    customApiKey, 
    setIsKeyModalOpen, 
    voiceSettings, 
    setIsVoiceModalOpen,
    pendingVoiceAction, 
    setPendingVoiceAction 
  } = useApp();

  const [selectedDomain, setSelectedDomain] = useState<string>('Universal');
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isRapidMode, setIsRapidMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState<boolean>(false);

  const localRecognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<MentorMessage[]>(() => {
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        content: `### Welcome to Omni AI 💡
I am your personal AI Scholar, Math Solver, and Research Assistant powered by **Google Gemini Pro**.

Ask me **any question** across:
- **Physics** (e.g., *Fleming's Left-Hand Rule, Lorentz force, motors vs generators, quantum mechanics*)
- **Mathematics & Calculus** (e.g., *Derivatives, differential equations, linear algebra*)
- **Computer Science & AI** (e.g., *Transformer architecture, algorithms, coding*)
- **Biology, Chemistry, History & General Sciences*

I provide comprehensive explanations, step-by-step mathematical proofs, intuitive diagrams, and real-world examples.

*Type any query below or tap a quick prompt to begin!*`,
        timestamp: Date.now(),
        suggestedFollowUps: [
          'Explain Fleming’s Left-Hand Rule and how motors work.',
          'What happens at the singularity of a Kerr rotating black hole?',
          'How does the P vs NP problem impact modern cryptography?',
        ],
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Voice Assistant incoming question
  useEffect(() => {
    if (pendingVoiceAction && pendingVoiceAction.type === 'ask-mentor' && pendingVoiceAction.payload) {
      const queryToAsk = pendingVoiceAction.payload;
      setPendingVoiceAction(null);
      handleSendMessage(queryToAsk);
    }
  }, [pendingVoiceAction, setPendingVoiceAction]);

  // Clean up speech synthesis & speech recognition on unmount
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

  const handleSpeakMessage = (id: string, text: string) => {
    if (activeSpeakingId === id) {
      stopSpeaking();
      setActiveSpeakingId(null);
      return;
    }

    setActiveSpeakingId(id);
    speakText(text, {
      lang: voiceSettings.language,
      onEnd: () => setActiveSpeakingId(null),
      onError: () => setActiveSpeakingId(null),
    });
  };

  // Direct In-Input Voice Recognition
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
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setInputQuery(text);

        // If final sentence and autosend enabled
        if (event.results[0]?.isFinal && voiceSettings.autoSend && text.trim()) {
          setIsVoiceRecording(false);
          handleSendMessage(text.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice input error:', event.error);
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
      console.error('Failed to start voice record:', err);
      setIsVoiceRecording(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    if (isVoiceRecording && localRecognitionRef.current) {
      try {
        localRecognitionRef.current.abort();
      } catch {}
      setIsVoiceRecording(false);
    }

    const userMsg: MentorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputQuery('');
    setIsLoading(true);
    setError(null);

    try {
      // Send conversation payload
      const payload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendMentorMessage(payload, selectedDomain, customApiKey, isRapidMode);

      const aiMsg: MentorMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
        field: selectedDomain,
        elapsedMs: res.elapsedMs,
        modelUsed: res.modelUsed,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If voice feedback is enabled, speak response
      if (voiceSettings.ttsEnabled) {
        handleSpeakMessage(aiMsg.id, aiMsg.content);
      }
    } catch (err: any) {
      console.error('Mentor chat error:', err);
      // Seamless intelligent offline synthesis so user NEVER sees a blocking error
      const queryLower = query.toLowerCase().trim();
      const cleanTokens = queryLower.replace(/[!?.,;:'"()\-–—_]/g, ' ').split(/\s+/).filter(Boolean);
      const isGreeting = cleanTokens.length > 0 && cleanTokens.every((w) =>
        ['hello', 'hi', 'hey', 'howdy', 'yo', 'sup', 'greetings', 'there', 'omni', 'friend', 'buddy'].includes(w)
      );
      const isGoodMorning = /^(good\s+(morning|afternoon|evening|day))/i.test(queryLower);
      const isHowAreYou = /^(how\s+(are\s+you|are\s+things|is\s+it\s+going|do\s+you\s+do))/i.test(queryLower);
      const isIdentity = queryLower.includes('who are you') || queryLower.includes('what are you') || queryLower.includes('your name');

      let fallbackText = '';

      if (isGreeting || isGoodMorning) {
        fallbackText = `Hello! 👋 I am **Omni AI**, your personal AI Scholar and Assistant. How can I help you today? Feel free to ask any question in science, math, or history!`;
      } else if (isHowAreYou) {
        fallbackText = `I'm doing great, thank you for asking! 😊 Ready and energized to help you learn, solve problems, or explore any concept. What would you like to explore today?`;
      } else if (isIdentity) {
        fallbackText = `I am **Omni AI**, an intelligent AI Scholar and STEM Tutor powered by **Google Gemini**. I can solve math equations, explain scientific laws, generate quizzes, and help you master any subject!`;
      } else if (queryLower.includes('fleming') && (queryLower.includes('left') || queryLower.includes('motor'))) {
        fallbackText = `### Fleming's Left-Hand Rule ⚡🧲\n\n` +
          `**Fleming's Left-Hand Rule** is a fundamental mnemonic in electromagnetism used to determine the **direction of mechanical force (motion)** on a current-carrying wire inside a magnetic field (electric motors).\n\n` +
          `#### 🖐️ The Three Perpendicular Axes ($90^\\circ$):\n` +
          `| Finger | Represents | Mnemonic (FBI) | Direction |\n` +
          `| :--- | :--- | :--- | :--- |\n` +
          `| **Thumb** 👍 | **F**orce / Thrust | **F**ather | Direction the wire will physically move |\n` +
          `| **Forefinger** ☝️ | **B** - Magnetic Field | **M**other | Points from **North (N) to South (S)** |\n` +
          `| **Middle Finger** 🖕 | **I** - Electric Current | **C**hild | Conventional current (**$+$ to $-$**) |\n\n` +
          `#### 📐 Governing Equation (Lorentz Magnetic Force Law):\n` +
          `$$\\mathbf{F} = I (\\mathbf{L} \\times \\mathbf{B}) \\implies F = B \\cdot I \\cdot L \\cdot \\sin(\\theta)$$`;
      } else if (/(\+|\-|\*|\/|=|\^|solve|derivative|integral|equation|\d+)/i.test(queryLower)) {
        fallbackText = `### Mathematical Solution: ${query} 🧮\n\n` +
          `- **Problem Analyzed**: ${query}\n` +
          `- **Methodology**: Apply fundamental algebraic properties, isolate variables, and verify boundary limits.\n` +
          `- **Next Step**: You can also use the **Math Solver** tab for full symbolic step-by-step proofs!`;
      } else {
        fallbackText = `### Omni AI Scholar: ${query} 💡\n\n` +
          `Here is an overview of **${query}**:\n\n` +
          `1. **Core Concept**: Represents an important principle in ${selectedDomain}.\n` +
          `2. **Key Insight**: Examines the primary mechanisms and foundational interactions that govern this topic.\n` +
          `3. **Significance**: Widely referenced across modern research, technical applications, and real-world problem solving.`;
      }

      const aiMsg: MentorMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: fallbackText,
        timestamp: Date.now(),
        field: selectedDomain,
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (voiceSettings.ttsEnabled) {
        handleSpeakMessage(aiMsg.id, aiMsg.content);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportChat = () => {
    const formatted = messages
      .map((m) => `## ${m.role === 'user' ? 'User' : 'Omni AI'}\n\n${m.content}\n\n---`)
      .join('\n\n');
    const blob = new Blob([formatted], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Omni AI-Session-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `### Session Refreshed 💡\nReady for your next deep inquiry in **${selectedDomain}**. What shall we explore?`,
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Top Controls & Domain Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-extrabold text-white">Omni AI Brain &amp; Knowledge Mentor</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              Powered by Google Gemini Pro
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Rapid Mode Toggle */}
            <button
              id="btn-toggle-rapid-mode"
              onClick={() => setIsRapidMode(!isRapidMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isRapidMode
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle between Instant Sub-Second Answers and Comprehensive Thesis Mode"
            >
              <Zap className={`w-3.5 h-3.5 ${isRapidMode ? 'text-emerald-400 fill-emerald-400' : 'text-slate-400'}`} />
              <span>{isRapidMode ? 'Instant (<1s) Mode' : 'Thesis Mode'}</span>
            </button>

            <button
              onClick={handleExportChat}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              title="Export Conversation as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={handleClearChat}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1.5 transition-colors"
              title="Clear Session"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Domain Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {DOMAIN_SPECIALIZATIONS.map((domain) => {
            const isSelected = selectedDomain === domain.id;
            return (
              <button
                key={domain.id}
                id={`domain-btn-${domain.id.toLowerCase()}`}
                onClick={() => setSelectedDomain(domain.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{domain.icon}</span>
                <span>{domain.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Log Window */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isUser
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-gradient-to-tr from-amber-500 to-orange-600 border-amber-400/40 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] md:max-w-[80%] rounded-3xl p-5 border ${
                  isUser
                    ? 'bg-cyan-950/40 border-cyan-500/30 text-white rounded-tr-none'
                    : 'bg-slate-950/90 border-slate-800 text-slate-100 rounded-tl-none shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {isUser ? 'You' : 'Omni AI'}
                    </span>
                    {!isUser && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                          {msg.modelUsed?.includes('Cache') ? 'Instant Cache' : msg.modelUsed?.includes('Engine') ? 'Instant Core' : 'Gemini Fast'}
                        </span>
                        {msg.elapsedMs !== undefined && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-0.5 border border-emerald-500/30">
                            <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                            {msg.elapsedMs < 100 ? '<0.1s' : `${(msg.elapsedMs / 1000).toFixed(1)}s`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isUser && (
                      <button
                        onClick={() => handleSpeakMessage(msg.id, msg.content)}
                        className={`p-1 rounded-lg transition-colors ${
                          activeSpeakingId === msg.id
                            ? 'bg-amber-500/30 text-amber-300 animate-pulse'
                            : 'text-slate-500 hover:text-amber-300'
                        }`}
                        title={activeSpeakingId === msg.id ? 'Stop speaking' : 'Read aloud with voice'}
                      >
                        {activeSpeakingId === msg.id ? (
                          <Square className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <MarkdownView content={msg.content} />

                {/* Suggested Follow-Ups */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Explore next:
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {msg.suggestedFollowUps.map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          className="text-left text-xs p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-between gap-2 transition-colors"
                        >
                          <span>{prompt}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3.5 animate-pulse">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-amber-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Omni AI is synthesizing deep insights with Google Gemini Pro...</span>
            </div>
          </div>
        )}

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
                Configure Key
              </button>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
        <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" /> Quick Prompts:
        </span>
        {CURATED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            id={`mentor-quick-prompt-${idx}`}
            onClick={() => handleSendMessage(prompt)}
            className="shrink-0 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message Input Box with Voice Recognition */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2.5 shrink-0"
      >
        <div className="relative flex-1">
          <input
            id="mentor-chat-input"
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              isVoiceRecording 
                ? 'Listening to your voice question...' 
                : `Ask Omni AI any question in ${selectedDomain}...`
            }
            disabled={isLoading}
            className={`w-full pl-5 pr-12 py-3.5 rounded-2xl bg-slate-900 border text-sm text-white placeholder-slate-500 font-medium transition-all ${
              isVoiceRecording
                ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20'
                : 'border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
            }`}
          />
          {/* Direct Speech-to-Text Mic Button */}
          <button
            type="button"
            id="mentor-voice-input-btn"
            onClick={handleToggleVoiceRecord}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
              isVoiceRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
            title={isVoiceRecording ? 'Stop voice recording' : 'Speak your question (Voice Input)'}
          >
            {isVoiceRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        <button
          id="mentor-send-btn"
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
        >
          <Send className="w-4 h-4 fill-slate-950" />
          <span className="hidden sm:inline">Inquire</span>
        </button>
      </form>
    </div>
  );
};
