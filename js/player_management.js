// --- player_management.js ---

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

// --- Add Player Modal Functions ---

/**
 * Opens the modal to add a new player.
 */
function openAddPlayerModal() {
    const modalElement = document.getElementById('add-player-modal');
    if (!modalElement) { console.error("Add Player modal element (#add-player-modal) not found."); return; }
    if (!db) { console.error("Add Player modal: DB not ready."); alert("Database connection error."); return; }

    // Define and Inject the specific HTML content for this modal
    const modalContentHTML = `
        <div class="modal-content">
            <button id="close-add-player-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Add New Player</h2>
            <form id="add-player-form">
                <div class="mb-4">
                    <label for="player-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Player Name:</label>
                    <input type="text" id="player-name" name="player-name" class="input-field w-full" required>
                </div>
                <div class="mb-5">
                    <label for="player-icon-url" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Icon URL (Optional):</label>
                    <input type="url" id="player-icon-url" name="player-icon-url" class="input-field w-full" placeholder="https://example.com/icon.png">
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a URL for the player's avatar/icon.</p>
                </div>
                <p id="add-player-error" class="text-red-500 text-sm mt-2 h-4"></p>
                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="cancel-add-player-modal-btn" class="button button-secondary">Cancel</button>
                    <button type="submit" class="button button-primary">Add Player</button>
                </div>
            </form>
        </div>`;
    modalElement.innerHTML = modalContentHTML;

    // Attach listeners *after* injecting HTML
    modalElement.querySelector('#close-add-player-modal-btn')?.addEventListener('click', closeAddPlayerModal);
    modalElement.querySelector('#cancel-add-player-modal-btn')?.addEventListener('click', closeAddPlayerModal);
    modalElement.querySelector('#add-player-form')?.addEventListener('submit', handleAddPlayerSubmit);

    openModal(modalElement); // Use generic openModal
}

/**
 * Closes the Add Player modal.
 */
function closeAddPlayerModal() {
    const modalElement = document.getElementById('add-player-modal');
    if (modalElement) closeModal(modalElement); // Use generic close
}

/**
 * Handles submission of the Add Player modal form.
 */
