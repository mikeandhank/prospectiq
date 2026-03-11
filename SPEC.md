# ProspectIQ - Sales Intelligence Agent

## Project Overview
- **Name:** ProspectIQ
- **Type:** Full-stack web application
- **Purpose:** Help sales professionals find, research, and build rapport with physicians, dentists, and auto shop owners
- **Target Users:** Sales reps, business development teams

## Tech Stack
- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS
- **Database:** SQLite (for caching)
- **APIs:** web_search, web_fetch (OpenClaw tools)

## UI/UX Specification

### Color Palette
- **Primary:** #1a365d (deep navy blue)
- **Secondary:** #2d3748 (dark gray)
- **Accent:** #38a169 (green for success/compliance)
- **Warning:** #dd6b20 (orange for verify)
- **Background:** #f7fafc (light gray)
- **Card Background:** #ffffff (white)
- **Text Primary:** #1a202c
- **Text Secondary:** #718096

### Typography
- **Headings:** System sans-serif (Segoe UI, Roboto, etc.)
- **Body:** System sans-serif
- **Monospace:** For data fields

### Layout
- **Header:** Logo + title, minimal
- **Main:** Search form at top, results grid below
- **Responsive:** Single column mobile, 2-3 columns desktop

### Components

#### Search Form
- Category dropdown: Doctor, Dentist, Auto Shop
- Location input: City, State (e.g., "Nashville, TN")
- Radius: Slider 5-50 miles
- Limit: Dropdown (10, 20, 50)
- Search button: Primary style

#### Prospect Card
- Header: Name + Business + Rating badge
- Contact: Phone, Email, Website, Address
- Category tag
- Rapport section (collapsible)
- Compliance badge
- Export individual button

### Visual Style
- Clean, professional, data-focused
- Subtle shadows on cards
- Clear visual hierarchy
- Green checkmarks for TCPA compliance

## Functionality Specification

### Core Features

1. **Prospect Search**
   - Input: category, location, radius, limit
   - Process: Directory sweep → NPI lookup → Enrichment
   - Output: List of Prospect Cards

2. **Directory Search**
   - Google Maps / Yelp / Yellow Pages
   - Deduplicate by address + phone
   - Extract: name, address, phone, website, rating

3. **NPI Lookup** (doctors/dentists)
   - Query npiregistry.cms.hhs.gov API
   - Add: NPI number, specialty, credential

4. **Rapport Enrichment**
   - LinkedIn profile scraping (public)
   - Social media presence
   - Business reviews analysis
   - News mentions

5. **Prospect Card Generation**
   - Structured output with all fields
   - Conversation starters
   - Pain points from reviews
   - Opportunity signals

6. **CSV Export**
   - All prospects in spreadsheet format
   - Include compliance disclaimer

### API Endpoints

```
GET  /                 - Serve frontend
POST /api/search       - Run search
GET  /api/prospects    - List cached prospects
GET  /api/export       - Download CSV
```

### Data Flow
1. User submits search form
2. Backend calls directory APIs (web_search/web_fetch)
3. Results cached in SQLite
4. NPI cross-reference for medical
5. Enrichment calls for each prospect
6. Format into Prospect Cards
7. Return to frontend

### TCPA Compliance
- Only publicly listed data
- Source tracking for all fields
- "Verify Before Calling" flags
- Export disclaimer

## Acceptance Criteria

1. ✅ Search form submits and shows loading state
2. ✅ Results display as Prospect Cards
3. ✅ Each card shows: name, business, phone, website, rating, category
4. ✅ Rapport section expandable
5. ✅ TCPA compliance badge visible
6. ✅ CSV export works
7. ✅ Mobile responsive
8. ✅ No crashes on empty results
