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

// NEW Helper: Populates the Golf Course dropdown in the submit form
async function populateGolfCourseSelectForSubmit() {
    // Target the new generic ID
    const selectElement = document.getElementById('game-golf-course-select');
    if (!selectElement) {
        console.warn("[Submit Form] Golf course select element (#game-golf-course-select) not found.");
        return;
    }
    if (!db) {
        console.error("[Submit Form] DB not available for populating golf courses.");
        selectElement.innerHTML = '<option value="">Error loading courses (DB)</option>';
        return;
    }

    console.log("[Submit Form] Populating golf course select...");
    selectElement.innerHTML = '<option value="">Loading Courses...</option>';

    try {
        // Query the correct collection: 'golf_courses'
        const snapshot = await db.collection('golf_courses').orderBy('name').get();
        selectElement.innerHTML = '<option value="">-- Select a Course --</option>'; // Default

        if (snapshot.empty) {
            selectElement.innerHTML = '<option value="">No courses found</option>';
            return;
        }

        snapshot.forEach(doc => {
            const course = { id: doc.id, ...doc.data() };
            const option = new Option(`${course.name} (Par ${course.total_par || 'N/A'})`, course.id);
            selectElement.add(option);
        });
        console.log(`[Submit Form] Populated ${snapshot.size} golf courses from 'golf_courses' collection.`);

    } catch (error) {
        console.error("[Submit Form] Error fetching golf courses:", error);
        selectElement.innerHTML = '<option value="">Error loading courses</option>';
        if (error.code === 'failed-precondition') {
            console.error("Firestore index required: 'golf_courses' collection, 'name' field (ascending).");
        }
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
 * @param {object} prefillData - The data object from getLiveGameResults.
 */
function applySubmitFormPrefill(prefillData) {
    console.log("[Submit Form] Applying prefill data:", prefillData);
    const form = document.getElementById('submit-past-game-form');
    if (!form || !prefillData) return;

    // Game Type (already selected by setupSubmitPastGameListeners)

    // Date/Time (These are submit-specific, IDs remain the same)
    const dateInput = form.querySelector('#submit-date-played');
    const timeInput = form.querySelector('#submit-time-played');
    if (dateInput && prefillData.date_played instanceof Date) {
        try {
            // Format date as YYYY-MM-DD
            const year = prefillData.date_played.getFullYear();
            const month = String(prefillData.date_played.getMonth() + 1).padStart(2, '0');
            const day = String(prefillData.date_played.getDate()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}`;

            // Format time as HH:MM (optional)
            if (timeInput) {
                const hours = String(prefillData.date_played.getHours()).padStart(2, '0');
                const minutes = String(prefillData.date_played.getMinutes()).padStart(2, '0');
                timeInput.value = `${hours}:${minutes}`;
            }
        } catch (e) {
            console.error("[Submit Form Prefill] Error setting date/time:", e);
            if (dateInput) dateInput.valueAsDate = new Date(); // Fallback to today
        }
    } else if (dateInput) {
        dateInput.valueAsDate = new Date(); // Fallback if date missing/invalid
    }

    // Score / Notes
    // Use generic score input IDs first, fallback to submit-specific if needed
    const scoreInput = form.querySelector('#game-golf-score-input') || form.querySelector('#game-score-input') || form.querySelector('#game-score-details') || form.querySelector('#submit-score');
    const notesInput = form.querySelector('#submit-notes'); // Submit specific
    if (scoreInput && prefillData.score !== undefined && prefillData.score !== null) {
        scoreInput.value = prefillData.score;
    }
    if (notesInput && prefillData.notes) {
        notesInput.value = prefillData.notes;
    }

    // Players (Win/Loss or Golf)
    // Use generic IDs where applicable
    const player1Select = form.querySelector('#game-player1'); // Golf/Bowling Player
    const winnerSelect = form.querySelector('#game-winner-select'); // 1v1 Winner
    const loserSelect = form.querySelector('#game-loser-select'); // 1v1 Loser

    // Prefill based on game type and available selectors
    if (prefillData.game_type === 'golf' || prefillData.game_type === 'bowling') {
        if (player1Select && prefillData.participants && prefillData.participants.length > 0) {
            if (prefillData.participants[0] === getCurrentUserId()) {
                player1Select.value = prefillData.participants[0];
            } else if (prefillData.player1_id) {
                player1Select.value = prefillData.player1_id;
            }
        }
    } else if (prefillData.outcome === 'Win/Loss' || prefillData.outcome === 'Draw') {
        if (winnerSelect && prefillData.player1_id) {
            winnerSelect.value = prefillData.player1_id;
        }
        if (loserSelect && prefillData.player2_id) {
            loserSelect.value = prefillData.player2_id;
        }
        // Handle draw checkbox
        const drawCheckbox = form.querySelector('#submit-is-draw');
        if (drawCheckbox && prefillData.outcome === 'Draw') {
            drawCheckbox.checked = true;
            drawCheckbox.dispatchEvent(new Event('change'));
        }
    }

    // If only current user ID is known (e.g., from live game win/loss)
    // and the other player select is empty, try to set the current user.
    const currentUserId = getCurrentUserId();
    if (currentUserId) {
        if (winnerSelect && !winnerSelect.value && prefillData.outcome === 'Win/Loss' && prefillData.player2_id !== currentUserId) {
            winnerSelect.value = currentUserId;
        } else if (loserSelect && !loserSelect.value && prefillData.outcome === 'Win/Loss' && prefillData.player1_id !== currentUserId) {
            loserSelect.value = currentUserId;
        } else if (player1Select && !player1Select.value && (prefillData.game_type === 'golf' || prefillData.game_type === 'bowling')) {
            player1Select.value = currentUserId;
        } else if (prefillData.outcome === 'Draw') {
            if (winnerSelect && !winnerSelect.value && loserSelect && loserSelect.value !== currentUserId) {
                winnerSelect.value = currentUserId;
            } else if (loserSelect && !loserSelect.value && winnerSelect && winnerSelect.value !== currentUserId) {
                loserSelect.value = currentUserId;
            }
        }
    }

    // Golf Specific
    if (prefillData.game_type === 'golf') {
        const courseSelect = form.querySelector('#game-golf-course-select'); // New ID
        const holesSelect = form.querySelector('#game-golf-holes-select'); // New ID
        if (courseSelect && prefillData.course_id) {
            setTimeout(() => {
                courseSelect.value = prefillData.course_id;
                console.log(`[Submit Form Prefill] Set course to: ${prefillData.course_id}`);
            }, 100);
        }
        if (holesSelect && prefillData.holes_played) {
            holesSelect.value = String(prefillData.holes_played);
            holesSelect.dispatchEvent(new Event('change'));
        }
        if (prefillData.hole_details) {
            const detailsContainer = form.querySelector('#game-golf-hole-inputs'); // New ID
            if (detailsContainer) {
                const detailsElement = detailsContainer.closest('details');
                if (detailsElement) detailsElement.open = true;

                setupSubmitGolfHoleInputs(detailsContainer, holesSelect.value);

                for (const holeKey in prefillData.hole_details) {
                    const holeNum = holeKey.split('_')[1];
                    const scoreInput = detailsContainer.querySelector(`#submit-hole-${holeNum}-score`);
                    if (scoreInput && prefillData.hole_details[holeKey].score !== null) {
                        scoreInput.value = prefillData.hole_details[holeKey].score;
                    }
                }
                console.log("[Submit Form Prefill] Applied hole details.");
            }
        }
    }

    // Pool Scratches (Submit specific IDs remain)
    if (prefillData.game_type === 'pool_8ball') {
        const scratchesWinnerInput = form.querySelector('#submit-pool-scratches-winner');
        const scratchesLoserInput = form.querySelector('#submit-pool-scratches-loser');
        if (scratchesWinnerInput && prefillData.scratches_winner !== undefined) {
            scratchesWinnerInput.value = prefillData.scratches_winner;
        }
        if (scratchesLoserInput && prefillData.scratches_loser !== undefined) {
            scratchesLoserInput.value = prefillData.scratches_loser;
        }
    }

    console.log("[Submit Form] Finished applying prefill data.");
}