async function handleAddPlayerSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorElement = form.querySelector('#add-player-error');
    if (!db) { alert("Database connection error."); return; }

    if (errorElement) errorElement.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    const playerName = form.querySelector('#player-name').value.trim();
    const playerIconUrl = form.querySelector('#player-icon-url').value.trim();

    if (!playerName) {
        if (errorElement) errorElement.textContent = "Player name is required.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Player';
        return;
    }

    const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;
    const playerData = {
        name: playerName,
        iconUrl: playerIconUrl || null,
        isAdmin: false, // Default to not admin
        date_created: firebase.firestore.FieldValue.serverTimestamp(),
        elos: { overall: defaultElo },
        elo_overall: defaultElo,
        wins: 0, losses: 0, draws: 0, games_played: 0,
        golf_handicap: null
    };

    try {
        // Add player to Firestore (let Firestore generate the ID)
        const docRef = await db.collection('players').add(playerData);
        console.log(`[FIRESTORE] Player "${playerName}" added successfully with ID: ${docRef.id}`);
        alert(`Player "${playerName}" added successfully!`);

        // Refresh player list UI and cache
        playersCachePopulated = false; // Invalidate cache
        await fetchAllPlayersForCache(); // Repopulate cache
        if (typeof populatePlayersList === 'function' && currentSectionId === 'players-section') {
            await populatePlayersList(); // Refresh grid if function exists and section is active
        }
        // Refresh dropdowns that use players (e.g., submit score)
        if (typeof populatePlayerDropdowns === 'function') { // Assuming a helper function exists
             await populatePlayerDropdowns();
        }

        closeAddPlayerModal(); // Close the modal on success

    } catch (error) {
        console.error("Error adding player:", error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
        alert(`Failed to add player: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Add Player';
    }
}

// --- Player List Population (Players Section) ---

/**
 * Populates the players list grid.
 */
async function populatePlayersList() {
    console.log("[Players] Populating players list...");
    const playersListContainer = document.getElementById('players-list-container');
    const sortFilter = document.getElementById('players-sort-filter');

    if (!playersListContainer || !sortFilter) {
        console.error("[Players] Players list container or sort filter not found.");
        if (playersListContainer) playersListContainer.innerHTML = '<p class="error-text text-center py-5 col-span-full">Error loading player list structure.</p>';
        return;
    }

    // Add listener for sorting change (if not already added)
    if (!sortFilter.dataset.listenerAttached) {
        sortFilter.addEventListener('change', populatePlayersList);
        sortFilter.dataset.listenerAttached = 'true'; // Mark as attached
        console.log("[Players] Attached change listener to sort filter.");
    }
     // Add listener for Add Player button (if not already added)
    const addPlayerBtn = document.getElementById('add-player-btn');
    if (addPlayerBtn && !addPlayerBtn.dataset.listenerAttached) {
        addPlayerBtn.addEventListener('click', () => {
            if (typeof openAddPlayerModal === 'function') {
                openAddPlayerModal();
            } else {
                console.error("openAddPlayerModal function not found.");
            }
        });
        addPlayerBtn.dataset.listenerAttached = 'true';
        console.log("[Players] Attached click listener to Add Player button.");
    }


    playersListContainer.innerHTML = '<p class="loading-text text-center py-5 col-span-full text-gray-600 dark:text-gray-400">Loading players...</p>';

    if (!db) {
        playersListContainer.innerHTML = '<p class="error-text text-center py-5 col-span-full">Database connection error.</p>';
        return;
    }

    const sortBy = sortFilter.value || 'name';
    let sortDirection = 'asc';
    if (sortBy === 'elo_overall') {
        sortDirection = 'desc';
    }

    try {
        const snapshot = await db.collection('players').orderBy(sortBy, sortDirection).get();

        if (snapshot.empty) {
            playersListContainer.innerHTML = '<p class="muted-text text-center py-5 col-span-full">No players found.</p>';
            return;
        }

        playersListContainer.innerHTML = ''; // Clear loading message
        const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;

        snapshot.forEach(doc => {
            const player = { id: doc.id, ...doc.data() };
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card card bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 flex flex-col items-center text-center cursor-pointer'; // Added cursor-pointer
            playerCard.dataset.playerId = player.id; // Store player ID

            // Prioritize iconUrl, then photo_url, then generated avatar
            const avatarUrl = player.iconUrl || player.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || '?')}&background=random&color=fff&size=64`;
            const overallElo = Math.round(player.elo_overall || defaultElo);

            playerCard.innerHTML = `
                <img src="${avatarUrl}" alt="${player.name || 'Player'}'s avatar" class="w-16 h-16 rounded-full mb-3 object-cover border-2 border-gray-200 dark:border-gray-600">
                <h3 class="font-semibold text-base mb-1 truncate w-full">${player.name || 'Unnamed Player'}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Elo: ${overallElo}</p>
            `;

            // Add click listener to the card itself
            playerCard.addEventListener('click', () => {
                console.log(`[Players] Player card clicked: ${player.id}`);
                if (typeof showSection === 'function') {
                    showSection('player-profile-section', true, { playerId: player.id });
                } else {
                    console.error("[Players] showSection function not found for navigation.");
                    window.location.hash = `#player-profile-section?playerId=${player.id}`; // Fallback
                }
            });

            playersListContainer.appendChild(playerCard);
        });

        console.log(`[Players] Populated ${snapshot.size} players, sorted by ${sortBy} ${sortDirection}.`);

    } catch (error) {
        console.error("[Players] Error fetching players:", error);
        playersListContainer.innerHTML = `<p class="error-text text-center py-5 col-span-full">Error loading players: ${error.message}</p>`;
        if (error.code === 'failed-precondition') {
            console.error(`Firestore index required: 'players' collection, '${sortBy}' field (${sortDirection}).`);
        }
    }
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
    const backButton = document.getElementById('player-profile-back-button'); // Get back button

    if (!profileSection || !profileNameEl || !profileImageEl || !eloRatingsContainer || !gamesPlayedContainer || !recentGamesContainer || !backButton) { // Check back button too
        console.error("[Profile Page] One or more essential profile elements not found.");
        const mainContent = document.getElementById('main-content');
        if(mainContent) mainContent.innerHTML = '<p class="error-text">Error loading profile page structure.</p>';
        return;
    }

    // --- Update Back Button Context ---
    // Use global previousSectionId and previousQueryParams from main.js
    let backLink = '#players-section'; // Default link
    let backText = 'Back to Players'; // Default text

    if (previousSectionId) {
        switch (previousSectionId) {
            case 'rankings-section':
                backLink = `#rankings-section?${previousQueryParams.toString()}`;
                backText = 'Back to Rankings';
                break;
            case 'results-section':
                 backLink = `#results-section?${previousQueryParams.toString()}`;
                 backText = 'Back to Results';
                 break;
            case 'tournaments-section':
                 backLink = `#tournaments-section?${previousQueryParams.toString()}`;
                 backText = 'Back to Tournaments';
                 break;
             case 'tournament-detail-section':
                 backLink = `#tournament-detail-section?${previousQueryParams.toString()}`;
                 backText = 'Back to Tournament';
                 break;
            // Add more cases as needed for other sections linking to profiles
            case 'players-section': // Explicitly handle coming from players list
            default:
                backLink = `#players-section?${previousQueryParams.toString()}`; // Keep potential sort/filter
                backText = 'Back to Players';
                break;
        }
    }
    backButton.href = backLink;
    backButton.textContent = `\u2190 ${backText}`; // Add arrow
    console.log(`[Profile Page] Set back button to: ${backText} (${backLink})`);
    // --- End Back Button Context ---


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
        // 1. Fetch Player Data (Ensure cache is populated if needed)
        if (!playersCachePopulated) {
            console.log("[Profile Page] Player cache not populated, fetching...");
            await fetchAllPlayersForCache();
            if (!playersCachePopulated) { // Check again after attempting fetch
                 throw new Error("Failed to populate player cache.");
            }
        }

        const playerData = globalPlayerCache[playerId]; // Use cache

        if (!playerData) {
             // Attempt direct fetch as fallback if cache failed or player missing
             console.warn(`[Profile Page] Player ${playerId} not found in cache, attempting direct fetch...`);
             const playerDoc = await db.collection('players').doc(playerId).get();
             if (!playerDoc.exists) {
                 throw new Error(`Player not found with ID: ${playerId}`);
             }
             // Add to cache if fetched directly
             globalPlayerCache[playerId] = { id: playerDoc.id, ...playerDoc.data() };
             playerData = globalPlayerCache[playerId];
             console.log(`[Profile Page] Successfully fetched player ${playerId} directly.`);
        }


        // Update Header
        profileNameEl.textContent = playerData.name || 'Unnamed Player';
        // Use iconUrl if available, fallback to photoURL, then to generated avatar
        profileImageEl.src =
            playerData.iconUrl || // Prioritize iconUrl
            playerData.photoURL || // Fallback to photoURL (if it exists)
            `https://ui-avatars.com/api/?name=${encodeURIComponent(playerData.name || '?')}&background=random&color=fff&size=128`; // Final fallback: generated
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
        profileImageEl.src = `https://ui-avatars.com/api/?name=X&background=FEE2E2&color=DC2626&size=128`; // Error avatar
        eloRatingsContainer.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
        gamesPlayedContainer.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
        recentGamesContainer.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
    }
}

