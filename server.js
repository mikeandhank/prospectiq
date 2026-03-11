const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const ProspectSearcher = require('./src/search-service');

const searcher = new ProspectSearcher();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// SPENDING SAFEGUARDS & RATE LIMITING
// ============================================

// Daily usage tracking (in-memory - resets on restart)
// For production, use Redis or a database
const usage = {
  searchesToday: 0,
  apiCallsToday: 0,
  lastReset: new Date().toDateString(),
  dailySearchLimit: parseInt(process.env.DAILY_SEARCH_LIMIT) || 100,
  dailyApiCallLimit: parseInt(process.env.DAILY_API_CALL_LIMIT) || 500
};

// Reset counters at midnight
function checkAndResetUsage() {
  const today = new Date().toDateString();
  if (usage.lastReset !== today) {
    usage.searchesToday = 0;
    usage.apiCallsToday = 0;
    usage.lastReset = today;
    console.log('🔄 Usage counters reset for new day');
  }
}

// Check if user has exceeded limits
function checkLimits(res) {
  checkAndResetUsage();
  
  if (usage.searchesToday >= usage.dailySearchLimit) {
    return res.status(429).json({ 
      error: 'Daily search limit exceeded',
      limit: usage.dailySearchLimit,
      resetsAt: 'midnight local time'
    });
  }
  
  if (usage.apiCallsToday >= usage.dailyApiCallLimit) {
    return res.status(429).json({
      error: 'Daily API call limit exceeded',
      limit: usage.dailyApiCallLimit,
      resetsAt: 'midnight local time'
    });
  }
  
  return null;
}

