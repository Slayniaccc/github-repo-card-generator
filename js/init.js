// NEW: registers the service worker (sw.js) that caches the static app shell for offline use
// and installability — never called for unsupported browsers, and failure is non-fatal
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 GitHub Repo Card Generator loaded!');
    renderRecentSearches(); // NEW: shows any searches saved from a previous visit

    // NEW: deep-link support — a URL like ?user=torvalds reopens straight to that profile,
    // so shared/bookmarked links (see shareResults() and updateURL()) actually work
    const deepLinkUser = getUsernameFromURL();
    if (deepLinkUser && GITHUB_USERNAME_PATTERN.test(deepLinkUser)) {
        elements.username.value = deepLinkUser;
        searchGitHub(deepLinkUser);
    }
});
