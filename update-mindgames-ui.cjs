const fs = require('fs');
let code = fs.readFileSync('src/components/MindGames.tsx', 'utf-8');

code = code.replace(
  '<h4 className="text-xl font-extrabold text-white">Ready for the Sprint?</h4>',
  '{isLoadingSprint ? <h4 className="text-xl font-extrabold text-amber-400">Loading new Sprint questions... <Loader2 className="w-5 h-5 inline animate-spin" /></h4> : <h4 className="text-xl font-extrabold text-white">Ready for the Sprint?</h4>}'
);

code = code.replace(
  '<button\n                onClick={startSprint}',
  '<button\n                disabled={isLoadingSprint}\n                onClick={startSprint}'
);

code = code.replace(
  'const { customApiKey, updateArcadeStats, userProgress, setIsKeyModalOpen } = useApp();',
  'const { customApiKey, updateArcadeStats, userProgress, setIsKeyModalOpen } = useApp();\n  const [isLoadingSprint, setIsLoadingSprint] = useState(false);\n  const [isLoadingChem, setIsLoadingChem] = useState(false);'
);

// Wait, I already added isLoadingSprint and isLoadingChem in the previous script!
// Let me remove the duplicate if it exists.
