// NEW: Recent Searches — remembers the last few successful lookups in localStorage so they're
// one click away next visit, most-recent first, deduped case-insensitively
const RECENT_SEARCHES_KEY = 'github-card-recent-searches';
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
    } catch {
        return [];
    }
}

function addRecentSearch(username) {
    const deduped = getRecentSearches().filter(u => u.toLowerCase() !== username.toLowerCase());
    deduped.unshift(username);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(deduped.slice(0, MAX_RECENT_SEARCHES)));
    renderRecentSearches();
}

function renderRecentSearches() {
    const recent = getRecentSearches();
    if (!recent.length) {
        elements.recentSearches.innerHTML = '';
        elements.recentSearches.classList.add('hidden');
        return;
    }

    elements.recentSearches.innerHTML = `
        <span class="recent-label">Recent:</span>
        ${recent.map(u => `<button type="button" class="recent-chip">${escapeHTML(u)}</button>`).join('')}
    `;
    elements.recentSearches.classList.remove('hidden');
    elements.recentSearches.querySelectorAll('.recent-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.username.value = btn.textContent;
            searchGitHub(btn.textContent);
        });
    });
}
