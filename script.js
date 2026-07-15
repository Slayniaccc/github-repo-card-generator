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