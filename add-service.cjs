const fs = require('fs');
let code = fs.readFileSync('src/services/geminiService.ts', 'utf-8');

const exportFunc = `
export async function generateArcadeQuestions(
  type: 'sprint' | 'chemistry',
  customApiKey?: string
): Promise<any[]> {
  const response = await fetch('/api/gemini/arcade-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, customApiKey }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to generate arcade questions.');
  }
  return data.data || [];
}
`;

code += exportFunc;
fs.writeFileSync('src/services/geminiService.ts', code);
