/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Key, ShieldAlert, ExternalLink, Check, Copy, HelpCircle } from 'lucide-react';

interface ApiKeyModalProps {
  currentKey: string;
  onSaveKey: (key: string) => void;
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string | null;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  currentKey,
  onSaveKey,
  isOpen,
  onClose,
  errorMessage,
}) => {
  const [inputKey, setInputKey] = useState(currentKey);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKey(inputKey.trim());
    onClose();
  };

  const handleCopyVercelVar = () => {
    navigator.clipboard.writeText('VITE_GOOGLE_MAPS_API_KEY');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Google Maps & Places API Key Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Configure your API key to query Google Maps Places API (New)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 text-sm font-semibold rounded"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-red-900">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>Permission / Unregistered Caller Error</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Google Maps returned: <span className="font-mono">{errorMessage}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Active Google Maps API Key
            </label>
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Stored securely in your local browser storage for immediate runtime use.
            </p>
          </div>

          {/* Quick Guide for Vercel Deployment & Google Cloud Console */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Why this happens on Vercel & How to solve in 2 steps:
            </div>

            <ol className="list-decimal pl-4 space-y-2 text-[11px] leading-relaxed">
              <li>
                <strong className="text-slate-800">
                  Step 1: Enable "Places API (New)" in Google Cloud Console
                </strong>
                <div className="text-slate-500 mt-0.5">
                  The error <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800">PLACES_SEARCH_TEXT: PERMISSION_DENIED: Method doesn't allow unregistered callers</code> occurs when{' '}
                  <strong className="text-slate-700">Places API (New)</strong> is not enabled on the project your API key belongs to, or when API restrictions block it.
                </div>
                <a
                  href="https://console.cloud.google.com/marketplace/product/google/places.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium mt-1"
                >
                  <span>Enable Places API (New) in Google Cloud</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>

              <li>
                <strong className="text-slate-800">
                  Step 2: Add Environment Variable in Vercel Project Settings
                </strong>
                <div className="text-slate-500 mt-0.5">
                  In your Vercel Dashboard, go to{' '}
                  <span className="font-semibold text-slate-700">Project Settings → Environment Variables</span>, and add:
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-white border border-slate-300 px-2 py-1 rounded text-slate-800 font-mono text-[11px]">
                    VITE_GOOGLE_MAPS_API_KEY
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyVercelVar}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 text-[10px] font-medium flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Name'}</span>
                  </button>
                </div>
              </li>

              <li>
                <strong className="text-slate-800">
                  Step 3: Check Website / HTTP Referrer Restrictions
                </strong>
                <div className="text-slate-500 mt-0.5">
                  If your API key has HTTP Referrer restrictions in Google Cloud Console, ensure your Vercel domain (e.g.,{' '}
                  <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800">*.vercel.app/*</code>) is included in the allowed referrers list.
                </div>
              </li>
            </ol>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              Save & Apply API Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
