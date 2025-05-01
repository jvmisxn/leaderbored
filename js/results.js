// --- results.js ---

let allGamesCache = []; // Cache for all fetched games
let currentResultsFilter = 'all'; // Keep track of the current filter

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

    // 2. Attach the event listener to the filter
    resultsGameFilter.removeEventListener('change', handleResultsFilterChange);
    resultsGameFilter.addEventListener('change', handleResultsFilterChange);
    console.log("[Results] Attached change listener to results filter.");

    // 3. Trigger the initial table population based on the default filter value
    if (typeof populateResultsTable === 'function') {
        console.log("[Results] Triggering initial results table population.");
        await populateResultsTable(); // This function will read the filter value
    } else {
        console.error("[Results] populateResultsTable function not found.");
        resultsTableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error: Results loading function unavailable.</td></tr>`;
    }
}

/**
 * Populates the results game filter dropdown.
 */
async function populateResultsFilter() {
    console.log("[Results Filter] Populating filter dropdown...");
    const resultsGameFilter = document.getElementById('results-game-filter');
    if (!resultsGameFilter) {
        console.warn("[Results Filter] Filter select element (#results-game-filter) not found.");
        return;
    }

    // Ensure configs are loaded before proceeding
    try {
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs(); // Await the config fetch
    } catch (error) {
        console.error("[Results Filter] Failed to fetch game configs.", error);
        resultsGameFilter.innerHTML = '<option value="all">All Games (Error)</option>';
        return;
    }

    // Clear existing options except the default 'All Games'
    resultsGameFilter.innerHTML = '<option value="all">All Games</option>';

    // Add options from gameTypesConfig (ensure gameTypesConfig is accessible)
    if (typeof window.globalGameConfigs === 'object' && window.globalGameConfigs !== null) {
        // Sort game types alphabetically by name for the dropdown
        const sortedGameTypes = Object.entries(window.globalGameConfigs)
            .sort(([, configA], [, configB]) => (configA.name || '').localeCompare(configB.name || ''));

        sortedGameTypes.forEach(([key, config]) => {
            const name = config.name || key; // Fallback to key if name is missing
            const option = new Option(name, key); // Text is the game name, value is the key
            resultsGameFilter.add(option);
        });
        console.log("[Results Filter] Finished adding game types from config:", Object.keys(window.globalGameConfigs));
    } else {
        console.warn("[Results Filter] gameTypesConfig not found or invalid. Only 'All Games' will be available.");
    }
}

/**
 * Handles the change event for the results game filter dropdown.
 */
async function handleResultsFilterChange() {
    console.log("[Results] Filter change detected.");
    if (typeof populateResultsTable === 'function') {
        await populateResultsTable(); // Re-populate the table with the new filter
    } else {
        console.error("[Results] populateResultsTable function not found during filter change.");
        const resultsTableBody = document.getElementById('results-table-body');
        if (resultsTableBody) {
            resultsTableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error updating results view.</td></tr>`;
        }
    }
}

/**
 * Fetches game results from Firestore and populates the results table.
 * Reads the filter value from the dropdown.
 * @param {number} [limit=25] - Maximum number of results to fetch.
 */
