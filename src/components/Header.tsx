import React from 'react';
import { 
  Cpu, 
  Key, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  Menu,
  Mic,
  MicOff,
  Settings2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveModule } from '../types';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const { 
    activeModule, 
    customApiKey, 
    geminiStatus, 
    setIsKeyModalOpen, 
    soundEnabled, 
    setSoundEnabled,
    voiceSettings,
    isVoiceActive,
    setIsVoiceActive,
    setIsVoiceModalOpen
  } = useApp();

  const isKeyActive = Boolean(customApiKey || geminiStatus.hasEnvKey);

  const getModuleTitle = (mod: ActiveModule) => {
    switch (mod) {
      case 'quiz':
        return { title: 'Quiz Arena', tag: 'Brain Arena', color: 'text-cyan-400', accent: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' };
      case 'math':
        return { title: 'Math Tutor', tag: 'Solver Engine', color: 'text-fuchsia-400', accent: 'border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-500/10' };
      case 'arcade':
        return { title: 'Mind Arcade', tag: 'Mini-Games', color: 'text-lime-400', accent: 'border-lime-500/40 text-lime-300 bg-lime-500/10' };
      case 'mentor':
        return { title: 'AI Mentor', tag: 'Instant Knowledge', color: 'text-amber-400', accent: 'border-amber-500/40 text-amber-300 bg-amber-500/10' };
    }
  };

  const currentInfo = getModuleTitle(activeModule);

  return (
    <header className="h-20 md:h-24 flex items-center justify-between px-6 md:px-10 border-b border-slate-800/40 bg-[#0a0f1d]/40 backdrop-blur-xl sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-4">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="text-lg md:text-2xl font-light text-slate-400">
            Module: <span className="text-white font-bold tracking-tight">{currentInfo.title}</span>
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Module Sub-Badge */}
        <span className={`hidden sm:inline-flex text-[11px] font-bold px-3 py-1 rounded-full border ${currentInfo.accent} uppercase tracking-wider font-mono`}>
          {currentInfo.tag}
        </span>

        {/* Gemini status pill */}
        <button
          onClick={() => setIsKeyModalOpen(true)}
          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
            isKeyActive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden lg:inline font-mono">Gemini Pro:</span>
          <span>{isKeyActive ? 'Online' : 'Configure'}</span>
        </button>

        {/* Voice Command & Voice Options Feature Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          <button
            id="header-voice-btn"
            onClick={() => {
              if (!voiceSettings.enabled) {
                setIsVoiceModalOpen(true);
              } else {
                setIsVoiceActive(!isVoiceActive);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              isVoiceActive
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                : voiceSettings.enabled
                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                : 'text-slate-400 hover:text-white'
            }`}
            title={voiceSettings.enabled ? 'Activate Voice Command (Alt + V)' : 'Voice Command is currently off. Click to configure.'}
          >
            {voiceSettings.enabled ? (
              <Mic className={`w-3.5 h-3.5 ${isVoiceActive ? 'text-rose-400' : 'text-cyan-400'}`} />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline font-mono">
              {isVoiceActive ? 'Listening...' : voiceSettings.enabled ? 'Voice Command' : 'Voice Off'}
            </span>
          </button>

          <button
            id="header-voice-options-btn"
            onClick={() => setIsVoiceModalOpen(true)}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Voice Options, Language & Microphone Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sound toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>
    </header>
  );
};

