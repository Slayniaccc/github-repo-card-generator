// Add this at the very top of script.js
const CONFIG = Object.freeze({
    GITHUB_API: 'https://api.github.com',
    MAX_REPOS: 5,
    CACHE_DURATION: 5 * 60 * 1000, // conserves API calls by reusing recent results for up to 5 mins, expires after 5 mins
     REPOS_PER_PAGE: 100,
    SUGGESTION_LIMIT: 5,
    ERROR_DISPLAY_MS: 5000,
    CACHE_MAX_ENTRIES: 20, // NEW: caps the response cache so a long session can't grow it unbounded
    MAX_REPO_PAGES: 3, // NEW: safety cap on pagination — 300 repos is enough for accurate analysis without unbounded API calls
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
    suggestions: document.getElementById('usernameSuggestions'),
    themeToggle: document.getElementById('themeToggle'), // NEW
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
// Event Listeners
elements.form.addEventListener('submit', handleSubmit); //references the handlesubmit function

elements.username.addEventListener('input', (event) => {
    clearTimeout(suggestTimer);
    const value = event.target.value.trim();
    suggestTimer = setTimeout(() => suggestUsers(value), 300);
});

// NEW: Ctrl+/ (Cmd+/ on Mac) focuses the search input — implements the shortcut the README already documented
window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        elements.username.focus();
    }
});


// NEW: mirrors GitHub's actual username rules (alphanumeric + single, non-leading/trailing hyphens, max 39 chars)
const GITHUB_USERNAME_PATTERN = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/;

async function handleSubmit(event) {
    event.preventDefault();
    const username = elements.username.value.trim();

    if (!username) {
        showError('Please enter a GitHub username');
        return;
    }

    // NEW: reject obviously-invalid usernames locally instead of spending an API call (and
    // rate-limit budget) on a request that could only ever come back 404
    if (!GITHUB_USERNAME_PATTERN.test(username)) {
        showError('That doesn\'t look like a valid GitHub username (letters, numbers, and single hyphens only)');
        return;
    }

    await searchGitHub(username);
}

let searchAbortController = null; // NEW: tracks the in-flight main search so a rapid re-submit can cancel it

async function searchGitHub(username) { //takes validated username and fetches user data and repos from GitHub API, handles caching, and displays results or errors
    clearResults();
    showLoading(true);

    // NEW: cancel any search still running from a previous submission — without this, submitting
    // a second username while the first is still loading could let the first response land last
    // and overwrite the second one's results.
    searchAbortController?.abort();
    const thisController = new AbortController();
    searchAbortController = thisController;

    try {
        // Check cache first
        const cacheKey = `github_${username}`;
        if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        displayResults(cached.data);
        return;
    }
    cache.delete(cacheKey);  // expired — drop it
}

        // Fetch user and repos in parallel
        const [userData, reposData] = await Promise.all([
            fetchUser(username, thisController.signal),
            fetchRepos(username, thisController.signal),
        ]);

        const data = { user: userData, repos: reposData };

        // Cache the data
        cacheSet(cacheKey, data); // NEW: routed through cacheSet() so the cache stays size-bounded

        displayResults(data);
    } catch (error) {
        if (error.name === 'AbortError') return; // NEW: superseded by a newer search — let it own the UI
        console.error('Error:', error);
        showError(error.message || 'Failed to fetch user data', () => searchGitHub(username)); // NEW: retry without retyping

     }finally{
        // NEW: only clear the loading state if this is still the active search — an aborted,
        // superseded search must not stomp on the spinner/button state of the one that replaced it
        if (searchAbortController === thisController) showLoading(false);
     }
    } // on error: log for debugging, show the user a message, stop the spinner

    async function fetchUser(username, signal) {
    const url = `${CONFIG.GITHUB_API}/users/${encodeURIComponent(username)}`;
    const response = await fetch(url, { signal });
    checkRateLimit(response); // NEW: surface rate-limit resets before falling through to generic error handling

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`User "${username}" not found`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
} //crafts the url,fetches it.If there is an error message,error messages are thrown.In case of success user data returned as JS object

