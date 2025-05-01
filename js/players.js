// --- players.js ---

let globalPlayerCache = {}; // Cache for player data { id: { name: '...', iconUrl: '...' } }
let playersCachePopulated = false; // Flag to track if initial population happened

// --- Player Data Fetching and Caching ---

// Fetches all players and populates the global cache
async function fetchAllPlayersForCache() {
    if (playersCachePopulated) {
        console.log("[CACHE] Global player cache already populated.");
        return true; // Already done
    }
    console.log("[CACHE] Populating global player cache...");
    // Ensure getAllPlayers is accessible or defined within this scope
    const players = await getAllPlayers('name'); // Use the existing function
    if (players && players.length > 0) {
        globalPlayerCache = {}; // Reset cache
        players.forEach(player => {
            globalPlayerCache[player.id] = player; // Store the whole player object
        });
        playersCachePopulated = true;
        console.log(`[CACHE] Global player cache populated with ${Object.keys(globalPlayerCache).length} players.`);
        return true;
    } else {
        console.error("[CACHE] Failed to fetch players for global cache.");
        playersCachePopulated = false; // Mark as not populated on failure
        return false;
    }
}

// Fetches all players from Firestore
async function getAllPlayers(orderBy = 'name') {
    // Ensure db is accessible
    if (!db) {
        console.error("getAllPlayers: Firestore DB not initialized.");
        return []; // Return empty array if DB not ready
    }
    console.log(`[DATA] Fetching all players, ordered by ${orderBy}...`);
    try {
        // Requires Firestore index: players: name (asc)
        const snapshot = await db.collection('players').orderBy(orderBy).get();
        const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[DATA] Fetched ${players.length} players.`);
        return players;
    } catch (error) {
        console.error("Error fetching players:", error);
        // Check for index error specifically
        if (error.code === 'failed-precondition') {
            console.error("Firestore index required: 'players' collection, 'name' field (ascending). Please create this index in your Firebase console.");
            alert("Database Error: A required index for players is missing. Please contact the administrator.");
        } else {
            alert(`Error fetching player list: ${error.message}`);
        }
        return []; // Return empty array on error
    }
}

// Populates a single select element with player options from an array
async function populatePlayerDropdown(selectElement, playersArray, prompt = 'Select Player', selectedValue = null) {
    if (!selectElement) {
        console.warn("populatePlayerDropdown: Provided selectElement is null or undefined.");
        return;
    }
    // Ensure player cache is ready
    if (!playersCachePopulated) await fetchAllPlayersForCache();
    selectElement.innerHTML = `<option value="">${prompt}</option>`; // Clear existing options and add prompt
    playersArray.forEach(player => {
        const option = new Option(player.name || 'Unnamed Player', player.id);
        if (player.id === selectedValue) {
            option.selected = true; // Select the option if it matches the provided value
        }
        selectElement.add(option);
    });
    console.log(`[UI] Populated dropdown ${selectElement.id || '(no id)'} with ${playersArray.length} players.`);
}


// --- Player List Display ---

async function populatePlayersList() {
     // Find the grid element *inside* this function call
     const playersGrid = document.getElementById('players-grid');
     if (!playersGrid) {
         console.warn("[Player List] Player grid container (#players-grid) not found in current DOM.");
         // Don't try to update if the element isn't there (e.g., on a different page)
         return;
     }
     console.log("[Player List] Populating #players-grid..."); // Log start
     playersGrid.innerHTML = '<p class="loading-text col-span-full text-center">Loading players...</p>';
     try {
         if (!db) throw new Error("Firestore database (db) is not initialized.");
         // Use cached data if available and populated, otherwise fetch directly
         let playersToDisplay = [];
         if (playersCachePopulated && Object.keys(globalPlayerCache).length > 0) {
            console.log("[Player List] Using cached player data.");
            playersToDisplay = Object.values(globalPlayerCache).sort((a, b) => a.name.localeCompare(b.name)); // Sort cached data by name
         } else {
            console.log("[Player List] Cache not populated, fetching directly.");
            playersToDisplay = await getAllPlayers('name'); // Fetch sorted if cache not ready
         }

         if (!playersToDisplay || playersToDisplay.length === 0) {
             playersGrid.innerHTML = '<p class="muted-text col-span-full text-center">No players found. Add players via Admin Login or Register.</p>'; // Use muted-text
             return;
         }

         playersGrid.innerHTML = ''; // Clear loading
         playersToDisplay.forEach(player => {
             const div = document.createElement('div');
             div.className = 'player-entry bg-white dark:bg-gray-700 p-5 rounded-lg shadow hover:shadow-md cursor-pointer flex items-center space-x-4 transition duration-200 ease-in-out'; // Added dark mode class
             div.setAttribute('data-player-id', player.id);
             // Use ui-avatars.com for fallback icons
             const iconUrl = player.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || '?')}&background=E0E7FF&color=4F46E5&size=48`;
             div.innerHTML = `
                 <img src="${iconUrl}" alt="Icon ${player.name || ''}" class="w-12 h-12 rounded-full flex-shrink-0 object-cover bg-gray-200" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=?&background=cccccc&color=ffffff&size=48';">
                 <span class="font-medium text-lg text-gray-800 dark:text-gray-200 truncate">${player.name || 'Unnamed Player'}</span> `; // Added dark mode class
             playersGrid.appendChild(div);

             // Add event listener for opening player modal
             div.addEventListener('click', () => {
                 console.log(`[Player List] Clicked on player: ${player.name} (ID: ${player.id})`);
                 if (typeof openPlayerModal === 'function') {
                     openPlayerModal(player.id);
                 } else {
                     console.error("openPlayerModal function is not defined or accessible.");
                     alert("Error: Cannot open player details.");
                 }
             });
         });
         console.log(`[Player List] Displayed ${playersToDisplay.length} players in #players-grid.`);
     } catch (error) {
         console.error("Error populating players list:", error);
         // Ensure grid element exists before trying to update it with error
         if (playersGrid) {
            playersGrid.innerHTML = `<p class="error-text col-span-full text-center">Error loading players: ${error.message}</p>`;
         }
     }
}


