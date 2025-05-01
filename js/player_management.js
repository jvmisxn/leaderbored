// --- player_management.js ---

// Global cache for player data (id -> {name, elos, ...})
let globalPlayerCache = {};
let playersCachePopulated = false;

// Map game keys to background image URLs
const gameBackgroundImages = {
    golf: 'images/bg_golf.jpg',
    pool: 'images/bg_pool.jpg',
    chess: 'images/bg_chess.jpg',
    board_game: 'images/bg_boardgame.jpg',
    // ...add more as needed...
};

// Helper: get most played game key for a player
function getMostPlayedGameKey(player) {
    if (!player || !player.games_played) return null;
    let max = 0, maxKey = null;
    for (const [gameKey, count] of Object.entries(player.games_played)) {
        if (count > max) { max = count; maxKey = gameKey; }
    }
    return maxKey;
}

/**
 * Fetches all player documents from Firestore and populates the globalPlayerCache.
 * Sets the playersCachePopulated flag.
 * @returns {Promise<boolean>} True if the cache was populated successfully, false otherwise.
 */
async function fetchAllPlayersForCache() {
    console.log("[Cache] Attempting to fetch all players for cache...");
    if (!db) {
        console.error("[Cache] Firestore DB object not available.");
        playersCachePopulated = false;
        return false;
    }

    try {
        const snapshot = await db.collection('players').get();
        globalPlayerCache = {}; // Reset cache before populating

        if (snapshot.empty) {
            console.warn("[Cache] No player documents found in Firestore.");
            playersCachePopulated = true; // Consider cache populated even if empty
            return true;
        }

        snapshot.forEach(doc => {
            globalPlayerCache[doc.id] = { id: doc.id, ...doc.data() };
        });

        playersCachePopulated = true;
        console.log(`[Cache] Successfully populated globalPlayerCache with ${snapshot.size} players.`);
        return true;

    } catch (error) {
        console.error("[Cache] Error fetching players for cache:", error);
        playersCachePopulated = false;
        globalPlayerCache = {}; // Clear cache on error
        return false;
    }
}

/**
 * Retrieves a player's name from the cache.
 * @param {string} playerId - The ID of the player.
 * @returns {string} The player's name or 'Unknown Player'.
 */
function getPlayerNameFromCache(playerId) {
    if (!playersCachePopulated) {
        console.warn(`[Cache] Attempted to get player name (${playerId}) before cache was populated.`);
    }
    return globalPlayerCache[playerId]?.name || 'Unknown Player';
}

// --- Player List Population (Players Section) ---

/**
 * Populates the players list grid in the 'players-section'.
 * Handles sorting based on the selected filter.
 */
async function populatePlayersList() {
    const container = document.getElementById('players-list-container');
    if (!container) {
        console.error("[Player List] #players-list-container not found.");
        return;
    }
    if (!db) {
        container.innerHTML = '<p class="error-text col-span-full">Database connection error.</p>';
        return;
    }
    container.innerHTML = '<p class="loading-text text-center py-5 col-span-full">Loading players...</p>';

    // Ensure player cache is ready
    if (!playersCachePopulated) await fetchAllPlayersForCache();

    // Get sort filter
    const sortFilter = document.getElementById('players-sort-filter');
    let sortKey = sortFilter ? sortFilter.value : 'name';

    // Fetch players from cache
    let players = Object.values(globalPlayerCache);

    // Sorting logic
    if (sortKey === 'name') {
        players.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortKey.startsWith('elo_')) {
        const key = sortKey.replace('elo_', '');
        players.sort((a, b) => ((b.elos?.[key] || 0) - (a.elos?.[key] || 0)));
    } else if (sortKey === 'elo_overall') {
        players.sort((a, b) => ((b.elos?.overall || 0) - (a.elos?.overall || 0)));
    }

    // Render player cards
    if (players.length === 0) {
        container.innerHTML = '<p class="muted-text text-center py-5 col-span-full">No players found.</p>';
        return;
    }
    container.innerHTML = '';
    players.forEach(player => {
        const card = createPlayerCardElement(player);
        container.appendChild(card);
    });
    console.log(`[Player List] Populated ${players.length} players.`);
}

/**
 * Creates the HTML element for a single player card.
 * @param {object} player - The player object { id, name, elos, photoURL, iconUrl, ... }.
 * @returns {HTMLElement} The created player card element.
 */
