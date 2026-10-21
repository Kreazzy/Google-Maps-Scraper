/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ExtractedBusinessLead,
  OutreachStage,
  PitchTemplate,
  SavedLeadRecord,
} from '../types/leads';
import {
  DEFAULT_PITCH_TEMPLATES,
  STAGE_METADATA,
  interpolatePitch,
} from '../utils/leadScoring';
import {
  X,
  Globe,
  Phone,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  BookmarkCheck,
  BookmarkPlus,
  Mail,
  MessageSquare,
  PhoneCall,
} from 'lucide-react';

interface LeadInspectorDrawerProps {
  lead: ExtractedBusinessLead | null;
  savedRecord: SavedLeadRecord | undefined;
  onClose: () => void;
  onSaveLead: (
    lead: ExtractedBusinessLead,
    campaignList?: string,
    initialOverrides?: Partial<Pick<SavedLeadRecord, 'stage' | 'notes'>>
  ) => void;
  onUpdateSavedLead: (
    id: string,
    updates: Partial<Pick<SavedLeadRecord, 'stage' | 'notes' | 'campaignList'>>
  ) => void;
  onRemoveSavedLead: (id: string) => void;
  customTemplates: PitchTemplate[];
}

export const LeadInspectorDrawer: React.FC<LeadInspectorDrawerProps> = ({
  lead,
  savedRecord,
  onClose,
  onSaveLead,
  onUpdateSavedLead,
  onRemoveSavedLead,
  customTemplates,
}) => {
  const allTemplates =
    customTemplates.length > 0 ? customTemplates : DEFAULT_PITCH_TEMPLATES;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    allTemplates[0]?.id || 'no-website-email'
  );
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [copiedField, setCopiedField] = useState<'body' | 'subject' | 'phone' | null>(
    null
  );
  const [notesDraft, setNotesDraft] = useState('');
  const [campaignDraft, setCampaignDraft] = useState('');

  const copyToClipboard = async (
    text: string,
    field: 'body' | 'subject' | 'phone'
  ) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Automatically pick the most relevant pitch template when a lead is selected
  useEffect(() => {
    if (!lead) return;
    let bestTemplate = allTemplates[0];
    if (lead.leadTier === 'no_website') {
      bestTemplate =
        allTemplates.find((t) => t.id === 'no-website-email') ||
        allTemplates.find((t) => t.targetTier === 'no_website') ||
        allTemplates[0];
    } else if (lead.leadTier === 'weak_presence') {
      bestTemplate =
        allTemplates.find((t) => t.id === 'weak-presence-email') ||
        allTemplates.find((t) => t.targetTier === 'weak_presence') ||
        allTemplates[0];
    }
    if (bestTemplate) {
      setSelectedTemplateId(bestTemplate.id);
      const interpolated = interpolatePitch(bestTemplate, lead);
      setEditableSubject(interpolated.subject);
      setEditableBody(interpolated.body);
    }
  }, [lead?.id]);

  // Update interpolated pitch when user switches template tabs or updates customTemplates
  useEffect(() => {
    if (!lead) return;
    const tpl =
      allTemplates.find((t) => t.id === selectedTemplateId) || allTemplates[0];
    if (tpl) {
      const interpolated = interpolatePitch(tpl, lead);
      setEditableSubject(interpolated.subject);
      setEditableBody(interpolated.body);
    }
  }, [selectedTemplateId, lead, allTemplates]);

  useEffect(() => {
    if (savedRecord) {
      setNotesDraft(savedRecord.notes || '');
      setCampaignDraft(savedRecord.campaignList || '');
    } else if (lead) {
      setNotesDraft('');
      setCampaignDraft(lead.searchQueryUsed || 'General Outreach');
    }
  }, [savedRecord, lead?.id]);

  if (!lead) return null;

  const activeTemplate =
    allTemplates.find((t) => t.id === selectedTemplateId) || allTemplates[0];

  const isMissingWebsite = !lead.websiteUri;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 lg:static w-full sm:w-[420px] lg:w-[430px] xl:w-[460px] shrink-0 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shadow-xl lg:shadow-none">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
            <span className="font-medium text-slate-700">{lead.category}</span>
            <span aria-hidden="true">·</span>
            <span>{lead.city}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                lead.leadTier === 'no_website'
                  ? 'text-red-600 font-semibold'
                  : lead.leadTier === 'weak_presence'
                  ? 'text-amber-700 font-semibold'
                  : 'text-emerald-700 font-medium'
              }
            >
              {lead.leadTier === 'no_website'
                ? lead.websiteUri
                  ? 'Social/Directory Link Only'
                  : 'No Website Listed'
                : lead.leadTier === 'weak_presence'
                ? 'SEO / Reputation Need'
                : 'Active Website'}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 leading-snug truncate">
            {lead.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close lead inspector"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {/* Section 1: Website & Contact Audit Summary */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">Opportunity Score</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  className={`text-2xl font-bold font-mono-tabular ${
                    lead.opportunityScore >= 70
                      ? 'text-red-600'
                      : lead.opportunityScore >= 40
                      ? 'text-amber-600'
                      : 'text-slate-800'
                  }`}
                >
                  {lead.opportunityScore}
                </span>
                <span className="text-xs text-slate-400 font-mono-tabular">/ 100</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {savedRecord ? (
                <button
                  type="button"
                  onClick={() => onRemoveSavedLead(lead.id)}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  Saved in Pipeline
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onSaveLead(lead, campaignDraft, { notes: notesDraft })
                  }
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Save to Pipeline
                </button>
              )}
            </div>
          </div>

          {/* Extracted Contact Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-600 shrink-0">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Website Status</span>
              </div>
              <div className="text-right font-medium">
                {isMissingWebsite ? (
                  <span className="text-red-600 font-semibold">
                    Missing — No website URI on Maps
                  </span>
                ) : (
                  <a
                    href={lead.websiteUri!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
                  >
                    <span>{lead.domain || lead.websiteUri}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-600 shrink-0">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone Number</span>
              </div>
              <div className="flex items-center gap-2">
                {lead.phone ? (
                  <>
                    <a
                      href={`tel:${lead.phone}`}
                      className="font-mono-tabular font-medium text-slate-900 hover:text-blue-600"
                    >
                      {lead.phone}
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(lead.phone!, 'phone')}
                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedField === 'phone' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400">Not listed</span>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-600 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Address</span>
              </div>
              <div className="text-right text-slate-700 max-w-[240px]">
                {lead.address}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-slate-500">
              <span>
                Google Reviews:{' '}
                <strong className="text-slate-800 font-mono-tabular">
                  {lead.rating ? `${lead.rating.toFixed(1)}★` : 'No rating'}
                </strong>{' '}
                ({lead.reviewCount} reviews)
              </span>
              {lead.googleMapsUri && (
                <a
                  href={lead.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>View on Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Explainable Audit Breakdown */}
          <div>
            <div className="text-xs font-semibold text-slate-800 mb-2">
              Audit & Opportunity Breakdown
            </div>
            <div className="text-xs text-slate-600 mb-2.5">
              Recommended Pitch:{' '}
              <span className="font-medium text-slate-900">
                {lead.recommendedAngle}
              </span>
            </div>
            <ul className="space-y-1.5">
              {lead.scoreFactors.map((factor, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2 text-xs py-1 px-2.5 bg-slate-50 rounded border border-slate-200/60"
                >
                  <span className="text-slate-700">{factor.label}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900 shrink-0">
                    +{factor.points} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 2: Pipeline CRM Controls (Stage & Agency Notes) */}
        <div className="p-5 space-y-3 bg-slate-50/40">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              Outreach Pipeline & Call Notes
            </h3>
            {!savedRecord && (
              <span className="text-[11px] text-slate-500">
                Editing auto-saves lead to pipeline
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Outreach Stage
              </label>
              <select
                value={savedRecord?.stage || 'new'}
                onChange={(e) => {
                  const nextStage = e.target.value as OutreachStage;
                  if (!savedRecord) {
                    onSaveLead(lead, campaignDraft, {
                      stage: nextStage,
                      notes: notesDraft,
                    });
                  } else {
                    onUpdateSavedLead(lead.id, { stage: nextStage });
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {(Object.keys(STAGE_METADATA) as OutreachStage[]).map((stageKey) => (
                  <option key={stageKey} value={stageKey}>
                    {STAGE_METADATA[stageKey].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Campaign / List Tag
              </label>
              <input
                type="text"
                value={campaignDraft}
                onChange={(e) => {
                  const val = e.target.value;
                  setCampaignDraft(val);
                  if (savedRecord) {
                    onUpdateSavedLead(lead.id, { campaignList: val });
                  }
                }}
                placeholder="e.g., Austin Plumbers"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Prospecting & Call Notes
            </label>
            <textarea
              rows={2}
              value={notesDraft}
              onChange={(e) => {
                const nextNotes = e.target.value;
                setNotesDraft(nextNotes);
                if (!savedRecord) {
                  onSaveLead(lead, campaignDraft, { notes: nextNotes });
                } else {
                  onUpdateSavedLead(lead.id, { notes: nextNotes });
                }
              }}
              placeholder="Log gatekeeper name, owner email, website issues, or follow-up date..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>
        </div>

        {/* Section 3: Personalized Pitch Script Generator */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900">
              Tailored Outreach Script
            </h3>
            <span className="text-[11px] text-slate-500">
              Auto-filled with {lead.name} data
            </span>
          </div>

          {/* Template Selector Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {allTemplates.map((tpl) => {
              const isActive = tpl.id === selectedTemplateId;
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
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>
                    {tpl.channel === 'email'
                      ? tpl.targetTier === 'no_website'
                        ? 'No-Site Email'
                        : 'SEO Email'
                      : tpl.channel === 'call'
                      ? 'Cold Call'
                      : 'SMS Pitch'}
                  </span>
                </button>
              );
            })}
          </div>

          {activeTemplate?.channel === 'email' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Subject Line
                </label>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(editableSubject, 'subject')}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'subject' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Subject</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-500">
                {activeTemplate?.channel === 'call'
                  ? 'Spoken Cold Call Opener'
                  : 'Message Body'}
              </label>
              <button
                type="button"
                onClick={() => void copyToClipboard(editableBody, 'body')}
                className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedField === 'body' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied Script</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Pitch Script</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={9}
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              className="w-full p-3 text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 resize-y"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
