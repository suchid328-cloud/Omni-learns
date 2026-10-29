import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  Volume2, 
  Languages, 
  HelpCircle, 
  Sparkles, 
  AlertCircle, 
  Zap, 
  Compass, 
  Calculator, 
  BrainCircuit, 
  Play,
  Square,
  Settings2,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Info,
  Sliders,
  Lock,
  Globe
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  isSpeechRecognitionSupported, 
  isSpeechSynthesisSupported, 
  speakText, 
  stopSpeaking,
  createSpeechRecognition,
  checkMicrophonePermission,
  requestMicrophoneAccess
} from '../services/speechService';

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-AU', label: 'English (Australia)' },
  { code: 'es-ES', label: 'Spanish (Español)' },
  { code: 'fr-FR', label: 'French (Français)' },
  { code: 'de-DE', label: 'German (Deutsch)' },
  { code: 'it-IT', label: 'Italian (Italiano)' },
  { code: 'ja-JP', label: 'Japanese (日本語)' },
  { code: 'hi-IN', label: 'Hindi (हिन्दी)' },
];

export const VoiceSettingsModal: React.FC = () => {
  const { 
    isVoiceModalOpen, 
    setIsVoiceModalOpen, 
    voiceSettings, 
    updateVoiceSettings,
    setIsVoiceActive,
    executeVoiceCommand 
  } = useApp();

  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testTranscript, setTestTranscript] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTestSpeaking, setIsTestSpeaking] = useState(false);
  
  // Permission diagnostics state
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied' | 'prompt' | 'unsupported'>('checking');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [activeBrowserTab, setActiveBrowserTab] = useState<'chrome' | 'safari' | 'firefox'>('chrome');
  const [isInIframe, setIsInIframe] = useState(false);

  const testRecognitionRef = useRef<any>(null);

  const isRecognitionSupported = isSpeechRecognitionSupported();
  const isTtsSupported = isSpeechSynthesisSupported();

  // Query actual browser permission state
  const refreshPermissionState = async () => {
    try {
      const state = await checkMicrophonePermission();
      setPermissionState(state);
    } catch {
      setPermissionState('unsupported');
    }
  };

  useEffect(() => {
    if (isVoiceModalOpen) {
      refreshPermissionState();
      try {
        setIsInIframe(window.self !== window.top);
      } catch {
        setIsInIframe(true);
      }
    }
  }, [isVoiceModalOpen]);

  // Cleanup test mic on unmount or close
  useEffect(() => {
    return () => {
      if (testRecognitionRef.current) {
        try {
          testRecognitionRef.current.abort();
        } catch {}
      }
      stopSpeaking();
    };
  }, []);

  if (!isVoiceModalOpen) return null;

  // Active trigger to request microphone permission from the browser
  const handleRequestBrowserPermission = async () => {
    setIsRequestingPermission(true);
    setTestStatus('Requesting microphone permission from your browser...');

    const result = await requestMicrophoneAccess();
    setIsRequestingPermission(false);

    if (result.granted) {
      setPermissionState('granted');
      setTestStatus('Success! Microphone permission granted by your browser.');
    } else {
      setPermissionState('denied');
      setTestStatus(result.error || 'Microphone permission blocked in browser. Follow the steps below to unblock.');
    }
  };

  const handleOpenInNewWindow = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Popup blocked:', e);
    }
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  const handleTestMicToggle = () => {
    if (isTestingMic) {
      if (testRecognitionRef.current) {
        try {
          testRecognitionRef.current.abort();
        } catch {}
      }
      setIsTestingMic(false);
      setTestStatus(null);
      return;
    }

    if (!isRecognitionSupported) {
      setTestStatus('Speech recognition is not supported in this browser environment.');
      return;
    }

    try {
      const recognition = createSpeechRecognition(voiceSettings.language);
      if (!recognition) {
        setTestStatus('Could not initialize speech recognition.');
        return;
      }

      testRecognitionRef.current = recognition;
      setTestTranscript('');
      setTestStatus('Listening... Speak anything into your microphone.');
      setIsTestingMic(true);

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTestTranscript(current);
        setTestStatus('Microphone is working perfectly! Audio detected.');
      };

      recognition.onerror = (event: any) => {
        console.warn('Test mic error:', event.error);
        if (event.error === 'not-allowed') {
          setPermissionState('denied');
          setTestStatus('Microphone permission was denied. Please follow the browser steps below to unblock.');
        } else if (event.error === 'no-speech') {
          setTestStatus('No speech detected. Speak closer to your microphone or check microphone volume.');
        } else {
          setTestStatus(`Recognition notice: ${event.error}`);
        }
        setIsTestingMic(false);
      };

      recognition.onend = () => {
        setIsTestingMic(false);
      };

      recognition.start();
    } catch (err: any) {
      setTestStatus(`Failed to start test: ${err?.message || 'Unknown error'}`);
      setIsTestingMic(false);
    }
  };

  const handleTestSpeech = () => {
    if (isTestSpeaking) {
      stopSpeaking();
      setIsTestSpeaking(false);
      return;
    }

    setIsTestSpeaking(true);
    speakText(
      'Omni AI Voice system is operational. You can ask questions, solve math derivations, and play quizzes with your voice!',
      {
        lang: voiceSettings.language,
        onEnd: () => setIsTestSpeaking(false),
        onError: () => setIsTestSpeaking(false),
      }
    );
  };

  const handleTryCommand = (phrase: string) => {
    setIsVoiceModalOpen(false);
    executeVoiceCommand(phrase);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#090d19] border border-cyan-500/30 rounded-3xl p-5 md:p-7 shadow-2xl shadow-cyan-500/10 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                Voice Settings &amp; Microphone
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Audio Hub
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure voice recognition, unblock browser permissions, and test audio.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVoiceModalOpen(false)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Microphone Permission Diagnostic & Unblock Card */}
        <div className={`p-4 md:p-5 rounded-2xl border transition-all ${
          permissionState === 'denied'
            ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/40'
            : permissionState === 'granted'
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              {permissionState === 'denied' ? (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              ) : permissionState === 'granted' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Sliders className="w-5 h-5 text-cyan-400 shrink-0" />
              )}
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  Browser Microphone Permission
                  {permissionState === 'granted' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Allowed &amp; Ready
                    </span>
                  )}
                  {permissionState === 'denied' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      Blocked in Browser
                    </span>
                  )}
                  {permissionState === 'prompt' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Permission Prompt Needed
                    </span>
                  )}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  {permissionState === 'denied'
                    ? 'Your browser has blocked microphone access for this page. Follow the steps below to allow it.'
                    : permissionState === 'granted'
                    ? 'Microphone is active and authorized by your browser.'
                    : 'Click Prompt Permission to allow your browser to record voice questions.'}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-prompt-mic-permission"
                onClick={handleRequestBrowserPermission}
                disabled={isRequestingPermission}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                <Mic className="w-3.5 h-3.5 fill-slate-950" />
                <span>{isRequestingPermission ? 'Requesting...' : 'Prompt Permission'}</span>
              </button>

              <button
                onClick={handleReloadPage}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
                title="Reload Page after changing browser settings"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Reload Page</span>
              </button>
            </div>
          </div>

          {/* If inside iframe (AI Studio or embedded container) */}
          {isInIframe && (
            <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-200">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Running inside preview frame. If browser blocks microphone, open in standalone window:</span>
              </div>
              <button
                onClick={handleOpenInNewWindow}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 hover:text-white font-semibold text-[11px] flex items-center gap-1 shrink-0 ml-2 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in Tab</span>
              </button>
            </div>
          )}

          {/* Browser-Specific Step-by-Step Unblock Instructions */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                How to Unblock Microphone in Your Browser:
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveBrowserTab('chrome')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    activeBrowserTab === 'chrome'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Chrome / Edge
                </button>
                <button
                  onClick={() => setActiveBrowserTab('safari')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    activeBrowserTab === 'safari'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Safari
                </button>
                <button
                  onClick={() => setActiveBrowserTab('firefox')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    activeBrowserTab === 'firefox'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Firefox
                </button>
              </div>
            </div>

            {/* Step Guide per Browser */}
            {activeBrowserTab === 'chrome' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300 mb-1">
                    <Info className="w-4 h-4 shrink-0" />
                    Seeing a Home button (🏠) to the left of the URL bar?
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The <strong>Home button (🏠)</strong> is on your browser toolbar. Don&apos;t click that! Look <strong>inside the address bar capsule</strong> itself, or check the <strong>far right</strong> side of the address bar.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-cyan-400 font-bold font-mono text-[11px] flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Option A: Inside URL Bar
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Look <em>inside</em> the text box where the URL is typed. On the left edge <em>inside</em> the oval, click the <strong>Tune/Sliders icon (🎚️)</strong> (two horizontal switches). Set <strong>Microphone</strong> to <strong>Allow</strong>.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-cyan-400 font-bold font-mono text-[11px] flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-rose-400" /> Option B: Right-Side Mic Icon
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Look at the <strong>far right</strong> of the address bar (near the star/zoom). If blocked, Chrome displays a <strong>Mic with a red X (🎙️❌)</strong>. Click it &rarr; choose <em>&ldquo;Always allow&rdquo;</em> &rarr; Done!
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-cyan-400 font-bold font-mono text-[11px] flex items-center gap-1">
                      <Settings2 className="w-3.5 h-3.5 text-emerald-400" /> Option C: 3-Dots Menu
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Click the <strong>Three dots (⋮)</strong> at top-right of Chrome &rarr; <strong>Settings</strong> &rarr; <strong>Privacy and security</strong> &rarr; <strong>Site settings</strong> &rarr; <strong>Microphone</strong> &rarr; allow this app.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeBrowserTab === 'safari' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-bold font-mono text-[11px]">1. Safari Settings</span>
                  <p className="text-slate-300 text-[11px]">
                    On Mac, click <strong>Safari</strong> in the top menu bar &rarr; <strong>Settings for This Website...</strong>
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-bold font-mono text-[11px]">2. Switch to Allow</span>
                  <p className="text-slate-300 text-[11px]">
                    Under <strong>Microphone</strong>, change from <em>Deny</em> to <strong>Allow</strong>.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-bold font-mono text-[11px]">3. On iPhone/iPad</span>
                  <p className="text-slate-300 text-[11px]">
                    Go to iOS <strong>Settings &rarr; Safari &rarr; Microphone &rarr; Allow</strong>, then refresh.
                  </p>
                </div>
              </div>
            )}

            {activeBrowserTab === 'firefox' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-bold font-mono text-[11px]">1. Click Mic/Shield</span>
                  <p className="text-slate-300 text-[11px]">
                    Click the <strong>Microphone</strong> or <strong>Shield icon</strong> immediately left of the URL bar.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-bold font-mono text-[11px]">2. Clear Block</span>
                  <p className="text-slate-300 text-[11px]">
                    Click the <strong>X</strong> next to &ldquo;Blocked Temporarily&rdquo; or permissions.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-bold font-mono text-[11px]">3. Reload &amp; Confirm</span>
                  <p className="text-slate-300 text-[11px]">
                    Reload the page and click <strong>Allow</strong> on the browser pop-up prompt.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Switches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Main Voice Recognition Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                Voice Recognition
              </span>
              <p className="text-xs text-slate-400">
                Recognize questions and commands via microphone
              </p>
            </div>
            <button
              id="toggle-voice-enabled"
              onClick={() => updateVoiceSettings({ enabled: !voiceSettings.enabled })}
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
                voiceSettings.enabled ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${
                  voiceSettings.enabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Text-to-Speech Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                Voice Feedback (TTS)
              </span>
              <p className="text-xs text-slate-400">
                Read AI answers aloud using speech synthesis
              </p>
            </div>
            <button
              id="toggle-voice-tts"
              onClick={() => updateVoiceSettings({ ttsEnabled: !voiceSettings.ttsEnabled })}
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
                voiceSettings.ttsEnabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${
                  voiceSettings.ttsEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Language Selection */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-amber-400" />
                Speech Language
              </span>
              <p className="text-xs text-slate-400">Accent &amp; dialect detection</p>
            </div>
            <select
              value={voiceSettings.language}
              onChange={(e) => updateVoiceSettings({ language: e.target.value })}
              className="bg-slate-900 border border-slate-750 text-xs text-white rounded-xl px-3 py-1.5 focus:border-cyan-500 focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-Send on Silence */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-fuchsia-400" />
                Auto-Submit on Pause
              </span>
              <p className="text-xs text-slate-400">Automatically executes question after speech stops</p>
            </div>
            <button
              id="toggle-voice-autosend"
              onClick={() => updateVoiceSettings({ autoSend: !voiceSettings.autoSend })}
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
                voiceSettings.autoSend ? 'bg-fuchsia-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${
                  voiceSettings.autoSend ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Microphone Diagnostics & Audio Test */}
        <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-cyan-400" />
              Microphone &amp; Audio Diagnostic Test
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestSpeech}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                {isTestSpeaking ? <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />}
                <span>{isTestSpeaking ? 'Stop Voice' : 'Test Speaker'}</span>
              </button>

              <button
                onClick={handleTestMicToggle}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isTestingMic
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isTestingMic ? 'Stop Test' : 'Test Microphone'}</span>
              </button>
            </div>
          </div>

          {/* Test Status or Heard Transcript */}
          {testStatus && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div>{testStatus}</div>
                {testTranscript && (
                  <div className="text-cyan-300 font-mono bg-slate-950 p-2 rounded border border-slate-800">
                    &ldquo;{testTranscript}&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}

          {!isRecognitionSupported && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Note: Web Speech Recognition works natively in Google Chrome, Microsoft Edge, and Safari.
              </span>
            </div>
          )}
        </div>

        {/* Voice Command Cheatsheet / Quick Examples */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Voice Command Cheatsheet (Tap any to try!):
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Scholar Inquiries */}
            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3 h-3" /> Ask Any Question
              </span>
              <button
                onClick={() => handleTryCommand("Explain Fleming's Left-Hand Rule and how motors rotate")}
                className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800/60 text-xs text-slate-300 hover:text-white transition-colors"
              >
                &ldquo;Explain Fleming&apos;s Left-Hand Rule&rdquo;
              </button>
            </div>

            {/* Math Solver */}
            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
              <span className="text-[11px] font-bold text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Calculator className="w-3 h-3" /> Solve Math &amp; Equations
              </span>
              <button
                onClick={() => handleTryCommand('Solve derivative of x cubed times sine x')}
                className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800/60 text-xs text-slate-300 hover:text-white transition-colors"
              >
                &ldquo;Solve derivative of x cubed times sine x&rdquo;
              </button>
            </div>

            {/* Quiz Generation */}
            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <BrainCircuit className="w-3 h-3" /> Voice Quiz Generation
              </span>
              <button
                onClick={() => handleTryCommand('Quiz me on Space and Black Holes')}
                className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800/60 text-xs text-slate-300 hover:text-white transition-colors"
              >
                &ldquo;Quiz me on Space and Black Holes&rdquo;
              </button>
            </div>

            {/* Navigation & Controls */}
            <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
              <span className="text-[11px] font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Compass className="w-3 h-3" /> Navigation Commands
              </span>
              <button
                onClick={() => handleTryCommand('Open Math Tutor')}
                className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800/60 text-xs text-slate-300 hover:text-white transition-colors"
              >
                &ldquo;Open Math Tutor&rdquo;
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={() => {
              setIsVoiceModalOpen(false);
              setIsVoiceActive(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors"
          >
            <Mic className="w-4 h-4 fill-slate-950" />
            <span>Start Listening Now</span>
          </button>

          <button
            onClick={() => setIsVoiceModalOpen(false)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