function createPlayerCardElement(player) {
    const div = document.createElement('div');
    div.className = 'player-entry';
    div.setAttribute('data-player-id', player.id);

    // Prioritize iconUrl, then photoURL, then generated avatar
    const imgUrl =
        player.iconUrl || // Prioritize iconUrl
        player.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || '?')}&background=E0E7FF&color=4F46E5&size=40`;
    const overallElo = player.elos?.overall !== undefined ? Math.round(player.elos.overall) : 'N/A';

    div.innerHTML = `
        <img src="${imgUrl}" alt="${player.name || 'Player'}" class="player-entry-image">
        <div class="player-entry-info">
            <div class="player-entry-name">${player.name || 'Unnamed Player'}</div>
            <div class="player-entry-elo">Overall Elo: ${overallElo}</div>
        </div>
    `;
    return div;
}

// --- Player Profile Page Population ---

/**
 * Fetches and populates the entire player profile page.
 * @param {string} playerId - The ID of the player whose profile to display.
 */
async function populatePlayerProfilePage(playerId) {
    console.log(`[Profile Page] Populating profile for player ID: ${playerId}`);
    const profileSection = document.getElementById('player-profile-section');
    const profileNameEl = document.getElementById('player-profile-name');
    const profileImageEl = document.getElementById('player-profile-image');
    const eloRatingsContainer = document.getElementById('player-profile-elo-ratings');
    const gamesPlayedContainer = document.getElementById('player-profile-games-played');
    const recentGamesContainer = document.getElementById('player-profile-recent-games');

    if (!profileSection || !profileNameEl || !profileImageEl || !eloRatingsContainer || !gamesPlayedContainer || !recentGamesContainer) {
        console.error("[Profile Page] One or more essential profile elements not found.");
        const mainContent = document.getElementById('main-content');
        if(mainContent) mainContent.innerHTML = '<p class="error-text">Error loading profile page structure.</p>';
        return;
    }

    // Set loading states
    profileNameEl.textContent = 'Loading...';
    profileImageEl.src = `https://ui-avatars.com/api/?name=?&background=E0E7FF&color=4F46E5&size=128`;
    eloRatingsContainer.innerHTML = '<p class="loading-text">Loading ratings...</p>';
    gamesPlayedContainer.innerHTML = '<p class="loading-text">Loading stats...</p>';
    recentGamesContainer.innerHTML = '<p class="loading-text">Loading recent games...</p>';

    if (!db) {
        console.error("[Profile Page] Firestore DB not available.");
        profileNameEl.textContent = 'Error';
        eloRatingsContainer.innerHTML = '<p class="error-text">DB Error</p>';
        gamesPlayedContainer.innerHTML = '<p class="error-text">DB Error</p>';
        recentGamesContainer.innerHTML = '<p class="error-text">DB Error</p>';
        return;
    }

    try {
        // 1. Fetch Player Data
        const playerDoc = await db.collection('players').doc(playerId).get();

        if (!playerDoc.exists) {
            console.error(`[Profile Page] Player not found with ID: ${playerId}`);
            profileNameEl.textContent = 'Player Not Found';
            profileImageEl.src = `https://ui-avatars.com/api/?name=X&background=FEE2E2&color=DC2626&size=128`;
            eloRatingsContainer.innerHTML = '<p class="error-text">Player not found.</p>';
            gamesPlayedContainer.innerHTML = '<p class="error-text">Player not found.</p>';
            recentGamesContainer.innerHTML = '<p class="error-text">Player not found.</p>';
            return;
        }

        const playerData = { id: playerDoc.id, ...playerDoc.data() };

        // Update Header
        profileNameEl.textContent = playerData.name || 'Unnamed Player';
        // Use iconUrl if available, fallback to photoURL, then to generated avatar
        profileImageEl.src =
            playerData.iconUrl || // Prioritize iconUrl
            playerData.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(playerData.name || '?')}&background=E0E7FF&color=4F46E5&size=128`;
        profileImageEl.alt = `${playerData.name || 'Player'}'s Profile`;

        // 2. Populate Ratings, Games Played, Recent Games (can run in parallel)
        await Promise.all([
            populatePlayerProfileRatings(eloRatingsContainer, playerData.elos || {}),
            populatePlayerProfileGamesPlayed(gamesPlayedContainer, playerId),
            populatePlayerProfileRecentGames(recentGamesContainer, playerId)
        ]);

        console.log(`[Profile Page] Successfully populated profile for ${playerData.name}`);

    } catch (error) {
        console.error(`[Profile Page] Error populating profile for ${playerId}:`, error);
        profileNameEl.textContent = 'Error Loading Profile';
        eloRatingsContainer.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
        gamesPlayedContainer.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
        recentGamesContainer.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
    }
}

/**
 * Populates the Elo ratings section of the player profile.
 * @param {HTMLElement} container - The container element for ratings.
 * @param {object} elos - The player's elos object (e.g., { overall: 1050, pool: 1100 }).
 */
