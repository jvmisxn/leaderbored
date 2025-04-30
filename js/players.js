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
function populatePlayerDropdown(selectElement, playersArray, prompt = 'Select Player', selectedValue = null) {
    if (!selectElement) {
        console.warn("populatePlayerDropdown: Provided selectElement is null or undefined.");
        return;
    }
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
     // Ensure playersGrid is accessible (defined in assignElements or passed)
     if (!playersGrid) { console.warn("Player grid container (#players-grid) not found."); return; }
     playersGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center">Loading players...</p>';
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
             playersGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center">No players found. Add players via Admin Login or Register.</p>';
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
         });
         console.log(`[Player List] Displayed ${playersToDisplay.length} players.`);
     } catch (error) {
         console.error("Error populating players list:", error);
         playersGrid.innerHTML = `<p class="text-red-500 col-span-full text-center">Error loading players: ${error.message}</p>`;
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


// --- Player Info Modal Functions ---

async function openPlayerModal(playerId) {
    // Ensure playerInfoModal and db are accessible
    const modalElement = document.getElementById('player-info-modal');
    if (!modalElement) { console.error("Player modal element (#player-info-modal) not found."); return; }
    if (!db) { console.error("Player modal: DB not ready."); return; }

    const modalContent = modalElement.querySelector('.modal-content');
     if (!modalContent) { console.error("Player modal content div (.modal-content) not found."); return; }

    console.log(`[PLAYER MODAL] Opening modal for player ID: ${playerId}`);

    // --- References & Reset Content ---
    const nameEl = modalContent.querySelector('#modal-player-name');
    const statsEl = modalContent.querySelector('#modal-player-game-stats');
    const activityEl = modalContent.querySelector('#modal-player-recent-activity');
    const iconEl = modalContent.querySelector('#modal-player-icon');
    const nameInputEl = modalContent.querySelector('#modal-edit-player-name-input');
    const iconInputEl = modalContent.querySelector('#modal-edit-player-icon-input');
    const overallStatsEl = modalContent.querySelector('#modal-player-overall-stats');
    const playerEditControls = modalContent.querySelector('.player-edit-controls');
    const adminControls = modalContent.querySelector('.admin-controls'); // Might need this if admin delete is separate

    // Reset content
    if (nameEl) nameEl.textContent = 'Loading...';
    if (statsEl) statsEl.innerHTML = '<p class="text-gray-500 col-span-2">Loading ratings...</p>';
    if (activityEl) activityEl.innerHTML = '<li class="text-gray-500">Loading activity...</li>';
    if (iconEl) iconEl.src = 'https://placehold.co/80x80/cccccc/ffffff?text=?';
    if (nameInputEl) nameInputEl.value = '';
    if (iconInputEl) iconInputEl.value = '';
    if (overallStatsEl) overallStatsEl.innerHTML = 'Loading stats...';
    if (playerEditControls) playerEditControls.style.display = 'none'; // Hide player controls initially
    if (adminControls) adminControls.style.display = 'none'; // Hide admin controls initially (let CSS handle final visibility)

    modalElement.classList.remove('modal-editing');
    modalElement.removeAttribute('data-current-player-id');
    // --- End Reset ---

    // Ensure openModal is accessible
    openModal(modalElement); // Open modal overlay

    // Fetch and Populate data
    try {
         const playerDocRef = db.collection('players').doc(playerId);
         const docSnap = await playerDocRef.get();
         if (!docSnap.exists) { throw new Error(`Player document not found for ID: ${playerId}`); }
         const details = { id: docSnap.id, ...docSnap.data() };
         console.log(`[PLAYER MODAL] Player data fetched:`, details);
         modalElement.setAttribute('data-current-player-id', playerId); // Store ID

         // Populate Basic Details
         const iconSrc = details.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(details.name || '?')}&background=E0E7FF&color=4F46E5&size=80`;
         if(iconEl) { iconEl.src = iconSrc; iconEl.alt = `Icon ${details.name || ''}`; }
         if(nameEl) nameEl.textContent = details.name || 'Unnamed Player';
         if(nameInputEl) nameInputEl.value = details.name || '';
         if(iconInputEl) iconInputEl.value = details.iconUrl || '';

         // Populate Overall Stats
         if (overallStatsEl) {
             // Ensure DEFAULT_ELO is accessible
             const wins = details.wins || 0; const losses = details.losses || 0; const draws = details.draws || 0; const played = details.games_played || 0;
             overallStatsEl.innerHTML = `Overall: <span class="font-medium text-green-600">${wins}W</span>/<span class="font-medium text-red-600">${losses}L</span>/<span class="font-medium text-gray-600">${draws}D</span> (${played} Played) | Elo: <span class="font-medium">${Math.round(details.elo_overall || DEFAULT_ELO)}</span>`;
         }

         // Populate game-specific stats
         if (statsEl) {
            console.log(`[PLAYER MODAL DEBUG] Populating game stats for ${details.name}`);
            statsEl.innerHTML = '';
            // Ensure gameTypesConfig and DEFAULT_ELO are accessible
            const elos = details.elos || {}; let statsHtml = '';
            Object.entries(gameTypesConfig).forEach(([gameKey, gameName]) => {
                let ratingDisplay = '';
                if (gameKey === 'golf') {
                    const handicapValue = details.golf_handicap;
                    ratingDisplay = (typeof handicapValue === 'number') ? `${handicapValue.toFixed(1)} Hcp` : 'Not Rated';
                    statsHtml += `<div class="font-medium text-gray-900 dark:text-gray-300">${gameName}:</div><div class="text-blue-600 dark:text-blue-400 font-semibold">${ratingDisplay}</div>`;
                } else {
                    const rating = Math.round(elos[gameKey] || DEFAULT_ELO);
                    ratingDisplay = `${rating} Elo`;
                    statsHtml += `<div class="font-medium text-gray-900 dark:text-gray-300">${gameName}:</div><div class="text-indigo-600 dark:text-indigo-400">${ratingDisplay}</div>`;
                }
            });
            if (!statsHtml) { statsHtml = '<p class="text-gray-500 dark:text-gray-400 col-span-2 italic">No specific game stats found.</p>'; }
            statsEl.innerHTML = statsHtml;
            console.log(`[PLAYER MODAL DEBUG] Updated #modal-player-game-stats.`);
         } else { console.error("[PLAYER MODAL DEBUG] #modal-player-game-stats element not found!"); }

         // Control Edit/Delete Visibility
         if (playerEditControls) {
             // Show controls if logged-in player matches profile (check currentPlayer from auth.js)
             if (currentPlayer && details.authUid && currentPlayer.authUid === details.authUid) {
                 console.log("[PLAYER MODAL] Current user matches profile. Showing player edit controls.");
                 playerEditControls.style.display = 'block'; // Or 'inline-flex'
             } else {
                 console.log("[PLAYER MODAL] Current user does not match profile. Hiding player edit controls.");
                 playerEditControls.style.display = 'none';
             }
         } else { console.warn("[PLAYER MODAL] '.player-edit-controls' container not found."); }
         // Admin controls visibility handled by CSS via 'body.admin-logged-in'

         // Populate Recent Activity (ensure populatePlayerRecentActivity is accessible)
         if (activityEl) {
            if (!playersCachePopulated) await fetchAllPlayersForCache(); // Ensure cache for names
            await populatePlayerRecentActivity(activityEl, playerId, 5);
         } else { console.error("[PLAYER MODAL] Recent activity element (#modal-player-recent-activity) not found."); }

     } catch (error) {
          console.error("[PLAYER MODAL] Error fetching or populating data:", error);
          alert(`Error loading player details: ${error.message}`);
          closePlayerModal(); // Close on critical error
     }
}

