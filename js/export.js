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

// NEW: Downloadable PNG Card — draws the profile + repo stats onto a <canvas> and exports it as
// an image, giving this "card generator" an actual shareable card image (previously it only ever
// exported raw JSON or a link).
const CARD_WIDTH = 600;
const CARD_HEIGHT = 300;

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // required so drawing it doesn't taint the canvas for export
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// wraps text onto at most maxLines lines, ellipsizing the last line if it still overflows
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;

    for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lineCount++;
            if (lineCount >= maxLines) {
                ctx.fillText(line.replace(/,?\s*$/, '') + '…', x, y);
                return;
            }
            ctx.fillText(line, x, y);
            y += lineHeight;
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) ctx.fillText(line, x, y);
}

async function downloadCard(user, analysis) {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');

    // background + border, matching the app's dark theme regardless of the visitor's light/dark toggle
    const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    bg.addColorStop(0, '#0d1117');
    bg.addColorStop(1, '#161b22');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CARD_WIDTH - 2, CARD_HEIGHT - 2);

    // avatar (clipped to a circle); if it fails to load (network/CORS), the card still renders without it
    const avatarX = 30, avatarY = 30, avatarSize = 90;
    try {
        const avatar = await loadImage(user.avatar_url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        ctx.strokeStyle = '#238636';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();
    } catch {
        // no avatar — proceed without it rather than failing the whole export
    }

    const textX = avatarX + avatarSize + 24;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(user.name || user.login, textX, 58);

    ctx.fillStyle = '#8b949e';
    ctx.font = '15px -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(`@${user.login}`, textX, 82);

    ctx.fillStyle = '#c9d1d9';
    ctx.font = '13px -apple-system, "Segoe UI", sans-serif';
    wrapText(ctx, user.bio || 'No bio available', textX, 104, CARD_WIDTH - textX - 24, 18, 2);

    // stat row
    const topLanguage = Object.entries(analysis.languages || {}).sort((a, b) => b[1] - a[1])[0];
    const stats = [
        ['Followers', formatNumber(user.followers)],
        ['Repos', formatNumber(user.public_repos)],
        ['Stars', formatNumber(analysis.totalStars || 0)],
        ['Top language', topLanguage ? topLanguage[0] : '—'],
    ];
    const statY = 200;
    const statWidth = (CARD_WIDTH - 60) / stats.length;
    stats.forEach(([label, value], i) => {
        const x = 30 + i * statWidth;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px -apple-system, "Segoe UI", sans-serif';
        ctx.fillText(String(value), x, statY);
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px -apple-system, "Segoe UI", sans-serif';
        ctx.fillText(label, x, statY + 20);
    });

    ctx.fillStyle = '#8b949e';
    ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Generated with GitHub Repo Card Generator', CARD_WIDTH - 20, CARD_HEIGHT - 16);
    ctx.textAlign = 'left';

    canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `github_${user.login}_card.png`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// AI Feature 4: Share Results
//checks if api exists, if yes, passes it an object
function shareResults(username) {
    // NEW: shares a deep link back into this app (?user=...) instead of the raw github.com
    // profile, so the recipient lands on the rendered card rather than GitHub's own page
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('user', username);

    if (navigator.share) {
        navigator.share({
            title: `GitHub Profile: ${username}`,
            text: `Check out ${username}'s GitHub profile!`,
            url: shareUrl.toString(),
        }).catch(() => {});
    } else {  //copies url to clipboard and alerts
        navigator.clipboard.writeText(shareUrl.toString())
            .then(() => alert('Profile URL copied to clipboard!'))
            .catch(() => {}); //silencing errors
    }
}
