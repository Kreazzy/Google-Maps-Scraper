/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExtractedBusinessLead,
  LeadTier,
  OutreachStage,
  PitchTemplate,
  SavedLeadRecord,
  ScoreFactor,
} from '../types/leads';

/**
 * Extracts a clean hostname from a website URL string.
 */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return url;
  }
}

/**
 * Extracts a likely city/locality name from a formatted address.
 */
export function extractCityFromAddress(address: string): string {
  if (!address) return 'your area';
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3) {
    return parts[parts.length - 3] || parts[1] || 'your area';
  }
  if (parts.length === 2) {
    return parts[0] || 'your area';
  }
  return 'your area';
}

/**
 * Computes the Opportunity Score (0 - 100), LeadTier, and explainable audit factors
 * from a real Google Maps Place record.
 */
export function evaluateBusinessLead(params: {
  id: string;
  name: string;
  category: string;
  address: string;
  location: { lat: number; lng: number };
  websiteUri: string | null;
  phone: string | null;
  internationalPhone: string | null;
  rating: number | null;
  reviewCount: number;
  businessStatus: string;
  googleMapsUri: string | null;
  searchQueryUsed: string;
}): ExtractedBusinessLead {
  const factors: ScoreFactor[] = [];
  let rawScore = 0;

  const hasWebsite = Boolean(params.websiteUri && params.websiteUri.trim().length > 0);
  const domain = extractDomain(params.websiteUri);
  const rating = params.rating;
  const reviewCount = params.reviewCount || 0;
  const hasPhone = Boolean(params.phone || params.internationalPhone);

  // Check if the "website" is actually just a social page or directory link
  const isSocialOrDirectoryOnly =
    hasWebsite &&
    domain !== null &&
    /(facebook\.com|instagram\.com|yelp\.com|linktr\.ee|m\.me|yellowpages\.com)/i.test(
      domain
    );

  // 1. Website Presence Audit (Up to 50 pts)
  if (!hasWebsite) {
    rawScore += 50;
    factors.push({
      label: 'No website linked on Google Maps profile',
      points: 50,
      category: 'website',
    });
  } else if (isSocialOrDirectoryOnly) {
    rawScore += 38;
    factors.push({
      label: `Uses third-party page (${domain}) instead of dedicated domain`,
      points: 38,
      category: 'website',
    });
  }

  // 2. Reputation & Local SEO Audit (Up to 25 pts)
  if (rating !== null && rating < 4.3) {
    rawScore += 18;
    factors.push({
      label: `Below-benchmark rating (${rating.toFixed(1)}★) — Reputation management opportunity`,
      points: 18,
      category: 'reputation',
    });
  } else if (rating === null) {
    rawScore += 14;
    factors.push({
      label: 'No customer ratings yet — Local SEO & review generation need',
      points: 14,
      category: 'reputation',
    });
  }

  if (reviewCount > 0 && reviewCount < 15) {
    rawScore += 12;
    factors.push({
      label: `Low review volume (${reviewCount} reviews) — Local Maps pack optimization angle`,
      points: 12,
      category: 'reputation',
    });
  } else if (reviewCount === 0) {
    rawScore += 10;
    factors.push({
      label: 'Zero Google reviews — Untapped local search visibility',
      points: 10,
      category: 'reputation',
    });
  }

  // 3. Active Customer Proof (Up to 15 pts)
  if (!hasWebsite && reviewCount >= 15) {
    rawScore += 15;
    factors.push({
      label: `Established customer base (${reviewCount} reviews) operating without a website`,
      points: 15,
      category: 'activity',
    });
  } else if (reviewCount >= 25) {
    rawScore += 8;
    factors.push({
      label: `Proven active local business (${reviewCount} customer reviews)`,
      points: 8,
      category: 'activity',
    });
  }

  // 4. Direct Contact Reachability (Up to 15 pts)
  if (hasPhone) {
    rawScore += 15;
    factors.push({
      label: 'Direct phone number listed for immediate outreach',
      points: 15,
      category: 'contact',
    });
  }

  const opportunityScore = Math.min(100, Math.max(8, rawScore));

  // Determine Lead Tier
  let leadTier: LeadTier = 'established';
  if (!hasWebsite || isSocialOrDirectoryOnly) {
    leadTier = 'no_website';
  } else if (
    (rating !== null && rating < 4.3) ||
    reviewCount < 15 ||
    opportunityScore >= 40
  ) {
    leadTier = 'weak_presence';
  }

  // Determine Recommended Pitch Angle
  let recommendedAngle = 'Conversion Rate Optimization & Paid Local Ads';
  if (!hasWebsite) {
    recommendedAngle =
      reviewCount >= 15
        ? 'High-Converting Website Build (Capturing Existing Maps Traffic)'
        : 'Turnkey Local Business Website + Google Business Profile Setup';
  } else if (isSocialOrDirectoryOnly) {
    recommendedAngle = `Dedicated Custom Domain Upgrade (Moving off ${domain})`;
  } else if (rating !== null && rating < 4.2) {
    recommendedAngle = 'Automated Review Generation & Reputation Recovery Funnel';
  } else if (reviewCount < 15) {
    recommendedAngle = 'Local SEO & Google Maps Top-3 Pack Visibility Campaign';
  }

  if (factors.length === 0) {
    factors.push({
      label: 'Active website & strong review profile — Pitch paid traffic or site speed audit',
      points: 8,
      category: 'activity',
    });
  }

  return {
    id: params.id,
    name: params.name,
    category: params.category || 'Local Business',
    address: params.address,
    city: extractCityFromAddress(params.address),
    location: params.location,
    websiteUri: params.websiteUri,
    domain,
    phone: params.phone,
    internationalPhone: params.internationalPhone,
    rating: params.rating,
    reviewCount,
    businessStatus: params.businessStatus || 'OPERATIONAL',
    googleMapsUri: params.googleMapsUri,
    leadTier,
    opportunityScore,
    scoreFactors: factors,
    recommendedAngle,
    searchQueryUsed: params.searchQueryUsed,
    extractedAt: new Date().toISOString(),
  };
}