/**
 * Populates the Elo ratings section of the player profile.
 * @param {HTMLElement} container - The container element for ratings.
 * @param {object} elos - The player's elos object (e.g., { overall: 1050, pool: 1100, golf_handicap: 12.3 }).
 */
async function populatePlayerProfileRatings(container, elos) {
    if (!container) return;
    let ratingsHtml = '<ul class="space-y-1 text-sm">';
    let hasRatings = false;
    const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000; // Use default ELO

    // Use a Map to store ratings, ensuring 'overall' comes first if present.
    const ratingsMap = new Map();

    // Add Overall first if it exists
    if (elos && elos.overall !== undefined && elos.overall !== null) {
        ratingsMap.set('overall', { name: 'Overall', rating: Math.round(elos.overall) });
        hasRatings = true;
    }

    // Add other game Elos, sorted alphabetically by game name
    // Use window.globalGameConfigs
    if (elos && typeof window.globalGameConfigs === 'object' && window.globalGameConfigs !== null) {
        const sortedGameElos = Object.entries(elos)
            .filter(([key, value]) => key !== 'overall' && key !== 'golf_handicap' && value !== undefined && value !== null)
            // Use window.globalGameConfigs here
            .map(([key, rating]) => ({ key, name: window.globalGameConfigs[key]?.name || key, rating: Math.round(rating) }))
            .sort((a, b) => a.name.localeCompare(b.name));

        sortedGameElos.forEach(item => {
            ratingsMap.set(item.key, item);
            hasRatings = true;
        });
    }

    // Add Golf Handicap last if it exists
    if (elos && elos.golf_handicap !== undefined && elos.golf_handicap !== null) {
        ratingsMap.set('golf_handicap', { name: 'Golf Handicap', rating: elos.golf_handicap.toFixed(1) });
        hasRatings = true;
    }

    // Generate HTML from the map
    if (hasRatings) {
        ratingsMap.forEach(item => {
            ratingsHtml += `<li class="flex justify-between"><span>${item.name}:</span> <strong class="font-medium">${item.rating}</strong></li>`;
        });
    } else {
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
        // Fetch player document directly for stats
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists) {
            container.innerHTML = '<p class="error-text">Player data not found.</p>';
            return;
        }
        const player = playerDoc.data();

        const totalGames = player.games_played || 0;
        const wins = player.wins || 0;
        const losses = player.losses || 0;
        const draws = player.draws || 0;
        const totalDecided = wins + losses;
        const winRate = totalDecided > 0 ? ((wins / totalDecided) * 100).toFixed(1) : 'N/A';

        let statsHtml = `<ul class="space-y-1 text-sm">`;
        statsHtml += `<li class="flex justify-between"><span>Total Played:</span> <strong>${totalGames}</strong></li>`;
        statsHtml += `<li class="flex justify-between"><span>Wins:</span> <strong class="text-green-600 dark:text-green-400">${wins}</strong></li>`;
        statsHtml += `<li class="flex justify-between"><span>Losses:</span> <strong class="text-red-600 dark:text-red-400">${losses}</strong></li>`;
        statsHtml += `<li class="flex justify-between"><span>Draws:</span> <strong class="text-gray-600 dark:text-gray-400">${draws}</strong></li>`;
        statsHtml += `<li class="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600"><span>Win Rate:</span> <strong>${winRate}${winRate !== 'N/A' ? '%' : ''}</strong></li>`;
        statsHtml += '</ul>';

        // Add breakdown by game type if available
        // Use window.globalGameConfigs
        if (player.games_played_by_type && typeof window.globalGameConfigs !== 'undefined') {
             statsHtml += '<h3 class="text-md font-semibold mt-4 mb-2 pt-2 border-t border-gray-200 dark:border-gray-600">By Game:</h3>';
             statsHtml += '<ul class="space-y-1 text-xs">';
             // Sort games by name before displaying
             const sortedGames = Object.entries(player.games_played_by_type)
                // Use window.globalGameConfigs here
                .map(([key, count]) => ({ key, name: window.globalGameConfigs[key]?.name || key, count }))
                .sort((a, b) => a.name.localeCompare(b.name));

             sortedGames.forEach(({ name, count }) => {
                 statsHtml += `<li class="flex justify-between"><span>${name}:</span> <span>${count} played</span></li>`;
             });
             statsHtml += '</ul>';
        }

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

        // Ensure configs and players are ready
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs(); // Ensure configs are loaded
        if (!playersCachePopulated) await fetchAllPlayersForCache();

        let gamesHtml = '<ul class="space-y-3">';
        snapshot.forEach(doc => {
            const game = { id: doc.id, ...doc.data() };
            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
            // Use window.globalGameConfigs
            const gameType = window.globalGameConfigs[game.game_type]?.name || game.game_type || 'Unknown Game';
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
        console.error(`[Profile Page] Error fetching recent games for player ${playerId}:`, error);
        container.innerHTML = `<p class="error-text">Error loading recent games: ${error.message}</p>`;
    }
}

console.log("[Player Mgmt] player_management.js loaded.");
