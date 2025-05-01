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
    console.log("[RANKING] Entered updateRankingsVisibility function."); // <-- Log remains
    // Find elements within the function
    const rankingsGameFilter = document.getElementById('rankings-game-filter');
    const rankingTablesContainer = document.getElementById('ranking-tables-container');

    // *** ADD THESE CHECKS ***
    if (!rankingsGameFilter || !rankingTablesContainer) {
        console.warn("[RANKING] Rankings filter or container not found in current DOM. Cannot update rankings view. Retrying might be needed if called during load.");
        return; // Exit if elements aren't present
    }
    // *** END CHECKS ***

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
        // Check if the overall table exists, create if not (should be in template ideally)
        targetTable = document.getElementById('ranking-table-overall');
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
                 console.log("[RANKING] Calling populateOverallRankings..."); // <-- Log remains
                 await populateOverallRankings();
             } else {
                 console.warn("[RANKING] populateOverallRankings function is not defined.");
                 const body = targetTable.querySelector('#overall-1v1-rankings-body');
                 if (body) body.innerHTML = `<tr><td colspan="3" class="error-text text-center py-4">Error: Ranking function unavailable.</td></tr>`;
             }
         } else if (gameTypesConfig[selectedGame]) {
             if (typeof populateGameRankings === 'function') {
                 console.log(`[RANKING] Calling populateGameRankings for ${selectedGame}...`); // <-- Log remains
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
         // Avoid modifying container innerHTML directly if it might be missing
         if (rankingTablesContainer) {
            rankingTablesContainer.innerHTML += `<p class="error-text text-center">Error: Could not display rankings for ${selectedGame}.</p>`;
         } else {
            console.error("[RANKING] Cannot show error message because rankingTablesContainer is also missing.");
         }
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
     if (!playersCachePopulated) await fetchAllPlayersForCache();
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

        // --- ADD EVENT LISTENER ---
        // Remove existing listener to prevent duplicates if this runs multiple times
        resultsGameFilter.removeEventListener('change', handleResultsFilterChange);
        resultsGameFilter.addEventListener('change', handleResultsFilterChange);
        console.log("[RESULTS FILTER] Attached change event listener.");
        // --- END ADD EVENT LISTENER ---

    } else {
        resultsGameFilter.innerHTML = '<option value="all">All Games</option>';
        console.warn("[RESULTS FILTER] gameTypesConfig not found or invalid. Only 'All Games' will be available.");
    }
}

/**
 * Handles the change event for the results game filter dropdown.
 */
async function handleResultsFilterChange() {
    const resultsGameFilter = document.getElementById('results-game-filter');
    if (!resultsGameFilter) return;

    const selectedGame = resultsGameFilter.value;
    console.log(`[RESULTS FILTER] Filter changed to: ${selectedGame}`);

    // Re-populate the main results table with the new filter
    // Assuming the main table body ID is 'results-table-body' and its parent table ID is 'results-table'
    await populateResultsTable(selectedGame, 50, 'results-table-body');
    // Visibility update is now handled within populateResultsTable
}

/**
 * Updates the visibility of golf-specific columns based on the filter.
 * @param {string} filterGameType - The currently selected game type filter ('all', 'golf', etc.).
 * @param {string} tableId - The ID of the parent <table> element.
 */
function updateResultsTableColumnVisibility(filterGameType, tableId) {
    const tableElement = document.getElementById(tableId);
    if (!tableElement) {
        console.warn(`[RESULTS VISIBILITY] Table element #${tableId} not found.`);
        return;
    }

    if (filterGameType === 'golf') {
        console.log(`[RESULTS VISIBILITY] Showing golf columns for table #${tableId}`);
        tableElement.classList.add('show-golf-columns');
    } else {
        console.log(`[RESULTS VISIBILITY] Hiding golf columns for table #${tableId}`);
        tableElement.classList.remove('show-golf-columns');
    }
}

