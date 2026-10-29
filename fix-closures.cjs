const fs = require('fs');
let code = fs.readFileSync('src/components/MindGames.tsx', 'utf-8');

// For Sprint:
// Find sprintQuestions ending
code = code.replace(
  "    { q: 'Antibiotics are effective against viral infections.', a: false, exp: 'Antibiotics only target bacterial cellular structures.' },\n  ];",
  "    { q: 'Antibiotics are effective against viral infections.', a: false, exp: 'Antibiotics only target bacterial cellular structures.' },\n  ]);"
);

// For Chemistry:
code = code.replace(
  "      fact: \"Mercury (Hg) has a melting point of -38.83°C, remaining liquid at room temperature.\"\n    }\n  ];",
  "      fact: \"Mercury (Hg) has a melting point of -38.83°C, remaining liquid at room temperature.\"\n    }\n  ]);"
);

fs.writeFileSync('src/components/MindGames.tsx', code);
