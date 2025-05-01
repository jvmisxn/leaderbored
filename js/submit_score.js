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

/**
 * Sets up listeners for the "Submit Past Game" section.
 */
async function setupSubmitPastGameListeners() {
    console.log("[Submit Past] Setting up listeners...");
    const gameTypeSelect = document.getElementById('submit-game-type-select');
    const formFieldsContainer = document.getElementById('submit-form-fields');
    const submitForm = document.getElementById('submit-score-form'); // Get the form itself

    if (!gameTypeSelect || !formFieldsContainer || !submitForm) {
        console.error("[Submit Past] Missing essential elements (select, fields container, or form).");
        return;
    }

    // 1. Populate Game Type Dropdown (Ensure configs are ready first)
    try {
        // Use populateGameTypeSelect from ui_utils.js
        if (typeof populateGameTypeSelect === 'function') {
            // Await ensures configs are fetched if needed within populateGameTypeSelect
            await populateGameTypeSelect(gameTypeSelect, 'Select Game Type');
        } else {
            console.error("[Submit Past] populateGameTypeSelect function not found."); // Updated function name
            gameTypeSelect.innerHTML = '<option value="">Error loading games</option>';
        }
    } catch (error) {
        console.error("[Submit Past] Error populating game type dropdown:", error);
        gameTypeSelect.innerHTML = '<option value="">Error loading games</option>';
    }

    // 2. Add Listener for Game Type Change
    gameTypeSelect.removeEventListener('change', handleSubmitGameTypeChange); // Prevent duplicates
    gameTypeSelect.addEventListener('change', handleSubmitGameTypeChange);

    // 3. Add Listener for Form Submission
    submitForm.removeEventListener('submit', handleSubmitScoreForm); // Prevent duplicates
    submitForm.addEventListener('submit', handleSubmitScoreForm);

    // 4. Check for and Apply Prefill Data (from live game results)
    if (window._tempLiveResults) {
        console.log("[Submit Past] Applying prefill data from live game:", window._tempLiveResults);
        const { gameKey, results } = window._tempLiveResults;

        if (gameKey && gameTypeSelect.querySelector(`option[value="${gameKey}"]`)) {
            gameTypeSelect.value = gameKey;
            // Manually trigger the change event to load the correct fields
            await handleSubmitGameTypeChange(); // Await this to ensure fields are loaded before prefill
            // Apply the actual results data to the loaded fields
            if (typeof applySubmitFormPrefill === 'function') {
                applySubmitFormPrefill(results);
            } else {
                console.error("[Submit Past] applySubmitFormPrefill function not found.");
            }
        } else if (gameKey) {
            console.warn(`[Submit Past] Prefill game key "${gameKey}" not found in dropdown.`);
        }
        // Clear the temporary data after attempting to use it
        delete window._tempLiveResults;
        console.log("[Submit Past] Cleared temporary live results.");
    } else {
        // If no prefill, ensure the form fields container is initially empty
        formFieldsContainer.innerHTML = '';
        console.log("[Submit Past] No prefill data found.");
    }

    console.log("[Submit Past] Listeners setup complete.");
}

/**
 * Handles the change event when a game type is selected in the submit score section.
 */
async function handleSubmitGameTypeChange() {
    // ...existing code...
}

/**
 * Handles the submission of the main score form.
 */
async function handleSubmitScoreForm(event) {
    // ...existing code...
}

// --- Player & Course Dropdown Population ---

/**
 * Populates player dropdowns within a given container element.
 * @param {HTMLElement} container - The element containing the dropdowns to populate.
 */
async function populatePlayerDropdowns(container) {
    // ...existing code...
}

// Populates a single select element with player options from an array
async function populatePlayerDropdown(selectElement, playersArray, prompt = 'Select Player', selectedValue = null) {
    if (!selectElement) {
        console.warn("populatePlayerDropdown: Provided selectElement is null or undefined.");
        return;
    }
    // Ensure player cache is ready
    if (!playersCachePopulated) await fetchAllPlayersForCache();
    selectElement.innerHTML = `<option value="">${prompt}</option>`;
    playersArray.forEach(player => {
        const option = new Option(player.name || 'Unnamed Player', player.id);
        if (player.id === selectedValue) {
            option.selected = true;
        }
        selectElement.add(option);
    });
    console.log(`[UI] Populated dropdown ${selectElement.id || '(no id)'} with ${playersArray.length} players.`);
}

/**
 * Applies prefill data (from live game) to the submit form fields.
 * Assumes form fields have already been loaded by loadSubmitGameFormFields.
 * Uses unified element IDs.
 * @param {object} prefillData - The data object from live game.
 */
