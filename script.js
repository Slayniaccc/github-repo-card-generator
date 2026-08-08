// Add this at the very top of script.js
const CONFIG = Object.freeze({
    GITHUB_API: 'https://api.github.com',
    MAX_REPOS: 5,
    CACHE_DURATION: 5 * 60 * 1000, // conserves API calls by reusing recent results for up to 5 mins, expires after 5 mins
     REPOS_PER_PAGE: 100,
    SUGGESTION_LIMIT: 5,
    ERROR_DISPLAY_MS: 5000,
}); //holds tunable constants
// Cache for API responses
const cache = new Map(); //right structure for a key / value cache, no inherited prototype keys
function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
} //prevents <script> style code from being run in the browser
const elements = {
    form: document.getElementById('repoForm'),
    username: document.getElementById('username'),
    profile: document.getElementById('profile'),
    repos: document.getElementById('repos'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    searchBtn: document.getElementById('searchBtn'), 
};
// Language colors mapping
const languageColors = {
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Java: '#b07219',
    TypeScript: '#3178c6',
    HTML: '#e34c26',
    CSS: '#563d7c',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Go: '#00ADD8',
    Rust: '#dea584',
    PHP: '#4F5D95',
    Ruby: '#701516',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    Vue: '#41b883',
    React: '#61dafb',
    Angular: '#dd0031',
    default: '#8b949e',
};
// Event Listeners
elements.form.addEventListener('submit', handleSubmit); //references the handlesubmit function


async function handleSubmit(event) {
    event.preventDefault();
    const username = elements.username.value.trim();

    if (!username) {
        showError('Please enter a GitHub username');
        return;
    }

    await searchGitHub(username);
}

async function searchGitHub(username) { //takes validated username and fetches user data and repos from GitHub API, handles caching, and displays results or errors
    clearResults();
    showLoading(true);

    try {
        // Check cache first
        const cacheKey = `github_${username}`;
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                displayResults(cached.data);
                showLoading(false);
                return;
            }
        } // asks if the name has been searched,and if the entry doesnt exist yet it pulls the data fresh
        if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        displayResults(cached.data);
        return;
    }
    cache.delete(cacheKey);  // expired — drop it
}

        // Fetch user and repos in parallel
        const [userData, reposData] = await Promise.all([
            fetchUser(username),
            fetchRepos(username),
        ]);

        const data = { user: userData, repos: reposData };
        
        // Cache the data
        cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
        });  //fetches username and repository amount at the same time, bundles as an object, caches the impormation

        displayResults(data);
        showLoading(false);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Failed to fetch user data');

     }finally{
        showLoading(false);
     } 
    } // on error: log for debugging, show the user a message, stop the spinner

    async function fetchUser(username) {
    const url = `${CONFIG.GITHUB_API}/users/${encodeURIComponent(username)}`;
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`User "${username}" not found`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
} //crafts the url,fetches it.If there is an error message,error messages are thrown.In case of success user data returned as JS object

async function fetchRepos(username) {
    const url = `${CONFIG.GITHUB_API}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch repositories`);
    }

    const repos = await response.json();
    return repos; //similar to previous function, however returns information on repositories.
}
function displayResults(data) {
    const { user, repos } = data;
    displayProfile(user);
    displayRepos(repos);
} //unpacks user and repos out of data,displays profile and repo info

function displayProfile(user) {
    const profileHTML = `
        <img src="${user.avatar_url}" alt="${user.login}'s avatar" loading="lazy" />
        <h1>${escapeHTML(user.name || user.login)}</h1>
        <p class="bio">${user.bio || 'No bio available'}</p>
        <div class="stats">
            <div class="stat-item">
                <i class="fas fa-users"></i>
                <span>${formatNumber(user.followers)}</span> followers
            </div>
            <div class="stat-item">
                <i class="fas fa-user-friends"></i>
                <span>${formatNumber(user.following)}</span> following
            </div>
            <div class="stat-item">
                <i class="fas fa-code"></i>
                <span>${formatNumber(user.public_repos)}</span> repos
            </div>
            ${user.location ? `
                <div class="stat-item">
                    <i class="fas fa-map-marker-alt"></i>
                    ${escapeHTML(user.location)}
                </div>
            ` : ''}
            ${user.company ? `
                <div class="stat-item">
                    <i class="fas fa-building"></i>
                   ${escapeHTML(user.company)}
                </div>
            ` : ''}
        </div>
        <a href="${user.html_url}" target="_blank" class="profile-link">
            <i class="fab fa-github"></i> View GitHub Profile
        </a>
    `;
//formatting of the whole profile
    elements.profile.innerHTML = profileHTML;
    elements.profile.style.display = 'block';
} //actual github profile now opened in a new tab

