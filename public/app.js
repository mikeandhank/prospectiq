// ProspectIQ Frontend Application

class ProspectIQ {
  constructor() {
    this.currentSearchId = null;
    this.init();
  }

  init() {
    // Get DOM elements
    this.searchForm = document.getElementById('searchForm');
    this.searchBtn = document.getElementById('searchBtn');
    this.resultsSection = document.getElementById('resultsSection');
    this.prospectsGrid = document.getElementById('prospectsGrid');
    this.resultsCount = document.getElementById('resultsCount');
    this.exportBtn = document.getElementById('exportBtn');
    this.loadingState = document.getElementById('loadingState');
    this.emptyState = document.getElementById('emptyState');
    this.radiusInput = document.getElementById('radius');
    this.radiusValue = document.getElementById('radiusValue');

    // Bind events
    this.bindEvents();
  }

  bindEvents() {
    // Search form submission
    this.searchForm.addEventListener('submit', (e) => this.handleSearch(e));

    // Radius slider
    this.radiusInput.addEventListener('input', (e) => {
      this.radiusValue.textContent = e.target.value;
    });

    // Export button
    this.exportBtn.addEventListener('click', () => this.handleExport());
  }

  async handleSearch(e) {
    e.preventDefault();

    const category = document.getElementById('category').value;
    const location = document.getElementById('location').value;
    const radius = parseInt(this.radiusInput.value);
    const limit = parseInt(document.getElementById('limit').value);

    if (!category || !location) {
      alert('Please select a category and enter a location');
      return;
    }

    // Show loading state
    this.setLoading(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, location, radius, limit })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      this.currentSearchId = data.search_id;
      this.displayResults(data.prospects, data.count);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      this.setLoading(false);
    }
  }

  displayResults(prospects, count) {
    // Clear previous results
    this.prospectsGrid.innerHTML = '';

    // Update count
    this.resultsCount.textContent = `${count} prospects found`;

    // Hide empty state, show results
    this.emptyState.classList.add('hidden');
    this.resultsSection.classList.remove('hidden');

    // Render prospect cards
    prospects.forEach(prospect => {
      const card = this.createProspectCard(prospect);
      this.prospectsGrid.appendChild(card);
    });
  }

  createProspectCard(prospect) {
    const template = document.getElementById('prospectCardTemplate');
    const clone = template.content.cloneNode(true);

    // Fill in basic info
    clone.querySelector('.p-name').textContent = prospect.name;
    clone.querySelector('.p-category').textContent = prospect.category;
    clone.querySelector('.p-category').setAttribute('data-category', prospect.category);
    clone.querySelector('.p-business').textContent = prospect.business_name;
    clone.querySelector('.p-address').textContent = prospect.address;

    // Rating
    const stars = clone.querySelector('.stars');
    stars.textContent = '★'.repeat(Math.floor(prospect.rating)) + '☆'.repeat(5 - Math.floor(prospect.rating));
    clone.querySelector('.reviews').textContent = `(${prospect.review_count} reviews)`;

    // Contact info
    const phoneLink = clone.querySelector('.p-phone');
    phoneLink.textContent = prospect.phone;
    phoneLink.href = `tel:${prospect.phone}`;

    const websiteLink = clone.querySelector('.p-website');
    websiteLink.textContent = prospect.website || 'No website';
    websiteLink.href = prospect.website || '#';

    const emailSpan = clone.querySelector('.p-email');
    emailSpan.textContent = prospect.email || 'No email';

    // Rapport intel
    clone.querySelector('.p-education').textContent = prospect.education || 'Not found';
    clone.querySelector('.p-interests').textContent = prospect.interests || 'Not found';
    clone.querySelector('.p-causes').textContent = prospect.causes || 'Not found';
    clone.querySelector('.p-starters').textContent = prospect.conversation_starters || 'None available';
    clone.querySelector('.p-pain-points').textContent = prospect.pain_points || 'Not identified';
    clone.querySelector('.p-opportunity').textContent = prospect.opportunity_signals || 'None identified';

    // Sources
    clone.querySelector('.p-sources').textContent = prospect.sources || 'Unknown';

    // Rapport toggle
    const toggleBtn = clone.querySelector('.rapport-toggle');
    const rapportContent = clone.querySelector('.rapport-content');
    toggleBtn.addEventListener('click', () => {
      rapportContent.classList.toggle('hidden');
      toggleBtn.textContent = rapportContent.classList.contains('hidden')
        ? 'View Rapport Intel ▼'
        : 'Hide Rapport Intel ▲';
    });

    return clone;
  }

  async handleExport() {
    if (!this.currentSearchId) {
      alert('No search results to export');
      return;
    }

    try {
      const response = await fetch(`/api/export/${this.currentSearchId}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prospects_${this.currentSearchId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  }

  setLoading(loading) {
    if (loading) {
      this.searchBtn.disabled = true;
      this.searchBtn.querySelector('.btn-text').classList.add('hidden');
      this.searchBtn.querySelector('.btn-loading').classList.remove('hidden');
      this.loadingState.classList.remove('hidden');
      this.resultsSection.classList.add('hidden');
      this.emptyState.classList.add('hidden');
    } else {
      this.searchBtn.disabled = false;
      this.searchBtn.querySelector('.btn-text').classList.remove('hidden');
      this.searchBtn.querySelector('.btn-loading').classList.add('hidden');
      this.loadingState.classList.add('hidden');
    }
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.prospectIQ = new ProspectIQ();
});
