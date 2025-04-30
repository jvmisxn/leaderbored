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


// --- Player Info Modal Functions ---

async function openPlayerModal(playerId) {
    console.log(`[PLAYER MODAL] Entered openPlayerModal function for ID: ${playerId}`); // <-- Add Log
    const modalElement = document.getElementById('player-info-modal');
    if (!modalElement) { console.error("[PLAYER MODAL] Player modal element (#player-info-modal) not found."); return; }
    if (!db) { console.error("[PLAYER MODAL] DB not ready."); return; }

    const modalContent = modalElement.querySelector('.modal-content');
    if (!modalContent) { console.error("[PLAYER MODAL] Player modal content div (.modal-content) not found."); return; }

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
    const adminControls = modalContent.querySelector('.admin-controls');

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

    // Open modal overlay FIRST
    console.log("[PLAYER MODAL] About to call generic openModal function."); // <-- Add Log
    if (typeof openModal === 'function') {
        openModal(modalElement); // This should make the modal visible
    } else {
        console.error("[PLAYER MODAL] openModal function not found!");
        alert("UI Error: Cannot display modal.");
        return; // Stop if we can't open the modal
    }

    // *** Log before data population ***
    console.log(`[PLAYER MODAL ${playerId}] BEFORE fetching/populating data.`);

    // Fetch and Populate data
    try {
        const playerDocRef = db.collection('players').doc(playerId);
        const docSnap = await playerDocRef.get();
        if (!docSnap.exists) { throw new Error(`Player document not found for ID: ${playerId}`); }
        const details = { id: docSnap.id, ...docSnap.data() };
        console.log(`[PLAYER MODAL] Player data fetched:`, details);
        modalElement.setAttribute('data-current-player-id', playerId);

        // Populate Basic Details
        const iconSrc = details.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(details.name || '?')}&background=E0E7FF&color=4F46E5&size=80`;
        if(iconEl) { iconEl.src = iconSrc; iconEl.alt = `Icon ${details.name || ''}`; }
        if(nameEl) nameEl.textContent = details.name || 'Unnamed Player';
        if(nameInputEl) nameInputEl.value = details.name || '';
        if(iconInputEl) iconInputEl.value = details.iconUrl || '';

        // Populate Overall Stats
        if (overallStatsEl) {
            const wins = details.wins || 0; const losses = details.losses || 0; const draws = details.draws || 0; const played = details.games_played || 0;
            overallStatsEl.innerHTML = `Overall: <span class="font-medium text-green-600">${wins}W</span>/<span class="font-medium text-red-600">${losses}L</span>/<span class="font-medium text-gray-600">${draws}D</span> (${played} Played) | Elo: <span class="font-medium">${Math.round(details.elo_overall || DEFAULT_ELO)}</span>`;
        }

        // Populate game-specific stats
        if (statsEl) {
            statsEl.innerHTML = '';
            const elos = details.elos || {}; let statsHtml = '';
            Object.entries(gameTypesConfig).forEach(([gameKey, gameName]) => {
                let ratingDisplay = '';
                if (gameKey === 'golf') {
                    const handicapValue = details.golf_handicap;
                    ratingDisplay = (typeof handicapValue === 'number') ? `${handicapValue.toFixed(1)} Hcp` : 'Not Rated';
                    statsHtml += `<div class="font-medium !text-gray-900 dark:text-gray-300">${gameName}:</div><div class="text-blue-600 dark:text-blue-400 font-semibold">${ratingDisplay}</div>`;
                } else {
                    const rating = Math.round(elos[gameKey] || DEFAULT_ELO);
                    ratingDisplay = `${rating} Elo`;
                    statsHtml += `<div class="font-medium !text-gray-900 dark:text-gray-300">${gameName}:</div><div class="text-indigo-600 dark:text-indigo-400">${ratingDisplay}</div>`;
                }
            });
            if (!statsHtml) { statsHtml = '<p class="text-gray-500 dark:text-gray-400 col-span-2 italic">No specific game stats found.</p>'; }
            statsEl.innerHTML = statsHtml;
        }

        // Control Edit/Delete Visibility
        if (playerEditControls) {
            if (currentPlayer && details.authUid && currentPlayer.authUid === details.authUid) {
                playerEditControls.style.display = 'block'; // Or 'inline-flex'
            } else {
                playerEditControls.style.display = 'none';
            }
        }

        // Populate Recent Activity
        if (activityEl) {
            if (!playersCachePopulated) await fetchAllPlayersForCache(); // Ensure cache for names
            await populatePlayerRecentActivity(activityEl, playerId, 5);
        }

        // --- Attach/Verify Modal Button Listeners ---
        console.log("[PLAYER MODAL] Attaching/Verifying modal action button listeners...");

        // Remove existing listeners to prevent duplicates if modal is reopened
        const editBtn = modalContent.querySelector('#modal-edit-player-btn');
        const cancelEditBtn = modalContent.querySelector('#modal-cancel-edit-player-btn');
        const saveBtn = modalContent.querySelector('#modal-save-player-btn');
        const deleteBtn = modalContent.querySelector('#modal-delete-player-btn');
        const closeBtn = modalContent.querySelector('.modal-cancel-button'); // Generic close

        // It's safer to remove and re-add listeners each time the modal opens
        editBtn?.removeEventListener('click', handleEditClick);
        cancelEditBtn?.removeEventListener('click', handleCancelEditClick);
        saveBtn?.removeEventListener('click', savePlayerChanges);
        deleteBtn?.removeEventListener('click', deletePlayer);
        closeBtn?.removeEventListener('click', closePlayerModal);

        // Add listeners
        editBtn?.addEventListener('click', handleEditClick);
        cancelEditBtn?.addEventListener('click', handleCancelEditClick);
        saveBtn?.addEventListener('click', savePlayerChanges);
        deleteBtn?.addEventListener('click', deletePlayer);
        closeBtn?.addEventListener('click', closePlayerModal);

        console.log("[PLAYER MODAL] Listeners attached/verified.");
        // --- End Listener Attachment ---

        // *** Log after successful data population and listener attachment ***
        console.log(`[PLAYER MODAL ${playerId}] AFTER successful data population and listener setup.`);

    } catch (error) {
        console.error(`[PLAYER MODAL ${playerId}] Error during fetching or populating data:`, error); // <-- Log specific error
        alert(`Error loading player details: ${error.message}`);
        closePlayerModal(); // Close on critical error
    }

    // *** Log at the very end of the function ***
    console.log(`[PLAYER MODAL ${playerId}] Reached end of openPlayerModal function.`);
}

// Helper function to handle the edit button click
function handleEditClick() {
    togglePlayerModalEdit(true);
}
// Helper function to handle the cancel edit button click
function handleCancelEditClick() {
    togglePlayerModalEdit(false);
}

function closePlayerModal() {
    const modalElement = document.getElementById('player-info-modal');
    if (!modalElement) return;
    if (typeof closeModal === 'function') {
        closeModal(modalElement); // Generic close handles hiding, scroll, etc.
    } else {
        console.error("[PLAYER MODAL] closeModal function not found!");
        modalElement.style.display = 'none';
    }
}

// --- Player Modal Recent Activity ---

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
             const participants = game.participants || [];

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
             } else {
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
            li.className = '!text-gray-800 dark:text-gray-200';
            li.innerHTML = `<span class="text-gray-500 dark:text-gray-400 text-xs mr-2">[${gameDate}]</span> ${description}`;
            activityElement.appendChild(li);
        }

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
    const newIconUrl = iconInput?.value.trim() || null;

    if (!newName) { alert("Player name cannot be empty."); nameInput?.focus(); return; }

    const updatedData = { name: newName, iconUrl: newIconUrl };

    try {
         await db.collection('players').doc(playerId).update(updatedData);
         alert("Player details updated successfully!");

         if (globalPlayerCache[playerId]) {
            globalPlayerCache[playerId].name = newName;
            globalPlayerCache[playerId].iconUrl = newIconUrl;
         } else {
             playersCachePopulated = false;
         }

         togglePlayerModalEdit(false);

         modalElement.querySelector('#modal-player-name').textContent = newName;
         const iconSrc = newIconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(newName || '?')}&background=E0E7FF&color=4F46E5&size=80`;
         modalElement.querySelector('#modal-player-icon').src = iconSrc;

         if (typeof populatePlayersList === 'function') await populatePlayersList();

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

             delete globalPlayerCache[playerId];
             playersCachePopulated = false;

             closePlayerModal();

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
// 'DEFAULT_ELO', 'ELO_GAME_KEYS', 'currentPlayer', 'populateDashboard',
// 'populateResultsTable', 'updateRankingsVisibility' are initialized and accessible
// from the global scope or imported/passed appropriately