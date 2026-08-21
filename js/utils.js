// Utility Functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}
// converts an ISO timestamp into relative text like "3 days ago"
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
        const w = Math.floor(diffDays / 7);
        return w === 1 ? '1 week ago' : `${w} weeks ago`;
    }
    if (diffDays < 365) {
        const m = Math.floor(diffDays / 30);
        return m === 1 ? '1 month ago' : `${m} months ago`;
    }
    const y = Math.floor(diffDays / 365);
    return y === 1 ? '1 year ago' : `${y} years ago`;
}
// toggles loading UI: spinner visibility, button disabled state, and button label
function showLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
    elements.searchBtn.disabled = show;
    elements.searchBtn.innerHTML = show ?
        '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Searching...' :
        '<i class="fas fa-arrow-right" aria-hidden="true"></i> Search';
}

//wipes the profile, hides error message,empties repo information
function clearResults() {
    elements.profile.innerHTML = '';
    elements.profile.style.display = 'none';
    elements.repos.innerHTML = '';
    elements.analysis.innerHTML = '';
    elements.analysis.classList.add('hidden');
    elements.repoControls.classList.add('hidden'); // NEW: hide filter/sort controls until the next result set arrives
    elements.repoShowMore.innerHTML = ''; // NEW
    elements.repoShowMore.classList.add('hidden'); // NEW
    elements.error.classList.remove('show');
    clearTimeout(errorTimer);
}

// shows the error banner with a message, auto-hiding it after CONFIG.ERROR_DISPLAY_MS
// NEW: accepts an optional onRetry callback — when present, renders a Retry button and
// suppresses the auto-hide timer so the message doesn't vanish before the user can act on it
function showError(message, onRetry) {
    elements.error.innerHTML = `
        <span>${escapeHTML(message)}</span>
        ${onRetry ? '<button type="button" id="errorRetryBtn" class="action-btn action-btn--secondary">Retry</button>' : ''}
    `;
    elements.error.classList.remove('hidden');
    elements.error.classList.add('show');
    clearTimeout(errorTimer);

    if (onRetry) {
        elements.error.querySelector('#errorRetryBtn').addEventListener('click', onRetry);
    } else {
        errorTimer = setTimeout(() => {
            elements.error.classList.remove('show');
        }, CONFIG.ERROR_DISPLAY_MS);
    }
}