function applySubmitFormPrefill(prefillData) {
    console.log("[Submit Form] Applying prefill data:", prefillData);
    const form = document.getElementById('submit-past-game-form');
    if (!form || !prefillData) return;

    // Game Type is already set by setupSubmitPastGameListeners

    // Date/Time (Use submit-specific IDs)
    const dateInput = form.querySelector('#submit-date-played');
    const durationInput = form.querySelector('#submit-duration');
    const notesInput = form.querySelector('#submit-notes');

    // Set Date/Time to NOW by default when prefilling from live
    if (dateInput) {
        try {
            const now = new Date();
            // Format for datetime-local: YYYY-MM-DDTHH:mm
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch (e) {
            console.error("[Submit Form Prefill] Error setting date/time:", e);
        }
    }
    if (durationInput && prefillData.match_duration) {
        durationInput.value = prefillData.match_duration;
    }
    if (notesInput && prefillData.notes) { // Assuming notes might be collected live
        notesInput.value = prefillData.notes;
    }

    // Score / Details (Use generic IDs)
    const scoreInput = form.querySelector('#game-golf-score-input') || form.querySelector('#game-score-input') || form.querySelector('#game-score-details');
    if (scoreInput && prefillData.score !== undefined && prefillData.score !== null) {
        scoreInput.value = prefillData.score;
    }

    // Players (Use generic IDs)
    const player1Select = form.querySelector('#game-player1'); // Golf/Bowling Player
    const winnerSelect = form.querySelector('#game-winner-select'); // 1v1 Winner
    const loserSelect = form.querySelector('#game-loser-select'); // 1v1 Loser
    const team1Select = form.querySelector('#game-team1-select');
    const team2Select = form.querySelector('#game-team2-select');
    const drawCheckbox = form.querySelector('#submit-is-draw');

    const currentUserId = getCurrentUserId(); // Assuming this function exists

    // Simple prefill logic - assumes live game might only know current user and maybe opponent
    if (player1Select && currentUserId) { // Solo game
        player1Select.value = currentUserId;
    } else if (winnerSelect && loserSelect && currentUserId) { // 1v1 game
        // Assume current user won if prefilling, opponent needs selection
        winnerSelect.value = currentUserId;
        // If opponent ID was somehow captured live (e.g., pre-selected opponent)
        if (prefillData.opponent_id) {
             loserSelect.value = prefillData.opponent_id;
        }
        if (prefillData.outcome === 'Draw' && drawCheckbox) {
             drawCheckbox.checked = true;
             drawCheckbox.dispatchEvent(new Event('change')); // Trigger label change if listener exists
        }
    }
    // Add logic for team prefill if needed

    // Game Specific Prefills
    if (prefillData.game_type === 'golf') {
        const courseSelect = form.querySelector('#game-golf-course-select');
        const holesSelect = form.querySelector('#game-golf-holes-select');
        if (courseSelect && prefillData.course_id) {
            // May need timeout if course dropdown populates async after fields are added
            setTimeout(() => { courseSelect.value = prefillData.course_id; }, 150);
        }
        if (holesSelect && prefillData.holes_played) {
            holesSelect.value = String(prefillData.holes_played);
            // Trigger change if hole inputs depend on it
             holesSelect.dispatchEvent(new Event('change'));
        }
        // Prefill hole details if captured live and UI exists
        if (prefillData.hole_details) {
            const detailsContainer = form.querySelector('#game-golf-hole-inputs');
            const detailsElement = form.querySelector('#game-golf-hole-details');
            if (detailsContainer && detailsElement) {
                detailsElement.open = true; // Open the details section
                // Assuming setupSubmitGolfHoleInputs is called after prefill or handles existing values
                // You might need to explicitly set values here after inputs are generated
                console.warn("[Submit Form Prefill] Hole detail prefill needs specific input targeting after generation.");
            }
        }
    }
    // Add prefill for pool scratches, chess outcome etc. if captured live

    console.log("[Submit Form] Finished applying prefill data.");
}

/**
 * Loads the specific form fields into the container based on the selected game type.
 * Populates dropdowns after generating HTML.
 * @param {string} gameKey - The key of the selected game (e.g., 'golf', 'pool_8ball').
 * @param {HTMLElement} containerElement - The HTML element to populate with form fields.
 * @param {string} context - 'live' or 'submit'.
 */
async function loadSubmitGameFormFields(gameKey, containerElement, context) {
    console.log(`[Submit Form] Loading fields for game: ${gameKey}, context: ${context}`);
    if (!containerElement) {
        console.error("[Submit Score] Target container for fields not provided or found.");
        return;
    }
    containerElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center">Loading fields...</p>'; // Loading state

    // Handle empty game key selection
    if (!gameKey) {
        containerElement.innerHTML = `<p class="text-gray-500 dark:text-gray-400 text-center">Select a game type to see specific fields.</p>`;
        return;
    }

    try {
        // Ensure player cache and configs are ready
        if (!playersCachePopulated) await fetchAllPlayersForCache();
        const playersArray = Object.values(globalPlayerCache).sort((a, b) => a.name.localeCompare(b.name));
        // Ensure configs are loaded (generateGameFormFieldsHTML also checks, but good practice)
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();

        // Generate HTML using the shared function
        const formHTML = await generateGameFormFieldsHTML(gameKey, context); // Now async
        containerElement.innerHTML = formHTML;

        // --- Populate Dropdowns & Attach Listeners (After HTML is in DOM) ---
        // Use window.globalGameConfigs
        const config = window.globalGameConfigs ? window.globalGameConfigs[gameKey] : null;
        if (!config) throw new Error(`Configuration for ${gameKey} not loaded.`);

        if (config.supports_single_player && !config.supports_1v1 && !config.supports_teams) {
            await populatePlayerDropdown(containerElement.querySelector('#game-player1'), playersArray, 'Select Player');
        } else if (config.supports_1v1) {
            const winnerSelect = containerElement.querySelector('#game-winner-select');
            const loserSelect = containerElement.querySelector('#game-loser-select');
            await populatePlayerDropdown(winnerSelect, playersArray, 'Select Winner');
            await populatePlayerDropdown(loserSelect, playersArray, 'Select Loser');
            // Add draw checkbox listener
            const drawCheckbox = containerElement.querySelector('#submit-is-draw');
            if (drawCheckbox && winnerSelect && loserSelect) {
                drawCheckbox.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    // Find labels associated with the selects to change text
                    const winnerLabel = winnerSelect.previousElementSibling; // Assumes label is direct sibling
                    const loserLabel = loserSelect.previousElementSibling;
                    if(winnerLabel) winnerLabel.textContent = isChecked ? 'Player 1:' : 'Winner:';
                    if(loserLabel) loserLabel.textContent = isChecked ? 'Player 2:' : 'Loser:';
                });
                 // Initial check in case prefilled
                 if (drawCheckbox.checked) drawCheckbox.dispatchEvent(new Event('change'));
            }
        } else if (config.supports_teams) {
             await populatePlayerDropdown(containerElement.querySelector('#game-team1-select'), playersArray, 'Select Players');
             await populatePlayerDropdown(containerElement.querySelector('#game-team2-select'), playersArray, 'Select Players');
        }

        // Populate Golf Course Select
        if (gameKey === 'golf') {
            await populateGolfCourseSelectForSubmit(); // Targets '#game-golf-course-select'
            // Add listener for hole inputs generation
            const holeInputsContainer = containerElement.querySelector('#game-golf-hole-inputs');
            const holesSelect = containerElement.querySelector('#game-golf-holes-select');
            if (holeInputsContainer && holesSelect && typeof setupSubmitGolfHoleInputs === 'function') {
                // Initial setup based on default selection
                setupSubmitGolfHoleInputs(holeInputsContainer, holesSelect.value);
                // Add listener for changes
                holesSelect.addEventListener('change', (e) => setupSubmitGolfHoleInputs(holeInputsContainer, e.target.value));
            } else if (holeInputsContainer) {
                holeInputsContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 italic">Hole tracking setup function not found.</p>';
            }
        }

        console.log(`[Submit Form] Fields loaded and dropdowns populated for ${gameKey}.`);

    } catch (error) {
        console.error(`[Submit Form] Error loading/populating fields for ${gameKey}:`, error);
        containerElement.innerHTML = `<p class="error-text">Error loading form details for ${gameKey}. Please try again.</p>`;
    }
}