/**
 * Populates the main results table or a specific table body.
 * Assumes the corresponding <thead> includes columns for Date, Game Type, Description, Course, Location.
 * @param {string} [filterGameType='all'] - The game type key to filter by, or 'all'.
 * @param {number} [limit=50] - Maximum number of results to fetch.
 * @param {string|null} [targetTableBodyId=null] - The ID of a specific tbody to populate (e.g., for sport details page). If null, uses 'results-table-body'.
 */
async function populateResultsTable(filterGameType = 'all', limit = 50, targetTableBodyId = null) {
    // Find element within the function using the provided ID
    const tableBodyId = targetTableBodyId || 'results-table-body';
    const tableBody = document.getElementById(tableBodyId);
    const parentTable = tableBody ? tableBody.closest('table') : null; // Get parent table
    const parentTableId = parentTable ? parentTable.id : null; // Get parent table ID

    if (!tableBody || !parentTableId) {
        console.warn(`[RESULTS] Results table body (#${tableBodyId}) or its parent table with an ID not found in current DOM.`);
        return;
    }
    if (!db) {
        console.warn("[RESULTS] DB not ready.");
        tableBody.innerHTML = `<tr><td colspan="5" class="error-text text-center py-4">Database connection error.</td></tr>`;
        return;
    }

    // Ensure player cache is populated for names
    if (!playersCachePopulated) {
        console.log("[RESULTS] Player cache not populated, fetching...");
        try {
            await fetchAllPlayersForCache();
        } catch (error) {
             console.error("[RESULTS] Error fetching player cache:", error);
             tableBody.innerHTML = '<tr><td colspan="5" class="error-text text-center py-4">Error loading player data.</td></tr>';
             return;
        }
    }
    if (!playersCachePopulated) {
        console.error("[RESULTS] Failed to populate player cache after fetch attempt.");
        tableBody.innerHTML = '<tr><td colspan="5" class="error-text text-center py-4">Error loading player data.</td></tr>';
        return;
    }

    console.log(`[RESULTS] Populating results table #${tableBodyId} (Filter: ${filterGameType}, Limit: ${limit})...`);
    const loadingText = filterGameType === 'all' ? 'all' : (gameTypesConfig[filterGameType] || filterGameType);
    tableBody.innerHTML = `<tr><td colspan="5" class="loading-text text-center py-4">Loading ${loadingText} results...</td></tr>`;

    // Set column visibility *before* fetching data, in case fetch is slow
    updateResultsTableColumnVisibility(filterGameType, parentTableId);

    try {
        let query = db.collection('games');

        // Apply filter if not 'all'
        if (filterGameType !== 'all') {
            query = query.where('game_type', '==', filterGameType);
            console.log(`[RESULTS] Applying filter: game_type == ${filterGameType}`);
        }

        // Always order by date and apply limit
        query = query.orderBy('date_played', 'desc').limit(limit);

        const snapshot = await query.get();

        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="5" class="muted-text text-center py-4">No ${loadingText} results found.</td></tr>`;
            // Still update visibility in case the table was previously showing golf columns
            updateResultsTableColumnVisibility(filterGameType, parentTableId);
            return;
        }

        tableBody.innerHTML = ''; // Clear loading message
        if (!playersCachePopulated) await fetchAllPlayersForCache(); // Ensure player names are available

        const courseCache = {}; // Local cache for this population run
        const coursePromises = []; // To fetch courses in parallel

        // Pre-fetch necessary course data for golf games
        snapshot.docs.forEach(doc => {
            const game = doc.data();
            if (game.game_type === 'golf' && game.course_id && !courseCache[game.course_id]) {
                // Add a placeholder to prevent multiple fetches for the same ID
                courseCache[game.course_id] = { loading: true };
                coursePromises.push(
                    db.collection('golf_courses').doc(game.course_id).get()
                        .then(courseDoc => {
                            if (courseDoc.exists) {
                                courseCache[game.course_id] = { id: courseDoc.id, ...courseDoc.data() };
                            } else {
                                console.warn(`[RESULTS] Golf course with ID ${game.course_id} not found.`);
                                courseCache[game.course_id] = { name: 'Unknown Course', location: null }; // Mark as not found
                            }
                        })
                        .catch(error => {
                            console.error(`[RESULTS] Error fetching course ${game.course_id}:`, error);
                            courseCache[game.course_id] = { name: 'Error Loading Course', location: null }; // Mark error
                        })
                );
            }
        });

        // Wait for all course fetches to complete
        await Promise.all(coursePromises);
        console.log("[RESULTS] Course cache populated:", courseCache);


        snapshot.forEach(doc => {
            const game = { id: doc.id, ...doc.data() };
            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'N/A';
            const gameTypeDisplay = gameTypesConfig[game.game_type] || game.game_type || 'Unknown';
            const formatDisplay = game.format ? ` <span class="text-xs text-gray-500 dark:text-gray-400">(${game.format})</span>` : '';
            const participants = game.participants || [];
            const team1 = game.team1_participants || [];
            const team2 = game.team2_participants || [];

            // --- Build Description and Course/Location ---
            let description = '';
            let scoreDisplay = game.score ? `[${game.score}]` : ''; // Basic score display for non-golf
            let courseNameDisplay = '-';
            let courseLocationDisplay = '-';

            if (game.game_type === 'golf') {
                // Golf: Description = Player Name (Score: 90 / Par: 72 | +18)
                const playerName = participants.length > 0 ? (globalPlayerCache[participants[0]]?.name || 'Unknown Player') : 'Unknown Player';
                description = `<b>${playerName}</b>`;
                let parForRound = null;

                if (game.course_id && courseCache[game.course_id] && !courseCache[game.course_id].loading) {
                    const course = courseCache[game.course_id];
                    courseNameDisplay = course.name || 'Unnamed Course';
                    courseLocationDisplay = course.location || '-';
                    parForRound = course.total_par || null; // Assuming 18 holes for now
                } else if (game.course_id) {
                    courseNameDisplay = `Course ID ${game.course_id}`; // Fallback if cache failed
                }

                if (typeof game.score === 'number' && parForRound) {
                    const differential = game.score - parForRound;
                    let diffClass = 'text-gray-600 dark:text-gray-400';
                    let diffPrefix = '';
                    let diffDisplay = '';
                    if (differential > 0) { diffClass = 'text-red-600 dark:text-red-400'; diffPrefix = '+'; }
                    else if (differential < 0) { diffClass = 'text-green-600 dark:text-green-400'; }
                    diffDisplay = differential === 0 ? 'E' : `${diffPrefix}${differential}`;

                    description += ` (Score: ${game.score}/${parForRound} | <span class="font-semibold ${diffClass}">${diffDisplay}</span>)`;
                } else if (typeof game.score === 'number') {
                    description += ` (Score: ${game.score})`;
                }
                scoreDisplay = ''; // Score is now part of the description for golf
            } else if (game.outcome === 'Win/Loss' && participants.length >= 2) {
                // 1v1 Win/Loss: Winner defeated Loser in GameType [Score]
                const winnerName = globalPlayerCache[participants[0]]?.name || 'Unknown';
                const loserName = globalPlayerCache[participants[1]]?.name || 'Unknown';
                description = `<b>${winnerName}</b> defeated ${loserName} in ${gameTypeDisplay}${formatDisplay}`;
                if (game.game_type === 'chess' && game.chess_outcome) description += ` (${game.chess_outcome})`;
            } else if (game.outcome === 'Draw' && participants.length >= 2) {
                // 1v1 Draw: Player1 drew with Player2 in GameType [Score]
                const player1Name = globalPlayerCache[participants[0]]?.name || 'Unknown';
                const player2Name = globalPlayerCache[participants[1]]?.name || 'Unknown';
                description = `${player1Name} drew with ${player2Name} in ${gameTypeDisplay}${formatDisplay}`;
                if (game.game_type === 'chess' && game.chess_outcome) description += ` (${game.chess_outcome})`;
            } else if (game.outcome === 'Team Win' && team1.length > 0 && team2.length > 0) {
                // Team Win: Team (P1, P2) defeated Team (P3, P4) in GameType [Score]
                const team1Names = team1.map(id => globalPlayerCache[id]?.name || '?').join(', ');
                const team2Names = team2.map(id => globalPlayerCache[id]?.name || '?').join(', ');
                description = `<b>Team (${team1Names})</b> defeated Team (${team2Names}) in ${gameTypeDisplay}${formatDisplay}`;
            } else if (game.outcome === 'Team Draw' && team1.length > 0 && team2.length > 0) {
                // Team Draw: Team (P1, P2) drew with Team (P3, P4) in GameType [Score]
                const team1Names = team1.map(id => globalPlayerCache[id]?.name || '?').join(', ');
                const team2Names = team2.map(id => globalPlayerCache[id]?.name || '?').join(', ');
                description = `Team (${team1Names}) drew with Team (${team2Names}) in ${gameTypeDisplay}${formatDisplay}`;
            } else if (game.outcome === 'Cutthroat Win' && participants.length >= 3) {
                const winnerId = participants.find(pId => !game.participants.slice(1).includes(pId)); // Assumes winner is first if structure is [winner, loser1, loser2]
                const winnerName = globalPlayerCache[winnerId]?.name || 'Unknown';
                description = `<b>${winnerName}</b> won ${gameTypeDisplay}${formatDisplay}`;
            } else if (game.outcome === 'Solo Complete' && participants.length === 1) {
                const playerName = globalPlayerCache[participants[0]]?.name || 'Unknown';
                description = `<b>${playerName}</b> completed ${gameTypeDisplay}${formatDisplay}`;
                if (game.score) scoreDisplay = `[${game.score} points/time]`; // Adjust label if needed
            } else {
                // Fallback for other outcomes or participant counts
                const playerNames = participants.map(id => globalPlayerCache[id]?.name || '?').join(', ');
                description = `Game of ${gameTypeDisplay}${formatDisplay} played by ${playerNames}`;
            }

            // Append score if not already included in description (for non-golf games)
            if (scoreDisplay) {
                description += ` ${scoreDisplay}`;
            }

            // --- Create Table Row ---
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700'; // Added dark mode hover
            // Ensure 5 columns are created, add 'golf-column' class to the last two
            row.innerHTML = `
                <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${gameDate}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">${gameTypeDisplay}${formatDisplay}</td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <a href="#game-info-section?gameId=${game.id}" class="nav-link hover:underline" data-target="game-info-section">${description}</a>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 golf-column">${courseNameDisplay}</td> <!-- Added class -->
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 golf-column">${courseLocationDisplay}</td> <!-- Added class -->
            `;
            // Add click listener for the game link (description cell)
            const gameLink = row.querySelector('.nav-link[data-target="game-info-section"]');
            if (gameLink) {
                gameLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof showSection === 'function') {
                        showSection('game-info-section', true, { gameId: game.id });
                    } else {
                        window.location.hash = `#game-info-section?gameId=${game.id}`;
                    }
                });
            }

            tableBody.appendChild(row);
        });

        console.log(`[RESULTS] Populated ${snapshot.size} results for filter: ${filterGameType}`);

        // Update column visibility again after rows are added (important for dynamic content)
        updateResultsTableColumnVisibility(filterGameType, parentTableId);

    } catch (error) {
        console.error("[RESULTS] Error fetching results:", error);
        if (error.code === 'failed-precondition') {
             tableBody.innerHTML = `<tr><td colspan="5" class="error-text text-center py-4">Error: Firestore index missing for sorting results by date. Check console.</td></tr>`;
             console.error("Firestore index required: 'games' collection, 'date_played' field (descending).");
        } else {
            tableBody.innerHTML = `<tr><td colspan="5" class="error-text text-center py-4">Error loading results: ${error.message}</td></tr>`;
        }
        // Ensure columns are hidden if an error occurs during a golf filter
        updateResultsTableColumnVisibility('all', parentTableId); // Default to hiding golf columns on error
    }
}

