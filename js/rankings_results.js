// --- rankings_results.js ---

// --- Rankings Page Population ---

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
    console.log("[RANKING FILTER] Populating filter dropdown...");

    // Clear existing options except the default 'Overall'
    rankingsGameFilter.innerHTML = '<option value="overall">Overall (1v1)</option>';

    // *** Log the config object ***
    console.log("[RANKING FILTER] Checking gameTypesConfig:", gameTypesConfig);

    // Add options from gameTypesConfig (ensure gameTypesConfig is accessible)
    if (typeof gameTypesConfig === 'object' && gameTypesConfig !== null) {
        Object.entries(gameTypesConfig).forEach(([key, name]) => {
            // *** Log each game being added ***
            console.log(`[RANKING FILTER] Adding option: Name='${name}', Value='${key}'`);
            const option = new Option(name, key); // Text is the game name, value is the key
            rankingsGameFilter.add(option);
        });
        console.log("[RANKING FILTER] Finished adding game types from config:", Object.keys(gameTypesConfig));
    } else {
        console.warn("[RANKING FILTER] gameTypesConfig not found or invalid. Only 'Overall' will be available.");
    }
}

// Updates visibility of ranking tables based on filter selection
async function updateRankingsVisibility() {
    console.log("[RANKING] Entered updateRankingsVisibility function."); // <-- Add Log
    // Find elements within the function
    const rankingsGameFilter = document.getElementById('rankings-game-filter');
    const rankingTablesContainer = document.getElementById('ranking-tables-container');

    if (!rankingsGameFilter || !rankingTablesContainer) {
        console.warn("[RANKING] Rankings filter or container not found in current DOM. Cannot update rankings view.");
        return; // Exit if elements aren't present
    }
    if (!db) {
        console.warn("[RANKING] DB not ready. Cannot update rankings view.");
        rankingTablesContainer.innerHTML = '<p class="error-text p-4 text-center">Error initializing rankings view (DB connection).</p>';
        return;
    }

    const selectedGame = rankingsGameFilter.value;
    console.log(`[RANKING] Filter changed to: ${selectedGame}`);

    // Hide all ranking table containers
    rankingTablesContainer.querySelectorAll('.ranking-table').forEach(table => {
        table.classList.add('hidden');
        table.classList.remove('active');
    });

    // Construct the ID for the target table container
    const targetTableId = `ranking-table-${selectedGame}`;
    let targetTable = document.getElementById(targetTableId);

    // Dynamically create table container if it doesn't exist (for non-'overall' games)
    if (!targetTable && selectedGame !== 'overall' && gameTypesConfig[selectedGame]) {
         console.log(`[RANKING] Dynamically creating table container for ${selectedGame}`);
         targetTable = document.createElement('div');
         targetTable.id = targetTableId;
         targetTable.className = 'ranking-table hidden'; // Start hidden

         const gameName = gameTypesConfig[selectedGame];
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
        console.log(`[RANKING] Using existing overall table container.`);
        targetTable = document.getElementById('ranking-table-overall'); // Ensure overall table is targeted correctly
    }

    // Show the selected table and populate its data
    if (targetTable) {
         targetTable.classList.remove('hidden');
         targetTable.classList.add('active');

         // Call the appropriate data population function (ensure these functions are accessible)
         if (selectedGame === 'overall') {
             if (typeof populateOverallRankings === 'function') {
                 console.log("[RANKING] Calling populateOverallRankings..."); // <-- Add Log
                 await populateOverallRankings();
             } else {
                 console.warn("[RANKING] populateOverallRankings function is not defined.");
             }
         } else if (gameTypesConfig[selectedGame]) {
             if (typeof populateGameRankings === 'function') {
                 console.log(`[RANKING] Calling populateGameRankings for ${selectedGame}...`); // <-- Add Log
                 await populateGameRankings(selectedGame);
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
         rankingTablesContainer.innerHTML += `<p class="error-text text-center">Error: Could not display rankings for ${selectedGame}.</p>`;
    }
} // End updateRankingsVisibility

// Populates Overall 1v1 and 2v2 tables
async function populateOverallRankings() {
     console.log("[RANKING Overall] Entered populateOverallRankings function.");
     // Find elements within the function
     const elo1v1Body = document.getElementById('overall-1v1-rankings-body');
     const elo2v2Body = document.getElementById('overall-2v2-rankings-body'); // Now this should exist

     if (!elo1v1Body) {
         console.warn("[RANKING Overall] 1v1 rankings body (#overall-1v1-rankings-body) not found.");
     } else {
         elo1v1Body.innerHTML = `<tr><td colspan="3" class="loading-text text-center py-4">Loading Overall 1v1 rankings...</td></tr>`;
     }

     // Populate 2v2 Overall Rankings (Placeholder)
     if (elo2v2Body) {
         // Keep placeholder until 2v2 logic is implemented
         elo2v2Body.innerHTML = `<tr><td colspan="3" class="muted-text text-center py-4 italic">Overall 2v2 rankings not implemented yet.</td></tr>`;
     } else {
         // This warning should no longer appear if index.html is updated
         console.warn("[RANKING Overall] 2v2 rankings body (#overall-2v2-rankings-body) not found.");
     }

     // Ensure DB is ready
     if (!db) {
         console.warn("[RANKING] DB not ready for Overall rankings.");
         if (elo1v1Body) elo1v1Body.innerHTML = '<tr><td colspan="3" class="error-text text-center py-4">DB Error</td></tr>';
         return;
     }

     // Fetch players sorted by overall Elo (1v1)
     try {
         const snapshot = await db.collection('players').orderBy('elo_overall', 'desc').limit(20).get();
         if (snapshot.empty) {
             if (elo1v1Body) elo1v1Body.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">No players found.</td></tr>';
         } else {
             if (elo1v1Body) {
                 elo1v1Body.innerHTML = ''; // Clear loading
                 let rank = 1;
                 snapshot.forEach(doc => {
                     const player = doc.data();
                     const tr = document.createElement('tr');
                     tr.className = 'border-b dark:border-gray-700'; // Added dark mode class
                     tr.innerHTML = `
                         <td class="px-4 py-2">${rank}</td>
                         <td class="px-4 py-2">${player.name || 'Unnamed'}</td>
                         <td class="px-4 py-2">${Math.round(player.elo_overall || DEFAULT_ELO)}</td>
                     `;
                     elo1v1Body.appendChild(tr);
                     rank++;
                 });
             }
         }
     } catch (error) {
         console.error("Error loading Overall 1v1 rankings:", error);
         if (elo1v1Body) {
             if (error.code === 'failed-precondition') {
                 elo1v1Body.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-red-500">Error: Firestore index missing (players: elo_overall desc).</td></tr>';
                 console.error("Firestore index needed: players collection, elo_overall (descending).");
             } else {
                 elo1v1Body.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-red-500">Error loading rankings.</td></tr>';
             }
         }
     }

     // TODO: Add logic to fetch and populate 2v2 rankings when implemented

} // End populateOverallRankings

// Populates game-specific rankings table (Handles Golf Handicap vs Elo)
async function populateGameRankings(gameKey) {
     console.log(`[RANKING ${gameKey}] Entered populateGameRankings function.`);
     // Find elements within the function
     const tableBodyId = `${gameKey}-rankings-body`;
     const tableBody = document.getElementById(tableBodyId);
     const gameName = gameTypesConfig[gameKey] || gameKey;

     if (!tableBody) {
        console.warn(`[RANKING] Cannot populate rankings for ${gameName}: Table body #${tableBodyId} not found in current DOM.`);
        return; // Exit if element isn't present
     }
     if (!db) {
        console.warn(`[RANKING] Cannot populate rankings for ${gameName}: DB missing.`);
        tableBody.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">DB Error</td></tr>`;
        return;
     }
     console.log(`[RANKING] Populating rankings for ${gameName} in #${tableBodyId}...`);
     tableBody.innerHTML = `<tr><td colspan="3" class="loading-text text-center py-4">Loading ${gameName} rankings...</td></tr>`;

     try {
         let players = [];
         let orderByField = `elos.${gameKey}`; // Default Elo field path
         let orderDirection = 'desc'; // Default for Elo
         let isIndexError = false; // Flag for specific error handling

         // GOLF: Fetch and display by Handicap (ascending, nulls last)
         if (gameKey === 'golf') {
             orderByField = 'golf_handicap';
             orderDirection = 'asc';
             console.log(`[RANKING ${gameKey}] Fetching players, will sort by ${orderByField} ${orderDirection} client-side...`);
             try {
                 const snapshot = await db.collection('players').orderBy('name').get(); // Fetch unsorted by handicap first
                 players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 // Sort client-side: non-null handicaps first (ascending), then nulls
                 players.sort((a, b) => {
                     const hA = a.golf_handicap;
                     const hB = b.golf_handicap;
                     if (hA === null && hB === null) return a.name.localeCompare(b.name); // Sort nulls by name
                     if (hA === null) return 1; // Nulls go last
                     if (hB === null) return -1; // Nulls go last
                     return hA - hB; // Sort non-nulls numerically ascending
                 });
             } catch (fetchError) {
                 // Handle potential errors fetching even by name (less likely index issue)
                 console.error(`[RANKING ${gameKey}] Error fetching players by name:`, fetchError);
                 throw fetchError; // Re-throw to be caught by outer catch
             }

         } else { // Non-Golf (Elo)
             console.log(`[RANKING ${gameKey}] Fetching players sorted by Firestore field: ${orderByField} (${orderDirection})...`);
             try {
                 // Requires Firestore index: players: elos.{gameKey} (desc)
                 const snapshot = await db.collection('players').orderBy(orderByField, orderDirection).get();
                 players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
             } catch (queryError) {
                 if (queryError.code === 'failed-precondition') {
                     isIndexError = true; // Set flag for specific message
                     console.error(`[RANKING ${gameKey}] Firestore index missing! Need index on 'players' collection for field '${orderByField}' (${orderDirection}).`);
                     // Generate the link for convenience
                     const firestoreLink = `https://console.firebase.google.com/project/${firebase.app().options.projectId}/firestore/indexes`;
                     console.error(`[RANKING ${gameKey}] Create index here: ${firestoreLink}`);
                 }
                 // Re-throw the error to be handled by the outer catch block
                 throw queryError;
             }
         }
         console.log(`[RANKING ${gameKey}] Fetched and sorted ${players.length} players.`);

         if (players.length === 0) {
             tableBody.innerHTML = `<tr><td colspan="3" class="muted-text text-center py-4">No players found with ${gameKey} ratings.</td></tr>`;
         } else {
             tableBody.innerHTML = ''; // Clear loading
             players.forEach((player, index) => {
                 const rank = index + 1;
                 const rating = gameKey === 'golf' ? player.golf_handicap?.toFixed(1) : Math.round(player.elos?.[gameKey] || DEFAULT_ELO);
                 const tr = document.createElement('tr');
                 tr.className = 'border-b dark:border-gray-700'; // Added dark mode class
                 tr.innerHTML = `<td class="px-4 py-2">${rank}</td><td class="px-4 py-2">${player.name || 'Unnamed'}</td><td class="px-4 py-2">${rating}</td>`;
                 tableBody.appendChild(tr);
             });
             console.log(`[RANKING ${gameKey}] Successfully populated table #${tableBodyId}.`);
         }

     } catch (error) {
         console.error(`[RANKING ${gameKey}] Error fetching or populating rankings:`, error);
         // Use the flag to show a specific message for index errors
         if (isIndexError) {
              tableBody.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">Error: Database index missing for ${gameKey} ranking.<br><span class="text-sm">Admin: Check browser console for details and link to create index.</span></td></tr>`;
         } else {
             tableBody.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">Error loading ${gameKey} rankings: ${error.message}</td></tr>`;
         }
     }
} // End populateGameRankings

// --- Results Table Population ---

/**
 * Populates the results game filter dropdown.
 */
async function populateResultsFilter() {
    console.log("[RESULTS FILTER] Entered populateResultsFilter function.");
    const resultsGameFilter = document.getElementById('results-game-filter');
    if (!resultsGameFilter) {
        console.warn("[RESULTS FILTER] Filter select element (#results-game-filter) not found.");
        return;
    }
    console.log("[RESULTS FILTER] Populating filter dropdown...");

    // Clear existing options except the default 'All Games'
    resultsGameFilter.innerHTML = '<option value="all">All Games</option>';

    // Add options from gameTypesConfig
    if (typeof gameTypesConfig === 'object' && gameTypesConfig !== null) {
        Object.entries(gameTypesConfig).forEach(([key, name]) => {
            console.log(`[RESULTS FILTER] Adding option: Name='${name}', Value='${key}'`);
            const option = new Option(name, key);
            resultsGameFilter.add(option);
        });
        console.log("[RESULTS FILTER] Finished adding game types from config:", Object.keys(gameTypesConfig));
    } else {
        console.warn("[RESULTS FILTER] gameTypesConfig not found or invalid. Only 'All Games' will be available.");
    }
}

/**
 * Populates the results table, optionally filtering by game type.
 * @param {string} [filterGameKey='all'] - The game key to filter by, or 'all'.
 * @param {number} [limit=50] - The maximum number of results to fetch.
 */
async function populateResultsTable(filterGameKey = 'all', limit = 50) {
    // Find element within the function
    const resultsTableBody = document.getElementById('results-table-body');
    if (!resultsTableBody) {
        console.warn("[RESULTS] Results table body (#results-table-body) not found in current DOM.");
        return;
    }
    if (!db) {
        console.warn("[RESULTS] DB not ready.");
        resultsTableBody.innerHTML = '<tr><td colspan="3" class="error-text text-center py-4">Database connection error.</td></tr>'; // Adjusted colspan
        return;
    }

    // Ensure player cache is populated for names
    if (!playersCachePopulated) {
        console.log("[RESULTS] Player cache not populated, fetching...");
        await fetchAllPlayersForCache();
        if (!playersCachePopulated) {
            console.error("[RESULTS] Failed to populate player cache.");
            resultsTableBody.innerHTML = '<tr><td colspan="3" class="error-text text-center py-4">Error loading player data.</td></tr>'; // Adjusted colspan
            return;
        }
    }

    console.log(`[RESULTS] Populating results table (Filter: ${filterGameKey}, Limit: ${limit})...`);
    resultsTableBody.innerHTML = `<tr><td colspan="3" class="loading-text text-center py-4">Loading ${filterGameKey === 'all' ? 'all' : gameTypesConfig[filterGameKey] || filterGameKey} results...</td></tr>`; // Adjusted colspan

    try {
        let query = db.collection('games');

        // Apply filter if not 'all'
        if (filterGameKey !== 'all') {
            // Requires Firestore index: games: game_type (asc), date_played (desc)
            query = query.where('game_type', '==', filterGameKey);
            console.log(`[RESULTS] Applying filter: game_type == ${filterGameKey}`);
        }

        // Always order by date and apply limit
        query = query.orderBy('date_played', 'desc').limit(limit);

        const snapshot = await query.get();

        if (snapshot.empty) {
            resultsTableBody.innerHTML = `<tr><td colspan="3" class="muted-text text-center py-4">No ${filterGameKey === 'all' ? '' : (gameTypesConfig[filterGameKey] || filterGameKey)} game results found.</td></tr>`; // Adjusted colspan
            return;
        }

        resultsTableBody.innerHTML = ''; // Clear loading message
        const courseParCacheResults = {}; // Local cache for this population run

        for (const doc of snapshot.docs) {
            const game = { id: doc.id, ...doc.data() };
            const tr = document.createElement('tr');
            tr.className = 'border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'; // Added dark mode hover

            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
            const gameType = gameTypesConfig[game.game_type] || game.game_type || 'Unknown Game';
            let description = '';

            const participants = game.participants || [];
            const participantNames = participants.map(id => globalPlayerCache[id]?.name || 'Unknown Player');

            // --- Build Description Logic (similar to player modal activity) ---
            if (game.game_type === 'golf' && participantNames.length > 0) {
                description = `<b>${participantNames[0]}</b> played ${gameType}`;
                if (typeof game.score === 'number') {
                    if (game.course_id && game.course_id !== 'none') {
                        // Fetch course par (use local cache)
                        let coursePar = courseParCacheResults[game.course_id];
                        if (coursePar === undefined) { // Not in cache yet
                            try {
                                const courseDoc = await db.collection('golf_courses').doc(game.course_id).get();
                                coursePar = courseDoc.exists ? courseDoc.data().total_par : null;
                                courseParCacheResults[game.course_id] = coursePar; // Store in cache
                            } catch { coursePar = null; courseParCacheResults[game.course_id] = null; }
                        }

                        if (typeof coursePar === 'number') {
                            let parForRound = coursePar;
                            if (game.holes_played === '9F' || game.holes_played === '9B') { parForRound = Math.round(coursePar / 2); }
                            const differential = game.score - parForRound;
                            let diffClass = 'text-gray-600 dark:text-gray-400'; let diffPrefix = '';
                            if (differential > 0) { diffClass = 'text-red-600 dark:text-red-400'; diffPrefix = '+'; }
                            else if (differential < 0) { diffClass = 'text-green-600 dark:text-green-400'; }
                            const diffDisplay = differential === 0 ? 'E' : `${diffPrefix}${differential}`;
                            description += ` (${game.score}/${parForRound} | <span class="font-semibold ${diffClass}">${diffDisplay}</span>)`;
                        } else { description += ` (${game.score} on unknown course)`; }
                    } else { description += ` (${game.score}, no course info)`; }
                } else { description += ` (score not recorded)`; }
            } else if (game.outcome === 'Win/Loss' && participantNames.length >= 2) {
                description = `<b>${participantNames[0]}</b> beat ${participantNames[1]}`;
                if (game.score) description += ` (${game.score})`;
            } else if (game.outcome === 'Draw' && participantNames.length >= 2) {
                description = `${participantNames[0]} drew with ${participantNames[1]}`;
                if (game.score) description += ` (${game.score})`;
            } else {
                description = `Game played by ${participantNames.join(', ')}`;
                if (game.score) description += ` (${game.score})`;
            }
            // --- End Description Logic ---

            // Added dark mode and light mode text classes with !important
            tr.innerHTML = `
                <td class="px-4 py-3 !text-gray-600 dark:text-gray-400">${gameDate}</td>
                <td class="px-4 py-3 !text-gray-800 dark:text-gray-200">${gameType}</td>
                <td class="px-4 py-3 !text-gray-800 dark:text-gray-200">${description}</td>
                <!-- Optional Score Column -->
                <!-- <td class="px-4 py-3 !text-gray-700 dark:text-gray-300">${game.score || '-'}</td> -->
            `;
            resultsTableBody.appendChild(tr);
        }
        console.log(`[RESULTS] Displayed ${snapshot.size} results.`);

    } catch (error) {
        console.error("[RESULTS] Error fetching results:", error);
        if (error.code === 'failed-precondition' && filterGameKey !== 'all') {
            resultsTableBody.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">Error: Database index missing for filtering by game type.<br><span class="text-sm">Admin: Check browser console. Need index on 'games' for 'game_type' (asc) and 'date_played' (desc).</span></td></tr>`; // Adjusted colspan
            console.error(`Firestore index needed: 'games' collection, fields: game_type (asc), date_played (desc).`);
        } else {
            resultsTableBody.innerHTML = `<tr<td colspan="3" class="error-text text-center py-4">Error loading results: ${error.message}</td></tr>`; // Adjusted colspan
        }
    }
} // End populateResultsTable

// Note: This file assumes that 'firebase', 'db', 'rankingsGameFilter', 'rankingTablesContainer',
// 'resultsTableBody', 'gameTypesConfig', 'DEFAULT_ELO', 'K_FACTOR', 'globalPlayerCache',
// 'playersCachePopulated', 'fetchAllPlayersForCache' are initialized and accessible
// from the global scope or imported/passed appropriately