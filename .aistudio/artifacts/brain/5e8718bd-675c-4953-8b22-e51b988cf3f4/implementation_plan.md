# MapLead Scout — Local Business Lead Extraction & Website Audit Workspace

MapLead Scout is a B2B lead discovery and outreach workspace designed for marketing agencies, web design studios, and local SEO consultants. It combines live Google Maps spatial search with automated website presence auditing (`websiteURI`, rating, review volume, phone, and operational status) to pinpoint high-value local businesses that lack a website or need digital marketing upgrades.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Product Scope & Visual Direction**
> All preferences selected in our clarification step have been locked into this plan:

- **Target Lead Highlighting**: Prioritizes and surfaces both **businesses with no website listed** (Tier 1 Web Design & Setup leads) and **businesses with low ratings or weak digital presence** (Tier 2 Reputation & SEO Upgrade leads), with instant segmented filtering.
- **Full Agency Workflow Suite**:
  1. **Opportunity Scoring Engine**: Algorithmic 0–100 lead score based on missing website status, rating gaps, review count volume, and phone availability.
  2. **Cold Call & Email Pitch Script Generator**: Dynamic, personalized outreach scripts tailored to each business's exact gaps (e.g., *"Noticed [Business Name] has 48 reviews on Google Maps in [City] but no website link attached..."*).
  3. **Outreach CRM Pipeline & Notes**: Saved lead lists with stage tracking (`New Lead` → `Contacted` → `Follow-Up` → `Meeting Booked` → `Closed Won`) and persistent per-lead notes.
  4. **One-Click CSV Export**: Instant export of filtered search results or saved campaign lists with full contact metadata and custom notes for external dialers or email tools.
- **Visual Theme**: **Clean Light Agency Dashboard** — Crisp alabaster and pure white surfaces, structural 1px slate hairlines, high-density tabular data grids, and high-intent cobalt and emerald/amber semantic opportunity indicators.

---

## 1. Overview & Core Concept

- **What It Does**: Users search any business category (e.g., *"Roofing contractors"*, *"Family dentists"*, *"Auto repair"*, *"Landscaping"*) across any target location or current map viewport. The app queries the **Google Maps Places API (New)** to extract business profiles, automatically audits whether a `websiteURI` exists, computes an **Opportunity Score**, plots color-coded interactive pins on the map, and populates a high-density lead extraction table.
- **Target Audience / Persona**: Digital marketing agency owners, freelance web developers, local SEO specialists, and B2B sales prospectors looking for qualified local business leads.
- **Key Value**: Eliminates hours of manual Google Maps clicking and copy-pasting by extracting up to 20 businesses per search area at once, immediately isolating businesses without websites or with reputation gaps, and generating ready-to-send pitch scripts.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Spatial Lead Discovery & Extraction**:
   - The user enters a niche keyword (or clicks quick-select industry presets like *Plumbers*, *Dentists*, *Restaurants*, *Roofers*, *Med Spas*) and selects a target city/neighborhood via Google Places Autocomplete or centers the interactive map and clicks **"Search This Map Area"**.
   - As results load from the Places API (New), each business is inspected for `websiteURI`, `nationalPhoneNumber`, `rating`, `userRatingCount`, `businessStatus`, and `regularOpeningHours`.
2. **Website Audit & Opportunity Filtering**:
   - A segmented filter bar above the results lets the user slice leads by:
     - **All Extracted**
     - **No Website (High Priority)** — Businesses missing a `websiteURI` entirely.
     - **Low Rating / SEO Need** — Businesses with a website (or without) that have `< 4.2` rating or `< 15` reviews.
     - **Has Website** — Established businesses for broader marketing pitches.
   - Map markers dynamically reflect lead priority: Crimson/Amber high-opportunity pins for businesses missing websites, and Slate/Cobalt pins for businesses with existing websites.
3. **Lead Inspection & Pitch Script Drawer**:
   - Clicking any row in the extraction grid or pin on the map opens the **Lead Intelligence & Pitch Drawer** on the right.
   - Displays full extracted business details, an itemized **Opportunity Breakdown** (e.g., *"+45 pts: Missing Website URI"*, *"+20 pts: Active Phone Listed"*, *"+15 pts: 35+ Customer Reviews proving active business"*), and interactive **Cold Email / Cold Call / SMS Pitch Templates** pre-filled with the business's real name, city, rating, and review count—ready to copy with one click.
