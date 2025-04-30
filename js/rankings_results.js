// --- rankings_results.js ---

// --- Rankings Page Population ---

// Updates visibility of ranking tables based on filter selection
async function updateRankingsVisibility() {
    // Ensure necessary elements and DB connection are available (rankingsGameFilter, rankingTablesContainer, db, gameTypesConfig should be accessible)
    if (!rankingsGameFilter || !rankingTablesContainer || !db) {
        console.warn("Rankings filter, container, or DB not ready. Cannot update rankings view.");
        if(rankingTablesContainer) rankingTablesContainer.innerHTML = '<p class="text-red-500 p-4 text-center">Error initializing rankings view.</p>';
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
             <div class="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg">
                 <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">${gameName} Rankings (${rankingTypeTitle})</h2>
                 <div class="overflow-x-auto">
                     <table class="w-full text-left table-auto text-sm md:text-base">
                         <thead>
                             <tr class="bg-gray-100 dark:bg-gray-700">
                                 <th class="px-4 py-3 text-gray-600 dark:text-gray-300">Rank</th>
                                 <th class="px-4 py-3 text-gray-600 dark:text-gray-300">Player</th>
                                 <th class="px-4 py-3 text-gray-600 dark:text-gray-300">${ratingHeader}</th>
                             </tr>
                         </thead>
                         <tbody id="${selectedGame}-rankings-body" class="text-gray-700 dark:text-gray-200">
                             <tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">Initializing...</td></tr>
                         </tbody>
                     </table>
                 </div>
             </div>`;
         rankingTablesContainer.appendChild(targetTable);
    }

    // Show the selected table and populate its data
    if (targetTable) {
         targetTable.classList.remove('hidden');
         targetTable.classList.add('active');

         // Call the appropriate data population function (ensure these functions are accessible)
         if (selectedGame === 'overall') {
             await populateOverallRankings();
         } else if (gameTypesConfig[selectedGame]) {
             await populateGameRankings(selectedGame);
         } else {
             console.warn(`Unknown game type selected: ${selectedGame}`);
             const tbody = targetTable.querySelector('tbody');
             if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400 italic">Unknown game type selected.</td></tr>`;
         }
    } else {
         console.warn(`Ranking table container for "${selectedGame}" (ID: ${targetTableId}) not found.`);
         rankingTablesContainer.innerHTML = '<p class="text-red-500 p-4 text-center">Error: Could not display selected ranking table.</p>';
    }
} // End updateRankingsVisibility

