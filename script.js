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