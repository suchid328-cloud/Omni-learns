const fs = require('fs');
let code = fs.readFileSync('src/components/MindGames.tsx', 'utf-8');

// import it
code = code.replace(
  "import { fetchGameClue } from '../services/geminiService';",
  "import { fetchGameClue, generateArcadeQuestions } from '../services/geminiService';"
);

// replace static sprint
code = code.replace(
  "const SPRINT_QUESTIONS = [",
  "const [sprintQuestions, setSprintQuestions] = useState<any[]>([\n"
);
// replace closing bracket of SPRINT_QUESTIONS
code = code.replace(
  "  // GAME 3: MATH TARGET (Find the formula)",
  "  // GAME 3: MATH TARGET (Find the formula)"
); // This is risky. Let's do it manually using standard tools!