4. **Pipeline Management & CSV Export**:
   - Users can save individual leads or bulk-save all "No Website" leads into their **Saved Leads Pipeline** view.
   - Inside the Pipeline view, users update outreach stages, type call/meeting notes, filter by campaign tag, or click **"Export CSV"** to download a clean spreadsheet.

### Visual Identity & Theme

- **Aesthetic Direction**: Utilitarian, precision B2B SaaS workspace inspired by modern revenue intelligence tools.
- **Color Palette & Mood**:
  - **Dominant Canvas (60%)**: Crisp White (`#FFFFFF`) primary workspace tables and panels over a Cool Alabaster (`#F8FAFC`) structural canvas.
  - **Structural Surfaces (30%)**: Slate hairline borders (`#E2E8F0`), muted slate secondary typography (`#64748B`), and deep ink headings (`#0F172A`).
  - **Accent & Semantic Budget (10%)**:
    - Primary Action Cobalt (`#2563EB`) for search execution, active view tabs, and primary CTAs.
    - Missing Website / Hot Lead Alert (`#DC2626` / `#EA580C` text & subtle indicator) to immediately spotlight businesses with no website.
    - Reputation / SEO Opportunity Amber (`#D97706`) for low-rated or low-review businesses.
    - Verified Website Emerald (`#16A34A`) for businesses with an active web presence.
- **Typography & Hierarchy**:
  - **Display & UI Headers**: `Plus Jakarta Sans` (SemiBold/Bold 600–700) for crisp structural headings and workspace navigation.
  - **Body & Table Scannability**: `DM Sans` (Regular 400, Medium 500) at 13px–15px for dense business names, addresses, and pitch scripts.
  - **Data & Opportunity Metrics**: `JetBrains Mono` with `tabular-nums` for opportunity scores, review counts, star ratings, phone numbers, and extraction counts.
- **Component Styling & Layout**:
  - **Top Bar Contract**: Single-row header with three zones separated by `gap-8`: Brand wordmark (`MapLead Scout`) on the left, workspace navigation links (`Lead Extractor`, `Saved Pipeline`, `Pitch Templates`) in the center, and primary `"Export CSV"` action on the right.
  - **Split-Screen Spatial Workbench**: Desktop 1440px full-viewport layout featuring an interactive Google Map canvas alongside a high-density tabular data grid (`36px–44px` compact rows) and slide-over Lead Inspector drawer.
  - **Zero-Pill Metadata Discipline**: Business categories, review counts, and addresses use clean unboxed text with `·` separators rather than cluttered pill badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Google Maps Places API (New) `searchByText` & Field Masking**
  - *Chosen Approach*: Use the modern `google.maps.places.Place.searchByText` SDK method (via `@vis.gl/react-google-maps` and `useMapsLibrary('places')`) with explicit field masks (`id`, `displayName`, `formattedAddress`, `location`, `websiteURI`, `nationalPhoneNumber`, `rating`, `userRatingCount`, `businessStatus`, `primaryTypeDisplayName`, `googleMapsURI`).
  - *Why*: Avoids CORS blocks (CF1) and deprecated `PlacesService` failures while retrieving `websiteURI` and `nationalPhoneNumber` directly in a single batch call for up to 20 businesses per search query.
  - *Alternatives Considered*: Legacy `PlacesService.textSearch` (deprecated/disabled on new projects and required N+1 `getDetails` calls to check websites).
- **Decision 2: Transparent Rule-Based Opportunity Scoring**
  - *Chosen Approach*: Calculate a deterministic 0–100 **Lead Opportunity Score** in real time based on extracted Google Maps attributes:
    - **No Website Listed (`!websiteURI`)**: +50 points (Primary Web Design Lead).
    - **Has Active Phone (`nationalPhoneNumber`)**: +20 points (Directly reachable via cold call).
    - **Established Foot Traffic (`userRatingCount >= 10`)**: +15 points (Active business with revenue, not a ghost listing).
    - **Rating / SEO Gap (`rating < 4.3` or `userRatingCount < 15`)**: +15 points (Reputation management / local SEO angle).
  - *Why*: Gives the user an immediate, honest, mathematically grounded ranking of which business to call first without hallucinated metrics.
