const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Fix quiz-generate
code = code.replace(
  'const prompt = `Generate ${count} fascinating, high-quality multiple choice quiz questions about "${category}" at "${difficulty}" difficulty level.',
  'const prompt = `Generate ${count} fascinating, high-quality, completely unique and surprising multiple choice quiz questions about "${category}" at "${difficulty}" difficulty level. IMPORTANT: Make them different from typical questions. (Randomizer: ${Math.random()})'
);

// Better JSON parsing
const oldJsonParse = `        let parsed = [];
        try {
          parsed = JSON.parse(raw);
        } catch (pe) {
          const cleaned = raw.replace(/^\\s*\\\`\\\`\\\`json/i, '').replace(/^\\s*\\\`\\\`\\\`/i, '').replace(/\\\`\\\`\\\`\\s*$/, '').trim();
          parsed = JSON.parse(cleaned);
        }`;

const newJsonParse = `        let parsed = [];
        const jsonMatch = raw.match(/\\[\\s*\\{.*\\}\\s*\\]/s);
        if (jsonMatch) {
           parsed = JSON.parse(jsonMatch[0]);
        } else {
           parsed = JSON.parse(raw);
        }`;

code = code.replace(
  /let parsed = \[\];[\s\S]*?parsed = JSON\.parse\(cleaned\);\s*}/m,
  newJsonParse
);

fs.writeFileSync('server.ts', code);
