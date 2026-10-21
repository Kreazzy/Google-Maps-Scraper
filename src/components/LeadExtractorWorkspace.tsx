/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  ExtractedBusinessLead,
  OpportunityFilter,
  SavedLeadRecord,
  SortField,
} from '../types/leads';
import { evaluateBusinessLead } from '../utils/leadScoring';
import { PlaceLocationAutocomplete } from './PlaceLocationAutocomplete';
import {
  Search,
  Globe,
  Phone,
  ExternalLink,
  BookmarkCheck,
  BookmarkPlus,
  Compass,
  AlertCircle,
  Loader2,
  ArrowUpDown,
} from 'lucide-react';

interface LeadExtractorWorkspaceProps {
  extractedLeads: ExtractedBusinessLead[];
  setExtractedLeads: React.Dispatch<React.SetStateAction<ExtractedBusinessLead[]>>;
  selectedLead: ExtractedBusinessLead | null;
  onSelectLead: (lead: ExtractedBusinessLead | null) => void;
  savedLeadsMap: Record<string, SavedLeadRecord>;
  onSaveLead: (lead: ExtractedBusinessLead, campaignList?: string) => void;
  onBulkSaveLeads: (leads: ExtractedBusinessLead[], campaignList?: string) => void;
}

const INDUSTRY_PRESETS = [
  'Roofing Contractors',
  'Plumbers',
  'HVAC & Air Conditioning',
  'Landscaping & Lawn Care',
  'Auto Repair & Detailing',
  'Family Dentists',
  'Med Spas & Aesthetics',
  'General Contractors',
];

const DEFAULT_CENTER = { lat: 30.2672, lng: -97.7431 }; // Austin, TX

