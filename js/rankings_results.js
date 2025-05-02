// --- rankings_results.js ---

// Global constants (assuming these are defined elsewhere or imported)
// const DEFAULT_ELO = 1000;

/**
 * Main function to initialize and populate the rankings section.
 * Called by main.js when the rankings section is loaded.
 */
async function populateRankings() {
    console.log("[Rankings] Populating rankings section...");
    const rankingsContainer = document.getElementById('ranking-tables-container');
    const gameFilterSelect = document.getElementById('rankings-game-filter');

    // **Robustness Check:** Ensure elements exist before proceeding
    if (!rankingsContainer || !gameFilterSelect) {
        console.error("[Rankings] CRITICAL: Rankings container (#ranking-tables-container) or filter select (#rankings-game-filter) not found in the DOM. Check the 'template-rankings-section' in your HTML.");
        if (rankingsContainer && !gameFilterSelect) {
            rankingsContainer.innerHTML = '<p class="error-text text-center py-10">Error: Rankings structure incomplete (missing filter).</p>';
        } else if (!rankingsContainer) {
            // If the main container is missing, we can't even show an error message inside it.
            // The error will be logged to the console.
        }
        return; // Stop execution if elements are missing
    }

    // Set initial loading state
    rankingsContainer.innerHTML = '<p class="loading-text text-center py-10">Loading rankings...</p>';
    gameFilterSelect.innerHTML = '<option value="overall">Overall Elo</option>'; // Start with overall

    try {
        // Ensure game configs are loaded for the filter dropdown
        if (!window.globalGameConfigs) {
            console.log("[Rankings] Waiting for game configs...");
            await fetchAndCacheGameConfigs();
        }

        // Populate the filter dropdown
        await populateRankingsFilter(gameFilterSelect);

        // Attach listener if not already attached
        if (!gameFilterSelect.dataset.listenerAttached) {
            gameFilterSelect.addEventListener('change', handleRankingsFilterChange);
            gameFilterSelect.dataset.listenerAttached = 'true';
            console.log("[Rankings] Attached change listener to rankings filter.");
        }

        // Initial population based on current filter value (or default 'overall')
        await handleRankingsFilterChange(); // This will read the select and populate the table

        console.log("[Rankings] Section populated successfully.");

    } catch (error) {
        console.error("[Rankings] Error populating rankings section:", error);
        rankingsContainer.innerHTML = `<p class="error-text text-center py-10">Error loading rankings: ${error.message}</p>`;
    }
}

/**
 * Populates the rankings game filter dropdown.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 */
async function populateRankingsFilter(selectElement) {
    // Assumes globalGameConfigs is populated
    if (!window.globalGameConfigs) {
        console.error("[Rankings Filter] Game configs not available.");
        selectElement.innerHTML = '<option value="overall">Overall Elo</option><option value="">Error loading games</option>';
        return;
    }

    // Start with 'Overall Elo'
    let optionsHtml = '<option value="overall">Overall Elo</option>';

    // Add options for each game type that supports Elo ranking
    const sortedGameConfigs = Object.entries(window.globalGameConfigs)
        .filter(([key, config]) => config.rankingSystem === 'elo' || key === 'golf') // Include Elo games and Golf
        .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''));

    sortedGameConfigs.forEach(([key, config]) => {
        const displayName = config.name || key;
        // Use 'golf_handicap' for golf's value if it's golf
        const value = key === 'golf' ? 'golf_handicap' : key;
        optionsHtml += `<option value="${value}">${displayName}</option>`;
    });

    selectElement.innerHTML = optionsHtml;
    console.log("[Rankings Filter] Populated rankings filter dropdown.");
}


/**
 * Handles the change event for the rankings game filter dropdown.
 */
async function handleRankingsFilterChange() {
    const gameFilterSelect = document.getElementById('rankings-game-filter');
    const rankingsContainer = document.getElementById('ranking-tables-container');

    if (!gameFilterSelect || !rankingsContainer) {
        console.error("[Rankings Change] Filter select or container not found.");
        return;
    }

    const selectedGameKey = gameFilterSelect.value;
    console.log(`[Rankings Change] Filter changed to: ${selectedGameKey}`);

    rankingsContainer.innerHTML = `<p class="loading-text text-center py-10">Loading ${selectedGameKey === 'overall' ? 'Overall' : (window.globalGameConfigs[selectedGameKey]?.name || selectedGameKey)} rankings...</p>`;

    try {
        // Ensure player cache is ready before populating rankings
        if (!playersCachePopulated) {
            console.log("[Rankings Change] Waiting for player cache...");
            await fetchAllPlayersForCache();
        }

        if (selectedGameKey === 'overall') {
            await populateOverallRankings(rankingsContainer);
        } else if (selectedGameKey === 'golf_handicap') {
            await populateGolfRankings(rankingsContainer); // Specific function for golf handicap
        } else {
            await populateGameRankings(selectedGameKey, rankingsContainer);
        }
    } catch (error) {
        console.error(`[Rankings Change] Error populating rankings for ${selectedGameKey}:`, error);
        rankingsContainer.innerHTML = `<p class="error-text text-center py-10">Error loading rankings: ${error.message}</p>`;
    }
}