// --- Game Specific Field Generation ---

/**
 * Generates HTML for standard 1v1 player selection fields.
 * @param {string} context - 'live' or 'submit'.
 * @returns {string} HTML string for the fields.
 */
function generateStandard1v1Fields(context) {
    // ...existing code...
}

/**
 * Generates HTML for standard team selection fields.
 * @param {string} context - 'live' or 'submit'.
 * @returns {string} HTML string for the fields.
 */
function generateStandardTeamFields(context) {
    // ...existing code...
}

/**
 * Generates HTML for Golf specific fields (player, course, score, etc.).
 * @param {string} context - 'live' or 'submit'.
 * @returns {string} HTML string for the fields.
 */
function generateGolfFields(context) {
    // ...existing code...
}

/**
 * Generates HTML for Pool (8-Ball) specific fields.
 * @param {string} context - 'live' or 'submit'.
 * @returns {string} HTML string for the fields.
 */
function generatePool8BallFields(context) {
    // ...existing code...
}

/**
 * Generates HTML for Chess specific fields.
 * @param {string} context - 'live' or 'submit'.
 * @returns {string} HTML string for the fields.
 */
function generateChessFields(context) {
    // ...existing code...
}

/**
 * Generates HTML for Bowling specific fields.
 * @param {string} context - 'live' or 'submit'.
 * @returns {string} HTML string for the fields.
 */
function generateBowlingFields(context) {
    // ...existing code...
}

/**
 * Generates HTML for generic score/outcome fields.
 * @param {string} context - 'live' or 'submit'.
 * @param {object} config - The game config object.
 * @returns {string} HTML string for the fields.
 */
function generateGenericScoreFields(context, config) {
    // ...existing code...
}

console.log("[Submit Score] submit_score.js loaded.");