export const LeadExtractorWorkspace: React.FC<LeadExtractorWorkspaceProps> = ({
  extractedLeads,
  setExtractedLeads,
  selectedLead,
  onSelectLead,
  savedLeadsMap,
  onSaveLead,
  onBulkSaveLeads,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const [nicheQuery, setNicheQuery] = useState('Roofing Contractors');
  const [locationQuery, setLocationQuery] = useState('Austin, TX');
  const [hasMovedMap, setHasMovedMap] = useState(false);
  const [showInfoWindowOnMap, setShowInfoWindowOnMap] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasPerformedInitialSearch, setHasPerformedInitialSearch] = useState(false);

  const [opportunityFilter, setOpportunityFilter] =
    useState<OpportunityFilter>('all');
  const [sortField, setSortField] = useState<SortField>('opportunityScore');

  // Suppress "Search This Map Area" button when programmatic fitBounds/panTo occurs
  const isProgrammaticCameraMoveRef = useRef(false);

  const extractCoordinates = (
    loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined
  ): { lat: number; lng: number } | null => {
    if (!loc) return null;
    const lat =
      typeof (loc as google.maps.LatLng).lat === 'function'
        ? (loc as google.maps.LatLng).lat()
        : (loc as google.maps.LatLngLiteral).lat;
    const lng =
      typeof (loc as google.maps.LatLng).lng === 'function'
        ? (loc as google.maps.LatLng).lng()
        : (loc as google.maps.LatLngLiteral).lng;

    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
    return null;
  };

  const executePlacesExtraction = useCallback(
    async (options: {
      niche: string;
      locationText: string;
      useViewportBounds?: boolean;
      overrideCenter?: { lat: number; lng: number };
    }) => {
      if (!placesLib) return;

      const cleanNiche = options.niche.trim() || 'Local Businesses';
      const cleanLoc = options.locationText.trim();
      const combinedTextQuery =
        options.useViewportBounds || !cleanLoc
          ? cleanNiche
          : `${cleanNiche} in ${cleanLoc}`;

      setIsLoading(true);
      setErrorMsg(null);
      setHasMovedMap(false);
      setShowInfoWindowOnMap(false);

      try {
        const { Place } = placesLib;

        const request: google.maps.places.SearchByTextRequest = {
          textQuery: combinedTextQuery,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'websiteURI',
            'nationalPhoneNumber',
            'internationalPhoneNumber',
            'rating',
            'userRatingCount',
            'businessStatus',
            'primaryTypeDisplayName',
            'googleMapsURI',
          ],
          maxResultCount: 20,
        };

        if (options.useViewportBounds && map) {
          const currentBounds = map.getBounds();
          if (currentBounds) {
            request.locationRestriction = currentBounds;
          }
        } else if (options.overrideCenter) {
          request.locationBias = options.overrideCenter;
        }

        const { places } = await Place.searchByText(request);

        if (!places || places.length === 0) {
          setExtractedLeads([]);
          onSelectLead(null);
          setIsLoading(false);
          return;
        }

        const auditedLeads: ExtractedBusinessLead[] = [];
        const bounds = new google.maps.LatLngBounds();

        places.forEach((p, idx) => {
          const coords = extractCoordinates(p.location);
          if (!coords) return;

          bounds.extend(coords);

          const rawName =
            typeof p.displayName === 'string'
              ? p.displayName
              : (p.displayName as unknown as { text?: string })?.text ||
                'Unnamed Business';

          const rawCategory =
            typeof p.primaryTypeDisplayName === 'string'
              ? p.primaryTypeDisplayName
              : (p.primaryTypeDisplayName as unknown as { text?: string })?.text ||
                cleanNiche;

          const lead = evaluateBusinessLead({
            id: p.id || `place-${idx}-${Date.now()}`,
            name: rawName,
            category: rawCategory,
            address: p.formattedAddress || '',
            location: coords,
            websiteUri: p.websiteURI || null,
            phone: p.nationalPhoneNumber || null,
            internationalPhone: p.internationalPhoneNumber || null,
            rating: typeof p.rating === 'number' ? p.rating : null,
            reviewCount:
              typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
            businessStatus: p.businessStatus || 'OPERATIONAL',
            googleMapsUri: p.googleMapsURI || null,
            searchQueryUsed: combinedTextQuery,
          });

          auditedLeads.push(lead);
        });

        auditedLeads.sort((a, b) => b.opportunityScore - a.opportunityScore);

        setExtractedLeads(auditedLeads);

        if (auditedLeads.length > 0) {
          const topLead =
            auditedLeads.find((l) => l.leadTier === 'no_website') ||
            auditedLeads[0];
          onSelectLead(topLead);
        }

        if (!options.useViewportBounds && map && auditedLeads.length > 0) {
          isProgrammaticCameraMoveRef.current = true;
          map.fitBounds(bounds, 52);
          setTimeout(() => {
            isProgrammaticCameraMoveRef.current = false;
            setHasMovedMap(false);
          }, 700);
        }
      } catch (err: unknown) {
        console.error('Google Places searchByText error:', err);
        const detail = err instanceof Error ? err.message : '';
        setErrorMsg(
          `Unable to extract business listings (${
            detail || 'API Error'
          }). Please ensure Places API (New) and Maps JavaScript API are enabled on your Google Cloud project.`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [placesLib, map, setExtractedLeads, onSelectLead]
  );

  // Trigger initial live extraction when Places library loads
  useEffect(() => {
    if (placesLib && !hasPerformedInitialSearch && extractedLeads.length === 0) {
      setHasPerformedInitialSearch(true);
      void executePlacesExtraction({
        niche: nicheQuery,
        locationText: locationQuery,
      });
    }
  }, [
    placesLib,
    hasPerformedInitialSearch,
    extractedLeads.length,
    nicheQuery,
    locationQuery,
    executePlacesExtraction,
  ]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executePlacesExtraction({
      niche: nicheQuery,
      locationText: locationQuery,
      useViewportBounds: false,
    });
  };

  const handlePresetClick = (preset: string) => {
    setNicheQuery(preset);
    void executePlacesExtraction({
      niche: preset,
      locationText: locationQuery,
      useViewportBounds: false,
    });
  };

  const handleSearchCurrentMapArea = () => {
    void executePlacesExtraction({
      niche: nicheQuery,
      locationText: '',
      useViewportBounds: true,
    });
  };

  const handleLeadSelection = (
    lead: ExtractedBusinessLead,
    openPopup = false
  ) => {
    onSelectLead(lead);
    setShowInfoWindowOnMap(openPopup);
    if (map && !openPopup) {
      isProgrammaticCameraMoveRef.current = true;
      map.panTo(lead.location);
      setTimeout(() => {
        isProgrammaticCameraMoveRef.current = false;
      }, 450);
    }
  };

  // Audit summary metrics
  const auditMetrics = useMemo(() => {
    const total = extractedLeads.length;
    const noWebsite = extractedLeads.filter((l) => l.leadTier === 'no_website').length;
    const weakPresence = extractedLeads.filter(
      (l) => l.leadTier === 'weak_presence'
    ).length;
    const hasWebsite = extractedLeads.filter(
      (l) => l.leadTier === 'established'
    ).length;
    const topOpportunities = noWebsite + weakPresence;
    return { total, noWebsite, weakPresence, hasWebsite, topOpportunities };
  }, [extractedLeads]);

  // Filtered and sorted leads
  const filteredLeads = useMemo(() => {
    const list = extractedLeads.filter((lead) => {
      if (opportunityFilter === 'no_website') {
        return lead.leadTier === 'no_website';
      }
      if (opportunityFilter === 'weak_presence') {
        return lead.leadTier === 'weak_presence';
      }
      if (opportunityFilter === 'top_opportunities') {
        return (
          lead.leadTier === 'no_website' || lead.leadTier === 'weak_presence'
        );
      }
      if (opportunityFilter === 'has_website') {
        return Boolean(lead.websiteUri && lead.leadTier === 'established');
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortField === 'opportunityScore') {
        return b.opportunityScore - a.opportunityScore;
      }
      if (sortField === 'reviewCount') {
        return b.reviewCount - a.reviewCount;
      }
      if (sortField === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [extractedLeads, opportunityFilter, sortField]);

  const unsavedTopLeads = useMemo(
    () =>
      filteredLeads.filter(
        (l) =>
          (l.leadTier === 'no_website' || l.leadTier === 'weak_presence') &&
          !savedLeadsMap[l.id]
      ),
    [filteredLeads, savedLeadsMap]
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Search & Industry Presets Control Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 space-y-2.5 shrink-0">
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-wrap items-center gap-2.5"
        >
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={nicheQuery}
              onChange={(e) => setNicheQuery(e.target.value)}
              placeholder="Business category or niche (e.g., Roofing, Plumbers, Dentists)"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>

          <PlaceLocationAutocomplete
            value={locationQuery}
            onChange={setLocationQuery}
            onLocationResolved={(loc) => {
              if (map) {
                isProgrammaticCameraMoveRef.current = true;
                map.panTo(loc.center);
                map.setZoom(12);
                setTimeout(() => {
                  isProgrammaticCameraMoveRef.current = false;
                }, 500);
              }
              void executePlacesExtraction({
                niche: nicheQuery,
                locationText: loc.name,
                overrideCenter: loc.center,
              });
            }}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Auditing Maps...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Extract & Audit Leads</span>
              </>
            )}
          </button>
        </form>

        {/* Quick-Select High-Ticket Local Business Presets */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1 whitespace-nowrap">
              High-Ticket Niches:
            </span>
            {INDUSTRY_PRESETS.map((preset) => {
              const active =
                nicheQuery.toLowerCase() === preset.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white font-medium'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {/* Extracted Audit Metrics Summary */}
          <div className="flex items-center gap-3 text-xs text-slate-600 font-mono-tabular">
            <span>
              Extracted: <strong className="text-slate-900">{auditMetrics.total}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-red-600">
              No Website: <strong>{auditMetrics.noWebsite}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-700">
              Weak SEO/Rating: <strong>{auditMetrics.weakPresence}</strong>
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-xs text-red-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-700 hover:underline font-medium shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split-Screen Spatial Workbench */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Interactive Google Map with Color-Coded Opportunity Pins */}
        <div className="w-full lg:w-[44%] xl:w-[45%] h-[320px] lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0">
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={12}
            onCameraChanged={() => {
              if (!isProgrammaticCameraMoveRef.current && hasPerformedInitialSearch) {
                setHasMovedMap(true);
              }
            }}
            mapId="DEMO_MAP_ID"
            gestureHandling="greedy"
            clickableIcons={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              const isNoWebsite = lead.leadTier === 'no_website';
              const isWeakPresence = lead.leadTier === 'weak_presence';

              const pinBg = isNoWebsite
                ? '#DC2626'
                : isWeakPresence
                ? '#D97706'
                : '#2563EB';
              const pinBorder = isSelected
                ? '#0F172A'
                : isNoWebsite
                ? '#991B1B'
                : isWeakPresence
                ? '#92400E'
                : '#1E40AF';

              return (
                <AdvancedMarker
                  key={lead.id}
                  position={lead.location}
                  zIndex={isSelected ? 50 : isNoWebsite ? 30 : 10}
                  onClick={() => handleLeadSelection(lead, true)}
                  title={`${lead.name} — ${
                    isNoWebsite ? 'NO WEBSITE' : lead.domain || 'Has Website'
                  }`}
                >
                  <Pin
                    background={pinBg}
                    borderColor={pinBorder}
                    glyphColor="#FFFFFF"
                    scale={isSelected ? 1.25 : 1.0}
                  />
                </AdvancedMarker>
              );
            })}

            {showInfoWindowOnMap && selectedLead && (
              <InfoWindow
                position={selectedLead.location}
                pixelOffset={[0, -34]}
                onCloseClick={() => setShowInfoWindowOnMap(false)}
              >
                <div className="p-1 max-w-[230px] text-xs text-slate-900 space-y-1">
                  <div className="font-bold text-slate-900 truncate">
                    {selectedLead.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {!selectedLead.websiteUri ? (
                      <span className="text-red-600 font-semibold">
                        No Website Listed ({selectedLead.opportunityScore}/100)
                      </span>
                    ) : (
                      <span>
                        {selectedLead.domain} ({selectedLead.opportunityScore}/100)
                      </span>
                    )}
                  </div>
                  {selectedLead.phone && (
                    <div className="text-[11px] font-mono-tabular text-slate-700">
                      {selectedLead.phone}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>

          {/* Floating "Search Current Map Area" Button */}
          {hasMovedMap && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
              <button
                type="button"
                onClick={handleSearchCurrentMapArea}
                disabled={isLoading}
                className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg shadow-md hover:bg-slate-50 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>Extract "{nicheQuery}" in This Map Area</span>
              </button>
            </div>
          )}

          {/* Map Legend Bar */}
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-[11px] text-slate-700 shadow-xs pointer-events-none">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" />
                No Website (Hot Lead)
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
                Low Rating / SEO Need
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                Has Website
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right Pane: High-Density Lead Audit Table */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Table Filter & Bulk Action Toolbar */}
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setOpportunityFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  opportunityFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({auditMetrics.total})
              </button>
              <button
                type="button"
                onClick={() => setOpportunityFilter('top_opportunities')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  opportunityFilter === 'top_opportunities'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Top Leads: Missing + Low-Rated ({auditMetrics.topOpportunities})
              </button>
              <button
                type="button"
                onClick={() => setOpportunityFilter('no_website')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  opportunityFilter === 'no_website'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                No Website Only ({auditMetrics.noWebsite})
              </button>
              <button
                type="button"
                onClick={() => setOpportunityFilter('weak_presence')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  opportunityFilter === 'weak_presence'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weak SEO / Rating ({auditMetrics.weakPresence})
              </button>
              <button
                type="button"
                onClick={() => setOpportunityFilter('has_website')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  opportunityFilter === 'has_website'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Established Site ({auditMetrics.hasWebsite})
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  aria-label="Sort leads by"
                  className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="opportunityScore">Sort: Opportunity Score</option>
                  <option value="reviewCount">Sort: Review Volume</option>
                  <option value="rating">Sort: Star Rating</option>
                  <option value="name">Sort: Business Name</option>
                </select>
              </div>

              {unsavedTopLeads.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onBulkSaveLeads(
                      unsavedTopLeads,
                      `${nicheQuery} (${locationQuery || 'Map Area'})`
                    )
                  }
                  className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save {unsavedTopLeads.length} Top Leads</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-11 bg-slate-100 animate-pulse rounded-lg border border-slate-200/60"
                  />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  No matching business leads in this filter view
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try switching the filter tab above to "All ({auditMetrics.total})" or
                  searching a broader business category or city.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">Business Name & Location</th>
                    <th className="py-2.5 px-3">Website Presence Audit</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3 text-right">Rating / Reviews</th>
                    <th className="py-2.5 px-4 text-right">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    const isSaved = Boolean(savedLeadsMap[lead.id]);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleLeadSelection(lead, false)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/70 hover:bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 max-w-[230px]">
                          <div className="font-semibold text-slate-900 truncate">
                            {lead.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {lead.category} · {lead.address}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {!lead.websiteUri ? (
                            <div>
                              <span className="font-semibold text-red-600">
                                Missing Website
                              </span>
                              <div className="text-[11px] text-slate-500">
                                Web Design Opportunity
                              </div>
                            </div>
                          ) : lead.leadTier === 'no_website' ? (
                            <div>
                              <span className="font-semibold text-orange-600">
                                Social Page Only
                              </span>
                              <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                {lead.domain}
                              </div>
                            </div>
                          ) : lead.leadTier === 'weak_presence' ? (
                            <div>
                              <a
                                href={lead.websiteUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-amber-800 hover:underline inline-flex items-center gap-1"
                              >
                                <Globe className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[130px]">
                                  {lead.domain}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                              <div className="text-[11px] text-amber-700">
                                Needs Local SEO / Reviews
                              </div>
                            </div>
                          ) : (
                            <div>
                              <a
                                href={lead.websiteUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-emerald-800 hover:underline inline-flex items-center gap-1"
                              >
                                <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[130px]">
                                  {lead.domain}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                              <div className="text-[11px] text-slate-500">
                                Verified Website
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono-tabular whitespace-nowrap">
                          <span
                            className={`font-bold text-sm ${
                              lead.opportunityScore >= 70
                                ? 'text-red-600'
                                : lead.opportunityScore >= 40
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {lead.opportunityScore}
                          </span>
                          <span className="text-[11px] text-slate-400">/100</span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap font-mono-tabular">
                          {lead.phone ? (
                            <span className="text-slate-800 inline-flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {lead.phone}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unlisted</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono-tabular whitespace-nowrap">
                          <div className="font-medium text-slate-900">
                            {lead.rating ? `${lead.rating.toFixed(1)}★` : 'No rating'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {lead.reviewCount} reviews
                          </div>
                        </td>

                        <td
                          className="py-2.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs">
                              <BookmarkCheck className="w-3.5 h-3.5" />
                              Saved
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onSaveLead(
                                  lead,
                                  `${nicheQuery} (${locationQuery || 'Map Area'})`
                                )
                              }
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <BookmarkPlus className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