export const DEFAULT_PITCH_TEMPLATES: PitchTemplate[] = [
  {
    id: 'no-website-email',
    name: 'Missing Website — Traffic Leak Audit (Cold Email)',
    channel: 'email',
    targetTier: 'no_website',
    description:
      'High-response email for businesses with active Google Maps reviews but no website URL attached.',
    subject: 'Quick question about {{businessName}} on Google Maps',
    body: `Hi {{businessName}} team,

I was searching for {{category}} providers in {{city}} on Google Maps today and came across your listing.

You already have {{reviewSummary}} on Google, which is great social proof — however, I noticed there is no website linked to your Google Business Profile. Right now, when local customers click your listing looking for a quote or service list, they have nowhere to land and often click back to a competitor with a website.

I put together a quick 60-second mockup of what a fast, mobile-ready website for {{businessName}} would look like (with click-to-call and instant quote booking built in).

Would you be open to me sending over the preview link? No cost or obligation.

Best regards,
[Your Name]
[Your Agency / Contact]`,
  },
  {
    id: 'no-website-call',
    name: 'Missing Website — Direct Cold Call Opener',
    channel: 'call',
    targetTier: 'no_website',
    description:
      'Direct, non-salesy phone script when calling the business number extracted from Google Maps.',
    body: `"Hi, is this the owner or manager at {{businessName}}?

Great — I'll be super brief. I was looking at {{category}} companies in {{city}} on Google Maps right now and saw your profile at {{address}}.

You guys have {{reviewSummary}}, which is awesome, but I noticed your Google Maps button doesn't have a website attached to it. Usually that means a lot of local searchers who prefer to check services online before calling end up going to the next listing down.

We specialize in building simple, high-converting websites specifically for {{category}} businesses in {{city}} and connecting them directly to Google Maps.

If I built a free homepage preview tailored to {{businessName}}, where would be the best email or text number to send it so you can take a 30-second look?"`,
  },
  {
    id: 'weak-presence-email',
    name: 'Low Rating / Review Volume — Local SEO & Reputation Pitch',
    channel: 'email',
    targetTier: 'weak_presence',
    description:
      'Targets businesses that have a website or listing, but suffer from low review counts (<15) or <4.3★ rating.',
    subject: 'Helping {{businessName}} rank higher in {{city}} Google Maps',
    body: `Hi {{businessName}} team,

I was reviewing the top Google Maps search results for {{category}} in {{city}} and noticed {{businessName}} ({{websiteStatus}}).

Currently your listing sits at {{reviewSummary}}. In {{city}}, the top 3 businesses capturing the majority of inbound Maps calls average 4.7+ stars and 60+ reviews, along with optimized local landing pages.

We help {{category}} businesses automate 5-star review collection from existing happy customers and optimize their website + Google Business Profile to capture 2x–3x more local calls.

Could I send you a 3-point local search audit we ran for {{businessName}}?

Best,
[Your Name]
[Your Agency / Contact]`,
  },
  {
    id: 'sms-quick-outreach',
    name: 'SMS / WhatsApp — Instant Mockup Offer',
    channel: 'sms',
    targetTier: 'all',
    description:
      'Short, high-reply message for mobile numbers or contact forms.',
    body: `Hey {{businessName}} team! Found your {{category}} listing in {{city}} on Google Maps ({{auditHook}}). I mocked up a clean new lead-capture page concept specifically for your business. Mind if I text the link over for you to check out?`,
  },
];

