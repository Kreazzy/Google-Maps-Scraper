/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PitchTemplate } from '../types/leads';
import { DEFAULT_PITCH_TEMPLATES } from '../utils/leadScoring';
import { Mail, PhoneCall, MessageSquare, RotateCcw, Check } from 'lucide-react';

interface PitchTemplatesViewProps {
  templates: PitchTemplate[];
  onSaveTemplates: (templates: PitchTemplate[]) => void;
}

export const PitchTemplatesView: React.FC<PitchTemplatesViewProps> = ({
  templates,
  onSaveTemplates,
}) => {
  const [activeId, setActiveId] = useState<string>(templates[0]?.id || '');
  const [savedNotice, setSavedNotice] = useState(false);

  const activeTemplate =
    templates.find((t) => t.id === activeId) || templates[0];

  const handleFieldChange = (
    field: 'name' | 'subject' | 'body' | 'description',
    value: string
  ) => {
    if (!activeTemplate) return;
    const updated = templates.map((t) =>
      t.id === activeTemplate.id ? { ...t, [field]: value } : t
    );
    onSaveTemplates(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  const handleResetDefaults = () => {
    onSaveTemplates(DEFAULT_PITCH_TEMPLATES);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Agency Outreach & Pitch Script Playbooks
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize the cold email, phone opener, and SMS templates that auto-populate
              when you inspect a business lead on the map.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Saved changes
              </span>
            )}
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Default Playbooks</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Playbook List */}
          <div className="lg:col-span-4 space-y-2.5">
            {templates.map((tpl) => {
              const isSelected = tpl.id === activeTemplate?.id;
              const Icon =
                tpl.channel === 'email'
                  ? Mail
                  : tpl.channel === 'call'
                  ? PhoneCall
                  : MessageSquare;

              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setActiveId(tpl.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-white border-blue-600 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                      <Icon className="w-3.5 h-3.5 text-blue-600" />
                      {tpl.channel.toUpperCase()}
                    </span>
                    <span>
                      Target:{' '}
                      {tpl.targetTier === 'no_website'
                        ? 'No Website'
                        : tpl.targetTier === 'weak_presence'
                        ? 'Low Rating / SEO'
                        : 'All Leads'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {tpl.name}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {tpl.description}
                  </p>
                </button>
              );
            })}

            {/* Dynamic Merge Tokens Reference */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-800">
                Available Dynamic Merge Variables
              </div>
              <p className="text-[11px] text-slate-500">
                Include these placeholders in your scripts to automatically inject live
                Google Maps lead data:
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono-tabular text-slate-700">
                <span>{'{{businessName}}'}</span>
                <span>{'{{category}}'}</span>
                <span>{'{{city}}'}</span>
                <span>{'{{address}}'}</span>
                <span>{'{{phone}}'}</span>
                <span>{'{{reviewSummary}}'}</span>
                <span>{'{{websiteStatus}}'}</span>
                <span>{'{{auditHook}}'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Template Editor */}
          {activeTemplate && (
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Playbook Title
                </label>
                <input
                  type="text"
                  value={activeTemplate.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {activeTemplate.channel === 'email' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={activeTemplate.subject || ''}
                    onChange={(e) => handleFieldChange('subject', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Script Body
                </label>
                <textarea
                  rows={14}
                  value={activeTemplate.body}
                  onChange={(e) => handleFieldChange('body', e.target.value)}
                  className="w-full p-3.5 text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-sans"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