function closePlayerModal() {
    const modalElement = document.getElementById('player-info-modal');
    if (!modalElement) return;
    // Ensure closeModal is accessible
    closeModal(modalElement); // Generic close handles hiding, scroll, and resetting specific attributes/classes
}

// --- Player Modal Recent Activity ---

async function populatePlayerRecentActivity(activityElement, playerId, limit = 5) {
    if (!db || !playerId || !activityElement) {
         console.warn("[Player Activity] Missing DB, playerId, or activityElement.");
         if(activityElement) activityElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400">Could not load activity.</li>';
         return;
    }

    // Ensure global player cache is populated (fetchAllPlayersForCache should be accessible)
    if (!playersCachePopulated) {
        console.warn("[Player Activity] Player cache not populated. Activity may lack names. Attempting fetch...");
        await fetchAllPlayersForCache();
        if (!playersCachePopulated) {
            activityElement.innerHTML = '<li class="text-orange-500">Error loading player data for activity.</li>';
            return;
        }
    }
    activityElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400">Loading activity...</li>';

    // Optional: Course Par Cache (Specific to this function's context)
    const courseParCacheActivity = {};
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
        // Index Required: games: participants (Array), date_played (Descending)
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
             // Ensure gameTypesConfig is accessible
             const gameType = gameTypesConfig[game.game_type] || game.game_type || 'Unknown Game';
             const participants = game.participants || [];

             // Build Description (Golf vs Non-Golf)
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
             } else { // Non-Golf
                 const participantNames = participants.map(id => globalPlayerCache[id]?.name || 'Unknown Player');
                 if (game.outcome === 'Win/Loss' && participantNames.length >= 2) {
                    const winnerName = participantNames[0]; const loserName = participantNames[1];
                    if (winnerName === currentPlayerName) { description = `Beat ${loserName} in ${gameType}`; }
                    else if (loserName === currentPlayerName) { description = `Lost to ${winnerName} in ${gameType}`; }
                    else { description = `${winnerName} beat ${loserName} in ${gameType}`; }
                 } else if (game.outcome === 'Draw' && participantNames.length >= 2) {
                    const opponentName = participantNames.find(name => name !== currentPlayerName && name !== 'Unknown Player') || 'opponent';
                    description = `Drew against ${opponentName} in ${gameType}`;
                 } else {
                     const otherPlayerNames = participantNames.filter(name => name !== currentPlayerName).join(', ');
                     description = `Played ${gameType}${otherPlayerNames ? ' with ' + otherPlayerNames : ''}`;
                 }
                 if (game.score) description += ` (${game.score})`;
             }

            const li = document.createElement('li');
            // Add dark mode classes
            li.className = 'text-gray-800 dark:text-gray-200';
            li.innerHTML = `<span class="text-gray-500 dark:text-gray-400 text-xs mr-2">[${gameDate}]</span> ${description}`;
            activityElement.appendChild(li);
        } // End loop

    } catch (error) {
        console.error(`Error fetching recent activity for player ${playerId}:`, error);
         if (error.code === 'failed-precondition') {
             activityElement.innerHTML = `<li class="text-red-500">Error: Firestore index missing for activity query. Check console.</li>`;
             console.error("Firestore index needed: games collection, fields: participants (array-contains), date_played (desc).");
         } else {
            activityElement.innerHTML = `<li class="text-red-500">Error loading activity: ${error.message}</li>`;
         }
    }
}


