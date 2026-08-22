function displayProfile(user) {
    const profileHTML = `
        <img src="${user.avatar_url}" alt="${escapeHTML(user.login)}'s avatar" loading="lazy" />
        <h1>${escapeHTML(user.name || user.login)}</h1>
        <p class="bio">${escapeHTML(user.bio) || 'No bio available'}</p>
        <div class="stats">
            <div class="stat-item">
                <i class="fas fa-users" aria-hidden="true"></i>
                <span>${formatNumber(user.followers)}</span> followers
            </div>
            <div class="stat-item">
                <i class="fas fa-user-friends" aria-hidden="true"></i>
                <span>${formatNumber(user.following)}</span> following
            </div>
            <div class="stat-item">
                <i class="fas fa-code" aria-hidden="true"></i>
                <span>${formatNumber(user.public_repos)}</span> repos
            </div>
            ${user.location ? `
                <div class="stat-item">
                    <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                    ${escapeHTML(user.location)}
                </div>
            ` : ''}
            ${user.company ? `
                <div class="stat-item">
                    <i class="fas fa-building" aria-hidden="true"></i>
                   ${escapeHTML(user.company)}
                </div>
            ` : ''}
        </div>
        <div class="profile-actions">
            <a href="${user.html_url}" target="_blank" rel="noopener noreferrer" class="profile-link">
                <i class="fab fa-github" aria-hidden="true"></i> View GitHub Profile
            </a>
            <button type="button" id="exportBtn" class="action-btn action-btn--secondary">
                <i class="fas fa-download" aria-hidden="true"></i> Export JSON
            </button>
            <button type="button" id="shareBtn" class="action-btn">
                <i class="fas fa-share-alt" aria-hidden="true"></i> Share
            </button>
            <button type="button" id="downloadCardBtn" class="action-btn action-btn--secondary">
                <i class="fas fa-image" aria-hidden="true"></i> Download Card
            </button>
            <button type="button" id="activityBtn" class="action-btn action-btn--secondary">
                <i class="fas fa-clock-rotate-left" aria-hidden="true"></i> Recent Activity
            </button>
        </div>
    `;
//formatting of the whole profile
    elements.profile.innerHTML = profileHTML;
    elements.profile.style.display = 'block';
    elements.profile.querySelector('#exportBtn').addEventListener('click', () => exportData(lastData));
    elements.profile.querySelector('#shareBtn').addEventListener('click', () => shareResults(user.login));
    // NEW: renders the actual PNG "repo card" this app is named after — currentRepos is read at
    // click time, so it reflects whatever repos have loaded by the time the button is pressed
    elements.profile.querySelector('#downloadCardBtn').addEventListener('click', () => downloadCard(user, analyzeRepos(currentRepos)));
    // NEW: lazily fetches/toggles the recent-activity timeline — see js/activity.js
    elements.profile.querySelector('#activityBtn').addEventListener('click', () => toggleActivity(user.login));
} //builds a link to the github profile that opens in a new tab when clicked
