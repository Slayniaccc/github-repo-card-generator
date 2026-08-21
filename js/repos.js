// NEW: full fetched repo list — kept separate from what's rendered so the filter/sort controls
// below can operate on everything, not just the top 5 by stars
let currentRepos = [];
let repoFilter = { language: 'all', sort: 'stars' };
let repoDisplayCount = CONFIG.MAX_REPOS; // NEW: how many of the filtered/sorted repos are currently shown

const REPO_SORTERS = {
    stars: (a, b) => b.stargazers_count - a.stargazers_count,
    forks: (a, b) => b.forks_count - a.forks_count,
    updated: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
};

function displayRepos(repos) {
    currentRepos = repos;
    repoFilter.language = 'all'; // NEW: reset the language filter for each newly-searched user (sort preference is kept)
    repoDisplayCount = CONFIG.MAX_REPOS; // NEW: reset "Show more" progress for the new result set
    populateLanguageFilter(repos);
    renderRepoList();
}

// NEW: builds the language dropdown from whatever languages this user's repos actually use
function populateLanguageFilter(repos) {
    const languages = [...new Set(repos.map(r => r.language).filter(Boolean))].sort();

    if (!languages.length) {
        elements.repoControls.classList.add('hidden');
        return;
    }

    elements.languageFilter.innerHTML = [
        '<option value="all">All languages</option>',
        ...languages.map(lang => `<option value="${escapeHTML(lang)}">${escapeHTML(lang)}</option>`),
    ].join('');
    elements.languageFilter.value = repoFilter.language;
    elements.repoControls.classList.remove('hidden');
}

// NEW: applies the active language filter + sort to the full repo list, then renders up to
// repoDisplayCount of what remains — "Show more" advances that count instead of it being a hard cap
function renderRepoList() {
    const filtered = repoFilter.language === 'all'
        ? currentRepos
        : currentRepos.filter(repo => repo.language === repoFilter.language);

    const sortedFiltered = [...filtered].sort(REPO_SORTERS[repoFilter.sort]);
    const sortedRepos = sortedFiltered.slice(0, repoDisplayCount);

    if (sortedRepos.length === 0) {
        elements.repos.innerHTML = repoFilter.language === 'all'
            ? '<p>No repositories found</p>'
            : `<p>No ${escapeHTML(repoFilter.language)} repositories found</p>`;
        elements.repoShowMore.classList.add('hidden'); // NEW
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
    renderShowMoreControl(sortedFiltered.length); // NEW
}

// NEW: "Show more" reveals additional repos CONFIG.MAX_REPOS at a time from the already
// filtered/sorted set — replaces the old hard cap of always showing just the top 5
function renderShowMoreControl(totalMatching) {
    if (repoDisplayCount >= totalMatching) {
        elements.repoShowMore.innerHTML = '';
        elements.repoShowMore.classList.add('hidden');
        return;
    }

    const remaining = totalMatching - repoDisplayCount;
    elements.repoShowMore.innerHTML = `
        <button type="button" id="showMoreBtn" class="action-btn action-btn--secondary">
            Show ${Math.min(CONFIG.MAX_REPOS, remaining)} more (${remaining} left)
        </button>
    `;
    elements.repoShowMore.classList.remove('hidden');
    elements.repoShowMore.querySelector('#showMoreBtn').addEventListener('click', () => {
        repoDisplayCount += CONFIG.MAX_REPOS;
        renderRepoList();
    });
}
