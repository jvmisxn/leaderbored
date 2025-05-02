// --- results.js ---

let allGamesCache = []; // Cache for all fetched games
let currentResultsFilter = 'all'; // Keep track of the current filter

// --- Helper Functions ---

/**
 * Populates the game filter dropdown in the results section.
 */
async function populateResultsFilter() {
    const filterSelect = document.getElementById('results-game-filter');
    if (!filterSelect) {
        console.error("[Results Filter] Filter select element (#results-game-filter) not found.");
        return;
    }

    try {
        if (!window.globalGameConfigs) {
            console.log("[Results Filter] Configs not ready, fetching...");
            await fetchAndCacheGameConfigs();
        }
        const gameConfigs = window.globalGameConfigs || {};

        filterSelect.innerHTML = '<option value="all">All Games</option>'; // Start with 'All Games'
        Object.entries(gameConfigs)
            .sort(([, a], [, b]) => a.name.localeCompare(b.name)) // Sort by game name
            .forEach(([key, config]) => {
                const option = new Option(config.name || key, key);
                filterSelect.add(option);
            });
        console.log("[Results Filter] Populated results filter dropdown.");

        // Attach listener if not already attached
        if (!filterSelect.dataset.listenerAttached) {
            filterSelect.addEventListener('change', handleResultsFilterChange);
            filterSelect.dataset.listenerAttached = 'true';
            console.log("[Results Filter] Attached change listener.");
        }

    } catch (error) {
        console.error("[Results Filter] Error populating filter:", error);
        filterSelect.innerHTML = '<option value="all">Error loading filters</option>';
    }
}

/**
 * Handles changes to the results game filter.
 */
function handleResultsFilterChange() {
    console.log("[Results] Filter changed, reloading results...");
    populateResultsTable(); // Reload the table with the new filter applied
}

/**
 * Fetches game results based on the selected filter.
 * @param {string} gameTypeFilter - The game type key to filter by ('all' for no filter).
 * @param {number} limit - Maximum number of results to fetch.
 * @returns {Promise<Array>} - A promise resolving to an array of game objects.
 */
async function fetchGameResults(gameTypeFilter = 'all', limit = 50) {
    if (!db) {
        console.error("[Results Data] Firestore DB not available.");
        return [];
    }
    console.log(`[Results Data] Fetching results (Filter: ${gameTypeFilter}, Limit: ${limit})...`);
    try {
        let query = db.collection('games').orderBy('date_played', 'desc');

        if (gameTypeFilter !== 'all') {
            query = query.where('game_type', '==', gameTypeFilter);
        }

        query = query.limit(limit);
        const snapshot = await query.get();

        const results = [];
        snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
        console.log(`[Results Data] Fetched ${results.length} game results.`);
        return results;

    } catch (error) {
        console.error(`[Results Data] Error fetching game results (Filter: ${gameTypeFilter}):`, error);
        if (error.code === 'failed-precondition') {
             console.error(`Firestore index required for fetching results. Filter: ${gameTypeFilter}, Order: date_played desc.`);
        }
        return []; // Return empty array on error
    }
}

/**
 * Populates the results table body with fetched game data.
 */
