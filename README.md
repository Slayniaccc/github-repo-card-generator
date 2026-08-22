# GitHub Repo Card Generator

[![Status](https://img.shields.io/badge/status-complete-brightgreen)](https://github.com/Slayniaccc/github-repo-card-generator)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)](https://github.com/Slayniaccc/github-repo-card-generator)
[![CSS](https://img.shields.io/badge/CSS-3-blue)](https://github.com/Slayniaccc/github-repo-card-generator)
[![GitHub API](https://img.shields.io/badge/GitHub-API-black)](https://github.com/Slayniaccc/github-repo-card-generator)

A modern, feature-rich GitHub profile viewer with repository analysis, side-by-side comparisons, a downloadable summary card, and a light/dark theme.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Key Functions](#key-functions)
- [Customization](#customization)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Features

### User Experience

- Light/dark theme toggle, persisted across visits
- Fully responsive design for desktop, tablet, and mobile
- Smooth animations with fade, slide, and hover effects (respects `prefers-reduced-motion`)
- Loading states with visual feedback
- User-friendly error messages with a one-click Retry
- Shareable, bookmarkable URLs (`?user=<name>`) that reopen the same profile
- Recent-searches history for one-click return visits
- Side-by-side comparison of two profiles, including a followers/repos/stars/forks radar chart and a shared-vs-unique language breakdown
- Installable as a PWA, with the static app shell cached for offline reloads

### Performance & Reliability

- Smart caching (size-capped, FIFO eviction) reduces repeat API calls
- Parallel requests load profile and repos simultaneously
- In-flight requests are cancelled when superseded by a newer search, avoiding stale results
- Clear messaging when GitHub's API rate limit is hit, including a retry estimate
- Client-side username validation before spending a request
- Repo fetching paginates (up to 300 repos) so analysis totals aren't silently wrong for prolific users
- Lazy loading for images
- Keyboard shortcut (`Ctrl+/` / `Cmd+/`) to focus search
- Font Awesome loaded with a Subresource Integrity hash, so a compromised CDN can't inject unnoticed CSS

### Smart Features

- Username suggestions as you type
- Repository analysis: total stars, forks, top repo, and a language breakdown bar chart
- Recent activity feed — a timeline of a profile's public GitHub events (pushes, stars, forks, PRs, issues…), lazily fetched on demand so a normal search doesn't spend a request on it
- Filter and sort the repository list by language, stars, forks, or last updated, with "Show more" beyond the initial five
- Downloadable PNG summary card (avatar, stats, top language) — an actual "card" export, not just JSON
- Export full profile data as JSON
- One-click sharing via native share or clipboard

### Accessibility

- Accessible label on the search input (not placeholder-only)
- `aria-live` regions announce loading/result/error state changes to screen readers
- Decorative icons hidden from assistive tech (`aria-hidden`)
- Visible focus states throughout, including custom controls

### Technical Features

- Color-coded languages for 20+ programming languages
- Number formatting (`1.2K` instead of `1234`)
- Relative dates (`2 days ago` instead of raw dates)
- Full keyboard navigation support
- Open Graph / Twitter meta tags and an inline SVG favicon

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) — no framework, no build step |
| Styling | CSS Variables, Flexbox, Grid, Animations |
| API | GitHub REST API v3 (unauthenticated) |
| Offline | Service Worker + Web App Manifest |
| Icons | Font Awesome 6 (loaded with an SRI hash) |
| Hosting | GitHub Pages (or any static hosting) |

---

## Project Structure

```
github-repo-card-generator/
├── index.html      # markup + all UI containers the JS renders into
├── css/            # theme tokens (light/dark), layout, components, animations — one file per concern
├── js/             # all app logic — fetching, caching, rendering, comparisons — one file per concern
├── manifest.json    # PWA metadata (name, icon, theme color, start URL)
├── sw.js            # service worker: caches the static shell for offline use
└── README.md
```

---

## Quick Start

No dependencies, no build step — it's a static site.

```bash
git clone https://github.com/Slayniaccc/github-repo-card-generator.git
cd github-repo-card-generator
```

Then serve it with any static file server (the service worker requires `http(s)://`, not `file://`):

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

GitHub's REST API is unauthenticated here, so it's capped at **60 requests/hour** overall (**10/min** for the username-search autocomplete) per IP. The app surfaces a clear message with a retry estimate if you hit that limit while testing.

---

## How It Works

1. **Submit** — `handleSubmit()` validates the username format client-side (matching GitHub's actual rules) before spending a request.
2. **Fetch** — `searchGitHub()` checks the in-memory cache first, then calls `fetchUser()` and `fetchRepos()` in parallel via `Promise.all`. `fetchRepos()` paginates up to `CONFIG.MAX_REPO_PAGES` so analysis totals are accurate for prolific users. Every request carries an `AbortSignal`, so a new search cancels whatever was still in flight.
3. **Cache** — successful results are written through `cacheSet()`, which evicts the oldest entry once `CONFIG.CACHE_MAX_ENTRIES` is reached.
4. **Render** — `displayResults()` renders the profile, the language-filterable/sortable repo grid (`renderRepoList()`, with "Show more" beyond the first five), and the stars/forks/language analysis panel (`displayAnalysis()`).
5. **Persist** — the URL is kept in sync via `updateURL()` (`?user=<name>`) so results are bookmarkable and shareable, and the last few searches are saved to `localStorage` for the recent-searches chips.
6. **Activity (on demand)** — clicking "Recent Activity" calls `toggleActivity()`, which fetches `/users/:username/events/public` only the first time it's opened for a given profile (`fetchActivity()`, cached like everything else) and renders it via `renderActivity()`. This keeps the cost of a normal search at exactly 2 requests; the third is only spent if someone asks for it.
7. **Compare (independent flow)** — `compareUsers()` fetches two profiles + repo sets in parallel (reusing the same cache), then `renderComparison()` draws the stat rows, an SVG radar chart (`renderRadarChart()`) normalizing followers/repos/stars/forks per-axis to whichever side is higher, and a shared-vs-unique language breakdown (`renderLanguageOverlap()`).
8. **Offline** — `sw.js` caches the static app shell (HTML/CSS/JS/manifest) on first load; it deliberately never caches `api.github.com` responses, since those already have their own TTL'd cache in step 3.

---

## Key Functions

| Function | File | What it does |
|---|---|---|
| `searchGitHub(username)` | `js/search.js` | Orchestrates the cached, cancellable fetch + render pipeline for one profile |
| `compareUsers(usernameA, usernameB)` | `js/compare.js` | Fetches two profiles in parallel and renders a side-by-side stat comparison |
| `renderRadarChart(a, b)` | `js/compare.js` | Draws an inline SVG radar chart comparing two profiles' followers/repos/stars/forks |
| `renderLanguageOverlap(a, b)` | `js/compare.js` | Splits two profiles' languages into shared/only-A/only-B chip columns |
| `analyzeRepos(repos)` | `js/analysis.js` | Aggregates total stars/forks, language counts, and the top repo from a repo list |
| `renderRepoList()` | `js/repos.js` | Applies the active language filter, sort order, and "Show more" count to the fetched repos |
| `downloadCard(user, analysis)` | `js/export.js` | Draws the profile + key stats onto a `<canvas>` and exports it as a PNG |
| `toggleActivity(username)` | `js/activity.js` | Opens/closes the recent-activity panel, fetching `/events/public` only on first open per profile |
| `checkRateLimit(response)` | `js/search.js` | Throws a human-readable error (with a retry estimate) when GitHub's rate limit is hit |
| `cacheSet(key, data)` | `js/state.js` | Size-capped, FIFO-evicting write into the response cache |

---

## Customization

**Tunable constants** — `CONFIG` at the top of `js/state.js`: `MAX_REPOS` (repos shown before "Show more"), `CACHE_DURATION`, `CACHE_MAX_ENTRIES`, `MAX_REPO_PAGES`, `SUGGESTION_LIMIT`, `ERROR_DISPLAY_MS`, `ACTIVITY_LIMIT` (events shown in the recent-activity feed).

**Theming** — all colors are CSS custom properties defined once on `:root` in `css/variables.css` (`--primary`, `--accent`, `--border`, `--text`, `--muted`, `--heading`, `--body-bg`, `--stat-bg`, `--link`, `--link-hover`) and overridden under `[data-theme="light"]`. Changing a token updates every component that uses it, in both themes.

**Language colors** — the `languageColors` map in `js/state.js` covers 20+ languages with a `default` fallback; add entries there to color-code more.

---

## Future Improvements

- **Automated tests** — the `js/` files now have plenty of pure, testable logic (`formatNumber`, `formatDate`, `GITHUB_USERNAME_PATTERN`, `cacheSet` eviction, `REPO_SORTERS`, `analyzeRepos`) with zero coverage today. A small Vitest suite would catch regressions here.
- **Theme-aware download card** — `downloadCard()` still always renders the dark palette regardless of the active theme toggle; it should read the current CSS tokens instead.
- **Authenticated API proxy** — a small serverless function that attaches a token would lift the 60 req/hour unauthenticated ceiling to 5,000/hour, which matters more now that comparisons and pagination use more requests per search.
- **Proper PWA icon set** — the manifest currently ships a single `"sizes": "any"` SVG icon; adding real 192×192/512×512 (and maskable) PNGs would improve compatibility with launchers that don't support SVG icons.

---

## Contributing

Issues and pull requests are welcome. For anything non-trivial, please open an issue first to discuss the change — this is a small, dependency-free codebase and keeping it that way is part of the point.

---

## License

No license file is included in this repository yet, so all rights are reserved by default. If you'd like to reuse this code, please open an issue, or add a `LICENSE` file (e.g. MIT) if you're the repository owner.

---

## Contact

[github.com/Slayniaccc](https://github.com/Slayniaccc) — open an issue on this repo for bugs or feature requests.