// NEW: walks pages until GitHub returns a short page (fewer than REPOS_PER_PAGE) or MAX_REPO_PAGES
// is hit — previously only the first 100 repos were ever fetched, so totalStars/totalForks/top
// language in the analysis panel silently undercounted for any user with more than 100 repos.
async function fetchRepos(username, signal) {
    const repos = [];
    let page = 1;

    while (page <= CONFIG.MAX_REPO_PAGES) {
        const url = `${CONFIG.GITHUB_API}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${CONFIG.REPOS_PER_PAGE}&page=${page}`;
        const response = await fetch(url, { signal });
        checkRateLimit(response); // NEW

        if (!response.ok) {
            throw new Error(`Failed to fetch repositories`);
        }

        const pageRepos = await response.json();
        repos.push(...pageRepos);

        if (pageRepos.length < CONFIG.REPOS_PER_PAGE) break; // reached the last page
        page++;
    }

    return repos; //similar to previous function, however returns information on repositories.
}

// NEW: GitHub returns a normal 403 for rate-limiting; without this, users just saw "HTTP error! status: 403"
// with no indication of what happened or when they could try again.
function checkRateLimit(response) {
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
        const resetEpochSeconds = Number(response.headers.get('X-RateLimit-Reset'));
        const resetDate = new Date(resetEpochSeconds * 1000);
        const minutes = Math.max(1, Math.ceil((resetDate - Date.now()) / 60000));
        throw new Error(`GitHub API rate limit exceeded. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`);
    }
}
function displayResults(data) {
    lastData = data;
    const { user, repos } = data;
    displayProfile(user);
    displayRepos(repos);
    displayAnalysis(repos);
} //unpacks user and repos out of data,displays profile, repo info, and aggregate analysis

function displayProfile(user) {
    const profileHTML = `
        <img src="${user.avatar_url}" alt="${escapeHTML(user.login)}'s avatar" loading="lazy" />
        <h1>${escapeHTML(user.name || user.login)}</h1>
        <p class="bio">${escapeHTML(user.bio) || 'No bio available'}</p>
        <div class="stats">
            <div class="stat-item">
                <i class="fas fa-users" aria-hidden="true"></i>
                <span>${formatNumber(user.followers)}</span> followers
            </div>
            <div class="stat-item">
                <i class="fas fa-user-friends" aria-hidden="true"></i>
                <span>${formatNumber(user.following)}</span> following
            </div>
            <div class="stat-item">
                <i class="fas fa-code" aria-hidden="true"></i>
                <span>${formatNumber(user.public_repos)}</span> repos
            </div>
            ${user.location ? `
                <div class="stat-item">
                    <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                    ${escapeHTML(user.location)}
                </div>
            ` : ''}
            ${user.company ? `
                <div class="stat-item">
                    <i class="fas fa-building" aria-hidden="true"></i>
                   ${escapeHTML(user.company)}
                </div>
            ` : ''}
        </div>
        <div class="profile-actions">
            <a href="${user.html_url}" target="_blank" rel="noopener noreferrer" class="profile-link">
                <i class="fab fa-github" aria-hidden="true"></i> View GitHub Profile
            </a>
            <button type="button" id="exportBtn" class="action-btn action-btn--secondary">
                <i class="fas fa-download" aria-hidden="true"></i> Export JSON
            </button>
            <button type="button" id="shareBtn" class="action-btn">
                <i class="fas fa-share-alt" aria-hidden="true"></i> Share
            </button>
        </div>
    `;
//formatting of the whole profile
    elements.profile.innerHTML = profileHTML;
    elements.profile.style.display = 'block';
    elements.profile.querySelector('#exportBtn').addEventListener('click', () => exportData(lastData));
    elements.profile.querySelector('#shareBtn').addEventListener('click', () => shareResults(user.login));
} //builds a link to the github profile that opens in a new tab when clicked

