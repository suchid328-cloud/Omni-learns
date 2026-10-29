const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const badBlock = `      const jsonMatch = raw.match(/\\[\\s*\\{[\\s\\S]*?\\}\\s*\\]/);
      if (jsonMatch) {
         parsed = JSON.parse(jsonMatch[0]);
      } else {
         const cleaned = raw.replace(/^[\\\\\`\\s]*(json)?/i, '').replace(/[\\\\\`\\s]*$/, '').trim();
         parsed = JSON.parse(cleaned);
      }`;

const betterBlock = `      try {
        parsed = JSON.parse(raw);
      } catch (e1) {
        try {
          const cleaned = raw.replace(/^[\\s\\S]*?\\[/, '[').replace(/\\][\\s\\S]*$/, ']');
          parsed = JSON.parse(cleaned);
        } catch (e2) {
          const cleanedFallback = raw.replace(/^[\`\\s]*(json)?/i, '').replace(/[\`\\s]*$/, '').trim();
          parsed = JSON.parse(cleanedFallback);
        }
      }`;

// Since regex could be tricky, let's just match the start and end
code = code.replace(/const jsonMatch = raw\.match\(\/\\\[.*?JSON\.parse\(cleaned\);\s*\}/gs, betterBlock);

fs.writeFileSync('server.ts', code);