// Populates Overall 1v1 and 2v2 tables
async function populateOverallRankings() {
     // Ensure db and DEFAULT_ELO are accessible
     const elo1v1Body = document.getElementById('overall-1v1-rankings-body');
     const elo2v2Body = document.getElementById('overall-2v2-rankings-body');

     // Populate 1v1 Overall Rankings
     if (elo1v1Body && db) {
         elo1v1Body.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">Loading rankings...</td></tr>';
         try {
             // Requires index: players: elo_overall (desc)
             const snapshot = await db.collection('players').orderBy('elo_overall', 'desc').limit(20).get();
             if (snapshot.empty) {
                elo1v1Body.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">No players found.</td></tr>';
             } else {
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
         } catch (error) {
              console.error("Error loading Overall 1v1 rankings:", error);
              if (error.code === 'failed-precondition') {
                 elo1v1Body.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-red-500">Error: Firestore index missing (players: elo_overall desc).</td></tr>';
                 console.error("Firestore index needed: players collection, elo_overall (descending).");
              } else {
                 elo1v1Body.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-red-500">Error loading rankings.</td></tr>';
              }
         }
     }

     // Populate 2v2 Overall Rankings (Placeholder)
     if (elo2v2Body) {
         elo2v2Body.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400 italic">2v2 Team rankings not implemented.</td></tr>';
     }
} // End populateOverallRankings

// Populates game-specific rankings table (Handles Golf Handicap vs Elo)
async function populateGameRankings(gameKey) {
     // Ensure db, gameTypesConfig, DEFAULT_ELO are accessible
     const tableBodyId = `${gameKey}-rankings-body`;
     const tableBody = document.getElementById(tableBodyId);
     const gameName = gameTypesConfig[gameKey] || gameKey;

     if (!tableBody || !db) {
        console.warn(`Cannot populate rankings for ${gameName}: Table body or DB missing.`);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Error initializing table.</td></tr>`;
        return;
     }
     tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">Loading ${gameName} rankings...</td></tr>`;

     // GOLF: Fetch and display by Handicap
     if (gameKey === 'golf') {
         console.log(`[RANKING] Populating Golf Handicap rankings.`);
         try {
            // ** Index Required: players: golf_handicap (Asc) **
            const snapshot = await db.collection('players')
                                   .where('golf_handicap', '!=', null) // Filter by non-null handicap
                                   .orderBy('golf_handicap', 'asc')    // Order by handicap
                                   .limit(20)
                                   .get();
             if (snapshot.empty) {
                 const anyPlayer = await db.collection('players').limit(1).get(); // Check if any players exist at all
                 if (anyPlayer.empty) tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">No players found.</td></tr>`;
                 else tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">No players have a calculated handicap yet.</td></tr>`;
             } else {
                tableBody.innerHTML = ''; let rank = 1;
                snapshot.forEach(doc => {
                    const player = doc.data();
                    const handicapValue = player.golf_handicap;
                    const displayHandicap = (typeof handicapValue === 'number') ? handicapValue.toFixed(1) : 'N/A';
                    const tr = document.createElement('tr');
                    tr.className = 'border-b dark:border-gray-700'; // Added dark mode class
                    tr.innerHTML = `<td class="px-4 py-2">${rank}</td><td class="px-4 py-2">${player.name || 'Unnamed'}</td><td class="px-4 py-2">${displayHandicap}</td>`;
                    tableBody.appendChild(tr); rank++;
                });
             }
        } catch (error) {
            console.error(`Error loading Golf Handicap rankings:`, error);
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                 tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Error: Firestore index missing (players: golf_handicap asc). Check console.</td></tr>`;
                 console.error(`Firestore index needed: players collection, field 'golf_handicap' (ascending).`);
             } else { tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Error loading ${gameName} rankings.</td></tr>`; }
         }
     }
     // OTHER GAMES: Fetch and display by Elo
     else {
         console.log(`[RANKING] Populating Elo rankings for ${gameName} (Key: ${gameKey}).`);
         try {
            // ** Index Required: players: elos.<gameKey> (desc) for EACH game type **
            const fieldPath = `elos.${gameKey}`;
            const snapshot = await db.collection('players')
                                   .where(fieldPath, '>', 0) // Filter players who have played the game (Elo > 0 assumption might need refinement)
                                   .orderBy(fieldPath, 'desc') // Order by Elo descending
                                   .limit(20)
                                   .get();
            if (snapshot.empty) {
                 const anyPlayerWithGameElo = await db.collection('players').where(fieldPath, '!=', null).limit(1).get(); // Check if anyone has *any* Elo for this game
                 if (anyPlayerWithGameElo.empty) { // If no one has an Elo field for this game yet
                     tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">No players have played ${gameName} yet.</td></tr>`;
                 } else { // Players exist, but maybe none meet the > 0 filter (e.g., only defaults)
                     tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500 dark:text-gray-400">No ranked players found for ${gameName}.</td></tr>`;
                 }
            } else {
                tableBody.innerHTML = ''; let rank = 1;
                snapshot.forEach(doc => {
                    const player = doc.data();
                    const rating = player.elos?.[gameKey];
                    const tr = document.createElement('tr');
                    tr.className = 'border-b dark:border-gray-700'; // Added dark mode class
                    tr.innerHTML = `<td class="px-4 py-2">${rank}</td><td class="px-4 py-2">${player.name || 'Unnamed'}</td><td class="px-4 py-2">${rating ? Math.round(rating) : DEFAULT_ELO}</td>`; // Show default if somehow null/undefined after filtering
                    tableBody.appendChild(tr); rank++;
                });
             }
         } catch (error) {
            console.error(`Error loading ${gameName} Elo rankings:`, error);
            if (error.code === 'failed-precondition' || error.message.includes('index')) {
                 tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Error: Firestore index missing (players: elos.${gameKey} desc). Check console.</td></tr>`;
                 console.error(`Firestore index needed: players collection, field 'elos.${gameKey}' (descending).`);
             } else { tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Error loading ${gameName} rankings.</td></tr>`; }
         }
     } // End Conditional Logic
} // End populateGameRankings


// --- Results Table Population ---

async function populateResultsTable() {
    // Ensure resultsTableBody, db, fetchAllPlayersForCache, playersCachePopulated, globalPlayerCache, gameTypesConfig are accessible
    if (!resultsTableBody) { console.error("[RESULTS] Table body 'results-table-body' not found."); return; }
    if (!db) { console.error("[RESULTS] Firestore database (db) is not initialized."); resultsTableBody.innerHTML = '<tr><td colspan="4" class="text-red-500 text-center py-4">Database connection error.</td></tr>'; return; }

    // Ensure player cache is populated
    if (!playersCachePopulated) {
        console.warn("[RESULTS] Player cache not populated, attempting fetch...");
        await fetchAllPlayersForCache();
        if (!playersCachePopulated) {
             console.error("[RESULTS] Failed to populate player cache. Cannot display results accurately.");
             resultsTableBody.innerHTML = '<tr><td colspan="4" class="text-red-500 text-center py-4">Error loading player data for results.</td></tr>';
             return;
        }
    }

    console.log("[RESULTS] Populating results table using global cache...");
    resultsTableBody.innerHTML = '<tr><td colspan="4" class="text-gray-500 dark:text-gray-400 text-center py-4">Loading results...</td></tr>'; // Added dark mode class

    try {
        // Fetch games ordered by date, limit for performance
        // Requires index: games: date_played (desc)
        const snapshot = await db.collection('games').orderBy('date_played', 'desc').limit(50).get();

        if (snapshot.empty) {
            resultsTableBody.innerHTML = '<tr><td colspan="4" class="text-gray-500 dark:text-gray-400 text-center py-4">No game results found.</td></tr>'; // Added dark mode class
            return;
        }

        resultsTableBody.innerHTML = ''; // Clear loading

        // Optional: Cache course names locally for this function run
         const courseCache = {};
         const getCourseName = async (courseId) => {
            if (!courseId || courseId === 'none') return null;
            if (courseCache[courseId]) return courseCache[courseId];
            try {
                const courseDoc = await db.collection('golf_courses').doc(courseId).get();
                const name = courseDoc.exists ? courseDoc.data().name : 'Unknown Course';
                courseCache[courseId] = name;
                return name;
            } catch (err) { console.warn(`[RESULTS] Error fetching course ${courseId}:`, err); return 'Error Loading Course'; }
         };

        for (const doc of snapshot.docs) {
            const game = { id: doc.id, ...doc.data() };
            const tr = document.createElement('tr');
            tr.className = 'border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'; // Added dark mode classes
            tr.setAttribute('data-game-id', game.id);

            let gameDateStr = 'N/A';
            if (game.date_played && typeof game.date_played.toDate === 'function') {
                try { gameDateStr = game.date_played.toDate().toLocaleDateString(); }
                catch (e) { console.warn("Error formatting date:", e, game.date_played); }
            }

            const gameTypeDisplay = gameTypesConfig[game.game_type] || game.game_type || 'N/A';
            let description = '';

            // Use global cache for player names
            const participants = game.participants || [];
            const participantNames = participants.map(id => globalPlayerCache[id]?.name || 'Unknown Player');

            // Build Description
            if (game.game_type === 'golf' && participantNames.length > 0) {
                description = `${gameTypeDisplay}: <b>${participantNames[0]}</b> scored ${game.score || 'N/A'}`;
                if (game.course_id && game.course_id !== 'none') {
                     const courseName = await getCourseName(game.course_id);
                     if (courseName && courseName !== 'Error Loading Course' && courseName !== 'Unknown Course') { description += ` at ${courseName}`; }
                     else if (courseName === 'Error Loading Course' || courseName === 'Unknown Course'){ description += ` (on course ${game.course_id})`; }
                     else { description += ` (on course)`; }
                } else if (!game.course_id) { description += ` (no course info)`; }
            } else { // Non-Golf
                description = gameTypeDisplay;
                if (participants.length > 0) {
                    if (game.outcome === 'Win/Loss' && participantNames.length >= 2) { description = `${gameTypeDisplay}: <b>${participantNames[0]}</b> defeated ${participantNames[1]}`; }
                    else if (game.outcome === 'Draw' && participantNames.length >= 2) { description = `${gameTypeDisplay}: ${participantNames[0]} drew with ${participantNames[1]}`; }
                    else { description = `${gameTypeDisplay}: ${participantNames.join(' vs ')}`; }
                    if (game.score) { description += ` <span class="text-gray-600 dark:text-gray-400">(${game.score})</span>`; } // Added dark mode class
                } else { description += ": Unknown Participants"; }
            }

            // Gear icon cell (visibility controlled by CSS .admin-only and body.admin-logged-in)
            const actionsCellContent = `
                <div class="admin-only text-center">
                    <button class="text-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1 edit-delete-game-btn" data-game-id="${game.id}" title="Edit/Delete Game">⚙️</button>
                </div>`;

            // Populate table row
            tr.innerHTML = `
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">${gameDateStr}</td>
                <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">${gameTypeDisplay}</td>
                <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">${description}</td>
                <td class="px-2 py-3 text-sm">${actionsCellContent}</td>
            `;
            resultsTableBody.appendChild(tr);
        } // End loop

        console.log(`[RESULTS] Populated results table with ${snapshot.size} games.`);

    } catch (error) {
        console.error("Error fetching games for results table:", error);
         if (error.code === 'failed-precondition') {
             resultsTableBody.innerHTML = `<tr><td colspan="4" class="text-red-500 text-center py-4">Error: Firestore index missing for sorting results by date. Check console.</td></tr>`;
             console.error("Firestore index required: 'games' collection, 'date_played' field (descending).");
         } else {
            resultsTableBody.innerHTML = `<tr><td colspan="4" class="text-red-500 text-center py-4">Error loading results: ${error.message}</td></tr>`;
         }
    }
} // End populateResultsTable


// --- Elo Calculation & Update Functions ---

// Calculates Elo change for a Win/Loss result
async function calculateEloUpdate(winnerId, loserId, gameType) {
    // Ensure db, DEFAULT_ELO, K_FACTOR are accessible
    if (!db || !winnerId || !loserId || !gameType) { console.error("[ELO Calc] Missing required parameters or DB connection."); return {}; }
    console.log(`[ELO Calc] Calculating update for ${gameType}: Winner=${winnerId}, Loser=${loserId}`);
    try {
        const winnerRef = db.collection('players').doc(winnerId);
        const loserRef = db.collection('players').doc(loserId);
        const [winnerDoc, loserDoc] = await Promise.all([winnerRef.get(), loserRef.get()]);

        if (!winnerDoc.exists || !loserDoc.exists) {
            console.error("[ELO Calc] Winner or loser document not found.");
            alert("Error: Could not find player data for Elo calculation.");
            return {};
        }

        const winnerData = winnerDoc.data();
        const loserData = loserDoc.data();

        // Get current Elo for the specific game type
        const winnerElo = winnerData.elos?.[gameType] || DEFAULT_ELO;
        const loserElo = loserData.elos?.[gameType] || DEFAULT_ELO;
        console.log(`[ELO Calc] Current ${gameType} Elo: Winner=${winnerElo}, Loser=${loserElo}`);

        // Standard Elo calculation
        const exponent = (loserElo - winnerElo) / 400;
        const expectedScoreWinner = 1 / (1 + Math.pow(10, exponent));
        const newWinnerElo = Math.round(winnerElo + K_FACTOR * (1 - expectedScoreWinner));
        const newLoserElo = Math.round(loserElo + K_FACTOR * (0 - (1 - expectedScoreWinner)));

        console.log(`[ELO Calc] New ${gameType} Elo: Winner=${newWinnerElo}, Loser=${newLoserElo}`);

        // Prepare update objects using dot notation
        const winnerUpdates = {}; winnerUpdates[`elos.${gameType}`] = newWinnerElo;
        const loserUpdates = {}; loserUpdates[`elos.${gameType}`] = newLoserElo;

        return { [winnerId]: winnerUpdates, [loserId]: loserUpdates };

    } catch (error) {
        console.error("[ELO Calc] Error calculating Elo update:", error);
        alert(`Error calculating Elo: ${error.message}`);
        return {};
    }
} // End calculateEloUpdate

// Calculates Elo change for a Draw result
async function calculateEloUpdateDraw(player1Id, player2Id, gameType) {
     // Ensure db, DEFAULT_ELO, K_FACTOR are accessible
     if (!db || !player1Id || !player2Id || !gameType) { console.error("[ELO Calc Draw] Missing required parameters or DB connection."); return {}; }
     console.log(`[ELO Calc Draw] Calculating update for ${gameType} Draw: P1=${player1Id}, P2=${player2Id}`);
     try {
        const p1Ref = db.collection('players').doc(player1Id);
        const p2Ref = db.collection('players').doc(player2Id);
        const [p1Doc, p2Doc] = await Promise.all([p1Ref.get(), p2Ref.get()]);

        if (!p1Doc.exists || !p2Doc.exists) {
            console.error("[ELO Calc Draw] Player document not found.");
            alert("Error: Could not find player data for Elo calculation.");
            return {};
        }

        const p1Data = p1Doc.data();
        const p2Data = p2Doc.data();

        const p1Elo = p1Data.elos?.[gameType] || DEFAULT_ELO;
        const p2Elo = p2Data.elos?.[gameType] || DEFAULT_ELO;
        console.log(`[ELO Calc Draw] Current ${gameType} Elo: P1=${p1Elo}, P2=${p2Elo}`);

        // Elo calculation for draw (actual score is 0.5)
        const exponent1 = (p2Elo - p1Elo) / 400;
        const expectedScoreP1 = 1 / (1 + Math.pow(10, exponent1));
        const expectedScoreP2 = 1 - expectedScoreP1; // Symmetrical calculation
        const newP1Elo = Math.round(p1Elo + K_FACTOR * (0.5 - expectedScoreP1));
        const newP2Elo = Math.round(p2Elo + K_FACTOR * (0.5 - expectedScoreP2));

        console.log(`[ELO Calc Draw] New ${gameType} Elo: P1=${newP1Elo}, P2=${newP2Elo}`);

        // Prepare update objects
        const p1Updates = {}; p1Updates[`elos.${gameType}`] = newP1Elo;
        const p2Updates = {}; p2Updates[`elos.${gameType}`] = newP2Elo;

        return { [player1Id]: p1Updates, [player2Id]: p2Updates };

     } catch (error) {
         console.error("[ELO Calc Draw] Error calculating Elo update:", error);
         alert(`Error calculating Elo for draw: ${error.message}`);
         return {};
     }
} // End calculateEloUpdateDraw


// Updates player documents with Elo and Stats using a batch write
async function updatePlayerElosAndStats(combinedUpdates) {
     // Ensure db and firebase are accessible
     if (!db || !firebase || !firebase.firestore || Object.keys(combinedUpdates).length === 0) {
         console.warn("[ELO/STATS Update] No updates to apply or DB/Firestore FieldValue not connected/available.");
         return;
     }
     console.log("[ELO/STATS Update] Starting batch update:", combinedUpdates);
     const batch = db.batch(); // Create a new batch

     Object.entries(combinedUpdates).forEach(([playerId, updates]) => {
         if (playerId && typeof updates === 'object' && updates !== null && Object.keys(updates).length > 0) {
             const playerRef = db.collection('players').doc(playerId);
             // Merge potential Elo and stat updates
             batch.update(playerRef, updates);
             console.log(`[ELO/STATS Update] Adding update for ${playerId}:`, updates);
         } else {
             console.warn(`[ELO/STATS Update] Skipping invalid update entry for player ID: ${playerId}`, updates);
         }
     });

     try {
         await batch.commit();
         console.log("[FIRESTORE] Batch Elo/Stat update committed successfully.");
     } catch (error) {
         console.error("[FIRESTORE] Batch Elo/Stat update failed:", error);
         alert(`Failed to update player ratings/stats: ${error.message}`);
         // Optionally re-throw the error if higher-level handling is needed
         // throw error;
     }
} // End updatePlayerElosAndStats


// --- Golf Handicap Calculation ---

// Helper: Get Course Par by ID (with Caching)
async function getCourseParById(courseId, cacheObject) {
    // Ensure db is accessible
    if (!courseId) return null;
    // Check cache first
    if (cacheObject[courseId] !== undefined) return cacheObject[courseId];
    try {
        if (!db) { console.warn("DB not ready for getCourseParById"); return null; }
        const courseDoc = await db.collection('golf_courses').doc(courseId).get();
        let par = null;
        if (courseDoc.exists) {
            const data = courseDoc.data();
            if (typeof data.total_par === 'number') {
                par = data.total_par;
            } else { console.warn(`[getCourseParById] Course ${courseId} invalid 'total_par'.`); }
        } else { console.warn(`[getCourseParById] Course doc ${courseId} not found.`); }
        cacheObject[courseId] = par; // Store result (even null) in cache
        return par;
    } catch (err) {
        console.error(`[getCourseParById] Error fetching course ${courseId}:`, err);
        cacheObject[courseId] = null; // Cache null on error
        return null;
    }
} // End getCourseParById

// Simplified Handicap Calculation: Average Differential of Last N Scores
async function updateGolfHandicap(playerId, scoresToConsider = 10) {
    // Ensure db and rankingsGameFilter (optional, for UI refresh) are accessible
    if (!db || !playerId) { console.warn("[HANDICAP CALC] DB or Player ID missing."); return; }
    console.log(`[HANDICAP DEBUG] === Starting calculation for player ${playerId} (Scores: ${scoresToConsider}) ===`);
    const handicapCalcCache = {}; // Local cache for course pars during this calculation

    try {
        // Step 1: Fetch recent golf scores for the player
        console.log(`[HANDICAP DEBUG] Fetching last ${scoresToConsider} golf scores...`);
        // *** Index Required: games: player_id (==), game_type (==), date_played (desc) ***
        const gamesSnapshot = await db.collection('games')
            .where('player_id', '==', playerId)
            .where('game_type', '==', 'golf')
            .orderBy('date_played', 'desc')
            .limit(scoresToConsider)
            .get();

        if (gamesSnapshot.empty) { console.log(`[HANDICAP DEBUG] No golf scores found. Exiting calculation.`); return; }
        console.log(`[HANDICAP DEBUG] Found ${gamesSnapshot.size} potential scores.`);

        // Step 3: Calculate differentials
        const differentials = [];
        console.log(`[HANDICAP DEBUG] Calculating differentials...`);
        for (const gameDoc of gamesSnapshot.docs) {
            const gameData = gameDoc.data();
            const score = gameData.score;
            const courseId = gameData.course_id;
            const holesPlayed = gameData.holes_played || '18';

            // Validate required data for differential calculation
            if (!courseId) { console.log(`[HANDICAP DEBUG] Skipping game ${gameDoc.id}: Missing course_id.`); continue; }
            if (typeof score !== 'number') { console.log(`[HANDICAP DEBUG] Skipping game ${gameDoc.id}: Invalid score.`); continue; }

            // Get course par using the helper function and local cache
            const coursePar = await getCourseParById(courseId, handicapCalcCache);
            if (typeof coursePar !== 'number') { console.log(`[HANDICAP DEBUG] Skipping game ${gameDoc.id}: Invalid par for course ${courseId}.`); continue; }

            // Adjust par for 9-hole rounds
            let parForRound = coursePar;
            if (holesPlayed === '9F' || holesPlayed === '9B') { parForRound = Math.round(coursePar / 2); }

            const differential = score - parForRound;
            differentials.push(differential);
            console.log(`[HANDICAP DEBUG] Game ${gameDoc.id}: Score=${score}, Par=${parForRound}, Diff=${differential}`);
        }

        // Step 4: Calculate the average handicap
        if (differentials.length === 0) { console.log(`[HANDICAP DEBUG] No valid differentials calculated. Exiting.`); return; }

        const sumOfDifferentials = differentials.reduce((sum, diff) => sum + diff, 0);
        const calculatedHandicap = sumOfDifferentials / differentials.length;
        const finalHandicap = Math.round(calculatedHandicap * 10) / 10; // Round to one decimal place

        console.log(`[HANDICAP DEBUG] Final Handicap Calculated: ${finalHandicap} (Type: ${typeof finalHandicap}) from ${differentials.length} diffs`);

        // Step 5: Update Firestore if handicap is a valid number
        const playerRef = db.collection('players').doc(playerId);
        if (typeof finalHandicap === 'number' && !isNaN(finalHandicap)) {
            console.log(`[HANDICAP DEBUG] Preparing Firestore update for player ${playerId}: { golf_handicap: ${finalHandicap} }`);
            try {
                await playerRef.update({ golf_handicap: finalHandicap });
                console.log(`[HANDICAP DEBUG] Firestore update successful for player ${playerId}.`);
                // Update cache if player exists there
                if (globalPlayerCache[playerId]) {
                    globalPlayerCache[playerId].golf_handicap = finalHandicap;
                }
            } catch (updateError) {
                console.error(`[HANDICAP DEBUG] Firestore update FAILED for player ${playerId}:`, updateError);
                alert(`Failed to save calculated handicap: ${updateError.message}`); return;
            }
        } else {
            console.error(`[HANDICAP DEBUG] Calculated finalHandicap (${finalHandicap}) is not valid. Skipping update.`);
            alert("Error: Calculated handicap was not valid."); return;
        }

        // Optional: Refresh rankings UI if viewing Golf rankings
        if (rankingsGameFilter?.value === 'golf' && document.getElementById('rankings-section') && !document.getElementById('rankings-section').classList.contains('hidden')) {
             console.log("[HANDICAP DEBUG] Refreshing golf rankings display.");
             await populateGameRankings('golf'); // Ensure populateGameRankings is accessible
        }
         console.log(`[HANDICAP DEBUG] === Calculation finished successfully for player ${playerId} ===`);

    } catch (error) {
         console.error(`[HANDICAP DEBUG] === Error during calculation process for player ${playerId}:`, error);
         if (error.code === 'failed-precondition') {
             console.error("Firestore index likely needed: games: player_id (==), game_type (==), date_played (desc).");
             alert("Error calculating handicap: A database index is missing. Please check the console.");
         } else { alert(`An error occurred while calculating the handicap: ${error.message}`); }
    }
} // End updateGolfHandicap

// Note: This file assumes that 'firebase', 'db', 'rankingsGameFilter', 'rankingTablesContainer',
// 'resultsTableBody', 'gameTypesConfig', 'DEFAULT_ELO', 'K_FACTOR', 'globalPlayerCache',
// 'playersCachePopulated', 'fetchAllPlayersForCache' are initialized and accessible
// from the global scope or imported/passed appropriately.