// --- Add Player Modal Functions ---

function openAddPlayerModal() {
    // Get the specific modal container element
    const modalElement = document.getElementById('add-player-modal');
    if (!modalElement) { console.error("Add Player modal element (#add-player-modal) not found."); return; }
    if (!db) { console.error("Firestore DB not ready for Add Player modal."); return; }

    // Define and Inject the specific HTML content for this modal
    const modalContentHTML = `
        <div class="modal-content">
            <button id="close-add-player-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Add New Player</h2>
            <form id="add-player-form">
                <div class="mb-4">
                    <label for="player-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Player Name:</label>
                    <input type="text" id="player-name" name="player-name" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div class="mb-5">
                    <label for="player-icon-url" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Icon URL (Optional):</label>
                    <input type="url" id="player-icon-url" name="player-icon-url" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/icon.png">
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a URL for the player's avatar/icon.</p>
                </div>
                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="cancel-add-player-modal-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-5 rounded-lg">Cancel</button>
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg">Add Player</button>
                </div>
            </form>
        </div>`;
    modalElement.innerHTML = modalContentHTML;

    // Get references to elements *inside* the newly added modal content
    const closeButton = modalElement.querySelector('#close-add-player-modal-btn');
    const cancelButton = modalElement.querySelector('#cancel-add-player-modal-btn');
    const modalForm = modalElement.querySelector('#add-player-form');

    // Add event listeners
    if (closeButton) closeButton.addEventListener('click', closeAddPlayerModal);
    if (cancelButton) cancelButton.addEventListener('click', closeAddPlayerModal);
    if (modalForm) modalForm.addEventListener('submit', handleAddPlayerSubmit);

    // Call the generic openModal function (ensure openModal is accessible)
    openModal(modalElement);
}