function displayRepos(repos) {
    // Sort by stars and take top 5
    const sortedRepos = [...repos]
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, CONFIG.MAX_REPOS);

    if (sortedRepos.length === 0) {
        elements.repos.innerHTML = '<p>No repositories found</p>';
        return;
    }

    let reposHTML = '';
    sortedRepos.forEach((repo, index) => {
        const languageColor = repo.language ? languageColors[repo.language] || languageColors.default : languageColors.default;
        //similar to display profile, however is based on repository information
        reposHTML += `
            <div class="repo-card" style="animation-delay: ${index * 0.1}s">
                <h3>
                    <i class="fas fa-book" aria-hidden="true"></i>
                    ${escapeHTML(repo.name)}
                </h3>
                ${repo.description ? `<p class="description">${escapeHTML(repo.description)}</p>` : ''}
                <div class="repo-meta">
                    ${repo.language ? `
                        <span>
                            <span class="language-color" style="background-color: ${languageColor}"></span>
                         ${escapeHTML(repo.language)}
                        </span>
                    ` : ''}
                    ${repo.stargazers_count > 0 ? `
                        <span>
                            <i class="fas fa-star" aria-hidden="true" style="color: #f1e05a;"></i>
                            ${formatNumber(repo.stargazers_count)}
                        </span>
                    ` : ''}
                    ${repo.forks_count > 0 ? `
                        <span>
                            <i class="fas fa-code-branch" aria-hidden="true"></i>
                            ${formatNumber(repo.forks_count)}
                        </span>
                    ` : ''}
                    ${repo.updated_at ? `
                        <span>
                            <i class="fas fa-clock" aria-hidden="true"></i>
                            ${formatDate(repo.updated_at)}
                        </span>
                    ` : ''}
                </div>
                <a href="${repo.html_url}" rel="noopener noreferrer" target="_blank" class="repo-link">
                    View Repository <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                </a>
            </div>
        `;
    });

    elements.repos.innerHTML = reposHTML;
}
// Utility Functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}
// converts an ISO timestamp into relative text like "3 days ago"
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
        const w = Math.floor(diffDays / 7);
        return w === 1 ? '1 week ago' : `${w} weeks ago`;
    }
    if (diffDays < 365) {
        const m = Math.floor(diffDays / 30);
        return m === 1 ? '1 month ago' : `${m} months ago`;
    }
    const y = Math.floor(diffDays / 365);
    return y === 1 ? '1 year ago' : `${y} years ago`;
}
// toggles loading UI: spinner visibility, button disabled state, and button label
function showLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
    elements.searchBtn.disabled = show;
    elements.searchBtn.innerHTML = show ? 
        '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Searching...' : 
        '<i class="fas fa-arrow-right" aria-hidden="true"></i> Search';
}

//wipes the profile, hides error message,empties repo information
function clearResults() {
    elements.profile.innerHTML = '';
    elements.profile.style.display = 'none';
    elements.repos.innerHTML = '';
    elements.analysis.innerHTML = '';
    elements.analysis.classList.add('hidden');
    elements.error.classList.remove('show');
    clearTimeout(errorTimer);
}

// shows the error banner with a message, auto-hiding it after CONFIG.ERROR_DISPLAY_MS
// NEW: accepts an optional onRetry callback — when present, renders a Retry button and
// suppresses the auto-hide timer so the message doesn't vanish before the user can act on it
function showError(message, onRetry) {
    elements.error.innerHTML = `
        <span>${escapeHTML(message)}</span>
        ${onRetry ? '<button type="button" id="errorRetryBtn" class="action-btn action-btn--secondary">Retry</button>' : ''}
    `;
    elements.error.classList.remove('hidden');
    elements.error.classList.add('show');
    clearTimeout(errorTimer);

    if (onRetry) {
        elements.error.querySelector('#errorRetryBtn').addEventListener('click', onRetry);
    } else {
        errorTimer = setTimeout(() => {
            elements.error.classList.remove('show');
        }, CONFIG.ERROR_DISPLAY_MS);
    }
}
// AI Feature 1: Smart Search with Suggestions
let suggestAbortController = null; // NEW: tracks the in-flight suggestion request so it can be cancelled

