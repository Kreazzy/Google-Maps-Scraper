/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  ExtractedBusinessLead,
  OutreachStage,
  PitchTemplate,
  SavedLeadRecord,
} from './types/leads';
import {
  DEFAULT_PITCH_TEMPLATES,
  exportLeadsToCsv,
} from './utils/leadScoring';
import { LeadExtractorWorkspace } from './components/LeadExtractorWorkspace';
import { LeadInspectorDrawer } from './components/LeadInspectorDrawer';
import { SavedPipelineView } from './components/SavedPipelineView';
import { PitchTemplatesView } from './components/PitchTemplatesView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Key } from 'lucide-react';

const SAVED_LEADS_STORAGE_KEY = 'maplead_scout_saved_leads_v1';
const TEMPLATES_STORAGE_KEY = 'maplead_scout_pitch_templates_v1';
const API_KEY_STORAGE_KEY = 'maplead_scout_custom_api_key_v1';

type ActiveWorkspaceTab = 'extractor' | 'pipeline' | 'templates' | 'methodology';

export default function App() {
  const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
      return stored && stored.trim() ? stored.trim() : envApiKey;
    } catch {
      return envApiKey;
    }
  });

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyModalError, setApiKeyModalError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('extractor');
  const [extractedLeads, setExtractedLeads] = useState<ExtractedBusinessLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<ExtractedBusinessLead | null>(
    null
  );

  // Load saved pipeline leads from localStorage
  const [savedLeads, setSavedLeads] = useState<SavedLeadRecord[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_LEADS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Load custom pitch templates from localStorage
  const [pitchTemplates, setPitchTemplates] = useState<PitchTemplate[]>(() => {
    try {
      const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_PITCH_TEMPLATES;
    } catch {
      return DEFAULT_PITCH_TEMPLATES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_LEADS_STORAGE_KEY, JSON.stringify(savedLeads));
    } catch (e) {
      console.error('Failed to persist saved leads:', e);
    }
  }, [savedLeads]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TEMPLATES_STORAGE_KEY,
        JSON.stringify(pitchTemplates)
      );
    } catch (e) {
      console.error('Failed to persist templates:', e);
    }
  }, [pitchTemplates]);

  const savedLeadsMap = useMemo(() => {
    const map: Record<string, SavedLeadRecord> = {};
    savedLeads.forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [savedLeads]);

  const handleSaveLead = useCallback(
    (
      lead: ExtractedBusinessLead,
      campaignList = 'General Outreach',
      initialOverrides?: Partial<Pick<SavedLeadRecord, 'stage' | 'notes'>>
    ) => {
      setSavedLeads((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === lead.id);
        if (existingIndex !== -1) {
          if (!initialOverrides) return prev;
          return prev.map((item, idx) =>
            idx === existingIndex ? { ...item, ...initialOverrides } : item
          );
        }
        const newRecord: SavedLeadRecord = {
          ...lead,
          savedAt: new Date().toISOString(),
          stage: initialOverrides?.stage || 'new',
          notes: initialOverrides?.notes || '',
          campaignList,
        };
        return [newRecord, ...prev];
      });
    },
    []
  );

  const handleBulkSaveLeads = useCallback(
    (leadsToSave: ExtractedBusinessLead[], campaignList = 'Map Extraction') => {
      setSavedLeads((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const additions: SavedLeadRecord[] = leadsToSave
          .filter((l) => !existingIds.has(l.id))
          .map((l) => ({
            ...l,
            savedAt: new Date().toISOString(),
            stage: 'new' as OutreachStage,
            notes: '',
            campaignList,
          }));
        return [...additions, ...prev];
      });
    },
    []
  );

  const handleUpdateSavedLead = useCallback(
    (
      id: string,
      updates: Partial<Pick<SavedLeadRecord, 'stage' | 'notes' | 'campaignList'>>
    ) => {
      setSavedLeads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const handleRemoveSavedLead = useCallback((id: string) => {
    setSavedLeads((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSaveCustomApiKey = (newKey: string) => {
    setApiKey(newKey);
    try {
      if (newKey) {
        localStorage.setItem(API_KEY_STORAGE_KEY, newKey);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to persist API key:', e);
    }
  };

  const handleOpenApiKeyModal = (error?: string) => {
    setApiKeyModalError(error || null);
    setIsApiKeyModalOpen(true);
  };

  const handlePrimaryExportCsv = () => {
    if (activeTab === 'pipeline' && savedLeads.length > 0) {
      exportLeadsToCsv(savedLeads, 'maplead-pipeline');
    } else if (extractedLeads.length > 0) {
      exportLeadsToCsv(extractedLeads, 'maplead-extracted-audit');
    } else if (savedLeads.length > 0) {
      exportLeadsToCsv(savedLeads, 'maplead-pipeline');
    }
  };

  return (
    <APIProvider
      key={apiKey}
      apiKey={apiKey}
      libraries={['places', 'marker']}
    >
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 text-slate-900">
        {/* Strict 3-Zone Top Bar Contract */}
        <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 shrink-0">
          {/* Zone 1: Single text element Brand wordmark */}
          <a
            href="#extractor"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('extractor');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
          >
            MapLead Scout
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
            <a
              href="#extractor"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('extractor');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 ${
                activeTab === 'extractor'
                  ? 'text-slate-900 border-blue-600 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:underline'
              }`}
            >
              Lead Extractor
            </a>
            <a
              href="#pipeline"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('pipeline');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 ${
                activeTab === 'pipeline'
                  ? 'text-slate-900 border-blue-600 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:underline'
              }`}
            >
              Saved Pipeline ({savedLeads.length})
            </a>
            <a
              href="#templates"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('templates');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 ${
                activeTab === 'templates'
                  ? 'text-slate-900 border-blue-600 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:underline'
              }`}
            >
              Pitch Playbooks
            </a>
            <a
              href="#methodology"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('methodology');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-0.5 border-b-2 ${
                activeTab === 'methodology'
                  ? 'text-slate-900 border-blue-600 font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:underline'
              }`}
            >
              Audit Scoring Guide
            </a>
          </nav>

          {/* Zone 3: Actions (API Key config + Export) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenApiKeyModal()}
              title="Configure Google Maps API Key"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">API Key</span>
            </button>

            <button
              type="button"
              onClick={handlePrimaryExportCsv}
              disabled={extractedLeads.length === 0 && savedLeads.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Export Leads CSV
            </button>
          </div>
        </header>

        {/* Main Workspace Body + Contextual Lead Inspector Drawer */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'extractor' && (
            <LeadExtractorWorkspace
              extractedLeads={extractedLeads}
              setExtractedLeads={setExtractedLeads}
              selectedLead={selectedLead}
              onSelectLead={setSelectedLead}
              savedLeadsMap={savedLeadsMap}
              onSaveLead={handleSaveLead}
              onBulkSaveLeads={handleBulkSaveLeads}
              onOpenApiKeyModal={handleOpenApiKeyModal}
            />
          )}

          {activeTab === 'pipeline' && (
            <SavedPipelineView
              savedLeads={savedLeads}
              onSelectLead={setSelectedLead}
              onUpdateStage={(id, stage) =>
                handleUpdateSavedLead(id, { stage })
              }
              onUpdateNotes={(id, notes) =>
                handleUpdateSavedLead(id, { notes })
              }
              onRemoveLead={handleRemoveSavedLead}
              onSwitchToExtractor={() => setActiveTab('extractor')}
            />
          )}

          {activeTab === 'templates' && (
            <PitchTemplatesView
              templates={pitchTemplates}
              onSaveTemplates={setPitchTemplates}
            />
          )}

          {activeTab === 'methodology' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Website Audit & Opportunity Scoring Methodology
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    How MapLead Scout evaluates real-time Google Maps Places API
                    (New) business records to identify your highest-converting
                    agency prospects.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-xs font-semibold text-red-600">
                      Tier 1 · Missing Website (+50 pts)
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      No Website URI or Social-Only Link
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Businesses with no website field on Google Maps—or those
                      linking only to Facebook, Instagram, or Yelp—are losing
                      high-intent searchers. Ideal for turnkey web design &
                      landing page packages.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-xs font-semibold text-amber-700">
                      Tier 2 · Weak SEO / Rating (+12 to +30 pts)
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Below 4.3★ Rating or Under 15 Reviews
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Businesses that have a basic website but rank poorly in
                      the Google Maps Local 3-Pack due to low review count or
                      reputation gaps. Ideal for automated review funnels and
                      Local SEO retainers.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-xs font-semibold text-blue-600">
                      Contact & Activity Proof (+30 pts)
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Verified Phone + Active Customer Reviews
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Businesses with a listed national phone number (+15 pts)
                      and 15+ existing reviews (+15 pts) prove they have active
                      cash flow and customers, making them prime buyers for
                      marketing services.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide-Over Lead Intelligence & Pitch Drawer */}
          {(activeTab === 'extractor' || activeTab === 'pipeline') &&
            selectedLead && (
              <LeadInspectorDrawer
                lead={selectedLead}
                savedRecord={savedLeadsMap[selectedLead.id]}
                onClose={() => setSelectedLead(null)}
                onSaveLead={handleSaveLead}
                onUpdateSavedLead={handleUpdateSavedLead}
                onRemoveSavedLead={handleRemoveSavedLead}
                customTemplates={pitchTemplates}
              />
            )}
        </main>

        {/* In-App API Key Configuration & Troubleshooting Modal */}
        <ApiKeyModal
          currentKey={apiKey}
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          onSaveKey={handleSaveCustomApiKey}
          errorMessage={apiKeyModalError}
        />
      </div>
    </APIProvider>
  );
}
