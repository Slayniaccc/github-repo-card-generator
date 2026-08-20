# GitHub Repo Card Generator

[![Status](https://img.shields.io/badge/status-complete-brightgreen)](https://github.com/Slayniaccc/github-repo-card-generator)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)](https://github.com/Slayniaccc/github-repo-card-generator)
[![CSS](https://img.shields.io/badge/CSS-3-blue)](https://github.com/Slayniaccc/github-repo-card-generator)
[![GitHub API](https://img.shields.io/badge/GitHub-API-black)](https://github.com/Slayniaccc/github-repo-card-generator)

A modern, feature-rich GitHub profile viewer with repository analysis, a downloadable summary card, and a light/dark theme.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Preview](#preview)
- [How It Works](#how-it-works)
- [Key Functions](#key-functions)
- [Customization](#customization)
- [What I Learned](#what-i-learned)
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

### Performance & Reliability

- Smart caching (size-capped) reduces repeat API calls
- Parallel requests load profile and repos simultaneously
- In-flight requests are cancelled when superseded by a newer search, avoiding stale results
- Clear messaging when GitHub's API rate limit is hit, including a retry estimate
- Client-side username validation before spending a request
- Lazy loading for images
- Keyboard shortcut (`Ctrl+/` / `Cmd+/`) to focus search

### Smart Features

- Username suggestions as you type
- Repository analysis: total stars, forks, top repo, and a language breakdown bar chart
- Filter and sort the repository list by language, stars, forks, or last updated
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
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Styling | CSS Variables, Flexbox, Grid, Animations |
| API | GitHub REST API v3 |
| Icons | Font Awesome 6 |
| Hosting | GitHub Pages (or any static hosting) |

---

