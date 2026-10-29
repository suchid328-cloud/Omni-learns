const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Fix quiz-generate
code = code.replace(
  'const prompt = `Generate ${count} fascinating, high-quality multiple choice quiz questions about "${category}" at "${difficulty}" difficulty level.',
  'const prompt = `Generate ${count} fascinating, high-quality, completely unique and surprising multiple choice quiz questions about "${category}" at "${difficulty}" difficulty level. IMPORTANT: Make them different from typical questions. (Randomizer: ${Math.random()})'
);

code = code.replace(
  /let parsed = \[\];\s*try\s*\{\s*parsed = JSON\.parse\(raw\);\s*\}\s*catch\s*\(pe\)\s*\{\s*const cleaned[^}]+\}\s*/g,
  `let parsed = [];
        const jsonMatch = raw.match(/\\[\\s*\\{[\\s\\S]*?\\}\\s*\\]/);
        if (jsonMatch) {
           parsed = JSON.parse(jsonMatch[0]);
        } else {
           const cleaned = raw.replace(/^[\`\\s]*(json)?/i, '').replace(/[\`\\s]*$/, '').trim();
           parsed = JSON.parse(cleaned);
        }
        `
);

fs.writeFileSync('server.ts', code);
