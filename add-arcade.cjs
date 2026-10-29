const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const arcadeEndpoint = `
  // Arcade Generate API
  app.post('/api/gemini/arcade-generate', async (req, res) => {
    try {
      const { type, customApiKey } = req.body;
      const r = Math.random();
      let prompt = '';
      if (type === 'sprint') {
        prompt = \`Generate 10 completely random and fascinating True or False science/tech trivia statements. (Randomizer: \${r})
Return strictly a valid JSON array of objects matching:
[
  { "q": "Statement here.", "a": true, "exp": "Explanation here." }
]
Do NOT use markdown wrapping.\`;
      } else {
        prompt = \`Generate 5 completely random and surprising chemistry or physics multiple choice questions. (Randomizer: \${r})
Return strictly a valid JSON array of objects matching:
[
  { "q": "Question here?", "options": ["A", "B", "C", "D"], "correct": 1, "fact": "Fun fact here." }
]
Do NOT use markdown wrapping.\`;
      }

      const responseText = await runGeminiGeneration(customApiKey, prompt, 'You are a master trivia creator.', 0.9);
      const raw = responseText || '[]';
      let parsed = [];
      const jsonMatch = raw.match(/\\[\\s*\\{[\\s\\S]*?\\}\\s*\\]/);
      if (jsonMatch) {
         parsed = JSON.parse(jsonMatch[0]);
      } else {
         const cleaned = raw.replace(/^[\`\\s]*(json)?/i, '').replace(/[\`\\s]*$/, '').trim();
         parsed = JSON.parse(cleaned);
      }
      return res.json({ data: parsed });
    } catch (err) {
      console.error('Arcade generate error:', err);
      return res.status(500).json({ error: 'GENAI_ERROR', message: err.message });
    }
  });

`;

code = code.replace('  // Mind Games Clue / Oracle API', arcadeEndpoint + '  // Mind Games Clue / Oracle API');
fs.writeFileSync('server.ts', code);
