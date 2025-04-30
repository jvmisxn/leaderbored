// --- game_config.js ---

// --- Game Constants ---
const DEFAULT_ELO = 1200; // Default starting Elo
const K_FACTOR = 32; // Elo K-factor (adjust sensitivity)

// --- Game Type Configuration (Single Source of Truth) ---
// Key: used in Firestore (elos.<key>) and element IDs (ranking-table-<key>)
// Value: Display Name used in dropdowns and headings
let gameTypesConfig = {
    pool: "Pool",
    puttpong: "PuttPong", // Example - ensure this key is handled if used
    cornhole: "Cornhole", // Example - ensure this key is handled if used
    pickleball: "Pickleball", // Example - ensure this key is handled if used
    basketball_horse: "Basketball (HORSE)", // Example - ensure this key is handled if used
    golf: "Golf",
    chess: "Chess", // Added based on live game tools
    board_game: "Board Game" // Added based on live game tools
    // Add other predefined games here
    // New games added by admin will be appended to this object at runtime
};

// Create a list of keys that use Elo for easy iteration (update when config changes)
// Note: This assumes all games EXCEPT 'golf' use Elo. Adjust if needed.
let ELO_GAME_KEYS = Object.keys(gameTypesConfig).filter(key => key !== 'golf');


// --- Game Type Management Functions ---

// Updates dropdowns that list game types based on the current gameTypesConfig
function updateGameTypeDropdowns() {
    // Ensure populateSelectWithOptions is accessible
    if (typeof populateSelectWithOptions !== 'function') {
        console.error("updateGameTypeDropdowns Error: populateSelectWithOptions function is not available.");
        return;
    }
    console.log("[UI Update] Updating game type dropdowns..."); //
    // Get references to all relevant select elements
    const recordGameSelect = document.getElementById('game-type-select-modal'); // In Record Game Modal
    const editGameSelect = document.getElementById('edit-game-type-select-modal'); // In Edit Game Modal (Might not exist anymore if edit uses same modal)
    const rankingsFilterSelect = document.getElementById('rankings-game-filter'); // On Rankings Page
    const tournamentGameSelect = document.getElementById('tournament-game-type-select'); // In Create Tournament Modal
    const liveGameSelect = document.getElementById('live-game-select'); // In Live Game Section
    const pastGameSelect = document.getElementById('past-game-type'); // In Submit Past Game Section

    // Add 'overall' option specifically to rankings filter
    const rankingsOptions = { overall: "Overall (Elo)", ...gameTypesConfig }; // Ensure 'overall' makes sense for your logic

    // Populate each dropdown
    if (recordGameSelect) populateSelectWithOptions(recordGameSelect, gameTypesConfig, 'Select Game Type'); //
    if (editGameSelect) populateSelectWithOptions(editGameSelect, gameTypesConfig, 'Select Game Type'); // May be redundant if using one modal
    if (rankingsFilterSelect) populateSelectWithOptions(rankingsFilterSelect, rankingsOptions, 'Filter by Game'); // Use combined options
    if (tournamentGameSelect) populateSelectWithOptions(tournamentGameSelect, gameTypesConfig, 'Select Type'); //
    if (liveGameSelect) populateSelectWithOptions(liveGameSelect, gameTypesConfig, '-- Select a Game --'); //
    if (pastGameSelect) populateSelectWithOptions(pastGameSelect, gameTypesConfig, 'Select Game Type'); //
} // End updateGameTypeDropdowns


// --- Add Game Modal Functions ---

function openAddGameModal() {
    // Ensure necessary elements/variables accessible: addGameModal, db, openModal, closeModal, handleAddGameSubmit
    const modalElement = document.getElementById('add-game-modal'); //
    if (!modalElement) { console.error("Add Game modal element (#add-game-modal) not found."); alert("Error: Cannot open Add Game form."); return; } //
    if (!db) { console.warn("Add Game modal: DB not ready (may be needed for validation/submit)."); } // DB check (submit needs it)

    // Define and Inject HTML (with dark mode classes)
    const modalContentHTML = `
        <div class="modal-content">
            <button id="close-add-game-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Add New Game Type</h2>
            <form id="add-game-form">
                <div class="mb-4">
                    <label for="new-game-key" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Game Key:</label>
                    <input type="text" id="new-game-key" name="new-game-key" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500" required pattern="[a-z0-9_]+" placeholder="e.g. foosball, table_tennis (lowercase, underscores)">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Use lowercase letters, numbers, and underscores only. This is used internally.</p>
                </div>
                 <div class="mb-5">
                    <label for="new-game-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Display Name:</label>
                    <input type="text" id="new-game-name" name="new-game-name" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500" required placeholder="e.g. Foosball, Table Tennis">
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">This name appears in dropdowns and headings.</p>
                </div>
                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="cancel-add-game-modal-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-5 rounded-lg">Cancel</button>
                    <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-lg">Add Game</button>
                </div>
            </form>
        </div>`; //
    modalElement.innerHTML = modalContentHTML; // Inject HTML

    // Get references & Attach listeners
    const closeButton = modalElement.querySelector('#close-add-game-modal-btn'); //
    const cancelButton = modalElement.querySelector('#cancel-add-game-modal-btn'); //
    const modalForm = modalElement.querySelector('#add-game-form'); //

    if (closeButton) closeButton.addEventListener('click', closeAddGameModal); //
    if (cancelButton) cancelButton.addEventListener('click', closeAddGameModal); //
    if (modalForm) modalForm.addEventListener('submit', handleAddGameSubmit); //

    openModal(modalElement); // Show the modal
} // End openAddGameModal