function closeAddPlayerModal() {
    const modalElement = document.getElementById('add-player-modal');
    // Call the generic closeModal function (ensure closeModal is accessible)
    // It handles hiding, restoring scroll, and clearing content for this modal ID.
    closeModal(modalElement);
}

// Handles submission of the Add Player modal form
async function handleAddPlayerSubmit(event) {
    event.preventDefault(); // Prevent default form submission (page reload)
    const form = event.target; // Get the form element that triggered the event
    if (!db) { alert("Database connection error. Cannot add player."); return; }

    // Basic Form Validation
    let isValid = true;
    const nameInput = form.querySelector('#player-name');
    nameInput.classList.remove('border-red-500');
    const playerName = nameInput.value.trim();
    if (!playerName) {
        isValid = false;
        nameInput.classList.add('border-red-500');
    }
    if (!isValid) { alert("Please fill out all required fields (Player Name)."); return; }

    const playerIconUrl = form.querySelector('#player-icon-url')?.value.trim() || null;

    console.log(`[ADD PLAYER] Attempting to add player: ${playerName}`);

    try {
         // Initialize Player Data (Excluding golf Elo, including null handicap)
         // Ensure DEFAULT_ELO and ELO_GAME_KEYS are accessible
         const initialElos = { overall: DEFAULT_ELO };
         ELO_GAME_KEYS.forEach(gameKey => {
             if (gameKey !== 'golf') {
                 initialElos[gameKey] = DEFAULT_ELO;
             }
         });
         console.log("[ADD PLAYER] Initial Elos being set:", initialElos);

         const playerData = {
             name: playerName,
             elo_overall: DEFAULT_ELO,
             elos: initialElos,
             wins: 0, losses: 0, draws: 0, games_played: 0,
             golf_handicap: null, // Correctly initialized to null
             date_created: firebase.firestore.FieldValue.serverTimestamp(),
             isAdmin: false // Assume players added this way aren't admins by default
         };
         if (playerIconUrl) { playerData.iconUrl = playerIconUrl; }

         // Add the new player document
         const docRef = await db.collection('players').add(playerData);
         console.log(`[FIRESTORE] Player "${playerName}" added successfully with ID: ${docRef.id}`);
         alert(`Player "${playerName}" added successfully!`);

         // Refresh player list UI and cache
         playersCachePopulated = false; // Invalidate cache
         await fetchAllPlayersForCache(); // Repopulate cache
         if (typeof populatePlayersList === 'function') await populatePlayersList(); // Refresh grid if function exists

         closeAddPlayerModal(); // Close the modal

    } catch (error) {
        console.error("Error adding player:", error);
        alert(`Failed to add player: ${error.message}`);
    }
}


// --- Player Profile Page ---

/**
 * Fetches and populates the player profile page.
 * @param {string} playerId - The ID of the player to display.
 */
