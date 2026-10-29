// Web Speech API service for Speech Recognition and Text-to-Speech (TTS)

export interface SpeechRecognitionResultState {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export type VoiceIntentType = 
  | 'MATH_SOLVE'
  | 'QUIZ_TOPIC'
  | 'NAVIGATE'
  | 'QUIZ_ANSWER'
  | 'KNOWLEDGE_QUESTION';

export interface ClassifiedVoiceCommand {
  type: VoiceIntentType;
  rawText: string;
  cleanedQuery: string;
  targetModule?: 'quiz' | 'math' | 'arcade' | 'mentor';
  quizAnswerIndex?: number; // 0 for A, 1 for B, etc.
}

// Check if Web Speech Recognition is supported
export const isSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition
  );
};

// Check if Speech Synthesis (TTS) is supported
export const isSpeechSynthesisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
};

// Check current microphone permission status via navigator.permissions API
export const checkMicrophonePermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> => {
  if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return 'unsupported';
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return 'unsupported';
  }
};

// Actively request microphone permission via WebRTC getUserMedia
export const requestMicrophoneAccess = async (): Promise<{ granted: boolean; error?: string }> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { 
      granted: false, 
      error: 'Media devices API not supported in this browser. Please use Google Chrome, Edge, or Safari.' 
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Release tracks immediately so hardware mic light turns off
    stream.getTracks().forEach((track) => track.stop());
    return { granted: true };
  } catch (err: any) {
    console.warn('Microphone permission request error:', err);
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      return {
        granted: false,
        error: 'Microphone permission is blocked in your browser site settings.',
      };
    }
    return {
      granted: false,
      error: err?.message || 'Could not access microphone.',
    };
  }
};

// Create Speech Recognition instance
export const createSpeechRecognition = (language: string = 'en-US'): any | null => {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognitionClass = 
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition;

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;
    return recognition;
  } catch (err) {
    console.error('Failed to create SpeechRecognition:', err);
    return null;
  }
};

