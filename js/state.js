const CONFIG = Object.freeze({
    GITHUB_API: 'https://api.github.com',
    MAX_REPOS: 5,
    CACHE_DURATION: 5 * 60 * 1000, // conserves API calls by reusing recent results for up to 5 mins, expires after 5 mins
     REPOS_PER_PAGE: 100,
    SUGGESTION_LIMIT: 5,
    ERROR_DISPLAY_MS: 5000,
    CACHE_MAX_ENTRIES: 20, // NEW: caps the response cache so a long session can't grow it unbounded
    MAX_REPO_PAGES: 3, // NEW: safety cap on pagination — 300 repos is enough for accurate analysis without unbounded API calls
    ACTIVITY_LIMIT: 10, // NEW: public events shown in the recent-activity feed; fetched as a single page (no pagination) to keep this a one-request feature
}); //holds tunable constants
// Cache for API responses
const cache = new Map(); //right structure for a key / value cache, no inherited prototype keys

// NEW: Maps preserve insertion order, so the oldest entry is always cache.keys().next().value —
// evict it before inserting once the cache is full (simple FIFO, no extra bookkeeping needed)
function cacheSet(key, data) {
    if (cache.size >= CONFIG.CACHE_MAX_ENTRIES && !cache.has(key)) {
        cache.delete(cache.keys().next().value);
    }
    cache.set(key, { data, timestamp: Date.now() });
}
let lastData = null; // most recently displayed { user, repos }, used by export/share
let errorTimer = null;
let suggestTimer = null;
function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
} //prevents <script> style code from being run in the browser
const elements = {
    form: document.getElementById('repoForm'),
    username: document.getElementById('username'),
    profile: document.getElementById('profile'),
    repos: document.getElementById('repos'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    searchBtn: document.getElementById('searchBtn'),
    analysis: document.getElementById('analysis'),
    activity: document.getElementById('activity'), // NEW
    suggestions: document.getElementById('usernameSuggestions'),
    themeToggle: document.getElementById('themeToggle'), // NEW
    recentSearches: document.getElementById('recentSearches'), // NEW
    repoControls: document.getElementById('repoControls'), // NEW
    languageFilter: document.getElementById('languageFilter'), // NEW
    repoSort: document.getElementById('repoSort'), // NEW
    repoShowMore: document.getElementById('repoShowMore'), // NEW
    compareToggleBtn: document.getElementById('compareToggleBtn'), // NEW
    compareForm: document.getElementById('compareForm'), // NEW
    compareUsernameA: document.getElementById('compareUsernameA'), // NEW
    compareUsernameB: document.getElementById('compareUsernameB'), // NEW
    compareResults: document.getElementById('compareResults'), // NEW
};
// Language colors mapping
const languageColors = {
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Java: '#b07219',
    TypeScript: '#3178c6',
    HTML: '#e34c26',
    CSS: '#563d7c',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Go: '#00ADD8',
    Rust: '#dea584',
    PHP: '#4F5D95',
    Ruby: '#701516',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    Vue: '#41b883',
    React: '#61dafb',
    Angular: '#dd0031',
    default: '#8b949e',
};
