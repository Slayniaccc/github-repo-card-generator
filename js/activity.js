// NEW: Recent Activity — a timeline of a profile's public events (GitHub's /events/public
// endpoint). Lazily fetched only when the user clicks "Recent Activity", not on every search, so
// a normal profile lookup still costs exactly the 2 requests it always has (see js/search.js) and
// this third request is only spent when someone actually wants it.

// human-readable verb for each event type; falls back to a de-camel-cased label for any type not
// listed here (GitHub adds new event types occasionally)
const EVENT_DESCRIPTIONS = {
    // NEW: GitHub's public events API doesn't reliably include commit counts (payload.commits is
    // often absent entirely) — fall back to a plain "pushed to" rather than fabricating a count
    PushEvent: (e) => {
        const count = e.payload.commits?.length ?? e.payload.size ?? e.payload.distinct_size;
        return count != null ? `pushed ${count} commit${count === 1 ? '' : 's'} to` : 'pushed to';
    },
    CreateEvent: (e) => `created ${e.payload.ref_type}${e.payload.ref ? ` "${e.payload.ref}"` : ''} in`,
    DeleteEvent: (e) => `deleted ${e.payload.ref_type} "${e.payload.ref}" from`,
    WatchEvent: () => 'starred',
    ForkEvent: () => 'forked',
    IssuesEvent: (e) => `${e.payload.action} an issue in`,
    IssueCommentEvent: () => 'commented on an issue in',
    PullRequestEvent: (e) => `${e.payload.action} a pull request in`,
    PullRequestReviewEvent: () => 'reviewed a pull request in',
    PullRequestReviewCommentEvent: () => 'commented on a pull request in',
    ReleaseEvent: () => 'published a release in',
    PublicEvent: () => 'made public',
    MemberEvent: () => 'added a collaborator to',
    GollumEvent: () => 'updated the wiki for',
};

const EVENT_ICONS = {
    PushEvent: 'fa-code-commit',
    CreateEvent: 'fa-plus',
    DeleteEvent: 'fa-trash',
    WatchEvent: 'fa-star',
    ForkEvent: 'fa-code-branch',
    IssuesEvent: 'fa-circle-exclamation',
    IssueCommentEvent: 'fa-comment',
    PullRequestEvent: 'fa-code-pull-request',
    PullRequestReviewEvent: 'fa-eye',
    PullRequestReviewCommentEvent: 'fa-comment-dots',
    ReleaseEvent: 'fa-tag',
    PublicEvent: 'fa-lock-open',
    MemberEvent: 'fa-user-plus',
    GollumEvent: 'fa-book',
};

function describeEvent(event) {
    const describe = EVENT_DESCRIPTIONS[event.type];
    const verb = describe
        ? describe(event)
        : event.type.replace(/Event$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    const icon = EVENT_ICONS[event.type] || 'fa-circle-dot';
    return { icon, verb, repo: event.repo?.name };
}

// NEW: shares the same size-capped cache as searchGitHub()/compareUsers(), under its own key
// prefix, so re-toggling activity for a recently-viewed profile doesn't spend another request
async function fetchActivity(username, signal) {
    const cacheKey = `activity_${username}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        return cached.data;
    }

    const url = `${CONFIG.GITHUB_API}/users/${encodeURIComponent(username)}/events/public?per_page=${CONFIG.ACTIVITY_LIMIT}`;
    const response = await fetch(url, { signal });
    checkRateLimit(response);

    if (!response.ok) {
        throw new Error('Failed to fetch recent activity');
    }

    const events = await response.json();
    cacheSet(cacheKey, events);
    return events;
}

function renderActivity(events) {
    if (!events.length) {
        elements.activity.innerHTML = '<h2>Recent Activity</h2><p class="activity-empty">No recent public activity.</p>';
        return;
    }

    const items = events.map((event) => {
        const { icon, verb, repo } = describeEvent(event);
        return `
            <li class="activity-item">
                <i class="fas ${icon} activity-icon" aria-hidden="true"></i>
                <span class="activity-text">
                    ${verb}${repo ? ` <a href="https://github.com/${escapeHTML(repo)}" target="_blank" rel="noopener noreferrer">${escapeHTML(repo)}</a>` : ''}
                </span>
                <span class="activity-time">${formatDate(event.created_at)}</span>
            </li>
        `;
    }).join('');

    elements.activity.innerHTML = `<h2>Recent Activity</h2><ul class="activity-list">${items}</ul>`;
}

let activityAbortController = null; // NEW: mirrors searchAbortController's pattern for the activity fetch

// NEW: toggles the panel open/closed, only fetching on the first open for a given profile —
// dataset.loaded is reset by clearResults() whenever a new search starts, so switching profiles
// still re-fetches rather than showing the previous user's activity
async function toggleActivity(username) {
    if (!elements.activity.classList.contains('hidden')) {
        elements.activity.classList.add('hidden');
        return;
    }

    elements.activity.classList.remove('hidden');
    if (elements.activity.dataset.loaded === username) return;

    elements.activity.innerHTML = '<h2>Recent Activity</h2><p class="activity-empty">Loading recent activity…</p>';

    activityAbortController?.abort();
    const thisController = new AbortController();
    activityAbortController = thisController;

    try {
        const events = await fetchActivity(username, thisController.signal);
        renderActivity(events);
        elements.activity.dataset.loaded = username;
    } catch (error) {
        if (error.name === 'AbortError') return;
        elements.activity.innerHTML = `<h2>Recent Activity</h2><p class="activity-empty">${escapeHTML(error.message || 'Failed to load recent activity')}</p>`;
    }
}