/**
 * Loads the specific form fields into the container based on the selected game type.
 * @param {string} gameKey - The key of the selected game (e.g., 'golf', 'pool_8ball').
 * @param {HTMLElement} containerElement - The HTML element to populate with form fields.
 */
async function loadSubmitGameFormFields(gameKey, containerElement) {
    console.log(`[Submit Form] Loading fields for game: ${gameKey}`);
    if (!gameKey) {
        containerElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">Select a game type above to enter details.</p>';
        return;
    }

    // Ensure player cache is ready
    if (!playersCachePopulated) await fetchAllPlayersForCache();
    const playersArray = Object.values(globalPlayerCache).sort((a, b) => a.name.localeCompare(b.name));

    // Generate HTML using the shared function with 'submit' context
    const formHTML = generateGameFormFieldsHTML(gameKey, 'submit');
    containerElement.innerHTML = formHTML;

    // --- Populate Dropdowns & Attach Listeners (Submit Context) ---
    try {
        if (gameKey === 'golf') {
            await populatePlayerDropdown(containerElement.querySelector('#game-player1'), playersArray, 'Select Player'); // New ID
            await populateGolfCourseSelectForSubmit(); // Targets '#game-golf-course-select'
            const holeInputsContainer = containerElement.querySelector('#game-golf-hole-inputs');
            const holesSelect = containerElement.querySelector('#game-golf-holes-select');
            if (holeInputsContainer && holesSelect && typeof setupSubmitGolfHoleInputs === 'function') {
                setupSubmitGolfHoleInputs(holeInputsContainer, holesSelect.value);
                holesSelect.addEventListener('change', (e) => setupSubmitGolfHoleInputs(holeInputsContainer, e.target.value));
            } else if (holeInputsContainer) {
                holeInputsContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 italic">Hole tracking setup function not found.</p>';
            }
        } else if (gameKey === 'bowling') {
            await populatePlayerDropdown(containerElement.querySelector('#game-player1'), playersArray, 'Select Player'); // New ID
        } else if (['pool_8ball', 'chess', 'ping_pong', 'magic_gathering', 'disney_lorcana', 'warhammer_40k'].includes(gameKey)) {
            await populatePlayerDropdown(containerElement.querySelector('#game-winner-select'), playersArray, 'Select Winner');
            await populatePlayerDropdown(containerElement.querySelector('#game-loser-select'), playersArray, 'Select Loser');
            const drawCheckbox = containerElement.querySelector('#submit-is-draw');
            const winnerSelect = containerElement.querySelector('#game-winner-select');
            const loserSelect = containerElement.querySelector('#game-loser-select');
            if (drawCheckbox && winnerSelect && loserSelect) {
                drawCheckbox.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    winnerSelect.previousElementSibling.textContent = isChecked ? 'Player 1:' : 'Winner:';
                    loserSelect.previousElementSibling.textContent = isChecked ? 'Player 2:' : 'Loser:';
                });
            }
        }

        console.log(`[Submit Form] Fields loaded and dropdowns populated for ${gameKey}.`);

    } catch (error) {
        console.error(`[Submit Form] Error populating dropdowns for ${gameKey}:`, error);
        containerElement.innerHTML = `<p class="error-text">Error loading form details for ${gameKey}. Please try again.</p>`;
    }
}

// Placeholder for function to create hole inputs in submit context
function setupSubmitGolfHoleInputs(container, holesValue) {
    console.log(`[Submit Form] Setting up hole inputs for ${holesValue} holes.`);
    container.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400 italic">Hole input generation for submit form TBD.</p>`;
}

// Note: This file assumes that 'db', 'firebase', 'showSection', 'fetchAllPlayersForCache',
// 'playersCachePopulated', 'populateSelectWithOptions', 'populatePlayerDropdown', 'gameTypesConfig',
// 'globalPlayerCache', 'updatePlayerElosAndStats', 'updateGolfHandicap', 'populateGameInfoScreen',
// 'calculateEloUpdate', 'calculateEloUpdateDraw', 'populateResultsTable', 'populateDashboard',
// 'updateRankingsVisibility', 'ELO_GAME_KEYS' are initialized and accessible
// from the global scope or imported/passed appropriately