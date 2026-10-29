const fs = require('fs');
let code = fs.readFileSync('src/components/MindGames.tsx', 'utf-8');

// 1. imports
code = code.replace(
  "import { fetchGameClue } from '../services/geminiService';",
  "import { fetchGameClue, generateArcadeQuestions } from '../services/geminiService';"
);

// 2. Add States and Loaders
code = code.replace(
  "  const SPRINT_QUESTIONS = [",
  "  const [sprintQuestions, setSprintQuestions] = useState<any[]>([\n"
);
code = code.replace(
  "    { q: 'Antibiotics are effective against viral infections.', a: false, exp: 'Antibiotics only target bacterial cellular structures.' },\n  ];",
  "    { q: 'Antibiotics are effective against viral infections.', a: false, exp: 'Antibiotics only target bacterial cellular structures.' },\n  ]);\n  const [isLoadingSprint, setIsLoadingSprint] = useState(false);\n  const [isLoadingChem, setIsLoadingChem] = useState(false);"
);

code = code.replace(
  "  const CHEMISTRY_ROUNDS = [",
  "  const [chemistryQuestions, setChemistryQuestions] = useState<any[]>([\n"
);
code = code.replace(
  "      fact: \"Marie Curie coined the term 'radioactivity' and was the first woman to win a Nobel Prize (and the only person to win in two scientific fields: Physics and Chemistry!).\"\n    }\n  ];",
  "      fact: \"Marie Curie coined the term 'radioactivity' and was the first woman to win a Nobel Prize (and the only person to win in two scientific fields: Physics and Chemistry!).\"\n    }\n  ]);"
);

// 3. Add useEffects to fetch
code = code.replace(
  "  useEffect(() => {",
  `  useEffect(() => {
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

  useEffect(() => {`
);

// 4. Update References
code = code.replace(/SPRINT_QUESTIONS/g, "sprintQuestions");
code = code.replace(/CHEMISTRY_ROUNDS/g, "chemistryQuestions");

fs.writeFileSync('src/components/MindGames.tsx', code);
