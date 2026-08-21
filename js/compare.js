// NEW: Compare Users — fetches two profiles + repo sets in parallel (reusing the same cache as
// the main search) and renders their key stats side by side
async function compareUsers(usernameA, usernameB) {
    elements.compareResults.innerHTML = '<p class="compare-status">Loading comparison…</p>';
    elements.compareResults.classList.remove('hidden');

    try {
        const [dataA, dataB] = await Promise.all([
            fetchProfileAndAnalysis(usernameA),
            fetchProfileAndAnalysis(usernameB),
        ]);
        renderComparison(dataA, dataB);
    } catch (error) {
        elements.compareResults.innerHTML = `<p class="compare-status">${escapeHTML(error.message || 'Failed to load comparison')}</p>`;
    }
}

// NEW: fetches a user + their repos (checking the same cache searchGitHub() uses first) and
// bundles the repo analysis alongside the profile
async function fetchProfileAndAnalysis(username) {
    const cacheKey = `github_${username}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        return { user: cached.data.user, analysis: analyzeRepos(cached.data.repos) };
    }

    const [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);
    cacheSet(cacheKey, { user, repos });
    return { user, analysis: analyzeRepos(repos) };
}

// NEW: renders two profiles side by side, highlighting whichever side has the higher value per stat
function renderComparison(a, b) {
    const rows = [
        ['Followers', a.user.followers, b.user.followers],
        ['Public repos', a.user.public_repos, b.user.public_repos],
        ['Total stars', a.analysis.totalStars, b.analysis.totalStars],
        ['Total forks', a.analysis.totalForks, b.analysis.totalForks],
    ];

    const renderProfile = (data) => `
        <div class="compare-profile">
            <img src="${data.user.avatar_url}" alt="${escapeHTML(data.user.login)}'s avatar" loading="lazy" />
            <h3>${escapeHTML(data.user.name || data.user.login)}</h3>
            <p class="compare-username">@${escapeHTML(data.user.login)}</p>
        </div>
    `;

    const rowsHTML = rows.map(([label, valueA, valueB]) => `
        <div class="compare-row">
            <span class="compare-value ${valueA > valueB ? 'compare-winner' : ''}">${formatNumber(valueA)}</span>
            <span class="compare-label">${label}</span>
            <span class="compare-value ${valueB > valueA ? 'compare-winner' : ''}">${formatNumber(valueB)}</span>
        </div>
    `).join('');

    elements.compareResults.innerHTML = `
        <div class="compare-header">
            ${renderProfile(a)}
            <span class="compare-vs-badge" aria-hidden="true">VS</span>
            ${renderProfile(b)}
        </div>
        <div class="compare-stats">${rowsHTML}</div>
    `;
}