// Text-to-Speech: Read aloud responses
export const speakText = (
  text: string, 
  options: { 
    lang?: string; 
    rate?: number; 
    pitch?: number; 
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): void => {
  if (!isSpeechSynthesisSupported()) return;

  // Stop any active utterance first
  window.speechSynthesis.cancel();

  // Strip Markdown, LaTeX symbols, and formatting for clean natural speech
  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, 'Mathematical equation.')
    .replace(/\$([^\$]+)\$/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[|>#*~_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  // Break text into chunks if it is very long to prevent browser TTS cutoff
  const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 1000));
  utterance.lang = options.lang || 'en-US';
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;

  if (options.onEnd) {
    utterance.onend = () => options.onEnd?.();
  }
  if (options.onError) {
    utterance.onerror = (e) => options.onError?.(e);
  }

  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = (): void => {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
};

export const isSpeaking = (): boolean => {
  if (!isSpeechSynthesisSupported()) return false;
  return window.speechSynthesis.speaking;
};

// Convert spoken mathematical phrasing to clear math notations
export const convertSpeechToMath = (spoken: string): string => {
  let math = spoken.trim();

  const replacements: Array<[RegExp, string]> = [
    [/\bsquared\b/gi, '^2'],
    [/\bcubed\b/gi, '^3'],
    [/\bto the power of (\d+)\b/gi, '^$1'],
    [/\bto the power of ([a-z])\b/gi, '^$1'],
    [/\bsquare root of ([a-z0-9]+)\b/gi, '\\sqrt{$1}'],
    [/\bsquare root\b/gi, '\\sqrt{}'],
    [/\bplus\b/gi, '+'],
    [/\bminus\b/gi, '-'],
    [/\btimes\b/gi, '*'],
    [/\bmultiplied by\b/gi, '*'],
    [/\bdivided by\b/gi, '/'],
    [/\bequals\b/gi, '='],
    [/\bequal to\b/gi, '='],
    [/\bgreater than or equal to\b/gi, '\\ge'],
    [/\bless than or equal to\b/gi, '\\le'],
    [/\bgreater than\b/gi, '>'],
    [/\bless than\b/gi, '<'],
    [/\bpi\b/gi, '\\pi'],
    [/\btheta\b/gi, '\\theta'],
    [/\binfinity\b/gi, '\\infty'],
    [/\bsine\b/gi, '\\sin'],
    [/\bcosine\b/gi, '\\cos'],
    [/\btangent\b/gi, '\\tan'],
    [/\blogarithm\b/gi, '\\log'],
    [/\bnatural log\b/gi, '\\ln'],
    [/\bderivative of\b/gi, '\\frac{d}{dx}'],
    [/\bintegral of\b/gi, '\\int'],
  ];

  for (const [pattern, replacement] of replacements) {
    math = math.replace(pattern, replacement);
  }

  return math;
};

// Natural language voice command classifier
export const classifyVoiceCommand = (rawSpeech: string): ClassifiedVoiceCommand => {
  const text = rawSpeech.trim();
  const lower = text.toLowerCase();

  // 1. Navigation commands
  if (
    lower.includes('go to math') || 
    lower.includes('open math') || 
    lower.includes('switch to math') ||
    lower.includes('show math')
  ) {
    return {
      type: 'NAVIGATE',
      rawText: text,
      cleanedQuery: '',
      targetModule: 'math',
    };
  }

  if (
    lower.includes('go to quiz') || 
    lower.includes('open quiz') || 
    lower.includes('switch to quiz') ||
    lower.includes('quiz arena')
  ) {
    return {
      type: 'NAVIGATE',
      rawText: text,
      cleanedQuery: '',
      targetModule: 'quiz',
    };
  }

  if (
    lower.includes('go to arcade') || 
    lower.includes('open arcade') || 
    lower.includes('mind arcade') || 
    lower.includes('open games') ||
    lower.includes('play games')
  ) {
    return {
      type: 'NAVIGATE',
      rawText: text,
      cleanedQuery: '',
      targetModule: 'arcade',
    };
  }

  if (
    lower.includes('go to mentor') || 
    lower.includes('open mentor') || 
    lower.includes('open scholar') || 
    lower.includes('switch to mentor') ||
    lower.includes('ai mentor')
  ) {
    return {
      type: 'NAVIGATE',
      rawText: text,
      cleanedQuery: '',
      targetModule: 'mentor',
    };
  }

  // 2. Quiz Answer commands (e.g., "option a", "the second one", "option 3", "answer 1")
  const optionMatch = lower.match(/(?:option|choice|answer|select|pick)\s+([a-d]|1|2|3|4|first|second|third|fourth)/i);
  if (optionMatch) {
    const val = optionMatch[1].toLowerCase();
    let index = -1;
    if (val === 'a' || val === '1' || val === 'first') index = 0;
    else if (val === 'b' || val === '2' || val === 'second') index = 1;
    else if (val === 'c' || val === '3' || val === 'third') index = 2;
    else if (val === 'd' || val === '4' || val === 'fourth') index = 3;

    if (index !== -1) {
      return {
        type: 'QUIZ_ANSWER',
        rawText: text,
        cleanedQuery: text,
        quizAnswerIndex: index,
      };
    }
  }

  // 3. Quiz Topic / Generator commands
  if (
    lower.startsWith('quiz me on') ||
    lower.startsWith('quiz on') ||
    lower.startsWith('create quiz about') ||
    lower.startsWith('generate quiz on') ||
    lower.startsWith('start quiz on') ||
    lower.startsWith('make a quiz about')
  ) {
    const cleaned = text
      .replace(/^(quiz me on|quiz on|create quiz about|generate quiz on|start quiz on|make a quiz about)\s*/i, '')
      .trim();
    return {
      type: 'QUIZ_TOPIC',
      rawText: text,
      cleanedQuery: cleaned || 'Science & Space',
      targetModule: 'quiz',
    };
  }

  // 4. Math solver commands
  if (
    lower.startsWith('solve math') ||
    lower.startsWith('solve') ||
    lower.startsWith('calculate') ||
    lower.startsWith('compute') ||
    lower.startsWith('evaluate') ||
    lower.startsWith('find the derivative') ||
    lower.startsWith('derivative of') ||
    lower.startsWith('find the integral') ||
    lower.startsWith('integral of') ||
    lower.includes('differential equation') ||
    lower.includes('matrix multiplication') ||
    lower.includes('x^2') ||
    lower.includes('x squared') ||
    lower.includes('derivative') ||
    lower.includes('integral')
  ) {
    const cleaned = text
      .replace(/^(solve math problem|solve math|solve problem|solve equation|solve|calculate|compute|evaluate)\s*/i, '')
      .trim();
    return {
      type: 'MATH_SOLVE',
      rawText: text,
      cleanedQuery: cleaned || text,
      targetModule: 'math',
    };
  }

  // 5. General Knowledge Question (Default to Knowledge Mentor Scholar)
  // Strip conversational prefixes like "Hey Omni", "Can you explain", "Tell me", etc.
  const cleanedQuestion = text
    .replace(/^(hey omni|omni ai|please|can you|could you|tell me|explain to me|explain|what is|what are|how does|why is|why does|who was|who is)\s+/i, (match) => {
      // keep "What is", "How does", "Why is" if desired, or keep original text
      if (/^(what is|what are|how does|why is|why does|who was|who is)/i.test(match)) {
        return match;
      }
      return '';
    })
    .trim();

  return {
    type: 'KNOWLEDGE_QUESTION',
    rawText: text,
    cleanedQuery: cleanedQuestion || text,
    targetModule: 'mentor',
  };
};