// --- Player Info Modal Edit/Save/Delete ---

function togglePlayerModalEdit(editMode) {
    const modalElement = document.getElementById('player-info-modal');
    if (!modalElement) return;
    if (editMode) {
         modalElement.classList.add('modal-editing');
         modalElement.querySelector('#modal-edit-player-name-input')?.focus(); // Focus name input
    } else {
         modalElement.classList.remove('modal-editing');
         // Reset input fields to original values (fetch if needed or store temp)
         const playerId = modalElement.getAttribute('data-current-player-id');
         if (playerId && globalPlayerCache[playerId]) {
             const originalData = globalPlayerCache[playerId];
             modalElement.querySelector('#modal-edit-player-name-input').value = originalData.name || '';
             modalElement.querySelector('#modal-edit-player-icon-input').value = originalData.iconUrl || '';
         }
    }
}

async function savePlayerChanges() {
    const modalElement = document.getElementById('player-info-modal');
    if (!modalElement || !db) return;
    const playerId = modalElement.getAttribute('data-current-player-id');
    if (!playerId) { alert("Error: No player ID found."); return; }

    const nameInput = modalElement.querySelector('#modal-edit-player-name-input');
    const iconInput = modalElement.querySelector('#modal-edit-player-icon-input');
    const newName = nameInput?.value.trim();
    const newIconUrl = iconInput?.value.trim() || null; // Store null if empty

    if (!newName) { alert("Player name cannot be empty."); nameInput?.focus(); return; }

    const updatedData = { name: newName, iconUrl: newIconUrl };

    try {
         await db.collection('players').doc(playerId).update(updatedData);
         alert("Player details updated successfully!");

         // Update cache
         if (globalPlayerCache[playerId]) {
            globalPlayerCache[playerId].name = newName;
            globalPlayerCache[playerId].iconUrl = newIconUrl;
         } else {
             playersCachePopulated = false; // Invalidate if player wasn't in cache
         }

         togglePlayerModalEdit(false); // Switch back to view mode

         // Update UI immediately
         modalElement.querySelector('#modal-player-name').textContent = newName;
         const iconSrc = newIconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newName || '?')}&background=E0E7FF&color=4F46E5&size=80`;
         modalElement.querySelector('#modal-player-icon').src = iconSrc;

         // Refresh player grid (ensure populatePlayersList is accessible)
         if (typeof populatePlayersList === 'function') await populatePlayersList();
         // Potentially refresh other areas if name is displayed (e.g., results, rankings) - requires more state awareness

    } catch (error) {
        console.error(`Error updating player ${playerId}:`, error);
        alert(`Failed to update player: ${error.message}`);
    }
}

async function deletePlayer() {
     const modalElement = document.getElementById('player-info-modal');
     if (!modalElement || !db) return;
     const playerId = modalElement.getAttribute('data-current-player-id');
     const playerName = modalElement.querySelector('#modal-player-name')?.textContent || 'this player';
     if (!playerId) { alert("Error: No player ID found."); return; }

     if (confirm(`Are you sure you want to delete ${playerName} (${playerId})?\nWARNING: This cannot be undone and may affect historical game records and rankings.`)) {
         try {
             await db.collection('players').doc(playerId).delete();
             alert(`${playerName} deleted successfully!`);

             // Remove from cache and mark as not populated
             delete globalPlayerCache[playerId];
             playersCachePopulated = false; // Force refresh on next load

             closePlayerModal(); // Close the modal

             // Refresh relevant UI sections (ensure functions are accessible)
             if (typeof populatePlayersList === 'function') await populatePlayersList();
             if (typeof populateDashboard === 'function') await populateDashboard();
             if (typeof populateResultsTable === 'function') await populateResultsTable();
             if (typeof updateRankingsVisibility === 'function' && document.getElementById('rankings-section') && !document.getElementById('rankings-section').classList.contains('hidden')) {
                 await updateRankingsVisibility();
             }

         } catch (error) {
             console.error(`Error deleting player ${playerId}:`, error);
             alert(`Failed to delete player: ${error.message}`);
         }
     }
}

// Note: This file assumes that 'firebase', 'db', 'openModal', 'closeModal', 'gameTypesConfig',
// 'DEFAULT_ELO', 'ELO_GAME_KEYS', 'playersGrid', 'currentPlayer', 'populateDashboard',
// 'populateResultsTable', 'updateRankingsVisibility' are initialized and accessible
// from the global scope or imported/passed appropriately.