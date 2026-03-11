const express = require('express');
const cors = require('cors');
const path = require('path');
const ProspectSearcher = require('./src/search-service');

const searcher = new ProspectSearcher();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// SPENDING SAFEGUARDS & RATE LIMITING
// ============================================

const usage = {
  searchesToday: 0,
  apiCallsToday: 0,
  lastReset: new Date().toDateString(),
  dailySearchLimit: parseInt(process.env.DAILY_SEARCH_LIMIT) || 100,
  dailyApiCallLimit: parseInt(process.env.DAILY_API_CALL_LIMIT) || 500
};

function checkAndResetUsage() {
  const today = new Date().toDateString();
  if (usage.lastReset !== today) {
    usage.searchesToday = 0;
    usage.apiCallsToday = 0;
    usage.lastReset = today;
    console.log('🔄 Usage counters reset for new day');
  }
}

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

// In-memory storage (resets on restart - for production use Redis/Postgres)
const searchCache = new Map();

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const limitError = checkLimits(res);
    if (limitError) return limitError;
    
    const { category, location, radius, limit } = req.body;
    
    checkAndResetUsage();
    usage.searchesToday++;
    usage.apiCallsToday += (limit || 10) + 3;
    
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const prospects = await searcher.search(category, location, radius, limit);
    
    // Store in memory (not persistent - for production add Redis)
    searchCache.set(searchId, { prospects, category, location, createdAt: new Date() });
    
    // Cleanup old entries (keep last 100)
    if (searchCache.size > 100) {
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    
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

// Get prospects by search ID
app.get('/api/search/:searchId', (req, res) => {
  const { searchId } = req.params;
  const data = searchCache.get(searchId);
  
  if (!data) {
    return res.status(404).json({ error: 'Search not found' });
  }
  
  res.json({ prospects: data.prospects });
});

// Get all recent searches
app.get('/api/searches', (req, res) => {
  const searches = Array.from(searchCache.entries()).map(([id, data]) => ({
    search_id: id,
    category: data.category,
    location: data.location,
    prospect_count: data.prospects.length,
    created_at: data.createdAt
  }));
  
  res.json({ searches: searches.slice(-10).reverse() });
});

// Export CSV
app.get('/api/export/:searchId', (req, res) => {
  try {
    const { searchId } = req.params;
    const data = searchCache.get(searchId);
    
    if (!data || data.prospects.length === 0) {
      return res.status(404).json({ error: 'No prospects found' });
    }
    
    const prospects = data.prospects;
    
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
    res.status(500).json({ error: 'Export failed', message: error.message });
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