async function populatePlayerProfilePage(playerId) {
    console.log(`[Player Profile] Populating page for player ID: ${playerId}`);
    // Ensure elements exist
    const nameEl = document.getElementById('player-profile-name');
    const imageEl = document.getElementById('player-profile-image');
    const eloEl = document.getElementById('player-profile-elo-ratings');
    const gamesPlayedEl = document.getElementById('player-profile-games-played');
    const recentGamesEl = document.getElementById('player-profile-recent-games');
    // Add elements for new sections
    const playedWithEl = document.getElementById('player-profile-played-with'); // Needs to be added to HTML template
    const playedAgainstEl = document.getElementById('player-profile-played-against'); // Needs to be added to HTML template

    if (!nameEl || !imageEl || !eloEl || !gamesPlayedEl || !recentGamesEl) {
        console.error("[Player Profile] One or more required profile elements not found.");
        // Maybe display an error in the main content area if critical elements are missing
        const profileContent = document.getElementById('player-profile-content');
        if (profileContent) profileContent.innerHTML = '<p class="error-text">Error loading profile page structure.</p>';
        return;
    }
    // Add checks for new elements
    if (!playedWithEl || !playedAgainstEl) {
         console.warn("[Player Profile] 'Played With' or 'Played Against' elements not found. These sections will be skipped.");
    }


    // Set loading states
    nameEl.textContent = 'Loading...';
    imageEl.src = `https://ui-avatars.com/api/?name=?&background=E0E7FF&color=4F46E5&size=128`;
    eloEl.innerHTML = '<p class="loading-text">Loading ratings...</p>';
    gamesPlayedEl.innerHTML = '<p class="loading-text">Loading stats...</p>';
    recentGamesEl.innerHTML = '<p class="loading-text">Loading recent games...</p>';
    if (playedWithEl) playedWithEl.innerHTML = '<p class="loading-text">Loading teammate stats...</p>';
    if (playedAgainstEl) playedAgainstEl.innerHTML = '<p class="loading-text">Loading opponent stats...</p>';


    if (!db) { console.error("[Player Profile] DB not available."); return; }
    if (!playersCachePopulated) await fetchAllPlayersForCache(); // Ensure cache is ready

    try {
        const player = globalPlayerCache[playerId]; // Get player data from cache first

        if (!player) {
            // Optionally try fetching directly if not in cache (though cache should be pre-fetched)
            const playerDoc = await db.collection('players').doc(playerId).get();
            if (!playerDoc.exists) {
                throw new Error(`Player not found with ID: ${playerId}`);
            }
            // Add to cache if fetched directly (though ideally handled by fetchAllPlayersForCache)
            globalPlayerCache[playerId] = { id: playerDoc.id, ...playerDoc.data() };
            player = globalPlayerCache[playerId];
        }

        // --- Populate Basic Info ---
        nameEl.textContent = player.name || 'Unnamed Player';
        imageEl.src = player.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || '?')}&background=random&color=fff&size=128`;
        imageEl.alt = player.name || 'Player Profile';

        // --- Populate Elo Ratings ---
        let eloHtml = '<ul class="space-y-1 text-sm">';
        const overallElo = Math.round(player.elo_overall || DEFAULT_ELO);
        eloHtml += `<li class="flex justify-between"><span>Overall:</span> <strong class="font-semibold">${overallElo}</strong></li>`;
        if (player.elos && Object.keys(player.elos).length > 0) {
            // Sort game Elos alphabetically by game name
            const sortedGameElos = Object.entries(player.elos)
                .map(([key, rating]) => ({ key, name: gameTypesConfig[key] || key, rating }))
                .sort((a, b) => a.name.localeCompare(b.name));

            sortedGameElos.forEach(({ key, name, rating }) => {
                // Only display Elo for games configured for it (optional check)
                // if (ELO_GAME_KEYS.includes(key)) {
                    eloHtml += `<li class="flex justify-between"><span>${name}:</span> <strong class="font-semibold">${Math.round(rating)}</strong></li>`;
                // }
            });
        }
        // Display Golf Handicap if available
        if (typeof player.golf_handicap === 'number') {
             eloHtml += `<li class="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600"><span>Golf Handicap:</span> <strong class="font-semibold">${player.golf_handicap.toFixed(1)}</strong></li>`;
        }
        eloHtml += '</ul>';
        eloEl.innerHTML = eloHtml;

        // --- Populate Games Played Stats ---
        let gamesHtml = '<ul class="space-y-1 text-sm">';
        gamesHtml += `<li class="flex justify-between"><span>Total Played:</span> <strong>${player.games_played || 0}</strong></li>`;
        gamesHtml += `<li class="flex justify-between"><span>Wins:</span> <strong class="text-green-600 dark:text-green-400">${player.wins || 0}</strong></li>`;
        gamesHtml += `<li class="flex justify-between"><span>Losses:</span> <strong class="text-red-600 dark:text-red-400">${player.losses || 0}</strong></li>`;
        gamesHtml += `<li class="flex justify-between"><span>Draws:</span> <strong class="text-gray-600 dark:text-gray-400">${player.draws || 0}</strong></li>`;
        // Calculate Win Rate (handle division by zero)
        const totalDecided = (player.wins || 0) + (player.losses || 0);
        const winRate = totalDecided > 0 ? (((player.wins || 0) / totalDecided) * 100).toFixed(1) : 'N/A';
        gamesHtml += `<li class="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600"><span>Win Rate:</span> <strong>${winRate}${winRate !== 'N/A' ? '%' : ''}</strong></li>`;
        gamesHtml += '</ul>';
        gamesPlayedEl.innerHTML = gamesHtml;

        // --- Populate Recent Games (using existing helper) ---
        if (typeof populatePlayerRecentActivity === 'function') {
            await populatePlayerRecentActivity(recentGamesEl, playerId, 10); // Show more games on profile
        } else {
            recentGamesEl.innerHTML = '<p class="error-text">Error loading recent activity function.</p>';
        }

        // --- Populate Played With / Played Against (New Logic) ---
        if (playedWithEl && playedAgainstEl) {
            await populateTeammateOpponentStats(playedWithEl, playedAgainstEl, playerId);
        }


        // --- Apply Themed Background ---
        const profileSection = document.getElementById('player-profile-section');
        if (profileSection) {
            // Remove previous theme classes
            profileSection.classList.remove(...Object.keys(gameTypesConfig).map(k => `theme-${k}`));
            // Add new theme based on most played game (ensure getMostPlayedGameKey exists)
            if (typeof getMostPlayedGameKey === 'function') {
                const mostPlayedKey = getMostPlayedGameKey(player);
                if (mostPlayedKey) {
                    profileSection.classList.add(`theme-${mostPlayedKey}`);
                    console.log(`[Player Profile] Applied theme: theme-${mostPlayedKey}`);
                }
            }
        }

    } catch (error) {
        console.error(`[Player Profile] Error populating profile for ${playerId}:`, error);
        nameEl.textContent = 'Error';
        // Display error message in a central part of the profile content
        const profileContent = document.getElementById('player-profile-content');
        if (profileContent) profileContent.innerHTML = `<p class="error-text text-center py-10 col-span-full">Could not load player profile: ${error.message}</p>`;
        else { // Fallback if main content area isn't even there
             eloEl.innerHTML = `<p class="error-text">${error.message}</p>`;
             gamesPlayedEl.innerHTML = ''; recentGamesEl.innerHTML = '';
             if (playedWithEl) playedWithEl.innerHTML = '';
             if (playedAgainstEl) playedAgainstEl.innerHTML = '';
        }
    }
} // End populatePlayerProfilePage

/**
 * Fetches game data to calculate and display teammate and opponent statistics.
 * @param {HTMLElement} playedWithEl - The element to display teammate stats.
 * @param {HTMLElement} playedAgainstEl - The element to display opponent stats.
 * @param {string} playerId - The ID of the player whose profile is being viewed.
 */
async function populateTeammateOpponentStats(playedWithEl, playedAgainstEl, playerId) {
    if (!db) {
        playedWithEl.innerHTML = '<p class="error-text">DB Error</p>';
        playedAgainstEl.innerHTML = '<p class="error-text">DB Error</p>';
        return;
    }
    if (!playersCachePopulated) await fetchAllPlayersForCache(); // Ensure names are available

    playedWithEl.innerHTML = '<p class="loading-text text-xs">Calculating...</p>';
    playedAgainstEl.innerHTML = '<p class="loading-text text-xs">Calculating...</p>';

    const teammateCounts = {};
    const opponentCounts = {};

    try {
        // Query games where the player was on Team 1
        const team1Query = db.collection('games')
                             .where('team1_participants', 'array-contains', playerId);
        // Query games where the player was on Team 2
        const team2Query = db.collection('games')
                             .where('team2_participants', 'array-contains', playerId);
        // Query 1v1 games involving the player
        const oneVoneQuery = db.collection('games')
                               .where('participants', 'array-contains', playerId)
                               .where('format', '==', '1v1'); // Assuming format field exists

        const [team1Snapshot, team2Snapshot, oneVoneSnapshot] = await Promise.all([
            team1Query.get(),
            team2Query.get(),
            oneVoneQuery.get()
        ]);

        // Process Team 1 results
        team1Snapshot.forEach(doc => {
            const game = doc.data();
            const team1 = game.team1_participants || [];
            const team2 = game.team2_participants || [];
            // Add teammates from Team 1
            team1.forEach(pId => {
                if (pId !== playerId) {
                    teammateCounts[pId] = (teammateCounts[pId] || 0) + 1;
                }
            });
            // Add opponents from Team 2
            team2.forEach(pId => {
                opponentCounts[pId] = (opponentCounts[pId] || 0) + 1;
            });
        });

        // Process Team 2 results
        team2Snapshot.forEach(doc => {
            const game = doc.data();
            const team1 = game.team1_participants || [];
            const team2 = game.team2_participants || [];
            // Add teammates from Team 2
            team2.forEach(pId => {
                if (pId !== playerId) {
                    teammateCounts[pId] = (teammateCounts[pId] || 0) + 1;
                }
            });
            // Add opponents from Team 1
            team1.forEach(pId => {
                opponentCounts[pId] = (opponentCounts[pId] || 0) + 1;
            });
        });

        // Process 1v1 results
        oneVoneSnapshot.forEach(doc => {
             const game = doc.data();
             const participants = game.participants || [];
             participants.forEach(pId => {
                 if (pId !== playerId) {
                     opponentCounts[pId] = (opponentCounts[pId] || 0) + 1;
                 }
             });
        });


        // --- Display Teammate Stats ---
        const sortedTeammates = Object.entries(teammateCounts).sort(([, countA], [, countB]) => countB - countA);
        if (sortedTeammates.length > 0) {
            let teammateHtml = '<ul class="space-y-1 text-xs">';
            sortedTeammates.slice(0, 5).forEach(([pId, count]) => { // Show top 5
                const name = globalPlayerCache[pId]?.name || 'Unknown Player';
                teammateHtml += `<li class="flex justify-between"><span>${name}</span> <strong>${count} games</strong></li>`;
            });
            teammateHtml += '</ul>';
            playedWithEl.innerHTML = teammateHtml;
        } else {
            playedWithEl.innerHTML = '<p class="muted-text italic text-xs">No teammate data found.</p>';
        }

        // --- Display Opponent Stats ---
        const sortedOpponents = Object.entries(opponentCounts).sort(([, countA], [, countB]) => countB - countA);
         if (sortedOpponents.length > 0) {
            let opponentHtml = '<ul class="space-y-1 text-xs">';
            sortedOpponents.slice(0, 5).forEach(([pId, count]) => { // Show top 5
                const name = globalPlayerCache[pId]?.name || 'Unknown Player';
                opponentHtml += `<li class="flex justify-between"><span>${name}</span> <strong>${count} games</strong></li>`;
            });
            opponentHtml += '</ul>';
            playedAgainstEl.innerHTML = opponentHtml;
        } else {
            playedAgainstEl.innerHTML = '<p class="muted-text italic text-xs">No opponent data found.</p>';
        }

    } catch (error) {
        console.error(`[Player Profile] Error fetching teammate/opponent stats for ${playerId}:`, error);
        playedWithEl.innerHTML = '<p class="error-text text-xs">Error loading stats.</p>';
        playedAgainstEl.innerHTML = '<p class="error-text text-xs">Error loading stats.</p>';
         if (error.code === 'failed-precondition') {
             console.error("Firestore index potentially missing for teammate/opponent queries (e.g., on team1_participants, team2_participants, or participants + format).");
             playedWithEl.innerHTML = '<p class="error-text text-xs">DB Index Error</p>';
             playedAgainstEl.innerHTML = '<p class="error-text text-xs">DB Index Error</p>';
         }
    }
}


// --- Player Recent Activity ---
// Cache for course pars fetched during activity population
let courseParCacheActivity = {};

/**
 * Populates the recent activity list for a player.
 * @param {HTMLElement} activityElement - The UL element to populate.
 * @param {string} playerId - The ID of the player.
 * @param {number} [limit=5] - Max number of activities to show.
 */
async function populatePlayerRecentActivity(activityElement, playerId, limit = 5) {
    if (!db || !playerId || !activityElement) {
         console.warn("[Player Activity] Missing DB, playerId, or activityElement.");
         if(activityElement) activityElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400">Could not load activity.</li>';
         return;
    }

    if (!playersCachePopulated) {
        await fetchAllPlayersForCache();
        if (!playersCachePopulated) {
            activityElement.innerHTML = '<li class="text-orange-500">Error loading player data for activity.</li>';
            return;
        }
    }
    activityElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400">Loading activity...</li>';

    const getCourseParActivity = async (courseId) => {
         if (!courseId) return null;
         if (courseParCacheActivity[courseId] !== undefined) return courseParCacheActivity[courseId];
         try {
             const courseDoc = await db.collection('golf_courses').doc(courseId).get();
             if (courseDoc.exists) {
                 const par = courseDoc.data().total_par;
                 courseParCacheActivity[courseId] = (typeof par === 'number') ? par : null;
             } else { courseParCacheActivity[courseId] = null; }
         } catch (err) { console.error(`Error fetching course ${courseId} for activity:`, err); courseParCacheActivity[courseId] = null; }
         return courseParCacheActivity[courseId];
    };

    try {
        const gamesQuery = db.collection('games')
                            .where('participants', 'array-contains', playerId)
                            .orderBy('date_played', 'desc')
                            .limit(limit);
        const snapshot = await gamesQuery.get();

        if (snapshot.empty) {
             activityElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400 italic">No recent activity found.</li>';
             return;
        }
        activityElement.innerHTML = ''; // Clear loading

        const currentPlayerName = globalPlayerCache[playerId]?.name || 'Unknown Player'; // Use global cache

        for (const doc of snapshot.docs) {
             const game = { id: doc.id, ...doc.data() };
             let description = "";
             const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
             const gameType = gameTypesConfig[game.game_type] || game.game_type || 'Unknown Game';
             const formatDisplay = game.format ? ` (${game.format})` : '';
             const participants = game.participants || [];
             const team1 = game.team1_participants || [];
             const team2 = game.team2_participants || [];

             if (game.game_type === 'golf') {
                 description = `Played ${gameType}`;
                 if (typeof game.score === 'number') {
                     if (game.course_id) {
                         const coursePar = await getCourseParActivity(game.course_id);
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
                 if (game.hole_details) {
                     const totalPutts = Object.values(game.hole_details).reduce((sum, hole) => sum + (hole.putts || 0), 0);
                     if (totalPutts > 0) description += ` (${totalPutts} putts)`;
                 }

             } else if (game.outcome === 'Team Win') {
                 const playerTeam = team1.includes(playerId) ? team1 : (team2.includes(playerId) ? team2 : null);
                 const opponentTeam = playerTeam === team1 ? team2 : team1;
                 const playerTeamNames = playerTeam?.map(id => globalPlayerCache[id]?.name || '?').join(', ');
                 const opponentTeamNames = opponentTeam?.map(id => globalPlayerCache[id]?.name || '?').join(', ');

                 if (playerTeam === team1) { // Player was on winning team
                     description = `Won ${gameType}${formatDisplay} with ${playerTeamNames.replace(currentPlayerName, '').replace(', ,',',').replace(/^, |, $/,'').trim() || 'Teammates'} against ${opponentTeamNames}`;
                 } else { // Player was on losing team
                     description = `Lost ${gameType}${formatDisplay} with ${playerTeamNames.replace(currentPlayerName, '').replace(', ,',',').replace(/^, |, $/,'').trim() || 'Teammates'} to ${opponentTeamNames}`;
                 }

             } else if (game.outcome === 'Win/Loss') { // 1v1 Win/Loss
                 const winnerId = participants[0];
                 const loserId = participants[1];
                 const winnerName = globalPlayerCache[winnerId]?.name || 'Unknown';
                 const loserName = globalPlayerCache[loserId]?.name || 'Unknown';
                 if (winnerId === playerId) { description = `Beat ${loserName} in ${gameType}${formatDisplay}`; }
                 else if (loserId === playerId) { description = `Lost to ${winnerName} in ${gameType}${formatDisplay}`; }
                 else { description = `${winnerName} beat ${loserName} in ${gameType}${formatDisplay}`; } // Should not happen if query is correct

                 // Add specific details
                 if (game.game_type === 'chess' && game.chess_outcome) description += ` (${game.chess_outcome})`;
                 if (game.score) description += ` [${game.score}]`;

             } else if (game.outcome === 'Draw') {
                 if (team1.length > 0) { // Team Draw
                     description = `Drew ${gameType}${formatDisplay}`; // Simplified for brevity
                 } else { // 1v1 Draw
                     const otherPlayerId = participants.find(id => id !== playerId);
                     const otherPlayerName = globalPlayerCache[otherPlayerId]?.name || 'Unknown';
                     description = `Drew with ${otherPlayerName} in ${gameType}${formatDisplay}`;
                 }
                 if (game.score) description += ` [${game.score}]`;

             } else if (game.outcome === 'Cutthroat Win') {
                 const winnerId = participants.find(pId => team1.includes(pId)); // Assuming winner is stored in team1 for consistency
                 if (winnerId === playerId) { description = `Won ${gameType}${formatDisplay}`; }
                 else { description = `Played ${gameType}${formatDisplay}`; } // Lost or participated

             } else if (game.outcome === 'Solo Complete') {
                 description = `Completed ${gameType}${formatDisplay} in ${game.score}s`;
                 if (game.points) description += ` (${game.points} pts)`;
             } else { // Fallback (e.g., Bowling 'Single')
                 description = `Played ${gameType}${formatDisplay}`;
                 if (game.score) description += ` (Score: ${game.score})`;
             }


             // Create list item
             const li = document.createElement('li');
             li.className = 'text-sm border-b border-gray-200 dark:border-gray-700 pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0';
             li.innerHTML = `
                <span class="text-gray-500 dark:text-gray-400 text-xs block">${gameDate}</span>
                <a href="#game-info-section?gameId=${game.id}" class="nav-link hover:text-indigo-600 dark:hover:text-indigo-400" data-target="game-info-section">${description}</a>
             `;
             // Add listener for navigation
             const link = li.querySelector('a');
             if (link) {
                 link.addEventListener('click', (e) => {
                     e.preventDefault();
                     if (typeof showSection === 'function') {
                         showSection('game-info-section', true, { gameId: game.id });
                     } else { window.location.hash = `#game-info-section?gameId=${game.id}`; }
                 });
             }
             activityElement.appendChild(li);
        }

    } catch (error) {
        console.error(`[Player Profile] Error fetching recent activity for ${playerId}:`, error);
        activityElement.innerHTML = '<li class="error-text">Error loading activity.</li>';
    }
} // End populatePlayerRecentActivity

// Note: This file assumes that 'firebase', 'db', 'openModal', 'closeModal', 'gameTypesConfig',
// 'DEFAULT_ELO', 'ELO_GAME_KEYS', 'currentPlayer', 'populateDashboard',
// 'populateResultsTable', 'updateRankingsVisibility' are initialized and accessible
// from the global scope or imported/passed appropriately