/**
 * Populates a container with overall player rankings based on 'elo_overall'.
 * @param {HTMLElement} containerElement - The container element to populate.
 * @param {number} [limit=50] - The maximum number of players to display.
 */
async function populateOverallRankings(containerElement, limit = 50) {
    console.log(`[Rankings Data] Populating overall rankings (limit ${limit})...`);
    if (!db) return showErrorInContainer(containerElement, "Database connection error.");

    try {
        const snapshot = await db.collection('players')
                                 .orderBy('elo_overall', 'desc')
                                 .limit(limit)
                                 .get();

        if (snapshot.empty) {
            containerElement.innerHTML = '<p class="muted-text text-center py-5 italic">No players found for overall ranking.</p>';
            return;
        }

        const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;
        let tableHtml = createRankingTableHTML('Overall Elo'); // Use helper
        let rank = 1;
        snapshot.forEach(doc => {
            const player = { id: doc.id, ...doc.data() };
            const elo = Math.round(player.elo_overall || defaultElo);
            tableHtml += createRankingRowHTML(rank, player.id, player.name, elo, player.iconUrl || player.photoURL); // Use helper
            rank++;
        });
        tableHtml += '</tbody></table></div>'; // Close table structure

        containerElement.innerHTML = tableHtml;
        console.log(`[Rankings Data] Populated overall rankings table with ${snapshot.size} players.`);

    } catch (error) {
        console.error("[Rankings Data] Error fetching overall rankings:", error);
        showErrorInContainer(containerElement, `Error loading overall rankings: ${error.message}`);
        if (error.code === 'failed-precondition') {
            console.error("Firestore index required: 'players' collection, 'elo_overall' field (descending).");
        }
    }
}


/**
 * Populates a specific game's ranking table container.
 * @param {string} gameKey - The key of the game (e.g., 'pool', 'chess').
 * @param {HTMLElement} containerElement - The container element to populate.
 * @param {number} [limit=50] - Maximum number of players to show.
 */
async function populateGameRankings(gameKey, containerElement, limit = 50) {
    console.log(`[Rankings Data] Populating rankings for game: ${gameKey} (limit ${limit})...`);
    if (!db) return showErrorInContainer(containerElement, "Database connection error.");
    if (!gameKey || gameKey === 'overall' || gameKey === 'golf_handicap') { // golf handled separately
        return populateOverallRankings(containerElement, limit);
    }

    const gameConfig = window.globalGameConfigs ? window.globalGameConfigs[gameKey] : null;
    const gameName = gameConfig?.name || gameKey;
    const eloField = `elos.${gameKey}`; // Path to the Elo field in Firestore

    try {
        // Query players who have an Elo rating for this specific game
        const snapshot = await db.collection('players')
                                 .where(eloField, '>', 0) // Ensure the field exists and is numeric > 0 (adjust if needed)
                                 .orderBy(eloField, 'desc')
                                 .limit(limit)
                                 .get();

        if (snapshot.empty) {
            containerElement.innerHTML = `<p class="muted-text text-center py-5 italic">No players found with a ranking for ${gameName}.</p>`;
            return;
        }

        const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;
        let tableHtml = createRankingTableHTML(`${gameName} Elo`); // Use helper
        let rank = 1;
        snapshot.forEach(doc => {
            const player = { id: doc.id, ...doc.data() };
            // Access nested Elo rating safely
            const elo = Math.round(player.elos?.[gameKey] || defaultElo);
            tableHtml += createRankingRowHTML(rank, player.id, player.name, elo, player.iconUrl || player.photoURL); // Use helper
            rank++;
        });
        tableHtml += '</tbody></table></div>'; // Close table structure

        containerElement.innerHTML = tableHtml;
        console.log(`[Rankings Data] Populated ${gameName} rankings table with ${snapshot.size} players.`);

    } catch (error) {
        console.error(`[Rankings Data] Error fetching rankings for ${gameKey}:`, error);
        showErrorInContainer(containerElement, `Error loading ${gameName} rankings: ${error.message}`);
        if (error.code === 'failed-precondition') {
            console.error(`Firestore index required: 'players' collection, '${eloField}' field (descending).`);
        } else if (error.code === 'invalid-argument') {
             console.error(`Firestore query error for ${gameKey}: Ensure '${eloField}' exists and is comparable.`);
        }
    }
}