// --- Dashboard Population Helpers ---

/**
 * Populates a list element with recent games (Placeholder).
 * @param {HTMLElement} listElement - The UL or OL element to populate.
 * @param {number} count - The number of items to display.
 */
async function populateRecentGamesListElement(listElement, count) {
    console.log(`[Dashboard Helper] populateRecentGamesListElement called for #${listElement?.id} (count: ${count})`);
    if (!listElement) return;
    // TODO: Implement actual fetching and rendering of recent games
    listElement.innerHTML = `<li class="text-gray-500 dark:text-gray-400 italic">Recent games not implemented yet.</li>`;
}

/**
 * Populates a list element with top players using the unified card style.
 * @param {HTMLElement} listElement - The UL or OL element to populate (e.g., #top-players-list).
 * @param {number} count - The number of items to display.
 */
async function populateTopPlayersListElement(listElement, count) {
    if (!listElement) { console.error("[Dashboard/TopPlayers] List element not provided."); return; }
    if (!db) { console.error("[Dashboard/TopPlayers] DB not available."); listElement.innerHTML = '<li class="error-text col-span-full">DB Error</li>'; return; }

    console.log(`[Dashboard/TopPlayers] Populating top ${count} players into #${listElement.id}`);
    listElement.innerHTML = '<li class="loading-text col-span-full">Loading...</li>';

    try {
        // Ensure player cache is ready
        if (!playersCachePopulated) await fetchAllPlayersForCache();

        // Fetch players ordered by overall_elo
        const snapshot = await db.collection('players')
                                 .orderBy('overall_elo', 'desc')
                                 .limit(count)
                                 .get();

        if (snapshot.empty) {
            listElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400 italic col-span-full">No players found.</li>';
            return;
        }

        listElement.innerHTML = ''; // Clear loading message
        const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;

        snapshot.forEach(doc => {
            const player = { id: doc.id, ...doc.data() };
            const playerLi = document.createElement('li');
            // Apply unified card style and modal trigger classes/attributes directly to the LI
            playerLi.className = 'player-card player-entry'; // Use the same class
            playerLi.setAttribute('data-player-id', player.id);

            const firstName = player.name ? player.name.split(' ')[0] : 'Unknown';
            const profileImageUrl = player.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=random&color=fff&size=128`;
            const overallElo = player.overall_elo || defaultElo;

            // Use the new inner HTML structure
            playerLi.innerHTML = `
                <div class="player-card-image-wrapper">
                    <img src="${profileImageUrl}" alt="${firstName}" class="player-card-image" loading="lazy">
                </div>
                 <div class="flex flex-col items-center text-center w-full"> <!-- Wrapper for text content -->
                    <span class="player-card-name">${player.name || 'Unnamed Player'}</span>
                    <span class="player-card-elo">Overall Elo: ${overallElo}</span> <!-- Always show Overall Elo on dashboard -->
                </div>
            `;
            listElement.appendChild(playerLi);
        });
        console.log(`[Dashboard/TopPlayers] Populated ${snapshot.size} players.`);

    } catch (error) {
        console.error("[Dashboard/TopPlayers] Error fetching top players:", error);
        if (error.code === 'failed-precondition') {
             listElement.innerHTML = '<li class="error-text col-span-full">Index Missing</li>';
             console.error("Firestore index required: 'players' collection, 'overall_elo' field (descending).");
        } else {
            listElement.innerHTML = `<li class="error-text col-span-full">Error: ${error.message}</li>`;
        }
    }
}

/**
 * Populates a list element with top teams (Placeholder).
 * @param {HTMLElement} listElement - The UL or OL element to populate.
 * @param {number} count - The number of items to display.
 */
async function populateTopTeamsListElement(listElement, count) {
    console.log(`[Dashboard Helper] populateTopTeamsListElement called for #${listElement?.id} (count: ${count})`);
    if (!listElement) return;
    // TODO: Implement actual fetching and rendering of top teams (requires team data structure)
    listElement.innerHTML = `<li class="text-gray-500 dark:text-gray-400 italic">Top teams not implemented yet.</li>`;
}

// Note: This file assumes that 'firebase', 'db', 'rankingsGameFilter', 'rankingTablesContainer',
// 'resultsTableBody', 'gameTypesConfig', 'DEFAULT_ELO', 'K_FACTOR', 'globalPlayerCache',
// 'playersCachePopulated', 'fetchAllPlayersForCache' are initialized and accessible
// from the global scope or imported/passed appropriately