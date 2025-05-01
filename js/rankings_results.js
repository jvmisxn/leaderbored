// --- rankings_results.js ---

/**
 * Main function to initialize and populate the rankings section.
 * Called by main.js when the rankings section is loaded.
 */
async function populateRankings() {
    console.log("[RANKING] Initializing rankings section...");
    const rankingsGameFilter = document.getElementById('rankings-game-filter');
    const rankingTablesContainer = document.getElementById('ranking-tables-container');

    if (!rankingsGameFilter || !rankingTablesContainer) {
        console.error("[RANKING] Rankings filter or container element not found in the DOM. Cannot initialize rankings.");
        if (rankingTablesContainer) {
            rankingTablesContainer.innerHTML = '<p class="error-text text-center py-10">Error: Page structure is missing for rankings.</p>';
        }
        return;
    }

    // 1. Populate the filter dropdown
    if (typeof populateRankingsFilter === 'function') {
        await populateRankingsFilter(); // Ensure this uses the correct element ID
    } else {
        console.error("[RANKING] populateRankingsFilter function not found.");
        rankingsGameFilter.innerHTML = '<option value="overall">Error loading filters</option>';
    }

    // 2. Attach the event listener to the filter
    //    (Remove previous listener just in case)
    rankingsGameFilter.removeEventListener('change', handleRankingsFilterChange);
    rankingsGameFilter.addEventListener('change', handleRankingsFilterChange);
    console.log("[RANKING] Attached change listener to rankings filter.");

    // 3. Trigger the initial visibility update based on the default filter value
    if (typeof updateRankingsVisibility === 'function') {
        console.log("[RANKING] Triggering initial rankings visibility update.");
        // Pass the actual elements to the function
        await updateRankingsVisibility(rankingsGameFilter, rankingTablesContainer);
    } else {
        console.error("[RANKING] updateRankingsVisibility function not found.");
        rankingTablesContainer.innerHTML = '<p class="error-text text-center py-10">Error: Could not display rankings.</p>';
    }
}

/**
 * Populates the rankings game filter dropdown.
 */
async function populateRankingsFilter() {
    console.log("[RANKING FILTER] Entered populateRankingsFilter function.");
    const rankingsGameFilter = document.getElementById('rankings-game-filter');
    if (!rankingsGameFilter) {
        console.warn("[RANKING FILTER] Filter select element (#rankings-game-filter) not found.");
        return;
    }

    // Ensure configs are loaded before proceeding
    try {
        await fetchAndCacheGameConfigs(); // Await the config fetch
    } catch (error) {
        console.error("[RANKING FILTER] Failed to fetch game configs.", error);
        rankingsGameFilter.innerHTML = '<option value="overall">Overall (Error)</option>';
        return;
    }

    console.log("[RANKING FILTER] Populating filter dropdown...");

    // Clear existing options except the default 'Overall'
    rankingsGameFilter.innerHTML = '<option value="overall">Overall (1v1)</option>';

    // *** Log the config object ***
    console.log("[RANKING FILTER] Checking gameTypesConfig:", window.globalGameConfigs); // Use window.globalGameConfigs

    // Add options from gameTypesConfig (ensure gameTypesConfig is accessible)
    if (typeof window.globalGameConfigs === 'object' && window.globalGameConfigs !== null) { // Use window.globalGameConfigs
        // Sort game types alphabetically by name for the dropdown
        const sortedGameTypes = Object.entries(window.globalGameConfigs)
            .sort(([, configA], [, configB]) => (configA.name || '').localeCompare(configB.name || ''));

        sortedGameTypes.forEach(([key, config]) => {
            const name = config.name || key; // Fallback to key if name is missing
            // *** Log each game being added ***
            console.log(`[RANKING FILTER] Adding option: Name='${name}', Value='${key}'`);
            const option = new Option(name, key); // Text is the game name, value is the key
            rankingsGameFilter.add(option);
        });
        console.log("[RANKING FILTER] Finished adding game types from config:", Object.keys(window.globalGameConfigs));
    } else {
        console.warn("[RANKING FILTER] gameTypesConfig not found or invalid. Only 'Overall' will be available.");
    }
}

