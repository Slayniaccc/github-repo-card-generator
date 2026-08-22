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
        ${renderRadarChart(a, b)}
        ${renderLanguageOverlap(a, b)}
    `;
}

// NEW: the four axes plotted on the radar chart — each reads a stat off the same { user, analysis }
// shape fetchProfileAndAnalysis() returns, so adding an axis here is a one-line change
const RADAR_AXES = [
    { label: 'Followers', get: (d) => d.user.followers },
    { label: 'Repos', get: (d) => d.user.public_repos },
    { label: 'Stars', get: (d) => d.analysis.totalStars },
    { label: 'Forks', get: (d) => d.analysis.totalForks },
];

// NEW: radar/spider chart comparing two profiles across the axes above. Each axis is normalized to
// whichever of the two profiles scores higher on it (not a shared global max), so the chart always
// shows relative lean between the two rather than tiny slivers when one axis dwarfs the others.
function renderRadarChart(a, b) {
    const size = 260;
    const center = size / 2;
    const maxRadius = center - 44; // leaves room for axis labels outside the plotted area
    const n = RADAR_AXES.length;
    const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2; // -90deg so the first axis points up

    const maxes = RADAR_AXES.map((axis) => Math.max(axis.get(a), axis.get(b), 1)); // 1 avoids /0 when both are 0

    const pointsFor = (data) => RADAR_AXES.map((axis, i) => {
        const angle = angleFor(i);
        const r = (axis.get(data) / maxes[i]) * maxRadius;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');

    const rings = [0.25, 0.5, 0.75, 1].map((frac) => {
        const points = RADAR_AXES.map((_, i) => {
            const angle = angleFor(i);
            return `${center + frac * maxRadius * Math.cos(angle)},${center + frac * maxRadius * Math.sin(angle)}`;
        }).join(' ');
        return `<polygon points="${points}" class="radar-grid" />`;
    }).join('');

    const axisLines = RADAR_AXES.map((_, i) => {
        const angle = angleFor(i);
        const x = center + maxRadius * Math.cos(angle);
        const y = center + maxRadius * Math.sin(angle);
        return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-grid" />`;
    }).join('');

    const labels = RADAR_AXES.map((axis, i) => {
        const angle = angleFor(i);
        const x = center + (maxRadius + 24) * Math.cos(angle);
        const y = center + (maxRadius + 24) * Math.sin(angle);
        return `<text x="${x}" y="${y}" class="radar-axis-label" text-anchor="middle" dominant-baseline="middle">${axis.label}</text>`;
    }).join('');

    return `
        <div class="compare-radar">
            <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Radar chart comparing ${escapeHTML(a.user.login)} and ${escapeHTML(b.user.login)} across followers, repos, stars, and forks">
                ${rings}
                ${axisLines}
                <polygon points="${pointsFor(a)}" class="radar-shape radar-shape--a" />
                <polygon points="${pointsFor(b)}" class="radar-shape radar-shape--b" />
                ${labels}
            </svg>
            <div class="radar-legend">
                <span class="radar-legend-item"><span class="radar-swatch radar-swatch--a" aria-hidden="true"></span>${escapeHTML(a.user.login)}</span>
                <span class="radar-legend-item"><span class="radar-swatch radar-swatch--b" aria-hidden="true"></span>${escapeHTML(b.user.login)}</span>
            </div>
        </div>
    `;
}

// NEW: three-column breakdown of which languages both profiles' repos share versus which are
// unique to one side — reuses analyzeRepos().languages (already computed for the stat rows above)
// and the same language color map as the repo cards / analysis bars.
function renderLanguageOverlap(a, b) {
    const langsA = new Set(Object.keys(a.analysis.languages));
    const langsB = new Set(Object.keys(b.analysis.languages));
    if (!langsA.size && !langsB.size) return '';

    const shared = [...langsA].filter((lang) => langsB.has(lang)).sort();
    const onlyA = [...langsA].filter((lang) => !langsB.has(lang)).sort();
    const onlyB = [...langsB].filter((lang) => !langsA.has(lang)).sort();

    const chip = (lang) => `
        <span class="language-chip">
            <span class="language-color" style="background-color: ${languageColors[lang] || languageColors.default}"></span>
            ${escapeHTML(lang)}
        </span>
    `;

    const column = (title, langs) => `
        <div class="overlap-column">
            <h4>${title}</h4>
            <div class="overlap-chips">${langs.length ? langs.map(chip).join('') : '<span class="overlap-empty">—</span>'}</div>
        </div>
    `;

    return `
        <div class="compare-overlap">
            <h3>Language overlap</h3>
            <div class="overlap-columns">
                ${column(`Shared (${shared.length})`, shared)}
                ${column(`Only ${escapeHTML(a.user.login)}`, onlyA)}
                ${column(`Only ${escapeHTML(b.user.login)}`, onlyB)}
            </div>
        </div>
    `;
}