// Get usage stats
app.get('/api/usage', (req, res) => {
  checkAndResetUsage();
  res.json({
    searchesToday: usage.searchesToday,
    apiCallsToday: usage.apiCallsToday,
    dailySearchLimit: usage.dailySearchLimit,
    dailyApiCallLimit: usage.dailyApiCallLimit,
    remainingSearches: usage.dailySearchLimit - usage.searchesToday,
    remainingApiCalls: usage.dailyApiCallLimit - usage.apiCallsToday,
    lastReset: usage.lastReset
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new Database(path.join(__dirname, 'prospectiq.db'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id TEXT,
    name TEXT,
    business_name TEXT,
    address TEXT,
    phone TEXT,
    website TEXT,
    email TEXT,
    rating REAL,
    review_count INTEGER,
    category TEXT,
    years_in_practice TEXT,
    npi_number TEXT,
    specialty TEXT,
    education TEXT,
    interests TEXT,
    causes TEXT,
    conversation_starters TEXT,
    recent_news TEXT,
    pain_points TEXT,
    opportunity_signals TEXT,
    sources TEXT,
    tcpa_status TEXT DEFAULT 'verified',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_id TEXT UNIQUE,
    category TEXT,
    location TEXT,
    search_radius INTEGER,
    result_limit INTEGER,
    prospect_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// In-memory search storage (for demo - would be Redis in production)
const searchCache = new Map();

// API Routes

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    // Check spending limits first
    const limitError = checkLimits(res);
    if (limitError) return limitError;
    
    const { category, location, radius, limit } = req.body;
    
    // Track usage
    checkAndResetUsage();
    usage.searchesToday++;
    usage.apiCallsToday += (limit || 10) + 3; // estimate: limit results + geocode + NPI calls
    
    // Generate search ID
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store search record
    const insertSearch = db.prepare(`
      INSERT INTO searches (search_id, category, location, search_radius, result_limit, prospect_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Use real search service
    const prospects = await searcher.search(category, location, radius, limit);
    
    // Store prospects
    const insertProspect = db.prepare(`
      INSERT INTO prospects (
        search_id, name, business_name, address, phone, website, email,
        rating, review_count, category, years_in_practice, npi_number,
        specialty, education, interests, causes, conversation_starters,
        recent_news, pain_points, opportunity_signals, sources, tcpa_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((prospects) => {
      for (const p of prospects) {
        insertProspect.run(
          searchId, p.name, p.business_name, p.address, p.phone, p.website, p.email,
          p.rating, p.review_count, p.category, p.years_in_practice, p.npi_number,
          p.specialty, p.education, p.interests, p.causes, p.conversation_starters,
          p.recent_news, p.pain_points, p.opportunity_signals, p.sources, p.tcpa_status
        );
      }
    });
    
    insertMany(prospects);
    insertSearch.run(searchId, category, location, radius, limit, prospects.length);
    
    res.json({
      search_id: searchId,
      category,
      location,
      radius,
      count: prospects.length,
      prospects
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// AI-powered search endpoint (uses OpenClaw web_search)
app.post('/api/search/ai', async (req, res) => {
  try {
    const { category, location, radius, limit } = req.body;
    
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate search term for web search
    const searchTerm = category === 'Auto Shop' 
      ? `auto repair mechanic shops in ${location} phone address`
      : `${category.toLowerCase()}s in ${location} directory phone address`;
    
    // Use the searcher's fallback to generate mock data
    // In production, this would call out to OpenClaw's web_search tool
    const prospects = searcher.generateEnhancedMock(category, location, limit);
    
    // Store prospects
    const insertProspect = db.prepare(`
      INSERT INTO prospects (
        search_id, name, business_name, address, phone, website, email,
        rating, review_count, category, years_in_practice, npi_number,
        specialty, education, interests, causes, conversation_starters,
        recent_news, pain_points, opportunity_signals, sources, tcpa_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((prospects) => {
      for (const p of prospects) {
        insertProspect.run(
          searchId, p.name, p.business_name, p.address, p.phone, p.website, p.email,
          p.rating, p.review_count, p.category, p.years_in_practice, p.npi_number,
          p.specialty, p.education, p.interests, p.causes, p.conversation_starters,
          p.recent_news, p.pain_points, p.opportunity_signals, p.sources, p.tcpa_status
        );
      }
    });
    
    insertMany(prospects);
    
    const insertSearch = db.prepare(`
      INSERT INTO searches (search_id, category, location, search_radius, result_limit, prospect_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertSearch.run(searchId, category, location, radius, limit, prospects.length);
    
    res.json({
      search_id: searchId,
      category,
      location,
      radius,
      count: prospects.length,
      prospects,
      note: 'Using AI-enhanced mock data. For production, integrate OpenClaw web_search.'
    });
  } catch (error) {
    console.error('AI Search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// Get prospects by search ID
app.get('/api/search/:searchId', (req, res) => {
  try {
    const { searchId } = req.params;
    const prospects = db.prepare('SELECT * FROM prospects WHERE search_id = ?').all(searchId);
    res.json({ prospects });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Get all searches
app.get('/api/searches', (req, res) => {
  try {
    const searches = db.prepare('SELECT * FROM searches ORDER BY created_at DESC LIMIT 10').all();
    res.json({ searches });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Export CSV
app.get('/api/export/:searchId', (req, res) => {
  try {
    const { searchId } = req.params;
    const prospects = db.prepare('SELECT * FROM prospects WHERE search_id = ?').all(searchId);
    
    if (prospects.length === 0) {
      return res.status(404).json({ error: 'No prospects found' });
    }
    
    // Generate CSV
    const headers = [
      'Name', 'Business', 'Address', 'Phone', 'Website', 'Email',
      'Rating', 'Reviews', 'Category', 'Years', 'NPI', 'Specialty',
      'Education', 'Interests', 'Causes', 'Conversation Starters',
      'Recent News', 'Pain Points', 'Opportunity Signals', 'Sources', 'TCPA Status'
    ];
    
    const rows = prospects.map(p => [
      p.name, p.business_name, p.address, p.phone, p.website, p.email,
      p.rating, p.review_count, p.category, p.years_in_practice, p.npi_number,
      p.specialty, p.education, p.interests, p.causes, p.conversation_starters,
      p.recent_news, p.pain_points, p.opportunity_signals, p.sources, p.tcpa_status
    ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="prospects_${searchId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed', message: error.message, stack: error.stack });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`ProspectIQ server running on http://localhost:${PORT}`);
});
