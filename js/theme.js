// NEW: Theme Toggle — persists the visitor's choice in localStorage, defaulting to their OS preference
const THEME_STORAGE_KEY = 'github-card-theme';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = elements.themeToggle?.querySelector('i');
    if (icon) icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    elements.themeToggle?.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
}

function initTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const preferred = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(preferred);
}

elements.themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
});

initTheme();