- **Decision 3: LocalStorage Persistence with Instant CSV Export**
  - *Chosen Approach*: Persist saved leads, pipeline stage statuses, custom tags, and call notes in `localStorage` with instant JSON/CSV export.
  - *Why*: Ensures zero-latency pipeline updates during rapid prospecting sessions and preserves the user's lead lists across browser refreshes without requiring external database setup.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              Top Bar Header                                │
│  [MapLead Scout]        [Lead Extractor · Saved Pipeline · Pitch Library]  │
│                                                             [Export CSV]   │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        ▼                                                           ▼
┌───────────────────────────────────────┐   ┌────────────────────────────────┐
│       Lead Extractor Workbench        │   │    Saved Leads CRM Pipeline    │
│ ┌───────────────────────────────────┐ │   │ ┌────────────────────────────┐ │
│ │ Search Bar: Niche + Location      │ │   │ │ Stage Filter & Bulk Export │ │
│ │ Quick Presets + Opportunity Tabs  │ │   │ └──────────────┬─────────────┘ │
│ └─────────────────┬─────────────────┘ │   │                ▼               │
│                   │                   │   │ ┌────────────────────────────┐ │
│       ┌───────────┴───────────┐       │   │ │ Pipeline Table:            │ │
│       ▼                       ▼       │   │ │ Status Dropdown, Notes,    │ │
│ ┌─────────────────┐ ┌───────────────┐ │   │ │ Follow-up Date, Pitch Copy │ │
│ │ Interactive Map │ │ High-Density  │ │   │ └────────────────────────────┘ │
│ │ (@vis.gl/react- │ │ Lead Table    │ │   └────────────────────────────────┘
│ │  google-maps)   │ │ (Website URI  │
│ │ AdvancedMarkers │ │  Audit, Score,│     ┌────────────────────────────────┐
│ │ + Search Area   │ │  Phone, Save) │────▶│ Lead Intelligence & Pitch Pane │
│ └─────────────────┘ └───────────────┘ │   │ • Audit Breakdown              │
└───────────────────────────────────────┘   │ • Dynamic Email/Call Scripts   │
                                            │ • Direct Note & Stage Editor   │
                                            └────────────────────────────────┘
```

### Data Model & State

- **`ExtractedBusinessLead`**:
  - `id`: Google Place ID (`string`)
  - `name`: Business display name (`string`)
  - `category`: Primary business type display name (`string`)
  - `address`: Formatted address (`string`)
  - `location`: `{ lat: number, lng: number }`
  - `websiteUri`: `string | null` (Core audit field)
  - `domain`: Extracted clean hostname or `null`
  - `phone`: `string | null`
  - `rating`: `number | null`
  - `reviewCount`: `number`
  - `businessStatus`: `string`
  - `googleMapsUri`: `string`
  - `leadTier`: `'no_website' | 'weak_presence' | 'established'`
  - `opportunityScore`: `number` (0–100)
  - `scoreReasons`: `string[]` (Explainable audit factors)
- **`SavedLeadRecord`** (extends `ExtractedBusinessLead`):
  - `savedAt`: ISO timestamp
  - `stage`: `'new' | 'contacted' | 'follow_up' | 'meeting' | 'closed_won' | 'archived'`
  - `notes`: `string`
  - `campaignList`: `string` (e.g., *"Austin Roofers"*, *"Miami Dentists"*)

### Interactive Component & State Mapping

- **Search & Viewport Extraction Controller**:
  - Combines the business category query with either the selected Place Autocomplete location or the current `<Map>` center/bounds using `Place.searchByText({ textQuery, locationBias, fields })`.
  - Includes a **"Search Current Map Area"** button whenever the user pans/zooms the map to extract leads from adjacent neighborhoods.
- **Segmented Opportunity Filter Bar**:
  - Filters the extracted list and map pins in real time between *All Leads*, *No Website Only*, *Low Rating / SEO Need*, and *Has Phone Number*, plus sorting by *Opportunity Score*, *Review Count*, or *Rating*.
- **Pitch Script Customizer**:
  - Dynamically interpolates `{businessName}`, `{category}`, `{city}`, `{rating}`, `{reviewCount}`, and `{auditFinding}` into 3 selectable outreach templates (*Web Design Cold Email*, *Local SEO & Reputation Email*, and *Direct Phone Cold Call Opener*) with live editing and one-click clipboard copy.
