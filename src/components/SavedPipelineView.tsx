/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ExtractedBusinessLead,
  OutreachStage,
  SavedLeadRecord,
} from '../types/leads';
import { STAGE_METADATA, exportLeadsToCsv } from '../utils/leadScoring';
import {
  Search,
  Download,
  Trash2,
  ExternalLink,
  Phone,
  Globe,
  FolderKanban,
  ArrowUpRight,
} from 'lucide-react';

interface SavedPipelineViewProps {
  savedLeads: SavedLeadRecord[];
  onSelectLead: (lead: ExtractedBusinessLead) => void;
  onUpdateStage: (id: string, stage: OutreachStage) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onRemoveLead: (id: string) => void;
  onSwitchToExtractor: () => void;
}

export const SavedPipelineView: React.FC<SavedPipelineViewProps> = ({
  savedLeads,
  onSelectLead,
  onUpdateStage,
  onUpdateNotes,
  onRemoveLead,
  onSwitchToExtractor,
}) => {
  const [stageFilter, setStageFilter] = useState<OutreachStage | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'no_website' | 'weak_presence'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeads = useMemo(() => {
    return savedLeads.filter((lead) => {
      if (stageFilter !== 'all' && lead.stage !== stageFilter) return false;
      if (tierFilter === 'no_website' && lead.leadTier !== 'no_website') return false;
      if (tierFilter === 'weak_presence' && lead.leadTier !== 'weak_presence')
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(q);
        const matchCity = lead.city.toLowerCase().includes(q);
        const matchCategory = lead.category.toLowerCase().includes(q);
        const matchNotes = (lead.notes || '').toLowerCase().includes(q);
        const matchCampaign = (lead.campaignList || '').toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchCategory && !matchNotes && !matchCampaign) {
          return false;
        }
      }
      return true;
    });
  }, [savedLeads, stageFilter, tierFilter, searchQuery]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: savedLeads.length };
    (Object.keys(STAGE_METADATA) as OutreachStage[]).forEach((s) => {
      counts[s] = savedLeads.filter((l) => l.stage === s).length;
    });
    return counts;
  }, [savedLeads]);

  if (savedLeads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white m-6 rounded-xl border border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
          <FolderKanban className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Your Outreach Pipeline is Empty
        </h2>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          Extract local businesses from Google Maps in the Lead Extractor, filter by
          businesses missing websites or needing SEO, and save qualified prospects here to
          track calls, emails, and notes.
        </p>
        <button
          type="button"
          onClick={onSwitchToExtractor}
          className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Map Lead Extractor
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 p-6 gap-5">
      {/* Pipeline Summary Strip & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Saved Lead Pipeline & Outreach CRM
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track outreach status, log call notes, and export qualified local business
              prospects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                exportLeadsToCsv(filteredLeads, 'maplead-pipeline-export')
              }
              disabled={filteredLeads.length === 0}
              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {filteredLeads.length} Leads to CSV</span>
            </button>
          </div>
        </div>

        {/* Stage Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                stageFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Saved ({stageCounts.all})
            </button>
            {(Object.keys(STAGE_METADATA) as OutreachStage[]).map((stageKey) => (
              <button
                key={stageKey}
                type="button"
                onClick={() => setStageFilter(stageKey)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  stageFilter === stageKey
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {STAGE_METADATA[stageKey].label} ({stageCounts[stageKey] || 0})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tierFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Audits
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('no_website')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tierFilter === 'no_website'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                No Website
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('weak_presence')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tierFilter === 'weak_presence'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Low Rating / SEO
              </button>
            </div>

            <div className="relative w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by business, city, notes..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* High-Density CRM Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Business & Niche</th>
                <th className="py-2.5 px-3">Website Audit</th>
                <th className="py-2.5 px-3 text-right">Score</th>
                <th className="py-2.5 px-3">Direct Phone</th>
                <th className="py-2.5 px-3 text-right">Reviews</th>
                <th className="py-2.5 px-3">Outreach Stage</th>
                <th className="py-2.5 px-3">Agency Notes</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-50/90 transition-colors group"
                >
                  <td className="py-2.5 px-4 max-w-[240px]">
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      className="font-semibold text-slate-900 hover:text-blue-600 text-left block truncate w-full"
                    >
                      {lead.name}
                    </button>
                    <div className="text-[11px] text-slate-500 truncate">
                      {lead.category} · {lead.city} · {lead.campaignList}
                    </div>
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {!lead.websiteUri ? (
                      <span className="text-red-600 font-semibold">
                        No Website Listed
                      </span>
                    ) : lead.leadTier === 'no_website' ? (
                      <span className="text-orange-600 font-semibold">
                        Social Link ({lead.domain})
                      </span>
                    ) : (
                      <a
                        href={lead.websiteUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 hover:text-blue-600 inline-flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[140px]">
                          {lead.domain || 'Website'}
                        </span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono-tabular">
                    <span
                      className={`font-bold ${
                        lead.opportunityScore >= 70
                          ? 'text-red-600'
                          : lead.opportunityScore >= 40
                          ? 'text-amber-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {lead.opportunityScore}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap font-mono-tabular">
                    {lead.phone ? (
                      <span className="text-slate-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {lead.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono-tabular whitespace-nowrap text-slate-700">
                    {lead.rating ? `${lead.rating.toFixed(1)}★` : 'N/A'}{' '}
                    <span className="text-slate-400">({lead.reviewCount})</span>
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <select
                      value={lead.stage}
                      onChange={(e) =>
                        onUpdateStage(lead.id, e.target.value as OutreachStage)
                      }
                      className="px-2 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
                    >
                      {(Object.keys(STAGE_METADATA) as OutreachStage[]).map(
                        (st) => (
                          <option key={st} value={st}>
                            {STAGE_METADATA[st].label}
                          </option>
                        )
                      )}
                    </select>
                  </td>

                  <td className="py-2.5 px-3 min-w-[200px]">
                    <input
                      type="text"
                      value={lead.notes || ''}
                      onChange={(e) => onUpdateNotes(lead.id, e.target.value)}
                      placeholder="Add call or pitch note..."
                      className="w-full px-2 py-1 text-xs bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-600 focus:bg-white rounded text-slate-800 focus:outline-none"
                    />
                  </td>

                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectLead(lead)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <span>Pitch</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveLead(lead.id)}
                        title="Remove from pipeline"
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
