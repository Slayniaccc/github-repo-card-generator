// Event Listeners
// NEW: wrapped in a closure (rather than passed directly) so this registration doesn't require
// handleSubmit to already be defined — it's only resolved when the form is actually submitted
elements.form.addEventListener('submit', (event) => handleSubmit(event));

elements.username.addEventListener('input', (event) => {
    clearTimeout(suggestTimer);
    const value = event.target.value.trim();
    suggestTimer = setTimeout(() => suggestUsers(value), 300);
});

// NEW: Shareable/bookmarkable URLs — a copied link like ?user=torvalds reopens the same profile
function getUsernameFromURL() {
    return new URLSearchParams(window.location.search).get('user');
}

function updateURL(username) {
    const url = new URL(window.location.href);
    url.searchParams.set('user', username);
    history.replaceState(null, '', url); // replaceState avoids spamming browser history on every search
}

// NEW: Ctrl+/ (Cmd+/ on Mac) focuses the search input — implements the shortcut the README already documented
window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        elements.username.focus();
    }
});

// NEW: language filter / sort controls re-render the already-fetched repo list — no new API call needed
elements.languageFilter.addEventListener('change', (event) => {
    repoFilter.language = event.target.value;
    repoDisplayCount = CONFIG.MAX_REPOS; // NEW: start a changed filter back at the top, not mid-scroll
    renderRepoList();
});

elements.repoSort.addEventListener('change', (event) => {
    repoFilter.sort = event.target.value;
    repoDisplayCount = CONFIG.MAX_REPOS; // NEW
    renderRepoList();
});

// NEW: Compare Users — reveals a second search form and renders a side-by-side stat comparison,
// entirely independent of the main single-profile search above
elements.compareToggleBtn.addEventListener('click', () => {
    elements.compareForm.classList.toggle('hidden');
    if (!elements.compareForm.classList.contains('hidden')) elements.compareUsernameA.focus();
});

elements.compareForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const usernameA = elements.compareUsernameA.value.trim();
    const usernameB = elements.compareUsernameB.value.trim();

    if (!usernameA || !usernameB) {
        showError('Enter two usernames to compare');
        return;
    }
    if (!GITHUB_USERNAME_PATTERN.test(usernameA) || !GITHUB_USERNAME_PATTERN.test(usernameB)) {
        showError('One of those doesn\'t look like a valid GitHub username');
        return;
    }

    compareUsers(usernameA, usernameB);
});