async function populateResultsTable() {
    const tableBody = document.getElementById('results-table-body');
    const filterSelect = document.getElementById('results-game-filter');

    if (!tableBody || !filterSelect) {
        console.error("[Results Table] Table body or filter select not found.");
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error: Page structure missing.</td></tr>`;
        return;
    }

    const selectedGameType = filterSelect.value || 'all';
    tableBody.innerHTML = `<tr><td colspan="6" class="loading-text text-center py-4">Loading results for ${selectedGameType === 'all' ? 'all games' : (window.globalGameConfigs[selectedGameType]?.name || selectedGameType)}...</td></tr>`;

    try {
        // Ensure necessary caches are ready
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
        if (!playersCachePopulated) await fetchAllPlayersForCache();

        const results = await fetchGameResults(selectedGameType);

        if (results.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="muted-text text-center py-4">No results found for this filter.</td></tr>`;
            return;
        }

        tableBody.innerHTML = ''; // Clear loading message
        results.forEach(game => {
            const row = tableBody.insertRow();
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150';

            const gameConfig = window.globalGameConfigs[game.game_type] || {};
            const gameName = gameConfig.name || game.game_type || 'N/A';
            const datePlayed = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'N/A';

            let player1Name = 'N/A';
            let player2Name = 'N/A';
            let scoreText = game.score || 'N/A';
            let outcomeText = game.outcome || 'N/A';

            if (game.participants && game.participants.length > 0) {
                player1Name = getPlayerNameFromCache(game.participants[0]);
                if (game.participants.length > 1) {
                    player2Name = getPlayerNameFromCache(game.participants[1]);
                }
            }

            // Format score/outcome based on game type (example for Golf)
            if (game.game_type === 'golf' && game.scores) {
                 // Assuming scores is an array of objects like [{ playerId, score, strokes, putts, ... }]
                 const player1Score = game.scores.find(s => s.playerId === game.participants[0]);
                 const player2Score = game.scores.find(s => s.playerId === game.participants[1]);
                 scoreText = `${player1Score?.score || '-'} / ${player2Score?.score || '-'}`;
                 // Determine winner based on lower score for golf
                 if (player1Score && player2Score) {
                     if (player1Score.score < player2Score.score) outcomeText = `${player1Name} Wins`;
                     else if (player2Score.score < player1Score.score) outcomeText = `${player2Name} Wins`;
                     else outcomeText = 'Draw';
                 } else {
                     outcomeText = 'Incomplete';
                 }
            } else if (game.outcome === 'Win/Loss' && player1Name !== 'N/A' && player2Name !== 'N/A') {
                // Assuming participant[0] is winner if outcome is Win/Loss
                outcomeText = `${player1Name} Wins`;
            } else if (game.outcome === 'Draw') {
                 outcomeText = 'Draw';
            }

            // Add cells
            row.insertCell().textContent = gameName;
            row.insertCell().textContent = datePlayed;
            row.insertCell().textContent = player1Name;
            row.insertCell().textContent = player2Name;
            row.insertCell().textContent = scoreText;
            row.insertCell().textContent = outcomeText;

            // Add link/button to view game details
            const detailsCell = row.insertCell();
            detailsCell.className = 'text-center';
            const detailsLink = document.createElement('a');
            detailsLink.href = `#game-info-section?gameId=${game.id}`;
            detailsLink.className = 'nav-link text-indigo-600 dark:text-indigo-400 hover:underline text-xs';
            detailsLink.textContent = 'Details';
            detailsLink.dataset.target = 'game-info-section';
            detailsCell.appendChild(detailsLink);

        });

    } catch (error) {
        console.error("[Results Table] Error populating results table:", error);
        tableBody.innerHTML = `<tr><td colspan="7" class="error-text text-center py-4">Error loading results: ${error.message}</td></tr>`; // Increased colspan
    }
}

// --- Main Initialization ---

/**
 * Main function to initialize and populate the results section.
 * Called by main.js when the results section is loaded.
 */
async function populateResults() {
    console.log("[Results] Initializing results section...");
    const resultsGameFilter = document.getElementById('results-game-filter');
    const resultsTableBody = document.getElementById('results-table-body');

    if (!resultsGameFilter || !resultsTableBody) {
        console.error("[Results] Filter select or results table body not found.");
        if (resultsTableBody) {
            resultsTableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error: Page structure missing for results.</td></tr>`;
        }
        return;
    }

    // 1. Populate the filter dropdown
    if (typeof populateResultsFilter === 'function') {
        await populateResultsFilter(); // Ensure this uses the correct element ID
    } else {
        console.error("[Results] populateResultsFilter function not found.");
        resultsGameFilter.innerHTML = '<option value="all">Error loading filters</option>';
    }

    // 2. Populate the table initially (using default 'all' filter)
    if (typeof populateResultsTable === 'function') {
        await populateResultsTable();
    } else {
        console.error("[Results] populateResultsTable function not found.");
        resultsTableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error loading results table component.</td></tr>`;
    }

    console.log("[Results] Section initialization complete.");
}

console.log("[Results] results.js loaded.");