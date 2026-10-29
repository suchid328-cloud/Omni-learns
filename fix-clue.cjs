const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "const prompt = `You are a mysterious game oracle. Provide a short, cryptic, but helpful clue for a user playing \\\"\${gameType}\\\".",
  "const prompt = `You are a mysterious game oracle. Provide a short, cryptic, but helpful clue for a user playing \\\"\${gameType}\\\". (Randomizer: \${Math.random()})"
);

fs.writeFileSync('server.ts', code);
