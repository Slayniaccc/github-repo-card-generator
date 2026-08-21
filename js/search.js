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
    updateURL(user.login); // NEW: keeps the address bar in sync so the current profile is bookmarkable/shareable
    addRecentSearch(user.login); // NEW
} //unpacks user and repos out of data,displays profile, repo info, and aggregate analysis
