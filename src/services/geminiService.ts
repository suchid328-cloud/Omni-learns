import { QuizQuestion } from '../types';

export interface GeminiStatus {
  hasEnvKey: boolean;
  model: string;
  status: string;
}

export async function checkGeminiStatus(): Promise<GeminiStatus> {
  try {
    const res = await fetch('/api/gemini/status');
    if (!res.ok) {
      throw new Error(`Status check returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      hasEnvKey: false,
      model: 'gemini-1.5-pro',
      status: 'offline',
    };
  }
}

export async function solveMathProblem(
  problem: string,
  topic?: string,
  detailLevel: string = 'Comprehensive',
  customApiKey?: string
): Promise<{ result: string; modelUsed: string }> {
  const response = await fetch('/api/gemini/math-solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      problem,
      topic,
      detailLevel,
      customApiKey,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to generate solution.');
  }

  return data;
}

export async function generateQuizQuestions(
  category: string,
  count: number = 5,
  difficulty: string = 'medium',
  customApiKey?: string
): Promise<QuizQuestion[]> {
  const response = await fetch('/api/gemini/quiz-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category,
      count,
      difficulty,
      customApiKey,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to generate questions.');
  }

  return data.questions || [];
}

export async function sendMentorMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  field?: string,
  customApiKey?: string,
  rapidMode: boolean = true
): Promise<{ reply: string; modelUsed: string; elapsedMs?: number }> {
  const startTime = Date.now();
  const response = await fetch('/api/gemini/mentor-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      field,
      customApiKey,
      rapidMode,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to generate mentor response.');
  }

  return { ...data, elapsedMs: Date.now() - startTime };
}

export async function fetchGameClue(
  gameType: string,
  context: any,
  customApiKey?: string
): Promise<string> {
  const response = await fetch('/api/gemini/game-clue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameType,
      context,
      customApiKey,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to generate clue.');
  }

  return data.clue || '';
}

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
