const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf-8');

const oldProvider = `    <AppContext.Provider
      value={{
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
      }}
    >`;

const newProvider = `    <AppContext.Provider
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
      }), [activeModule, customApiKey, geminiStatus, refreshGeminiStatus, userProgress, incrementQuizStats, incrementMathStats, updateArcadeStats, isKeyModalOpen, soundEnabled])}
    >`;

code = code.replace(oldProvider, newProvider);

fs.writeFileSync('src/context/AppContext.tsx', code);
