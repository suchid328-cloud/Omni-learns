import React from 'react';
import { 
  BrainCircuit, 
  Calculator, 
  Gamepad2, 
  Sparkles, 
  Key, 
  ShieldCheck, 
  AlertCircle, 
  Trophy, 
  Zap, 
  CheckCircle2,
  Cpu,
  Flame,
  ChevronRight,
  Mic,
  Settings2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveModule } from '../types';

export const Sidebar: React.FC = () => {
  const { 
    activeModule, 
    setActiveModule, 
    customApiKey, 
    geminiStatus, 
    setIsKeyModalOpen,
    userProgress,
    setIsVoiceActive,
    setIsVoiceModalOpen,
    voiceSettings
  } = useApp();

  const isKeyActive = Boolean(customApiKey || geminiStatus.hasEnvKey);

  const navItems: Array<{
    id: ActiveModule;
    label: string;
    emoji: string;
    description: string;
    activeClass: string;
    borderAccent: string;
    color: string;
  }> = [
    {
      id: 'quiz',
      label: 'Quiz Arena',
      emoji: '🧠',
      description: 'Adaptive pool & trivia',
      activeClass: 'bg-gradient-to-r from-cyan-500/20 to-transparent border-l-4 border-cyan-500 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.15)]',
      borderAccent: 'border-cyan-500',
      color: 'text-cyan-400',
    },
    {
      id: 'math',
      label: 'Math Tutor',
      emoji: '📐',
      description: 'Step-by-step calculus engine',
      activeClass: 'bg-gradient-to-r from-fuchsia-500/20 to-transparent border-l-4 border-fuchsia-500 text-fuchsia-100 shadow-[0_0_15px_rgba(232,121,249,0.15)]',
      borderAccent: 'border-fuchsia-500',
      color: 'text-fuchsia-400',
    },
    {
      id: 'arcade',
      label: 'Mind Arcade',
      emoji: '🎮',
      description: 'Mini-games & speed sprints',
      activeClass: 'bg-gradient-to-r from-lime-500/20 to-transparent border-l-4 border-lime-500 text-lime-100 shadow-[0_0_15px_rgba(132,204,22,0.15)]',
      borderAccent: 'border-lime-500',
      color: 'text-lime-400',
    },
    {
      id: 'mentor',
      label: 'AI Mentor',
      emoji: '💡',
      description: 'Deep knowledge research',
      activeClass: 'bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-500 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      borderAccent: 'border-amber-500',
      color: 'text-amber-400',
    },
  ];

  const accuracy = userProgress.totalQuestionsAnswered > 0
    ? Math.round((userProgress.totalCorrectAnswers / userProgress.totalQuestionsAnswered) * 100)
    : 0;

  const calculatedXp = (userProgress.totalQuestionsAnswered * 50) + 
                       (userProgress.mathProblemsSolved * 80) + 
                       (userProgress.arcadeStats.sprintHighScore > 0 ? 120 : 0);
  const xpPercent = Math.min(100, Math.max(10, Math.round((calculatedXp / 1000) * 100)));

  return (
    <aside className="w-72 md:w-80 bg-[#0a0f1d] border-r border-slate-800/60 flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-fuchsia-600 rounded-xl flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] shrink-0">
            🧠
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-white leading-none">OMNILEARN</span>
            <span className="text-[10px] text-cyan-400 font-bold tracking-[0.2em] mt-1 uppercase">AI Discovery Hub</span>
          </div>
        </div>

        {/* API Configuration */}
        <div className="space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 block px-1">
              API Configuration
            </label>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 rounded-lg blur opacity-75 group-hover:opacity-100 transition-opacity" />
              <button
                id="sidebar-api-key-btn"
                onClick={() => setIsKeyModalOpen(true)}
                className="relative w-full bg-[#020617] border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-left focus:outline-none transition-all flex items-center justify-between text-slate-300 hover:border-cyan-500/50"
              >
                <div className="flex items-center gap-2 truncate">
                  <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate font-mono text-[11px]">
                    {customApiKey ? 'sk-custom-attached' : geminiStatus.hasEnvKey ? 'gemini-1.5-pro' : 'Configure API Key'}
                  </span>
                </div>
                {isKeyActive ? (
                  <div className="flex gap-1.5 items-center text-[10px] text-emerald-400 font-bold shrink-0 ml-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    ACTIVE
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center text-[10px] text-amber-400 font-bold shrink-0 ml-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                    SET KEY
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 block px-1">
              Navigation
            </label>
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                    isActive
                      ? item.activeClass
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`text-xl transition-all ${isActive ? 'scale-110' : 'grayscale group-hover:grayscale-0'}`}>
                      {item.emoji}
                    </span>
                    <div className="text-left min-w-0">
                      <div className={`font-bold text-sm tracking-tight truncate ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-normal">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Voice Command Quick Access */}
          <div className="pt-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 flex items-center justify-between gap-2 shadow-lg shadow-cyan-500/5">
              <button
                id="sidebar-voice-btn"
                onClick={() => {
                  if (!voiceSettings.enabled) {
                    setIsVoiceModalOpen(true);
                  } else {
                    setIsVoiceActive(true);
                  }
                }}
                className="flex items-center gap-2.5 text-left flex-1 group"
                title="Speak question or command (Alt + V)"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 group-hover:bg-cyan-500/30 group-hover:scale-105 transition-all shrink-0">
                  <Mic className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Voice Command
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {voiceSettings.enabled ? 'Tap to speak' : 'Voice is off'}
                  </div>
                </div>
              </button>

              <button
                id="sidebar-voice-settings-btn"
                onClick={() => setIsVoiceModalOpen(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                title="Voice Settings & Cheatsheet"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Progress & Stats Card */}
      <div className="p-6 md:p-8 mt-auto">
        <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 text-center space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Daily Progress</span>
            <span className="text-cyan-400 font-mono font-bold">{accuracy}% Acc</span>
          </div>

          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-full transition-all duration-500" 
              style={{ width: `${xpPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 font-mono">
            <span>{calculatedXp} / 1000 XP</span>
            <span className="text-slate-400">{userProgress.totalQuestionsAnswered} Qs answered</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

