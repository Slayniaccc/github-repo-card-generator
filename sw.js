// Minimal service worker: caches the static app shell so the page loads offline / installs as a
// PWA. Deliberately does NOT touch api.github.com or githubusercontent.com responses — those are
// already handled by the in-memory, TTL'd cache in js/state.js, and caching them here would let
// stale profile data silently outlive that TTL.
const CACHE_NAME = 'repo-card-generator-v4';
const APP_SHELL = [
    './',
    './index.html',
    './css/variables.css',
    './css/base.css',
    './css/search.css',
    './css/profile.css',
    './css/compare.css',
    './css/analysis.css',
    './css/activity.css',
    './css/repos.css',
    './css/feedback.css',
    './css/animations.css',
    './css/responsive.css',
    './css/accessibility.css',
    './js/state.js',
    './js/events-main.js',
    './js/search.js',
    './js/recent-searches.js',
    './js/profile.js',
    './js/repos.js',
    './js/compare.js',
    './js/utils.js',
    './js/suggestions.js',
    './js/analysis.js',
    './js/activity.js',
    './js/export.js',
    './js/theme.js',
    './js/init.js',
    './manifest.json',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;
    if (url.hostname === 'api.github.com' || url.hostname.endsWith('githubusercontent.com')) return;

    // cache-first for same-origin app-shell files, falling back to network and refreshing the
    // cache in the background; anything not already cached just goes to the network
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const network = fetch(event.request)
                .then((response) => {
                    if (response.ok && url.origin === self.location.origin) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