/**
 * Handles the change event for the rankings game filter dropdown.
 */
async function handleRankingsFilterChange() {
    console.log("[RANKING] Filter change detected.");
    const rankingsGameFilter = document.getElementById('rankings-game-filter');
    const rankingTablesContainer = document.getElementById('ranking-tables-container');

    if (!rankingsGameFilter || !rankingTablesContainer) {
        console.error("[RANKING] Filter or container element not found during change event.");
        return;
    }

    if (typeof updateRankingsVisibility === 'function') {
        // Pass the actual elements to the function
        await updateRankingsVisibility(rankingsGameFilter, rankingTablesContainer);
    } else {
        console.error("[RANKING] updateRankingsVisibility function not found during change event.");
        rankingTablesContainer.innerHTML = '<p class="error-text text-center py-10">Error updating rankings view.</p>';
    }
}

// Updates visibility of ranking tables based on filter selection
/**
 * Updates visibility of ranking tables based on filter selection.
 * @param {HTMLElement} rankingsGameFilter - The select element for the game filter.
 * @param {HTMLElement} rankingTablesContainer - The container element holding the ranking tables.
 */
async function updateRankingsVisibility(rankingsGameFilter, rankingTablesContainer) {
    console.log("[RANKING] Entered updateRankingsVisibility function.");

    // *** USE PASSED ELEMENTS INSTEAD OF getElementById ***
    if (!rankingsGameFilter || !rankingTablesContainer) {
        console.warn("[RANKING] Rankings filter or container element not provided to updateRankingsVisibility. Cannot update rankings view.");
        return; // Exit if elements aren't provided
    }
    // *** END CHECKS ***

    // Ensure configs are loaded before accessing them here too
    if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();

    if (!db) {
        console.warn("[RANKING] DB not ready. Cannot update rankings view.");
        rankingTablesContainer.innerHTML = '<p class="error-text p-4 text-center">Error initializing rankings view (DB connection).</p>';
        return;
    }

    // Remove the initial loading paragraph if it exists
    const initialLoadingP = rankingTablesContainer.querySelector('p.loading-text');
    if (initialLoadingP && initialLoadingP.parentElement === rankingTablesContainer) {
        console.log("[RANKING] Removing initial loading paragraph.");
        initialLoadingP.remove();
    }

    const selectedGame = rankingsGameFilter.value;
    console.log(`[RANKING] Filter changed to: ${selectedGame}`);

    // Hide all ranking table containers within the specific container
    rankingTablesContainer.querySelectorAll('.ranking-table').forEach(table => {
        table.classList.add('hidden');
        table.classList.remove('active');
    });

    // Construct the ID for the target table container
    const targetTableId = `ranking-table-${selectedGame}`;
    // Find the target table *within the container*
    let targetTable = rankingTablesContainer.querySelector(`#${targetTableId}`);

    // Dynamically create table container if it doesn't exist (for non-'overall' games)
    if (!targetTable && selectedGame !== 'overall' && window.globalGameConfigs[selectedGame]) {
         console.log(`[RANKING] Dynamically creating table container for ${selectedGame}`);
         targetTable = document.createElement('div');
         targetTable.id = targetTableId;
         targetTable.className = 'ranking-table hidden'; // Start hidden

         const gameName = window.globalGameConfigs[selectedGame].name || selectedGame; // Use window.globalGameConfigs
         const isGolf = selectedGame === 'golf';
         const ratingHeader = isGolf ? 'Handicap' : 'Rating';
         const rankingTypeTitle = isGolf ? 'Handicap Index' : 'Elo';

         // Inject the HTML structure (including dark mode classes)
         targetTable.innerHTML = `
             <div class="card p-6 md:p-8 rounded-xl shadow-lg">
                 <h2 class="text-2xl font-semibold mb-5">${gameName} Rankings (${rankingTypeTitle})</h2>
                 <div class="overflow-x-auto">
                     <table class="w-full text-left table-auto text-sm md:text-base">
                         <thead>
                             <tr class="bg-gray-100 dark:bg-gray-700">
                                 <th class="px-4 py-3">Rank</th>
                                 <th class="px-4 py-3">Player</th>
                                 <th class="px-4 py-3">${ratingHeader}</th>
                             </tr>
                         </thead>
                         <tbody id="${selectedGame}-rankings-body">
                             <tr><td colspan="3" class="text-center py-4 loading-text">Loading ${gameName} rankings...</td></tr>
                         </tbody>
                     </table>
                 </div>
             </div>`;
         rankingTablesContainer.appendChild(targetTable); // Add the new table container to the DOM
         console.log(`[RANKING] Appended new table container #${targetTable.id} to #${rankingTablesContainer.id}`);
    } else if (targetTable) {
        console.log(`[RANKING] Found existing table container #${targetTable.id}`);
    } else if (selectedGame === 'overall') {
        // Check if the overall table exists within the container, create if not
        targetTable = rankingTablesContainer.querySelector('#ranking-table-overall');
        if (!targetTable) {
            console.warn("[RANKING] Overall ranking table container (#ranking-table-overall) not found. Creating dynamically (should be in template).");
            targetTable = document.createElement('div');
            targetTable.id = 'ranking-table-overall';
            targetTable.className = 'ranking-table hidden'; // Start hidden
            targetTable.innerHTML = `
                <div class="card p-6 md:p-8 rounded-xl shadow-lg">
                    <h2 class="text-2xl font-semibold mb-5">Overall Rankings (1v1 Elo)</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left table-auto text-sm md:text-base">
                            <thead>
                                <tr class="bg-gray-100 dark:bg-gray-700">
                                    <th class="px-4 py-3">Rank</th>
                                    <th class="px-4 py-3">Player</th>
                                    <th class="px-4 py-3">Rating</th>
                                </tr>
                            </thead>
                            <tbody id="overall-1v1-rankings-body">
                                <tr><td colspan="3" class="text-center py-4 loading-text">Loading Overall 1v1 rankings...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <!-- Add 2v2 table structure here if needed -->
            `;
            rankingTablesContainer.appendChild(targetTable);
        } else {
            console.log(`[RANKING] Using existing overall table container.`);
        }
    }

    // Show the selected table and populate its data
    if (targetTable) {
         targetTable.classList.remove('hidden');
         targetTable.classList.add('active');
         // Call the appropriate data population function (ensure these functions are accessible)
         if (selectedGame === 'overall') {
             if (typeof populateOverallRankings === 'function') {
                 console.log("[RANKING] Calling populateOverallRankings...");
                 // Pass the specific tbody element to populateOverallRankings
                 const overallBody = targetTable.querySelector('#overall-1v1-rankings-body');
                 // ADDED CHECK: Ensure overallBody exists before calling populate
                 if (overallBody) {
                    await populateOverallRankings(overallBody); // Pass the element
                 } else {
                    console.error("[RANKING] Could not find #overall-1v1-rankings-body within the target table element:", targetTable);
                    // Optionally display an error message in the table container
                    if (targetTable) {
                        targetTable.innerHTML = '<p class="error-text text-center py-5">Error: Failed to load ranking table structure.</p>';
                    }
                 }
             } else {
                 console.warn("[RANKING] populateOverallRankings function is not defined.");
                 const body = targetTable.querySelector('#overall-1v1-rankings-body');
                 if (body) body.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">Error: Ranking function unavailable.</td></tr>`;
             }
         } else if (window.globalGameConfigs[selectedGame]) {
             if (typeof populateGameRankings === 'function') {
                 console.log(`[RANKING] Calling populateGameRankings for ${selectedGame}...`);
                 // Pass the specific tbody element to populateGameRankings
                 const gameBody = targetTable.querySelector(`#${selectedGame}-rankings-body`);
                 await populateGameRankings(selectedGame, gameBody); // Pass the element
             } else {
                 console.error("[RANKING] populateGameRankings function not found!");
                 const body = targetTable.querySelector('tbody');
                 if (body) body.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">Error: Ranking function unavailable.</td></tr>`;
             }
         } else {
             console.warn(`Unknown game type selected: ${selectedGame}`);
             const tbody = targetTable.querySelector('tbody');
             if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400 italic">Unknown game type selected.</td></tr>`;
         }
    } else {
         console.warn(`[RANKING] Target table container could not be found or created for game: ${selectedGame}`);
         // Avoid modifying container innerHTML directly if it might be missing
         if (rankingTablesContainer) {
            // Clear container and show error if table wasn't found/created
            rankingTablesContainer.innerHTML = `<p class="error-text text-center">Error: Could not display rankings for ${selectedGame}.</p>`;
         } else {
            console.error("[RANKING] Cannot show error message because rankingTablesContainer is also missing.");
         }
    }
} // End updateRankingsVisibility

