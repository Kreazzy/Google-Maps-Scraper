/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LeadTier = 'no_website' | 'weak_presence' | 'established';

export type OutreachStage =
  | 'new'
  | 'contacted'
  | 'follow_up'
  | 'meeting'
  | 'closed_won'
  | 'archived';

export interface ScoreFactor {
  label: string;
  points: number;
  category: 'website' | 'reputation' | 'contact' | 'activity';
}

export interface ExtractedBusinessLead {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  location: {
    lat: number;
    lng: number;
  };
  websiteUri: string | null;
  domain: string | null;
  phone: string | null;
  internationalPhone: string | null;
  rating: number | null;
  reviewCount: number;
  businessStatus: string;
  googleMapsUri: string | null;
  leadTier: LeadTier;
  opportunityScore: number;
  scoreFactors: ScoreFactor[];
  recommendedAngle: string;
  searchQueryUsed: string;
  extractedAt: string;
}

export interface SavedLeadRecord extends ExtractedBusinessLead {
  savedAt: string;
  stage: OutreachStage;
  notes: string;
  campaignList: string;
  lastContactedAt?: string | null;
}

export type OpportunityFilter =
  | 'all'
  | 'top_opportunities'
  | 'no_website'
  | 'weak_presence'
  | 'has_website';

export type SortField = 'opportunityScore' | 'reviewCount' | 'rating' | 'name';

export interface PitchTemplate {
  id: string;
  name: string;
  channel: 'email' | 'call' | 'sms';
  targetTier: LeadTier | 'all';
  subject?: string;
  body: string;
  description: string;
}
