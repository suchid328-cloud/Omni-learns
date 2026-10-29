import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { QuizArena } from './components/QuizArena';
import { MathSolver } from './components/MathSolver';
import { MindGames } from './components/MindGames';
import { KnowledgeMentor } from './components/KnowledgeMentor';
import { ApiKeyModal } from './components/ApiKeyModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { VoiceAssistantHUD } from './components/VoiceAssistantHUD';

const MainContent: React.FC = () => {
  const { activeModule } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-100 font-sans overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-[#0a0f1d] h-full overflow-y-auto border-r border-slate-800/60">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area with Radial Gradient & Ambient Glow */}
      <div className="flex-1 relative flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#020617] to-[#020617] min-w-0 overflow-hidden">
        {/* Ambient background bloom */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fuchsia-600/5 blur-[120px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />
        
        <Header onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        <main className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto relative z-10">
          {activeModule === 'quiz' && <QuizArena />}
          {activeModule === 'math' && <MathSolver />}
          {activeModule === 'arcade' && <MindGames />}
          {activeModule === 'mentor' && <KnowledgeMentor />}
        </main>
      </div>

      <ApiKeyModal />
      <VoiceSettingsModal />
      <VoiceAssistantHUD />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