/**
 * Fetches and populates the overall 1v1 rankings table body.
 * @param {HTMLElement} tbodyElement - The tbody element to populate (e.g., #overall-1v1-rankings-body).
 */
async function populateOverallRankings(tbodyElement) {
    // ADDED CHECK: Ensure tbodyElement is valid at the start
    if (!tbodyElement) {
        console.error("[RANKING DATA] Overall rankings tbody element not provided or invalid.");
        // Attempt to find a fallback or display a general error
        const container = document.getElementById('overall-rankings-table-container'); // Assuming a container ID exists
        if (container) {
            container.innerHTML = '<p class="error-text text-center py-5">Error loading overall rankings table.</p>';
        }
        return;
    }
    console.log("[RANKING DATA] Populating overall rankings into element:", tbodyElement);
    tbodyElement.innerHTML = `<tr><td colspan="3" class="loading-text px-3 py-4 text-center">Loading Overall 1v1 rankings...</td></tr>`;

    if (!db) {
        tbodyElement.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">Database connection error.</td></tr>`;
        return;
    }

    try {
        // Ensure player cache is ready
        if (!playersCachePopulated) await fetchAllPlayersForCache();

        const snapshot = await db.collection('players')
                                 .orderBy('elo_overall', 'desc')
                                 .limit(100) // Limit for performance
                                 .get();

        if (snapshot.empty) {
            tbodyElement.innerHTML = `<tr><td colspan="3" class="muted-text text-center py-4">No players found with overall rankings.</td></tr>`;
            return;
        }

        tbodyElement.innerHTML = ''; // Clear loading
        let rank = 1;
        const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;

        snapshot.forEach(doc => {
            const player = { id: doc.id, ...doc.data() };
            const playerName = player.name || 'Unnamed Player';
            const playerElo = Math.round(player.elo_overall || defaultElo);

            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700';
            tr.innerHTML = `
                <td class="px-4 py-3 text-center">${rank}</td>
                <td class="px-4 py-3">
                    <a href="#player-profile-section?playerId=${player.id}" class="nav-link font-medium text-indigo-600 dark:text-indigo-400 hover:underline" data-target="player-profile-section">${playerName}</a>
                </td>
                <td class="px-4 py-3 text-center font-semibold">${playerElo}</td>
            `;
            // Add listener for navigation
            const link = tr.querySelector('a.nav-link');
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof showSection === 'function') {
                        showSection('player-profile-section', true, { playerId: player.id });
                    } else { window.location.hash = `#player-profile-section?playerId=${player.id}`; }
                });
            }
            tbodyElement.appendChild(tr);
            rank++;
        });
        console.log(`[RANKING DATA] Populated ${snapshot.size} players in overall rankings.`);

    } catch (error) {
        console.error("[RANKING DATA] Error fetching overall rankings:", error);
        // Ensure tbodyElement is still valid before updating innerHTML
        if (tbodyElement) {
            tbodyElement.innerHTML = `<tr><td colspan="3" class="error-text px-3 py-4 text-center">Error loading overall rankings: ${error.message}</td></tr>`;
        }
        if (error.code === 'failed-precondition') {
             tbodyElement.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">Error: Index missing for overall rankings.</td></tr>`;
             console.error("Firestore index required: 'players' collection, 'elo_overall' field (descending).");
        }
    }
}

