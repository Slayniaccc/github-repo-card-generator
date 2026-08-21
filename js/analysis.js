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
        ${renderLanguageBars(analysis.languages)}
    `;
    elements.analysis.classList.remove('hidden');
}

// NEW: renders a top-5 percentage-bar breakdown of languages across ALL fetched repos (not just
// the filtered/sorted subset shown in the card grid), reusing the same color map as the repo cards
function renderLanguageBars(languages) {
    const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!entries.length) return '';

    const totalWithLanguage = Object.values(languages).reduce((sum, count) => sum + count, 0);

    const rows = entries.map(([lang, count]) => {
        const percent = Math.round((count / totalWithLanguage) * 100);
        const color = languageColors[lang] || languageColors.default;
        return `
            <div class="language-bar-row">
                <span class="language-bar-label">
                    <span class="language-color" style="background-color: ${color}"></span>
                    ${escapeHTML(lang)}
                </span>
                <div class="language-bar-track">
                    <div class="language-bar-fill" style="width: ${percent}%; background-color: ${color}"></div>
                </div>
                <span class="language-bar-percent">${percent}%</span>
            </div>
        `;
    }).join('');

    return `<div class="language-bars">${rows}</div>`;
}