async function populateResultsTable(limit = 25) {
    const resultsTableBody = document.getElementById('results-table-body');
    const resultsGameFilter = document.getElementById('results-game-filter');

    if (!resultsTableBody || !resultsGameFilter) {
        console.error("[Results Table] Table body or filter element not found.");
        if (resultsTableBody) resultsTableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error: Page structure missing.</td></tr>`;
        return;
    }

    const selectedGame = resultsGameFilter.value;
    console.log(`[Results Table] Populating results for game type: ${selectedGame} (limit: ${limit})`);
    resultsTableBody.innerHTML = `<tr><td colspan="6" class="loading-text text-center py-4 text-gray-600 dark:text-gray-400">Loading game results...</td></tr>`;

    if (!db) {
        console.error("[Results Table] Firestore DB not available.");
        resultsTableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Database connection error.</td></tr>`;
        return;
    }

    // Ensure necessary caches are ready
    try {
        if (!playersCachePopulated) await fetchAllPlayersForCache();
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
        if (selectedGame === 'golf' && !golfCourseCachePopulated) await ensureGolfCourseCache();
    } catch (error) {
        console.error("[Results Table] Error preparing caches:", error);
        resultsTableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error loading required data: ${error.message}</td></tr>`;
        return;
    }

    try {
        let query = db.collection('games');

        // Apply filter if not 'all'
        if (selectedGame !== 'all') {
            query = query.where('game_type', '==', selectedGame);
        }

        query = query.orderBy('date_played', 'desc').limit(limit);

        const snapshot = await query.get();

        if (snapshot.empty) {
            resultsTableBody.innerHTML = `<tr><td colspan="6" class="muted-text text-center py-4">No game results found${selectedGame !== 'all' ? ` for ${window.globalGameConfigs[selectedGame]?.name || selectedGame}` : ''}.</td></tr>`;
            return;
        }

        resultsTableBody.innerHTML = ''; // Clear loading message
        snapshot.forEach(doc => {
            const game = { id: doc.id, ...doc.data() };
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700';

            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
            const gameType = window.globalGameConfigs[game.game_type]?.name || game.game_type || 'Unknown Game';
            let description = '';
            let courseName = '';
            let courseLocation = '';

            // --- Build Description ---
            const participants = game.participants || [];
            const team1 = game.team1_participants || [];
            const team2 = game.team2_participants || [];
            const participantNames = participants.map(id => getPlayerNameFromCache(id));
            const team1Names = team1.map(id => getPlayerNameFromCache(id));
            const team2Names = team2.map(id => getPlayerNameFromCache(id));

            if (game.outcome === 'Win/Loss') {
                if (team1.length > 0 && team2.length > 0) { // Team Win/Loss
                    description = `Team (${team1Names.join(', ')}) beat Team (${team2Names.join(', ')})`;
                } else if (participantNames.length >= 2) { // 1v1 Win/Loss
                    description = `${participantNames[0]} beat ${participantNames[1]}`;
                } else {
                    description = `Win/Loss recorded`; // Fallback
                }
            } else if (game.outcome === 'Draw') {
                if (team1.length > 0 && team2.length > 0) { // Team Draw
                    description = `Team (${team1Names.join(', ')}) drew with Team (${team2Names.join(', ')})`;
                } else if (participantNames.length >= 2) { // 1v1 Draw
                    description = `${participantNames[0]} drew with ${participantNames[1]}`;
                } else {
                    description = `Draw recorded`; // Fallback
                }
            } else if (game.outcome === 'Solo Complete' && participantNames.length === 1) {
                description = `${participantNames[0]} completed`;
            } else if (game.game_type === 'golf' && participantNames.length === 1) {
                description = `${participantNames[0]} played Golf`;
            } else { // Fallback or other outcomes
                description = `Game played by ${participantNames.join(', ')}`;
            }

            if (game.score) {
                description += ` (${game.score})`;
            }
            if (game.game_type === 'chess' && game.chess_outcome) {
                description += ` [${game.chess_outcome}]`;
            }

            // --- Get Golf Course Info ---
            if (game.game_type === 'golf' && game.course_id) {
                const course = globalGolfCourseCache[game.course_id];
                if (course) {
                    courseName = course.name || 'Unknown Course';
                    courseLocation = course.location || '';
                } else {
                    courseName = 'Course Info Missing';
                }
            }

            // --- Populate Table Row ---
            tr.innerHTML = `
                <td class="px-4 py-3">${gameDate}</td>
                <td class="px-4 py-3">${gameType}</td>
                <td class="px-4 py-3">${description}</td>
                <td class="px-4 py-3 golf-column">${courseName}</td>
                <td class="px-4 py-3 golf-column">${courseLocation}</td>
                <td class="px-4 py-3">
                    <a href="#game-info-section?gameId=${game.id}" class="nav-link text-indigo-600 dark:text-indigo-400 hover:underline" data-target="game-info-section">Details</a>
                </td>
            `;
            resultsTableBody.appendChild(tr);
        });

        // Show/hide golf columns based on filter
        updateGolfColumnsVisibility(selectedGame === 'golf' || selectedGame === 'all');

    } catch (error) {
        console.error("[Results Table] Error fetching results:", error);
        resultsTableBody.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error loading results: ${error.message}</td></tr>`;
        if (error.code === 'failed-precondition') {
            console.error("Firestore index required: 'games' collection, 'date_played' field (descending). Add composite index if filtering by game_type.");
        }
    }
}

/**
 * Shows or hides the golf-specific columns in the results table.
 * @param {boolean} show - Whether to show the golf columns.
 */
function updateGolfColumnsVisibility(show) {
    const table = document.getElementById('results-table');
    if (!table) return;
    const golfColumns = table.querySelectorAll('.golf-column');
    golfColumns.forEach(col => {
        col.style.display = show ? '' : 'none'; // Use '' to revert to default (table-cell) or 'none' to hide
    });
    // Adjust colspan of loading/error messages if needed (though they should be replaced by data)
    const messageCells = table.querySelectorAll('.loading-text, .muted-text, .error-text');
    messageCells.forEach(cell => {
        if (cell.parentElement.cells.length === 1) { // Check if it's a full-row message
            cell.colSpan = show ? 6 : 4; // Adjust colspan based on visible columns
        }
    });
}

console.log("[Results] results.js loaded.");
