// AI Feature 1: Smart Search with Suggestions
let suggestAbortController = null; // NEW: tracks the in-flight suggestion request so it can be cancelled

async function suggestUsers(partialUsername) {
    if (partialUsername.length < 2) {
        elements.suggestions.innerHTML = '';
        return;
    }

    // NEW: cancel any request still in flight from a previous keystroke — without this, a slow
    // response for an earlier partial username could resolve after a newer one and overwrite it.
    suggestAbortController?.abort();
    suggestAbortController = new AbortController();

    try {
        const response = await fetch(
            `${CONFIG.GITHUB_API}/search/users?q=${encodeURIComponent(partialUsername)}&per_page=${CONFIG.SUGGESTION_LIMIT}`,
            { signal: suggestAbortController.signal }
        );
        if (!response.ok) return;
        const data = await response.json();
        elements.suggestions.innerHTML = data.items
            .map(user => `<option value="${escapeHTML(user.login)}"></option>`)
            .join('');
    } catch (error) {
        if (error.name === 'AbortError') return; // expected: a newer keystroke superseded this request
        console.error('Suggestion error:', error);
    }
}