async function populatePlayerProfileRatings(container, elos) {
    if (!container) return;
    let ratingsHtml = '<ul class="space-y-1 text-sm">';
    let hasRatings = false;

    if (elos.overall !== undefined) {
        ratingsHtml += `<li class="flex justify-between"><span>Overall:</span> <strong class="font-medium">${Math.round(elos.overall)}</strong></li>`;
        hasRatings = true;
    }

    if (typeof ELO_GAME_KEYS !== 'undefined' && typeof gameTypesConfig !== 'undefined') {
        ELO_GAME_KEYS.forEach(key => {
            if (elos[key] !== undefined) {
                const gameName = gameTypesConfig[key] || key;
                ratingsHtml += `<li class="flex justify-between"><span>${gameName}:</span> <strong class="font-medium">${Math.round(elos[key])}</strong></li>`;
                hasRatings = true;
            }
        });
    } else {
        Object.entries(elos).forEach(([key, value]) => {
            if (key !== 'overall' && value !== undefined) {
                 ratingsHtml += `<li class="flex justify-between"><span>${key}:</span> <strong class="font-medium">${Math.round(value)}</strong></li>`;
                 hasRatings = true;
            }
        });
    }

    if (elos.golf_handicap !== undefined) {
         ratingsHtml += `<li class="flex justify-between border-t dark:border-gray-600 pt-1 mt-1"><span>Golf Handicap:</span> <strong class="font-medium">${elos.golf_handicap.toFixed(1)}</strong></li>`;
         hasRatings = true;
    }

    if (!hasRatings) {
        ratingsHtml += '<li>No ratings available yet.</li>';
    }

    ratingsHtml += '</ul>';
    container.innerHTML = ratingsHtml;
}

/**
 * Fetches and populates the games played stats section.
 * @param {HTMLElement} container - The container element for stats.
 * @param {string} playerId - The ID of the player.
 */
async function populatePlayerProfileGamesPlayed(container, playerId) {
    if (!container || !db) return;
    try {
        const gamesQuery = db.collection('games')
                             .where('participants', 'array-contains', playerId)
                             .orderBy('date_played', 'desc');
        const snapshot = await gamesQuery.get();
        const totalGames = snapshot.size;

        let statsByGame = {};
        snapshot.forEach(doc => {
            const game = doc.data();
            const gameType = game.game_type || 'unknown';
            if (!statsByGame[gameType]) {
                statsByGame[gameType] = { played: 0 };
            }
            statsByGame[gameType].played++;
        });

        let statsHtml = `<p class="text-lg font-medium mb-2">Total Games: ${totalGames}</p>`;
        statsHtml += '<ul class="space-y-1 text-sm">';

        if (totalGames > 0 && typeof gameTypesConfig !== 'undefined') {
            Object.entries(statsByGame).forEach(([key, stats]) => {
                const gameName = gameTypesConfig[key] || key;
                statsHtml += `<li class="flex justify-between"><span>${gameName}:</span> <span>${stats.played} played</span></li>`;
            });
        } else if (totalGames === 0) {
            statsHtml += '<li>No games played yet.</li>';
        } else {
             statsHtml += '<li>Could not break down stats by game type.</li>';
        }

        statsHtml += '</ul>';
        container.innerHTML = statsHtml;

    } catch (error) {
        console.error("[Profile Page] Error fetching games played stats:", error);
        container.innerHTML = `<p class="error-text">Error loading stats: ${error.message}</p>`;
    }
}

/**
 * Fetches and populates the recent games list for the player profile.
 * @param {HTMLElement} container - The container element for the list.
 * @param {string} playerId - The ID of the player.
 * @param {number} [limit=10] - Maximum number of games to show.
 */
async function populatePlayerProfileRecentGames(container, playerId, limit = 10) {
    if (!container || !db) return;
    try {
        const gamesQuery = db.collection('games')
                             .where('participants', 'array-contains', playerId)
                             .orderBy('date_played', 'desc')
                             .limit(limit);

        const snapshot = await gamesQuery.get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">No recent games found.</p>';
            return;
        }

        if (!playersCachePopulated) await fetchAllPlayersForCache();

        let gamesHtml = '<ul class="space-y-3">';
        snapshot.forEach(doc => {
            const game = { id: doc.id, ...doc.data() };
            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
            const gameType = gameTypesConfig[game.game_type] || game.game_type || 'Unknown Game';
            let opponentName = 'N/A';
            let resultText = game.score || game.outcome || 'Result Unknown';

            if (game.participants && game.participants.length > 1) {
                const opponentId = game.participants.find(pId => pId !== playerId);
                if (opponentId) {
                    opponentName = globalPlayerCache[opponentId]?.name || 'Unknown Opponent';
                }
            }

            let description = `Played ${gameType}`;
            if (opponentName !== 'N/A') description += ` vs ${opponentName}`;
            if (game.outcome === 'Win/Loss') {
                resultText = (game.participants[0] === playerId) ? `Won (${resultText})` : `Lost (${resultText})`;
            } else if (game.outcome === 'Draw') {
                 resultText = `Draw (${resultText})`;
            }

            gamesHtml += `
                <li class="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0">
                    <a href="#game-info-section?gameId=${game.id}" class="nav-link block hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded" data-target="game-info-section">
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-medium text-gray-800 dark:text-gray-200">${description}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${gameDate}</span>
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">${resultText}</div>
                    </a>
                </li>`;
        });
        gamesHtml += '</ul>';

        container.innerHTML = gamesHtml;

    } catch (error) {
        console.error("[Profile Page] Error fetching recent games:", error);
        container.innerHTML = `<p class="error-text">Error loading recent games: ${error.message}</p>`;
    }
}

console.log("[Player Mgmt] player_management.js loaded.");