/**
 * Populates a table body with top players for a specific game type.
 * @param {string} gameKey - The key of the game type (e.g., 'pool', 'chess', 'overall').
 * @param {HTMLElement} tableBodyElement - The tbody element to populate.
 * @param {number} [limit=10] - The maximum number of players to display.
 */
async function populateGameRankings(gameKey, tableBodyElement, limit = 10) {
    if (!tableBodyElement) {
        console.error(`[Rankings] Target table body element not provided for game key: ${gameKey}.`);
        return;
    }
    console.log(`[Rankings] Populating rankings for game: ${gameKey} into element:`, tableBodyElement.id || 'tbody');
    tableBodyElement.innerHTML = `<tr><td colspan="3" class="loading-text px-3 py-4 text-center">Loading ${gameKey === 'overall' ? 'Overall' : gameKey} rankings...</td></tr>`;

    if (!db) {
        console.error("[Rankings] Firestore DB not available.");
        tableBodyElement.innerHTML = `<tr><td colspan="3" class="error-text px-3 py-4 text-center">Database error.</td></tr>`;
        return;
    }

    // Ensure player cache is populated for names
    if (!playersCachePopulated) {
        console.log("[Rankings] Player cache not populated, fetching...");
        await fetchAllPlayersForCache();
    }

    try {
        let query;
        const eloField = gameKey === 'overall' ? 'elo_overall' : `elos.${gameKey}`;

        query = db.collection('players')
                  .orderBy(eloField, 'desc')
                  .limit(limit);

        const snapshot = await query.get();

        if (snapshot.empty) {
            console.log(`[Rankings] No players found with rankings for ${gameKey}.`);
            tableBodyElement.innerHTML = `<tr><td colspan="3" class="muted-text px-3 py-4 text-center">No rankings available yet for ${gameKey}.</td></tr>`;
            return;
        }

        tableBodyElement.innerHTML = ''; // Clear loading message
        let rank = 1;
        snapshot.forEach(doc => {
            const player = { id: doc.id, ...doc.data() };
            // Get rating, handling potential missing field or nested structure
            let rating = player.elo_overall; // Default to overall
            if (gameKey !== 'overall' && player.elos && player.elos[gameKey] !== undefined) {
                rating = player.elos[gameKey];
            } else if (gameKey !== 'overall') {
                rating = DEFAULT_ELO; // Assign default if specific game Elo is missing
            }

            const ratingDisplay = Math.round(rating || DEFAULT_ELO); // Use default if null/undefined
            const playerName = player.name || 'Unnamed Player';

            const tr = document.createElement('tr');
            tr.className = 'border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'; // Add hover effect
            tr.innerHTML = `
                <td class="px-3 py-2 font-medium text-gray-900 dark:text-white">${rank}</td>
                <td class="px-3 py-2">
                    <a href="#player-profile-section?playerId=${player.id}" class="nav-link hover:underline" data-target="player-profile-section">${playerName}</a>
                </td>
                <td class="px-3 py-2">${ratingDisplay}</td>
            `;
            tableBodyElement.appendChild(tr);
            rank++;
        });
        console.log(`[Rankings] Populated ${snapshot.size} players for ${gameKey}.`);

    } catch (error) {
        console.error(`[Rankings] Error fetching rankings for ${gameKey}:`, error);
        tableBodyElement.innerHTML = `<tr><td colspan="3" class="error-text px-3 py-4 text-center">Error loading rankings: ${error.message}</td></tr>`;
        if (error.code === 'failed-precondition') {
            console.error(`Firestore index required: 'players' collection, '${eloField}' field (descending).`);
            tableBodyElement.innerHTML = `<tr><td colspan="3" class="error-text px-3 py-4 text-center">Error: Database index missing for sorting ${gameKey} rankings.</td></tr>`;
        }
    }
}

// Note: This file assumes that 'firebase', 'db',
// 'gameTypesConfig', 'DEFAULT_ELO', 'K_FACTOR', 'globalPlayerCache',
// 'playersCachePopulated', 'fetchAllPlayersForCache', 'showSection'
// are initialized and accessible globally or imported/passed appropriately
console.log("[Rankings/Results] rankings_results.js loaded.");