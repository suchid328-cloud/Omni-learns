const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Generate 2 fascinating, high-quality multiple choice quiz questions about "Science" at "medium" difficulty level.
Return a valid JSON array of objects strictly matching this structure:
[
  {
    "id": "q1",
    "category": "Science",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Detailed explanation of why this answer is correct and interesting facts.",
    "funFact": "An extra mind-blowing fact about this concept."
  }
]
Do NOT enclose with markdown backticks if possible, or return strictly valid JSON.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
          systemInstruction: 'You are a master quiz creator.',
          temperature: 0.7
      }
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.log('Error:', err.message || err);
  }
}
test();
