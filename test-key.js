const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function test() {
  console.log("Key exists:", !!process.env.GEMINI_API_KEY);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Hello',
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.log("Error:", err.message || err);
  }
}
test();
