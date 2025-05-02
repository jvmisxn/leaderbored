// --- players.js ---

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

// RENAMED to avoid conflict with player_management.js version
async function populatePlayersGrid_Old() {
     // Find the grid element *inside* this function call
     const playersGrid = document.getElementById('players-grid'); // This ID might be incorrect based on HTML structure
     if (!playersGrid) {
         console.warn("[Player List - OLD] Player grid container (#players-grid) not found in current DOM.");
         // Don't try to update if the element isn't there (e.g., on a different page)
         return;
     }
     console.log("[Player List - OLD] Populating #players-grid..."); // Log start
     playersGrid.innerHTML = '<p class="loading-text col-span-full text-center">Loading players...</p>';
     try {
         if (!db) throw new Error("Firestore database (db) is not initialized.");
         // Use cached data if available and populated, otherwise fetch directly
         let playersToDisplay = [];
         if (playersCachePopulated && Object.keys(globalPlayerCache).length > 0) {
            console.log("[Player List - OLD] Using cached player data.");
            playersToDisplay = Object.values(globalPlayerCache).sort((a, b) => a.name.localeCompare(b.name)); // Sort cached data by name
         } else {
            console.log("[Player List - OLD] Cache not populated, fetching directly.");
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

             // Add event listener for opening player modal (This might be legacy behavior)
             div.addEventListener('click', () => {
                 console.log(`[Player List - OLD] Clicked on player: ${player.name} (ID: ${player.id})`);
                 // This likely needs to navigate to the profile page instead of opening a modal
                 // Example: showSection('player-profile-section', true, { playerId: player.id });
                 if (typeof openPlayerModal === 'function') { // Keeping old logic for now, but likely needs update
                     openPlayerModal(player.id);
                 } else {
                     console.error("openPlayerModal function is not defined or accessible.");
                     // Consider navigating instead:
                     // window.location.hash = `#player-profile-section?playerId=${player.id}`;
                 }
             });
         });
         console.log(`[Player List - OLD] Displayed ${playersToDisplay.length} players in #players-grid.`);
     } catch (error) {
         console.error("Error populating players list (OLD):", error);
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
 * @deprecated Use populatePlayerProfilePage from player_management.js instead
 */
async function populatePlayerProfilePage(playerId) {
    // Forward to the main implementation
    if (typeof window.populatePlayerProfilePage === 'function') {
        return window.populatePlayerProfilePage(playerId);
    } else {
        console.error("[Players] Main populatePlayerProfilePage implementation not found");
        throw new Error("Profile page population not available");
    }
}

// --- Helper Functions ---

/**
 * Calculates win rate percentage string.
 * @param {number} wins - Number of wins.
 * @param {number} losses - Number of losses.
 * @returns {string} Win rate percentage (e.g., "60.0%") or "N/A".
 */
function calculateWinRate(wins, losses) {
    // ...existing code...
}

/**
 * Creates HTML for a player stat entry (used in teammate/opponent lists).
 * @param {string} otherPlayerId - The ID of the other player.
 * @param {string} otherPlayerName - The name of the other player.
 * @param {object} stats - The stats object { wins, losses, games }.
 * @param {string} type - 'teammate' or 'opponent'.
 * @returns {string} HTML string for the list item.
 */
function createPlayerStatEntry(otherPlayerId, otherPlayerName, stats, type) {
    // ...existing code...
}

// Note: This file assumes that 'firebase', 'db', 'openModal', 'closeModal', 'window.globalGameConfigs',
// 'DEFAULT_ELO', 'ELO_GAME_KEYS', 'currentPlayer', 'populateDashboard',
// 'populateResultsTable', 'updateRankingsVisibility' are initialized and accessible
// from the global scope or imported/passed appropriately
// Also assumes 'populatePlayerProfileGamesPlayed' and 'getMostPlayedGameKey' are available from player_management.js