/**
 * Interpolates a pitch template with real business data.
 */
export function interpolatePitch(
  template: PitchTemplate,
  lead: ExtractedBusinessLead
): { subject: string; body: string } {
  const reviewSummary =
    lead.reviewCount > 0 && lead.rating
      ? `${lead.rating.toFixed(1)}★ across ${lead.reviewCount} reviews`
      : lead.reviewCount > 0
      ? `${lead.reviewCount} customer reviews`
      : 'an active Google Maps profile';

  const websiteStatus = lead.websiteUri
    ? `linked to ${lead.domain || lead.websiteUri}`
    : 'currently missing a website link';

  const auditHook = !lead.websiteUri
    ? 'noticed there is no website linked to your profile'
    : `saw your ${reviewSummary} and website at ${lead.domain}`;

  const replaceTokens = (str: string) =>
    str
      .replace(/\{\{businessName\}\}/g, lead.name)
      .replace(/\{\{category\}\}/g, lead.category.toLowerCase())
      .replace(/\{\{city\}\}/g, lead.city)
      .replace(/\{\{address\}\}/g, lead.address)
      .replace(/\{\{phone\}\}/g, lead.phone || 'your listed phone')
      .replace(/\{\{reviewSummary\}\}/g, reviewSummary)
      .replace(/\{\{websiteStatus\}\}/g, websiteStatus)
      .replace(/\{\{auditHook\}\}/g, auditHook);

  return {
    subject: template.subject ? replaceTokens(template.subject) : '',
    body: replaceTokens(template.body),
  };
}

export const STAGE_METADATA: Record<
  OutreachStage,
  { label: string; colorClass: string }
> = {
  new: { label: 'New Lead', colorClass: 'text-blue-700 bg-blue-50 border-blue-200' },
  contacted: {
    label: 'Contacted',
    colorClass: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  follow_up: {
    label: 'Follow-Up',
    colorClass: 'text-purple-800 bg-purple-50 border-purple-200',
  },
  meeting: {
    label: 'Meeting Booked',
    colorClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  closed_won: {
    label: 'Closed Won',
    colorClass: 'text-emerald-900 bg-emerald-100 border-emerald-300',
  },
  archived: {
    label: 'Archived',
    colorClass: 'text-slate-600 bg-slate-100 border-slate-200',
  },
};

/**
 * Exports an array of leads or saved records to a formatted CSV file and triggers browser download.
 */
export function exportLeadsToCsv(
  leads: (ExtractedBusinessLead | SavedLeadRecord)[],
  filenamePrefix = 'maplead-scout-export'
): void {
  if (!leads.length) return;

  const headers = [
    'Business Name',
    'Category',
    'Website Status',
    'Website URL',
    'Domain',
    'Opportunity Score (0-100)',
    'Recommended Pitch Angle',
    'Phone Number',
    'Star Rating',
    'Review Count',
    'City',
    'Full Address',
    'Outreach Stage',
    'Campaign List',
    'Agency Notes',
    'Google Maps Link',
    'Audit Findings',
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = leads.map((lead) => {
    const isSaved = 'stage' in lead;
    const websiteStatusLabel =
      lead.leadTier === 'no_website'
        ? lead.websiteUri
          ? 'Social/Directory Only'
          : 'NO WEBSITE'
        : lead.leadTier === 'weak_presence'
        ? 'Has Website (SEO/Rating Need)'
        : 'Has Website';

    return [
      escapeCsv(lead.name),
      escapeCsv(lead.category),
      escapeCsv(websiteStatusLabel),
      escapeCsv(lead.websiteUri || ''),
      escapeCsv(lead.domain || ''),
      escapeCsv(lead.opportunityScore),
      escapeCsv(lead.recommendedAngle),
      escapeCsv(lead.phone || lead.internationalPhone || ''),
      escapeCsv(lead.rating !== null ? lead.rating.toFixed(1) : 'N/A'),
      escapeCsv(lead.reviewCount),
      escapeCsv(lead.city),
      escapeCsv(lead.address),
      escapeCsv(isSaved ? STAGE_METADATA[lead.stage]?.label || lead.stage : 'Unsaved'),
      escapeCsv(isSaved ? lead.campaignList : lead.searchQueryUsed),
      escapeCsv(isSaved ? lead.notes : ''),
      escapeCsv(lead.googleMapsUri || ''),
      escapeCsv(lead.scoreFactors.map((f) => `${f.label} (+${f.points})`).join('; ')),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}-${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
