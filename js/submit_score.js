// --- submit_score.js ---

// --- Navigation to Submit Score Screen ---

/**
 * Prepares and navigates to the submit score screen.
 * @param {string | null} gameKey - The key for the game played (optional).
 * @param {object} results - An object containing results from live tools (e.g., { score: '75', courseId: '...', holesPlayed: '18', holeScores: {...}, playerId: '...' }). Defaults to empty object.
 */
async function navigateToSubmitScore(gameKey = null, results = {}) {
    console.log(`[Navigate Submit] Requesting navigation. Game: ${gameKey || 'Not specified'}, Results:`, results);

    // Ensure player cache is populated (needed by setupSubmitPastGameListeners later)
    if (!playersCachePopulated) {
        console.warn("[Navigate Submit] Player cache not ready, fetching...");
        await fetchAllPlayersForCache();
    }

    // Store the results temporarily so they can be picked up after the template loads.
    // We'll store them in a global variable or a temporary storage accessible by setupSubmitPastGameListeners.
    // Using a simple global variable for this example:
    window._tempLiveResults = { gameKey, results };
    console.log("[Navigate Submit] Stored live results temporarily:", window._tempLiveResults);

    // Show the section. The loadTemplateContent function will call setupSubmitPastGameListeners,
    // which will then use window._tempLiveResults to pre-populate the form.
    showSection('submit-past-game-section');
} // End navigateToSubmitScore


// --- Submit Past Game Section Logic ---

