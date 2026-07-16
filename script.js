// Add this at the very top of script.js
const CONFIG = {
    GITHUB_API: 'https://api.github.com',
    MAX_REPOS: 5,
    CACHE_DURATION: 5 * 60 * 1000,
};
// Cache for API responses
const cache = new Map();
// DOM Elements
const elements = {
    form: document.getElementById('repoForm'),
    username: document.getElementById('username'),
    profile: document.getElementById('profile'),
    repos: document.getElementById('repos'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    searchBtn: document.getElementById('searchBtn'),
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
elements.form.addEventListener('submit', handleSubmit);

// Enter key support
elements.username.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        elements.form.dispatchEvent(new Event('submit'));
    }
});

// Keyboard shortcut: Ctrl+/ to focus search
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        elements.username.focus();
    }
});
async function handleSubmit(event) {
    event.preventDefault();
    const username = elements.username.value.trim();

    if (!username) {
        showError('Please enter a GitHub username');
        return;
    }

    await searchGitHub(username);
}

async function searchGitHub(username) { //takes validated username and fetches user data and repos from GitHub API, handles caching, and displays results or errors
    clearResults();
    showLoading(true);

    try {
        // Check cache first
        const cacheKey = `github_${username}`;
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                displayResults(cached.data);
                showLoading(false);
                return;
            }
        }

        // Fetch user and repos in parallel
        const [userData, reposData] = await Promise.all([
            fetchUser(username),
            fetchRepos(username),
        ]);

        const data = { user: userData, repos: reposData };
        
        // Cache the data
        cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
        });

        displayResults(data);
        showLoading(false);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Failed to fetch user data');
        showLoading(false);
    }
    async function fetchUser(username) {
    const url = `${CONFIG.GITHUB_API}/users/${username}`;
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`User "${username}" not found`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

async function fetchRepos(username) {
    const url = `${CONFIG.GITHUB_API}/users/${username}/repos?sort=updated&per_page=100`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch repositories`);
    }

    const repos = await response.json();
    return repos;
}
    
}