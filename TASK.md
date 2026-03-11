# ProspectIQ - Sales Intelligence Agent

## Project Overview

Build a full-stack web application that helps sales professionals identify, research, and build rapport with high-value prospects (physicians, dentists, auto shop owners).

## Core Features

### 1. Prospect Discovery
Search publicly listed business data from:
- Google Maps / Google Business Profile
- Yelp Business Directory
- Yellow Pages / Superpages
- Healthgrades, Zocdoc, Vitals (medical)
- State dental board registries
- NPI Registry (npiregistry.cms.hhs.gov)
- BBB, Chamber of Commerce

### 2. Rapport Intelligence
Enrich prospects with publicly available:
- LinkedIn profiles
- Social media (Twitter, Facebook, Instagram)
- Business reviews (Google, Yelp)
- News mentions
- Professional affiliations

### 3. TCPA Compliance
- Only use publicly listed data
- Label source for every field
- Flag uncertain numbers
- Include compliance disclaimer on exports

### 4. Output Format
Generate structured "Prospect Cards" with all enrichment data and conversation starters.

## Technical Requirements

### Stack
- **Backend:** Node.js with Express
- **Frontend:** Simple HTML/CSS/JS (keep it lightweight)
- **Database:** SQLite for caching results

### API Endpoints Needed
- `POST /api/search` - Run prospect search
- `GET /api/prospects/:id` - Get single prospect
- `GET /api/export/csv` - Export results as CSV

### Search Workflow
1. Directory sweep (Google Maps, Yelp, Yellow Pages)
2. NPI cross-reference (doctors/dentists only)
3. Rapport enrichment (LinkedIn, social, news)
4. Compile Prospect Cards

## Directory Structure

```
/data/.openclaw/workspace/prospectiq/
├── server.js           # Express backend
├── database.js         # SQLite setup
├── package.json        # Dependencies
├── public/
│   ├── index.html      # Main UI
│   ├── styles.css      # Styling
│   └── app.js          # Frontend logic
├── src/
│   ├── search/
│   │   ├── index.js    # Search orchestration
│   │   ├── directories.js  # Directory scraping
│   │   └── npi.js      # NPI registry lookup
│   ├── enrichment/
│   │   ├── linkedin.js
│   │   ├── social.js
│   │   └── news.js
│   └── utils/
│       ├── tcpa.js     # Compliance helpers
│       └── formatter.js # Prospect card formatting
└── SPEC.md             # Full specification
```

## UI Requirements

### Search Form
- Category dropdown (Doctor, Dentist, Auto Shop)
- Location input (City, State)
- Radius slider (5-50 miles)
- Results limit (10, 20, 50)

### Results Display
- Prospect Cards in grid/list view
- Click to expand full details
- Export to CSV button

### Prospect Card Fields
- Name, Business, Address, Phone, Website, Email
- Rating + review count
- Category, Years in practice
- Rapport Intel (Education, Interests, Causes)
- Conversation Starters
- Recent News, Pain Points, Opportunity Signals
- Compliance badge + Sources

## First Step

Create `SPEC.md` with full architectural details before writing any code. Confirm spec with Hank before proceeding to implementation.

## Notes
- Use web_search and web_fetch for data gathering (built into OpenClaw)
- Rate limit: 2 seconds between requests per domain
- Cache results for 30 days
- Keep it simple — MVP first, enhancements later