function displayRepos(repos) {
    // Sort by stars and take top 5
    const sortedRepos = [...repos]
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, CONFIG.MAX_REPOS);

    if (sortedRepos.length === 0) {
        elements.repos.innerHTML = '<p>No repositories found</p>';
        return;
    }

    let reposHTML = '';
    sortedRepos.forEach((repo, index) => {
        const languageColor = repo.language ? languageColors[repo.language] || languageColors.default : languageColors.default;
        //similar to display profile, however is based on repository information
        reposHTML += `
            <div class="repo-card" style="animation-delay: ${index * 0.1}s">
                <h3>
                    <i class="fas fa-book"></i>
                    ${escapeHTML(repo.name)}
                </h3>
                ${repo.description ? `<p class="description">${repo.description}</p>` : ''}
                <div class="repo-meta">
                    ${repo.language ? `
                        <span>
                            <span class="language-color" style="background-color: ${languageColor}"></span>
                         ${escapeHTML(repo.language)}
                        </span>
                    ` : ''}
                    ${repo.stargazers_count > 0 ? `
                        <span>
                            <i class="fas fa-star" style="color: #f1e05a;"></i>
                            ${formatNumber(repo.stargazers_count)}
                        </span>
                    ` : ''}
                    ${repo.forks_count > 0 ? `
                        <span>
                            <i class="fas fa-code-branch"></i>
                            ${formatNumber(repo.forks_count)}
                        </span>
                    ` : ''}
                    ${repo.updated_at ? `
                        <span>
                            <i class="fas fa-clock"></i>
                            ${formatDate(repo.updated_at)}
                        </span>
                    ` : ''}
                </div>
                <a href="${repo.html_url}" rel="noopener noreferrer" target="_blank" class="repo-link">
                    View Repository <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        `;
    });

    elements.repos.innerHTML = reposHTML;
}
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
        const w = Math.floor(diffDays / 7)
        return w === 1 ? '1 week ago' :  `${w} weeks ago`; 
    }
    if (diffDays < 365){
        const m = Math.floor(diffDays/30)
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
        '<i class="fas fa-spinner fa-spin"></i> Searching...' : 
        '<i class="fas fa-arrow-right"></i> Search';
}

//wipes the profile, hides error message,empties repo information
function clearResults() {
    elements.profile.innerHTML = '';
    elements.profile.style.display = 'none';
    elements.repos.innerHTML = '';
    elements.error.classList.remove('show');
}
// AI Feature 1: Smart Search with Suggestions
async function suggestUsers(partialUsername) {
    if (partialUsername.length < 2) return;
    
    try {
        const response = await fetch(`${CONFIG.GITHUB_API}/search/users?q=${partialUsername}&per_page=5`);
        const data = await response.json();
        console.log('Suggestions:', data.items.map(user => user.login));
    } catch (error) {
        console.error('Suggestion error:', error);
    }
}
// AI Feature 2: Repository Analysis
function analyzeRepos(repos) {
    const analysis = {
        totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0), //all star counts added
        totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0), //all fork counts added
        languages: {}, //lang tally
        mostPopular: repos.sort((a, b) => b.stargazers_count - a.stargazers_count)[0], //single repo with most stars
    };

    repos.forEach(repo => {
        if (repo.language) {
            analysis.languages[repo.language] = (analysis.languages[repo.language] || 0) + 1;
        }
    });

    return analysis;
}
// AI Feature 3: Export Results as JSON
function exportData(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' }); //file like object held in memory
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a');
    a.href = url;
    a.download = `github_${data.user.login}_data.json`;
    a.click();
    URL.revokeObjectURL(url); //frees blob from memory
}
//triggers a file download of fetched data


// AI Feature 4: Share Results
//checks if api exists, if yes, passes it an object
function shareResults(username) {
    if (navigator.share) {
        navigator.share({
            title: `GitHub Profile: ${username}`,
            text: `Check out ${username}'s GitHub profile!`,
            url: `https://github.com/${username}`,
        }).catch(() => {});
    } else {  //copies url to clipboard and alerts
        navigator.clipboard.writeText(`https://github.com/${username}`)
            .then(() => alert('Profile URL copied to clipboard!'))
            .catch(() => {}); //silencing errors
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 GitHub Repo Card Generator loaded!');
});