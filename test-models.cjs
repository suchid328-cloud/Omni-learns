const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = await ai.models.list();
    for await (const m of models) {
        console.log(m.name);
    }
  } catch (err) {
    console.log("Error:", err.message || err);
  }
}
test();