/**
 * Populates Golf rankings based on handicap (lower is better).
 * @param {HTMLElement} containerElement - The container element to populate.
 * @param {number} [limit=50] - Maximum number of players to show.
 */
async function populateGolfRankings(containerElement, limit = 50) {
    console.log(`[Rankings Data] Populating Golf Handicap rankings (limit ${limit})...`);
    if (!db) return showErrorInContainer(containerElement, "Database connection error.");

    try {
        // Query players who have a non-null handicap, order ascending (lower is better)
        const snapshot = await db.collection('players')
                                 .where('golf_handicap', '!=', null)
                                 .orderBy('golf_handicap', 'asc')
                                 .limit(limit)
                                 .get();

        if (snapshot.empty) {
            containerElement.innerHTML = '<p class="muted-text text-center py-5 italic">No players found with a Golf Handicap.</p>';
            return;
        }

        let tableHtml = createRankingTableHTML('Golf Handicap', 'Handicap'); // Use helper, specify rating header
        let rank = 1;
        snapshot.forEach(doc => {
            const player = { id: doc.id, ...doc.data() };
            const handicap = player.golf_handicap !== null ? player.golf_handicap.toFixed(1) : 'N/A';
            tableHtml += createRankingRowHTML(rank, player.id, player.name, handicap, player.iconUrl || player.photoURL); // Use helper
            rank++;
        });
        tableHtml += '</tbody></table></div>'; // Close table structure

        containerElement.innerHTML = tableHtml;
        console.log(`[Rankings Data] Populated Golf Handicap rankings table with ${snapshot.size} players.`);

    } catch (error) {
        console.error("[Rankings Data] Error fetching Golf Handicap rankings:", error);
        showErrorInContainer(containerElement, `Error loading Golf rankings: ${error.message}`);
        if (error.code === 'failed-precondition') {
            console.error("Firestore index required: 'players' collection, 'golf_handicap' field (ascending), where 'golf_handicap' != null.");
        }
    }
}


// --- Helper Functions for Table Creation ---

/**
 * Creates the basic HTML structure for a ranking table.
 * @param {string} title - The title for the table (e.g., "Overall Elo", "Pool Elo").
 * @param {string} [ratingHeader='Rating'] - The header text for the rating column.
 * @returns {string} HTML string for the table structure.
 */
function createRankingTableHTML(title, ratingHeader = 'Rating') {
    return `
        <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
            <h2 class="text-xl font-semibold p-4 border-b dark:border-gray-700">${title}</h2>
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">Rank</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Player</th>
                        <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">${ratingHeader}</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
    `; // Table body will be closed after rows are added
}

/**
 * Creates the HTML string for a single row in a ranking table.
 * @param {number} rank - The player's rank.
 * @param {string} playerId - The player's ID.
 * @param {string} playerName - The player's name.
 * @param {number|string} rating - The player's rating or handicap.
 * @param {string|null} avatarUrl - The URL for the player's avatar.
 * @returns {string} HTML string for the table row.
 */
function createRankingRowHTML(rank, playerId, playerName, rating, avatarUrl) {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName || '?')}&background=random&color=fff&size=32`;
    const playerAvatar = avatarUrl || defaultAvatar;
    const nameDisplay = playerName || 'Unnamed Player';

    return `
        <tr>
            <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${rank}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm">
                <a href="#player-profile-section?playerId=${playerId}" class="nav-link flex items-center group" data-target="player-profile-section">
                    <img class="h-8 w-8 rounded-full object-cover mr-3 flex-shrink-0 bg-gray-300 dark:bg-gray-600" src="${playerAvatar}" alt="${nameDisplay}">
                    <span class="font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">${nameDisplay}</span>
                </a>
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right font-medium">${rating}</td>
        </tr>
    `;
}

// Helper to show error within a container element
function showErrorInContainer(container, message) {
    if (container) {
        container.innerHTML = `<p class="error-text text-center py-5">${message}</p>`;
    } else {
        console.error("Cannot show error, container element not found.");
    }
}


// Note: This file assumes that 'firebase', 'db',
// 'gameTypesConfig', 'DEFAULT_ELO', 'K_FACTOR', 'globalPlayerCache',
// 'playersCachePopulated', 'fetchAllPlayersForCache', 'showSection'
// are initialized and accessible globally or imported/passed appropriately
console.log("[Rankings/Results] rankings_results.js loaded.");