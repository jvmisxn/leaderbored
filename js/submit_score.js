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
    // Ensure game configs are loaded (needed by setupSubmitPastGameListeners later)
    if (!window.globalGameConfigs) {
        console.warn("[Navigate Submit] Game configs not ready, fetching...");
        await fetchAndCacheGameConfigs();
    }
    // Ensure golf course cache is loaded if relevant (needed by setupSubmitPastGameListeners later)
    if (gameKey === 'golf' && !golfCourseCachePopulated) {
        console.warn("[Navigate Submit] Golf course cache not ready, fetching...");
        await ensureGolfCourseCache();
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

/**
 * Sets up the main listeners for the submit past game section.
 * Called once when the section is loaded.
 */
async function setupSubmitScoreSection(prefillParams = null) {
    console.log("[Submit Score] Setting up Submit Score Section. Prefill Params:", prefillParams); // Added log
    const gameTypeSelect = document.getElementById('submit-game-type-select');
    const formFieldsContainer = document.getElementById('submit-game-specific-fields');
    const form = document.getElementById('submit-past-game-form');
    const errorElement = document.getElementById('submit-game-error'); // General error display

    if (!gameTypeSelect || !formFieldsContainer || !form || !errorElement) {
        console.error("[Submit Score] Essential elements missing for setup (select, fields container, form, or error display).");
        if (errorElement) errorElement.textContent = "Error loading page structure.";
        else console.error("Cannot display error message - error element missing.");
        return;
    }

    errorElement.textContent = ''; // Clear previous errors
    formFieldsContainer.innerHTML = '<p class="muted-text text-center">Select a game type to enter details.</p>'; // Reset fields container

    // 1. Populate Game Type Dropdown
    try {
        console.log("[Submit Score] Attempting to populate game type select..."); // Added log
        if (typeof populateGameTypeSelect === 'function') {
            await populateGameTypeSelect(gameTypeSelect, 'Select Game Type');
            console.log("[Submit Score] populateGameTypeSelect finished."); // Added log
        } else {
            throw new Error("populateGameTypeSelect function not found.");
        }
    } catch (error) {
        console.error("[Submit Score] Error populating game type dropdown:", error);
        gameTypeSelect.innerHTML = '<option value="">Error loading games</option>';
        errorElement.textContent = "Failed to load game types.";
        // Don't proceed if game types fail to load
        return;
    }

    // 2. Attach Change Listener to Game Type Select
    gameTypeSelect.removeEventListener('change', handleGameTypeChange); // Prevent duplicates
    gameTypeSelect.addEventListener('change', handleGameTypeChange);
    console.log("[Submit Score] Attached change listener to game type select."); // Added log

    // 3. Attach Submit Listener to Form
    form.removeEventListener('submit', handleSubmitPastGame); // Prevent duplicates
    form.addEventListener('submit', handleSubmitPastGame);
    console.log("[Submit Score] Attached submit listener to form."); // Added log

    // 4. Handle Prefill (if data is passed via params)
    const prefillData = window.history.state?.prefillData; // Get data from history state
    if (prefillData) {
        console.log("[Submit Score] Prefill data found in history state:", prefillData);
        // Clear the state after reading it
        window.history.replaceState({ ...window.history.state, prefillData: null }, '');

        if (prefillData.game_type && gameTypeSelect.querySelector(`option[value="${prefillData.game_type}"]`)) {
            gameTypeSelect.value = prefillData.game_type;
            console.log(`[Submit Score] Prefilled game type to: ${prefillData.game_type}`);
            // Manually trigger load fields after setting value and ensuring DOM is ready
            // Use setTimeout to allow dropdown population to potentially finish if async issues persist
            setTimeout(async () => {
                console.log("[Submit Score] Triggering loadSubmitGameFormFields for prefill...");
                await loadSubmitGameFormFields(prefillData.game_type, formFieldsContainer, prefillData);
            }, 50); // Small delay
        } else {
            console.warn("[Submit Score] Prefill game type not found in dropdown or missing:", prefillData.game_type);
            errorElement.textContent = "Could not prefill all game details.";
        }
    } else {
        console.log("[Submit Score] No prefill data found in history state.");
    }

    console.log("[Submit Score] Setup complete."); // Added log
}

/**
 * Handles the change event when a game type is selected.
 * @param {Event} event - The change event object.
 */
async function handleGameTypeChange(event) {
    const gameKey = event.target.value;
    const formFieldsContainer = document.getElementById('submit-game-specific-fields');
    console.log(`[Submit Score] Game type changed to: ${gameKey}`); // Added log
    if (gameKey) {
        await loadSubmitGameFormFields(gameKey, formFieldsContainer);
    } else {
        formFieldsContainer.innerHTML = '<p class="muted-text text-center">Select a game type to enter details.</p>';
    }
}

/**
 * Applies prefilled data to the submit score form.
 * Should be called AFTER loadSubmitGameFormFields has populated the fields.
 * @param {object} prefillData - The data object from live game or other source.
 */
function applySubmitFormPrefill(prefillData) {
    console.log("[Submit Score Prefill] Applying prefill data:", prefillData);
    const form = document.getElementById('submit-past-game-form');
    if (!form || !prefillData) return;

    // --- Prefill Common Fields ---
    if (prefillData.game_type) {
        const gameTypeSelect = form.querySelector('#submit-game-type-select');
        if (gameTypeSelect && gameTypeSelect.querySelector(`option[value="${prefillData.game_type}"]`)) {
            gameTypeSelect.value = prefillData.game_type;
            console.log(`[Submit Score Prefill] Set game type to ${prefillData.game_type}`);
        } else {
            console.warn(`[Submit Score Prefill] Could not set game type: ${prefillData.game_type}`);
        }
    }
    // Prefill date (optional, might default to today)
    const dateInput = form.querySelector('#game-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0]; // Default to today
        console.log(`[Submit Score Prefill] Set date to today`);
    }

    // --- Prefill Participants ---
    if (prefillData.participants && prefillData.participants.length > 0) {
        const winnerSelect = form.querySelector('#game-winner-select');
        const loserSelect = form.querySelector('#game-loser-select');
        const player1Select = form.querySelector('#game-player1-select');
        const player2Select = form.querySelector('#game-player2-select');

        if (winnerSelect && prefillData.participants[0]) {
            winnerSelect.value = prefillData.participants[0];
            console.log(`[Submit Score Prefill] Set winner to ${prefillData.participants[0]}`);
        }
        if (loserSelect && prefillData.participants[1]) {
            loserSelect.value = prefillData.participants[1];
            console.log(`[Submit Score Prefill] Set loser to ${prefillData.participants[1]}`);
        }
        if (player1Select && prefillData.participants[0]) {
            player1Select.value = prefillData.participants[0];
            console.log(`[Submit Score Prefill] Set player 1 to ${prefillData.participants[0]}`);
        }
        if (player2Select && prefillData.participants[1]) {
            player2Select.value = prefillData.participants[1];
            console.log(`[Submit Score Prefill] Set player 2 to ${prefillData.participants[1]}`);
        }
    }

    // --- Prefill Game-Specific Fields ---
    if (prefillData.game_type === 'golf') {
        const courseSelect = form.querySelector('#game-golf-course-select');
        const holesSelect = form.querySelector('#game-golf-holes-select');
        if (courseSelect && prefillData.course_id) {
            courseSelect.value = prefillData.course_id;
            console.log(`[Submit Score Prefill] Set course to ${prefillData.course_id}`);
        }
        if (holesSelect && prefillData.holes_played) {
            holesSelect.value = prefillData.holes_played.toString();
            console.log(`[Submit Score Prefill] Set holes played to ${prefillData.holes_played}`);
            setTimeout(() => generateGolfHoleInputs('submit'), 50);
        }

        if (prefillData.scores) {
            console.log("[Submit Score Prefill] Prefilling golf scores:", prefillData.scores);
            Object.entries(prefillData.scores).forEach(([playerId, scoreData]) => {
                console.log(`[Submit Score Prefill] Processing scores for player ${playerId}`);
                const playerSection = form.querySelector(`[data-player-id="${playerId}"]`);
                if (!playerSection) {
                    console.warn(`[Submit Score Prefill] Could not find form section for player ${playerId}`);
                    return;
                }

                const totalScoreInput = playerSection.querySelector('input[name="total_score"]');
                if (totalScoreInput && scoreData.totalScore !== undefined) {
                    totalScoreInput.value = scoreData.totalScore;
                    console.log(`[Submit Score Prefill] Set total score for ${playerId} to ${scoreData.totalScore}`);
                }

                if (scoreData.holeScores) {
                    console.log(`[Submit Score Prefill] Prefilling hole scores for ${playerId}:`, scoreData.holeScores);
                    const numHoles = prefillData.holes_played === 9 ? 9 : 18;
                    for (let i = 1; i <= numHoles; i++) {
                        const holeKey = `hole_${i}`;
                        const holeScoreData = scoreData.holeScores[holeKey];
                        if (holeScoreData) {
                            const holeScoreInput = playerSection.querySelector(`#hole_${i}_score_${playerId}`);
                            if (holeScoreInput && holeScoreData.score !== undefined && holeScoreData.score !== null) {
                                holeScoreInput.value = holeScoreData.score;
                            }
                            const holePuttsInput = playerSection.querySelector(`#hole_${i}_putts_${playerId}`);
                            if (holePuttsInput && holeScoreData.putts !== undefined && holeScoreData.putts !== null) {
                                holePuttsInput.value = holeScoreData.putts;
                            }
                            const holeDriveInput = playerSection.querySelector(`#hole_${i}_drive_${playerId}`);
                            if (holeDriveInput && holeScoreData.drive !== undefined && holeScoreData.drive !== null) {
                                holeDriveInput.value = holeScoreData.drive;
                            }
                        }
                    }
                    console.log(`[Submit Score Prefill] Finished prefilling hole scores for ${playerId}`);
                }
            });
        }
    }

    console.log("[Submit Score Prefill] Finished applying prefill data.");
}

/**
 * Loads the specific form fields into the container based on the selected game type.
 * Populates dropdowns after generating HTML.
 * @param {string} gameKey - The key of the selected game (e.g., 'golf', 'pool_8ball').
 * @param {HTMLElement} containerElement - The HTML element to populate with form fields.
 * @param {object|null} prefillData - Optional data to prefill the form (e.g., from live game).
 */
async function loadSubmitGameFormFields(gameKey, containerElement, prefillData = null) {
    console.log(`[Submit Score] Loading form fields for game: ${gameKey}. Prefill data present: ${!!prefillData}`);
    containerElement.innerHTML = '<p class="loading-text">Loading form...</p>'; // Show loading state

    // Ensure configs are loaded (should be, but double-check)
    if (!window.globalGameConfigs) {
        console.warn("[Submit Score] Game configs not ready in loadSubmitGameFormFields, attempting fetch...");
        await fetchAndCacheGameConfigs();
        if (!window.globalGameConfigs) {
             containerElement.innerHTML = '<p class="error-text">Error: Game configurations could not be loaded.</p>';
             return;
        }
    }

    const gameConfig = window.globalGameConfigs?.[gameKey];
    if (!gameConfig) {
        containerElement.innerHTML = '<p class="error-text">Invalid game type selected.</p>';
        return;
    }

    let formHtml = '';
    // Generate game-specific fields using the factory function
    if (typeof generateGameFormFieldsHTML === 'function') {
        formHtml = await generateGameFormFieldsHTML(gameKey, 'submit', prefillData); // Pass context and optional prefill
    } else {
        console.error("generateGameFormFieldsHTML function not found!");
        containerElement.innerHTML = '<p class="error-text">Error generating form fields.</p>';
        return;
    }

    containerElement.innerHTML = formHtml;
    console.log(`[Submit Score] Injected HTML for ${gameKey} fields.`); // Added log

    // --- Populate Dropdowns AFTER HTML is in the DOM ---
    try {
        console.log("[Submit Score] Populating dropdowns..."); // Added log
        // Ensure player cache is ready before populating dropdowns
        if (!playersCachePopulated) {
            console.log("[Submit Score] Player cache not populated, fetching..."); // Added log
            await fetchAllPlayersForCache();
        }
        if (!playersCachePopulated) throw new Error("Player cache failed to load."); // Check again
        console.log("[Submit Score] Player cache ready."); // Added log

        const playersArray = Object.values(globalPlayerCache).sort((a, b) => a.name.localeCompare(b.name));

        // Populate all player dropdowns within the container
        const playerSelects = containerElement.querySelectorAll('select[name="player_id"], select[name="winner_id"], select[name="loser_id"], select[name^="team"], select[id^="game-player"]'); // Added generic player selects
        console.log(`[Submit Score] Found ${playerSelects.length} player select elements.`); // Added log
        playerSelects.forEach(select => {
            let prompt = 'Select Player';
            if (select.id.includes('winner')) prompt = 'Select Winner';
            else if (select.id.includes('loser')) prompt = 'Select Loser';
            else if (select.id.includes('team1')) prompt = 'Select Team 1 Players';
            else if (select.id.includes('team2')) prompt = 'Select Team 2 Players';
            else if (select.id.includes('player1')) prompt = 'Select Player 1';
            else if (select.id.includes('player2')) prompt = 'Select Player 2';

            populatePlayerDropdown(select, playersArray, prompt); // Use the helper from player_management.js or players.js
        });
        console.log("[Submit Score] Player dropdowns populated."); // Added log

        // Populate Golf Course Dropdown if present
        const golfCourseSelect = containerElement.querySelector('#game-golf-course-select');
        if (golfCourseSelect) {
            console.log("[Submit Score] Found golf course select, populating..."); // Added log
            // Ensure course cache is ready
            if (!golfCourseCachePopulated && typeof fetchAndCacheGolfCourses === 'function') {
                 console.log("[Submit Score] Golf course cache not populated, fetching..."); // Added log
                 await fetchAndCacheGolfCourses();
            }
            if (!golfCourseCachePopulated) throw new Error("Golf course cache failed to load."); // Check again
            console.log("[Submit Score] Golf course cache ready."); // Added log

            if (typeof populateGolfCourseDropdown === 'function') {
                await populateGolfCourseDropdown(golfCourseSelect);
                console.log("[Submit Score] Golf course dropdown populated."); // Added log
            } else {
                console.error("populateGolfCourseDropdown function not found.");
                golfCourseSelect.innerHTML = '<option value="">Error loading courses</option>';
            }
            // Add listener for holes played dropdown to regenerate hole inputs
             const holesPlayedSelect = containerElement.querySelector('#game-golf-holes-select');
             if (holesPlayedSelect) {
                 holesPlayedSelect.removeEventListener('change', setupSubmitGolfHoleInputs); // Use the specific handler
                 holesPlayedSelect.addEventListener('change', setupSubmitGolfHoleInputs);
                 console.log("[Submit Score] Attached change listener to holes played select."); // Added log
                 // Also generate initially if a course might be prefilled or default selected
                 // Use setTimeout to ensure DOM is fully ready after innerHTML update
                 setTimeout(() => {
                    console.log("[Submit Score] Triggering initial golf hole input generation...");
                    generateGolfHoleInputs('submit'); // Call with context only initially
                 }, 0);
             }
        }

        // Apply prefill data if provided *after* dropdowns are populated
        if (prefillData) {
            console.log("[Submit Score] Applying prefill data after field/dropdown population:", prefillData); // Added log
            applySubmitFormPrefill(prefillData);
             // Re-generate hole inputs if golf course/holes were prefilled
             if (gameKey === 'golf' && (prefillData.course_id || prefillData.holes_played)) {
                 console.log("[Submit Score] Re-generating golf hole inputs due to prefill..."); // Added log
                 // Use setTimeout to ensure prefill values are set before generation
                 setTimeout(() => {
                    generateGolfHoleInputs('submit'); // Call with context only
                 }, 50); // Small delay
             }
        }

        console.log(`[Submit Score] Form fields for ${gameKey} loaded and dropdowns populated.`);

    } catch (error) {
        console.error("[Submit Score] Error populating dropdowns or applying prefill:", error); // Updated error context
        containerElement.innerHTML += `<p class="error-text">Error loading selection options: ${error.message}</p>`;
    }
}

/**
 * Handles the submission of the past game form.
 */
async function handleSubmitPastGame(event) {
    console.log("[Submit Score] Past game form submitted."); // Keep existing log
    // ... (existing handleSubmitPastGame code - no changes needed based on current prompt) ...
}

/**
 * Initializes the submit score form and adds event listeners.
 */
function initSubmitScoreForm() {
    // ...existing code...
    
    // Add continue iteration handler
    document.getElementById('continue-iteration').addEventListener('click', () => {
        const currentGameData = getCurrentGameData();
        if (currentGameData) {
            navigateToLiveGame(currentGameData.sport, currentGameData.players);
        }
    });
}

/**
 * Retrieves the current game data from the form.
 * @returns {object|null} - The current game data or null if invalid.
 */
function getCurrentGameData() {
    const form = document.getElementById('submit-past-game-form');
    const sportSelect = form.querySelector('[name="sport"]');
    const playerInputs = form.querySelectorAll('[name^="player"]');
    
    if (!sportSelect || !playerInputs.length) return null;
    
    const players = Array.from(playerInputs)
        .map(input => input.value)
        .filter(value => value.trim() !== '');
        
    return {
        sport: sportSelect.value,
        players: players
    };
}

/**
 * Initializes the submit score functionality.
 */
function initSubmitScore() {
    // ...existing code...
    
    document.getElementById('continue-iteration').addEventListener('click', function() {
        // Clear the current game data
        clearGameData();
        // Navigate back to the live game screen
        navigateToLiveGame();
    });
}

/**
 * Starts a new game iteration based on the previous game data.
 * @param {object} previousGameData - The data from the previous game.
 */
function startNewGameIteration(previousGameData) {
    // Preserve relevant game settings for the next iteration
    const newGameData = {
        sport: previousGameData.sport,
        players: previousGameData.players,
        course: previousGameData.course,  // If applicable
        settings: previousGameData.settings
    };
    
    // Reset scores and start time
    localStorage.setItem('currentGame', JSON.stringify(newGameData));
    
    // Navigate back to the live game screen
    window.location.href = '#live-game';
    initializeLiveGame();
}

/**
 * Clears the current game data from temporary storage.
 */
function clearGameData() {
    // Reset any temporary game state
    sessionStorage.removeItem('currentGameScores');
    sessionStorage.removeItem('currentGamePlayers');
}

/**
 * Navigates back to the live game screen.
 */
function navigateToLiveGame() {
    // Hide submit score section
    document.getElementById('submit-score-section').classList.add('hidden');
    // Show live game section
    document.getElementById('live-game-section').classList.remove('hidden');
    // Reset the live game form
    resetLiveGameForm();
}

/**
 * Resets the live game form fields and state.
 */
function resetLiveGameForm() {
    // Reset any form fields or game state
    const scoreInputs = document.querySelectorAll('.score-input');
    scoreInputs.forEach(input => input.value = '');
}

// Add event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    const continueIterationBtn = document.getElementById('continue-iteration');
    if (continueIterationBtn) {
        continueIterationBtn.addEventListener('click', () => {
            const gameConfig = getCurrentGameConfig();
            if (gameConfig) {
                // Reset the game state but keep the same configuration
                navigateToLiveGame(gameConfig);
            }
        });
    }
    // ...existing code...
});

console.log("[Submit Score] submit_score.js loaded.");