function closeAddGameModal() {
     // Ensure addGameModal and closeModal are accessible
     const modalElement = document.getElementById('add-game-modal'); //
     if (modalElement) closeModal(modalElement); // Use generic close
} // End closeAddGameModal

// Handles submission of the Add New Game Type modal form
async function handleAddGameSubmit(event) {
    event.preventDefault(); //
    const form = event.target; //
    // Ensure db, firebase, gameTypesConfig, ELO_GAME_KEYS, DEFAULT_ELO, updateGameTypeDropdowns, updateRankingsVisibility, closeAddGameModal are accessible
    if (!db || !firebase || !firebase.firestore) { alert("Database connection or Firestore components missing."); return; } //

    const formData = new FormData(form); //
    const gameKey = formData.get('new-game-key')?.trim().toLowerCase(); //
    const gameName = formData.get('new-game-name')?.trim(); //

    // Validation
    if (!gameKey || !gameName) { alert("Please enter both a Game Key and a Display Name."); return; } //
    if (!/^[a-z0-9_]+$/.test(gameKey)) {
        alert("Game Key can only contain lowercase letters, numbers, and underscores."); //
        form.querySelector('#new-game-key').classList.add('border-red-500'); //
        return; //
    }
    if (gameTypesConfig[gameKey]) {
        alert(`Game Key "${gameKey}" already exists.`); //
        form.querySelector('#new-game-key').classList.add('border-red-500'); //
        return; //
    }
    // --- End Validation ---

    console.log(`[ADD GAME] Attempting to add: Key=${gameKey}, Name=${gameName}`); //

    // 1. Update local config immediately
    gameTypesConfig[gameKey] = gameName; //
    // Update Elo keys list - assuming new games use Elo by default (adjust if not)
    if (gameKey !== 'golf') { // Example exclusion, make this dynamic if needed
         ELO_GAME_KEYS = Object.keys(gameTypesConfig).filter(key => key !== 'golf');
    } else {
         ELO_GAME_KEYS = Object.keys(gameTypesConfig).filter(key => key !== 'golf'); // Recalculate even if adding golf to be safe
    }
    console.log("[ADD GAME] Updated local gameTypesConfig:", gameTypesConfig); //
    console.log("[ADD GAME] Updated ELO_GAME_KEYS:", ELO_GAME_KEYS); //

    // 2. Update UI Elements
    updateGameTypeDropdowns(); //
    // Ranking table creation handled by updateRankingsVisibility when selected

    // 3. Update existing players in Firestore (handle potential performance issues)
    alert("Updating existing players with new game rating... This might take a moment."); //
    try {
        const playersRef = db.collection('players'); //
        const snapshot = await playersRef.get(); //
        const batch = db.batch(); // Use a batch write
        let operationCount = 0; //

        if (snapshot.empty) {
            console.log("[ADD GAME] No existing players found to update."); //
        } else {
            console.log(`[ADD GAME] Found ${snapshot.size} players to update for new game: ${gameKey}`); //
            snapshot.forEach(doc => {
                const playerRef = playersRef.doc(doc.id); //
                const updateData = {}; //
                // Use dot notation to update the nested 'elos' map with default Elo
                // This assumes new games use Elo. Adjust logic if a game type shouldn't have an Elo rating (like golf).
                if (gameKey !== 'golf') { // Only add Elo field if it's not golf
                    updateData[`elos.${gameKey}`] = DEFAULT_ELO; //
                    batch.update(playerRef, updateData); //
                    operationCount++; //
                }

                // Handle batch commit limit
                if (operationCount >= 499) {
                     console.warn("[ADD GAME] Batch limit reached, committing partial batch..."); //
                     batch.commit().then(() => console.log("[ADD GAME] Partial batch committed.")); // Commit current
                     batch = db.batch(); // Start new batch
                     operationCount = 0; // Reset count
                }
            });

            // Commit any remaining operations
            if (operationCount > 0) {
                 await batch.commit(); //
                 console.log("[ADD GAME] Final player update batch committed."); //
            } else if (gameKey === 'golf') {
                console.log("[ADD GAME] No player Elo updates needed for Golf game type."); //
            } else {
                 console.log("[ADD GAME] No player Elo updates needed (operation count was 0)."); //
            }
        }

        alert(`Game "${gameName}" added successfully! Existing players updated.`); //
        closeAddGameModal(); // Close the modal

        // Refresh rankings view if currently visible
        if (typeof updateRankingsVisibility === 'function' && document.getElementById('rankings-section') && !document.getElementById('rankings-section').classList.contains('hidden')) { //
            await updateRankingsVisibility(); //
        }

    } catch (error) {
        console.error("Error updating existing players with new game:", error); //
        alert(`Failed to update existing players: ${error.message}. The game type was added locally but may not be reflected for existing players.`); //
        // Optionally revert local config change on failure
        // delete gameTypesConfig[gameKey];
        // ELO_GAME_KEYS = Object.keys(gameTypesConfig).filter(key => key !== 'golf');
        // updateGameTypeDropdowns();
    }
} // End handleAddGameSubmit

// Note: This file assumes that 'db', 'firebase', 'populateSelectWithOptions', 'updateRankingsVisibility',
// 'openModal', 'closeModal' are initialized and accessible globally or imported.