import React, { useState } from 'react';
import { Key, X, ExternalLink, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { checkGeminiStatus } from '../services/geminiService';

export const ApiKeyModal: React.FC = () => {
  const { 
    isKeyModalOpen, 
    setIsKeyModalOpen, 
    customApiKey, 
    setCustomApiKey, 
    geminiStatus, 
    refreshGeminiStatus 
  } = useApp();

  const [inputKey, setInputKey] = useState<string>(customApiKey);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isKeyModalOpen) return null;

  const handleSave = async () => {
    setCustomApiKey(inputKey.trim());
    setTesting(true);
    setTestResult(null);

    try {
      await refreshGeminiStatus();
      setTestResult({
        success: true,
        message: 'API Key preferences saved and validated successfully!',
      });
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Could not validate key.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    setInputKey('');
    setCustomApiKey('');
    setTestResult({
      success: true,
      message: 'Custom key removed. Using default environment key if available.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gemini API Engine Setup</h2>
              <p className="text-xs text-slate-400">Powering OmniLearn with Google Gemini Pro</p>
            </div>
          </div>
          <button
            id="close-api-key-modal"
            onClick={() => setIsKeyModalOpen(false)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Alert */}
          {geminiStatus.hasEnvKey ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-emerald-300 block">Workspace API Key Detected</span>
                <p className="text-slate-300 mt-0.5">
                  An active <code className="text-emerald-300 bg-emerald-950/60 px-1 py-0.5 rounded">GEMINI_API_KEY</code> is configured on the backend. You can use all AI features directly, or attach a custom key below.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-300 block">Custom Key Recommended</span>
                <p className="text-slate-300 mt-0.5">
                  Paste your Google AI Studio Gemini API key below to unlock live AI problem-solving, dynamic quiz generation, and AI mentor conversations.
                </p>
              </div>
            </div>
          )}

          {/* Input field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Your Gemini API Key:</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] hover:underline"
              >
                Get a free key from Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <input
                id="gemini-api-key-input"
                type="password"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-500 font-mono"
              />
            </div>
          </div>

          {/* Test feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Info note */}
          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              All API calls use the official <code className="text-cyan-300">@google/genai</code> SDK server proxy to keep keys protected.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-rose-400 px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors"
          >
            Clear Key
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsKeyModalOpen(false)}
              className="text-xs text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Close
            </button>
            <button
              id="save-api-key-btn"
              onClick={handleSave}
              disabled={testing}
              className="text-xs font-bold px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Validating...
                </>
              ) : (
                'Save Key'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