async function setupSubmitPastGameListeners() {
    const form = document.getElementById('submit-past-game-form');
    if (!form) {
        console.warn("[Submit Form] Form element '#submit-past-game-form' not found. Aborting setup.");
        return;
    }

    console.log("[Submit Form] Setting up listeners and UI...");

    // Retrieve temporarily stored live results (if any) from the global scope
    const liveData = window._tempLiveResults || null;
    const liveResults = liveData?.results || null;
    const liveGameKey = liveData?.gameKey || null;
    delete window._tempLiveResults; // Clean up global variable immediately
    console.log("[Submit Form] Retrieved Temp Live Data:", { liveGameKey, liveResults });

    // Get references to form elements
    const gameTypeSelect = form.querySelector('#past-game-type');
    const winnerSelect = form.querySelector('#past-winner'); // Used for Winner OR Golfer
    const loserSelect = form.querySelector('#past-loser');
    const drawCheckbox = form.querySelector('#past-is-draw');
    const scoreInput = form.querySelector('#past-score');
    const dateInput = form.querySelector('#past-date-played');

    // Get references to field CONTAINERS and LABELS
    const winnerContainer = form.querySelector('#past-winner-container');
    const loserContainer = form.querySelector('#past-loser-container');
    const drawContainer = form.querySelector('#past-is-draw-container');
    const winnerLabel = winnerContainer?.querySelector('label');
    const loserLabel = loserContainer?.querySelector('label');

    // Get references to NEW Golf Specific elements
    const golfSpecificContainer = form.querySelector('#submit-golf-specific-fields');
    const golfCourseSelect = form.querySelector('#past-golf-course');
    const golfHolesRadios = form.querySelectorAll('input[name="past_golf_holes_played"]');
    const golfTrackCheckbox = form.querySelector('#past-golf-track-holes');
    const golfHoleScoresSection = form.querySelector('#past-golf-hole-scores-section');
    const golfHoleInputsContainer = form.querySelector('#past-golf-hole-inputs-container');
    const backToLiveBtn = form.querySelector('#back-to-live-game-btn');

    // --- Initial Setup ---
    form.reset(); // Clear previous entries

    // Populate Game Types dropdown
    if (gameTypeSelect && typeof populateSelectWithOptions === 'function') {
        populateSelectWithOptions(gameTypeSelect, gameTypesConfig, 'Select Game Type');
        // Pre-select game type if navigated from live game
        if (liveGameKey && gameTypesConfig[liveGameKey]) {
            gameTypeSelect.value = liveGameKey;
            console.log(`[Submit Form] Pre-selected game type: ${liveGameKey}`);
        }
    }

    // Populate Player Dropdowns using cache
    if (winnerSelect && loserSelect && globalPlayerCache && typeof populatePlayerDropdown === 'function') {
        const playersArray = Object.values(globalPlayerCache);
        populatePlayerDropdown(winnerSelect, playersArray, 'Select Winner/Golfer*');
        populatePlayerDropdown(loserSelect, playersArray, 'Select Loser*');
        // Golfer pre-selection happens inside updateFormUI based on liveResults
    }

    // Pre-fill date with today
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Pre-fill Score (handle null explicitly)
    if (liveResults?.score !== undefined && liveResults?.score !== null && scoreInput) {
        console.log(`[Submit Form] Pre-filling score with: ${liveResults.score}`);
        scoreInput.value = liveResults.score;
    }

    // Show/hide back button based on whether we came from live game
    if (backToLiveBtn) {
        backToLiveBtn.classList.toggle('hidden', !liveGameKey); // Show only if liveGameKey exists
        if (liveGameKey) {
            const backListener = () => {
                console.log("[Submit Form] Back to Live Game clicked.");
                showSection('live-game-section');
            };
            backToLiveBtn.removeEventListener('click', backToLiveBtn._listener);
            backToLiveBtn.addEventListener('click', backListener);
            backToLiveBtn._listener = backListener;
        }
    }

    // --- Helper Function to Generate/Update Hole Inputs on Submission Form ---
    const generatePastHoleInputs = (prefillScores = null) => {
        // ... existing implementation ...
    };

    // --- Helper Function to Calculate Total Score from Past Hole Inputs ---
    const updateTotalScoreFromPastHoles = () => {
        // ... existing implementation ...
    };

    // --- Function to update the entire form UI based on game type ---
    const updateFormUI = async (selectedGameType) => {
        console.log(`[Submit Form UI Update] Updating for game type: ${selectedGameType}`);

        // --- Define isGolf *before* using it ---
        const isGolf = selectedGameType === 'golf';
        // ---

        // Reset visibility and requirements first
        // ... (rest of existing reset logic) ...

        // --- Modifications within updateFormUI for pre-population ---

        // Reset fields when switching types
        if (isGolf) {
            // ... (existing golf setup logic) ...
        } else { // Not Golf
            // ... (existing non-golf reset logic) ...
        }
        console.log("[Submit Form UI Update] UI update complete.");
    }; // --- End of updateFormUI ---

    // --- Attach Event Listeners ---
    // ... (existing listener attachments for gameTypeSelect, drawCheckbox, golfTrackCheckbox, golfHolesRadios) ...

    // --- Form Submit Listener ---
    if (form) {
        form.removeEventListener('submit', handleSubmitPastGame);
        form.addEventListener('submit', handleSubmitPastGame);
    }

    // Initial call to set up the form based on the potentially pre-selected game type
    if (gameTypeSelect) {
        await updateFormUI(gameTypeSelect.value || ''); // Await this initial UI setup
    }

    console.log("[Submit Form] Listeners and UI setup complete.");
} // --- END setupSubmitPastGameListeners ---

// --- Submit Past Game Form Handler ---

async function handleSubmitPastGame(event) {
    // ... existing implementation ...
} // --- END handleSubmitPastGame ---

// Note: This file assumes that 'db', 'firebase', 'showSection', 'fetchAllPlayersForCache',
// 'playersCachePopulated', 'populateSelectWithOptions', 'populatePlayerDropdown', 'gameTypesConfig',
// 'globalPlayerCache', 'updatePlayerElosAndStats', 'updateGolfHandicap', 'populateGameInfoScreen',
// 'calculateEloUpdate', 'calculateEloUpdateDraw', 'populateResultsTable', 'populateDashboard',
// 'updateRankingsVisibility', 'ELO_GAME_KEYS' are initialized and accessible
// from the global scope or imported/passed appropriately