async function suggestUsers(partialUsername) {
    if (partialUsername.length < 2) {
        elements.suggestions.innerHTML = '';
        return;
    }

    // NEW: cancel any request still in flight from a previous keystroke — without this, a slow
    // response for an earlier partial username could resolve after a newer one and overwrite it.
    suggestAbortController?.abort();
    suggestAbortController = new AbortController();

    try {
        const response = await fetch(
            `${CONFIG.GITHUB_API}/search/users?q=${encodeURIComponent(partialUsername)}&per_page=${CONFIG.SUGGESTION_LIMIT}`,
            { signal: suggestAbortController.signal }
        );
        if (!response.ok) return;
        const data = await response.json();
        elements.suggestions.innerHTML = data.items
            .map(user => `<option value="${escapeHTML(user.login)}"></option>`)
            .join('');
    } catch (error) {
        if (error.name === 'AbortError') return; // expected: a newer keystroke superseded this request
        console.error('Suggestion error:', error);
    }
}
// AI Feature 2: Repository Analysis
function analyzeRepos(repos) {
    const analysis = {
        totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0), //all star counts added
        totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0), //all fork counts added
        languages: {}, //lang tally
        mostPopular: [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count)[0], //single repo with most stars, sorted on a copy so the input order isn't mutated
    };

    repos.forEach(repo => {
        if (repo.language) {
            analysis.languages[repo.language] = (analysis.languages[repo.language] || 0) + 1;
        }
    });

    return analysis;
}

// renders aggregate stats (stars, forks, top language, top repo) computed by analyzeRepos
function displayAnalysis(repos) {
    if (!repos.length) {
        elements.analysis.innerHTML = '';
        elements.analysis.classList.add('hidden');
        return;
    }

    const analysis = analyzeRepos(repos);
    const topLanguage = Object.entries(analysis.languages).sort((a, b) => b[1] - a[1])[0];

    elements.analysis.innerHTML = `
        <h2>Repository Analysis</h2>
        <div class="stats">
            <div class="stat-item">
                <i class="fas fa-star" aria-hidden="true"></i>
                <span>${formatNumber(analysis.totalStars)}</span> total stars
            </div>
            <div class="stat-item">
                <i class="fas fa-code-branch" aria-hidden="true"></i>
                <span>${formatNumber(analysis.totalForks)}</span> total forks
            </div>
            ${topLanguage ? `
                <div class="stat-item">
                    <i class="fas fa-code" aria-hidden="true"></i>
                    <span>${escapeHTML(topLanguage[0])}</span> most used
                </div>
            ` : ''}
            ${analysis.mostPopular ? `
                <div class="stat-item">
                    <i class="fas fa-trophy" aria-hidden="true"></i>
                    <span>${escapeHTML(analysis.mostPopular.name)}</span> top repo
                </div>
            ` : ''}
        </div>
    `;
    elements.analysis.classList.remove('hidden');
}
// AI Feature 3: Export Results as JSON
function exportData(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' }); //file like object held in memory
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a');
    a.href = url;
    a.download = `github_${data.user.login}_data.json`;
    a.click();
    URL.revokeObjectURL(url); //frees blob from memory
}
//triggers a file download of fetched data


// AI Feature 4: Share Results
//checks if api exists, if yes, passes it an object
function shareResults(username) {
    if (navigator.share) {
        navigator.share({
            title: `GitHub Profile: ${username}`,
            text: `Check out ${username}'s GitHub profile!`,
            url: `https://github.com/${username}`,
        }).catch(() => {});
    } else {  //copies url to clipboard and alerts
        navigator.clipboard.writeText(`https://github.com/${username}`)
            .then(() => alert('Profile URL copied to clipboard!'))
            .catch(() => {}); //silencing errors
    }
}

// NEW: Theme Toggle — persists the visitor's choice in localStorage, defaulting to their OS preference
const THEME_STORAGE_KEY = 'github-card-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = elements.themeToggle?.querySelector('i');
    if (icon) icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    elements.themeToggle?.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
}

function initTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const preferred = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(preferred);
}

elements.themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
});

initTheme();

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 GitHub Repo Card Generator loaded!');
});