// --- submit_score.js ---

// --- Navigation to Submit Score Screen ---

/**
 * Prepares and navigates to the submit score screen.
 * @param {string | null} gameKey - The key for the game played (optional).
 * @param {object} results - An object containing results from live tools (e.g., { score: '75', courseId: '...', holesPlayed: '18', holeScores: {...}, playerId: '...' }). Defaults to empty object.
 */
async function navigateToSubmitScore(gameKey = null, results = {}) {
    console.log(`Navigating to Submit Score screen. Game: ${gameKey || 'Not specified'}, Results:`, results); // Log results

    const submitSection = document.getElementById('submit-past-game-section');
    if (!submitSection) {
        console.error("Submit Past Game section not found!"); //
        alert("Error: Cannot navigate to score submission page."); //
        return;
    }

    const form = submitSection.querySelector('#submit-past-game-form'); //
    const gameTypeSelect = form?.querySelector('#past-game-type'); //
    const scoreInput = form?.querySelector('#past-score'); //
    const dateInput = form?.querySelector('#past-date-played'); //

    // Ensure player cache is populated for dropdowns (needed by setupSubmitPastGameListeners)
    // Ensure fetchAllPlayersForCache and playersCachePopulated are accessible
    if (!playersCachePopulated) {
        console.warn("[Navigate Submit] Player cache not ready, fetching..."); //
        await fetchAllPlayersForCache(); //
    }

    // --- Prepare the Form ---
    if (form) {
        form.reset(); // Clear previous entries

        // Pre-fill date with today (optional)
        if (dateInput) {
             dateInput.value = new Date().toISOString().split('T')[0]; //
        }

        // Pre-fill Game Type first, as other logic depends on it
        if (gameKey && gameTypeSelect) {
            // Ensure gameTypesConfig is accessible
            if (gameTypesConfig[gameKey]) { //
                 gameTypeSelect.value = gameKey; //
            } else {
                 console.warn(`Invalid gameKey '${gameKey}' passed to navigateToSubmitScore.`); //
                 gameTypeSelect.value = ''; // Reset if invalid key
            }
        } else if (gameTypeSelect) {
            gameTypeSelect.value = ''; // Reset if no key passed
        }

        // Pre-fill Score (handle null explicitly)
        if (results.score !== undefined && results.score !== null && scoreInput) {
            console.log(`Pre-filling score with: ${results.score}`); //
            scoreInput.value = results.score; //
        } else if (scoreInput) {
            scoreInput.value = ''; // Ensure score is empty if not passed or null
        }

        // Store detailed results temporarily on the form for setupSubmitPastGameListeners to use
        if (results && Object.keys(results).length > 0) { // Check if results object is not empty
             form.setAttribute('data-live-results', JSON.stringify(results)); //
             console.log("[Navigate Submit] Stored live results on form attribute."); //
        } else {
             form.removeAttribute('data-live-results'); //
             console.log("[Navigate Submit] No live results to store on form attribute."); //
        }

        // Call setup listeners AFTER setting the game type and storing results data.
        // This function will now handle the UI changes and pre-population based on the stored data.
        // Ensure setupSubmitPastGameListeners is accessible
        await setupSubmitPastGameListeners(); // Make sure this function handles the pre-population logic

    } else {
         console.error("Could not find the submit past game form!"); //
         return; // Stop if form isn't found
    }

    // Show the section AFTER the form is prepared
    // Ensure showSection is accessible
    showSection('submit-past-game-section'); //
} // End navigateToSubmitScore


// --- Submit Past Game Section Logic ---

async function setupSubmitPastGameListeners() { // Make async for course population
    const form = document.getElementById('submit-past-game-form');
    if (!form) {
        console.warn("[Submit Form] Form element '#submit-past-game-form' not found. Aborting setup."); //
        return;
    }

    console.log("[Submit Form] Setting up listeners and UI..."); //

    // Retrieve temporarily stored live results (if any)
    const liveResultsString = form.getAttribute('data-live-results'); //
    const liveResults = liveResultsString ? JSON.parse(liveResultsString) : null; //
    form.removeAttribute('data-live-results'); // Clean up attribute
    console.log("[Submit Form] Retrieved Live Results for Pre-population:", liveResults); //

    // Get references to form elements
    const gameTypeSelect = form.querySelector('#past-game-type'); //
    const winnerSelect = form.querySelector('#past-winner'); // Used for Winner OR Golfer
    const loserSelect = form.querySelector('#past-loser'); //
    const drawCheckbox = form.querySelector('#past-is-draw'); //
    const scoreInput = form.querySelector('#past-score'); //
    const dateInput = form.querySelector('#past-date-played'); //

    // Get references to field CONTAINERS and LABELS
    const winnerContainer = form.querySelector('#past-winner-container'); //
    const loserContainer = form.querySelector('#past-loser-container'); //
    const drawContainer = form.querySelector('#past-is-draw-container'); //
    const winnerLabel = winnerContainer?.querySelector('label'); //
    const loserLabel = loserContainer?.querySelector('label'); //

    // Get references to NEW Golf Specific elements
    const golfSpecificContainer = form.querySelector('#submit-golf-specific-fields'); //
    const golfCourseSelect = form.querySelector('#past-golf-course'); //
    const golfHolesRadios = form.querySelectorAll('input[name="past_golf_holes_played"]'); //
    const golfTrackCheckbox = form.querySelector('#past-golf-track-holes'); //
    const golfHoleScoresSection = form.querySelector('#past-golf-hole-scores-section'); //
    const golfHoleInputsContainer = form.querySelector('#past-golf-hole-inputs-container'); //
    const backToLiveBtn = form.querySelector('#back-to-live-game-btn'); //

    // Add listener for the Back button
    if (backToLiveBtn) {
        const backListener = () => {
            console.log("[Submit Form] Back to Live Game clicked."); //
            showSection('live-game-section'); // Ensure showSection is accessible
        };
        // Manage listener to prevent duplicates
        backToLiveBtn.removeEventListener('click', backToLiveBtn._listener); //
        backToLiveBtn.addEventListener('click', backListener); //
        backToLiveBtn._listener = backListener; // Store reference
    }

    // --- Helper Function to Generate/Update Hole Inputs on Submission Form ---
    const generatePastHoleInputs = (prefillScores = null) => {
        if (!golfHoleInputsContainer || !golfHolesRadios || !golfTrackCheckbox || !golfHoleScoresSection || !scoreInput || !gameTypeSelect) {
             console.warn("[Submit Form] Missing elements required for generatePastHoleInputs."); //
             return;
        }

        const trackScores = golfTrackCheckbox.checked; //
        golfHoleScoresSection.style.display = trackScores ? 'block' : 'none'; //
        scoreInput.readOnly = trackScores; //
        scoreInput.placeholder = trackScores ? 'Auto-calculated from holes' : 'Enter Total Score'; //
        scoreInput.classList.toggle('bg-gray-100', trackScores); //
        scoreInput.classList.toggle('focus:ring-transparent', trackScores); //
        scoreInput.required = (gameTypeSelect.value === 'golf' && !trackScores); // Require score input only if golf AND NOT tracking holes

        golfHoleInputsContainer.innerHTML = ''; // Clear previous inputs
        golfHoleInputsContainer.removeEventListener('input', updateTotalScoreFromPastHoles); // Remove previous listener

        if (trackScores) {
            let startHole = 1; //
            let endHole = 18; //
            const holesValue = Array.from(golfHolesRadios).find(radio => radio.checked)?.value; //

            if (holesValue === '9F') { endHole = 9; } //
            else if (holesValue === '9B') { startHole = 10; endHole = 18; } //

            console.log(`[Submit Form] Generating hole inputs from ${startHole} to ${endHole}`); //

            for (let i = startHole; i <= endHole; i++) {
                const holeDiv = document.createElement('div'); //
                const scoreValueAttr = prefillScores?.[`hole_${i}`] ? `value="${prefillScores[`hole_${i}`]}"` : ''; // Use prefillScores safely
                holeDiv.innerHTML = `
                    <label for="past-hole-${i}" class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hole ${i}</label>
                    <input type="number" id="past-hole-${i}" name="past-hole-${i}" min="1" ${scoreValueAttr} class="past-hole-score-input shadow-sm appearance-none border rounded w-full py-1 px-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500 text-sm leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-400" required> `; // Added dark mode classes
                golfHoleInputsContainer.appendChild(holeDiv); //
            }
            // Add listener to recalculate total score when hole scores change
            golfHoleInputsContainer.addEventListener('input', updateTotalScoreFromPastHoles); //
            updateTotalScoreFromPastHoles(); // Initial calculation after generating/pre-filling
        }
    }; // --- End of generatePastHoleInputs ---

    // --- Helper Function to Calculate Total Score from Past Hole Inputs ---
    const updateTotalScoreFromPastHoles = () => {
         if (!golfTrackCheckbox || !golfHoleInputsContainer || !scoreInput) return; //
         if (!golfTrackCheckbox.checked) return; // Only run if tracking scores

        let total = 0; //
        let allHolesFilled = true; //
        const inputs = golfHoleInputsContainer.querySelectorAll('.past-hole-score-input'); //
        if(inputs.length === 0) allHolesFilled = false; // No inputs means not filled

        inputs.forEach(input => {
            const score = parseInt(input.value, 10); //
            if (!isNaN(score) && score > 0) { //
                total += score; //
            } else {
                allHolesFilled = false; // Mark as incomplete if any hole is empty or invalid
            }
        });
        // Only update the total score display if all required holes have a valid score
        scoreInput.value = allHolesFilled && total > 0 ? total : ''; //
    }; // --- End of updateTotalScoreFromPastHoles ---


    // --- Function to update the entire form UI based on game type ---
    const updateFormUI = async (selectedGameType) => {
        if (!winnerContainer || !loserContainer || !drawContainer || !golfSpecificContainer || !winnerSelect || !loserSelect || !scoreInput || !golfCourseSelect || !drawCheckbox || !winnerLabel || !loserLabel ) {
            console.warn("[Submit Form UI Update] Missing essential form elements. Aborting UI update."); //
            return;
        }

        const isGolf = selectedGameType === 'golf'; //
        console.log(`[Submit Form UI Update] Game type: ${selectedGameType}, isGolf: ${isGolf}`); //

        // Toggle visibility
        winnerContainer.classList.remove('hidden'); //
        loserContainer.classList.toggle('hidden', isGolf); //
        drawContainer.classList.toggle('hidden', isGolf); //
        golfSpecificContainer.classList.toggle('hidden', !isGolf); //

        // Update required status
        winnerSelect.required = true; //
        loserSelect.required = !isGolf; //
        golfCourseSelect.required = isGolf; //
        // Score requirement handled dynamically by generatePastHoleInputs

        // Update labels and placeholders
        winnerLabel.textContent = isGolf ? 'Golfer:*' : 'Winner:*'; //
        if (!isGolf && loserLabel) { loserLabel.textContent = 'Loser:*'; } //
        scoreInput.placeholder = isGolf ? 'Enter Total Score or Track Holes' : 'e.g. 8-3, 21-15'; //
        scoreInput.type = isGolf ? 'number' : 'text'; //


        // Reset fields when switching types
        if (isGolf) {
            drawCheckbox.checked = false; //
            loserSelect.value = ''; //
            // Populate Golf Course Select (Ensure db is accessible)
            if (golfCourseSelect.options.length <= 1) { // Only populate if empty
                console.log("[Submit Form UI Update] Populating golf course select..."); //
                golfCourseSelect.innerHTML = '<option value="">Loading Courses...</option>'; //
                try {
                    if (!db) throw new Error("DB not initialized for course population"); //
                    // Index required: golf_courses: name (asc)
                    const snapshot = await db.collection('golf_courses').orderBy('name').get(); //
                    golfCourseSelect.innerHTML = '<option value="">Select Course*</option>'; //
                    snapshot.forEach(doc => golfCourseSelect.add(new Option(`${doc.data().name} (Par ${doc.data().total_par || 'N/A'})`, doc.id))); //
                    golfCourseSelect.add(new Option('Score Only (No Course Info)', 'none')); //
                } catch (e) {
                    console.error("Error populating golf course dropdown:", e); //
                    golfCourseSelect.innerHTML = '<option value="">Error Loading Courses</option>'; //
                     if (e.code === 'failed-precondition') {
                         console.error("Firestore index required: 'golf_courses' collection, 'name' field (ascending)."); //
                     }
                }
            }
            // Pre-select course if coming from live game
             if (liveResults?.courseId) {
                 // Delay needed if options were just populated
                 setTimeout(() => {
                    if(golfCourseSelect.querySelector(`option[value="${liveResults.courseId}"]`)) {
                        golfCourseSelect.value = liveResults.courseId;
                        console.log(`[Submit Form UI Update] Pre-selected course: ${liveResults.courseId}`); //
                    } else {
                        console.warn(`[Submit Form UI Update] Course ID ${liveResults.courseId} not found in dropdown.`); //
                    }
                 }, 100); // Small delay to allow DOM update
             }

            // Pre-select holes played if coming from live game
             if (liveResults?.holesPlayed && golfHolesRadios) {
                console.log(`[Submit Form UI Update] Pre-selecting holes played: ${liveResults.holesPlayed}`); //
                Array.from(golfHolesRadios).forEach(radio => {
                    radio.checked = (radio.value === liveResults.holesPlayed); //
                });
            } else if (golfHolesRadios) {
                 // Default to 18 if no live results
                 const radio18 = Array.from(golfHolesRadios).find(r => r.value === '18'); //
                 if (radio18) radio18.checked = true; //
            }

             // Pre-check track holes checkbox and prefill hole scores if data exists
             let shouldPrefillHoles = false; //
             if (liveResults?.holeScores && Object.keys(liveResults.holeScores).length > 0) { //
                 if (golfTrackCheckbox) {
                     console.log("[Submit Form UI Update] Pre-checking track holes based on live results."); //
                     golfTrackCheckbox.checked = true; // Set checked state
                     shouldPrefillHoles = true; // Flag to prefill after generation
                 }
             } else {
                 if (golfTrackCheckbox) golfTrackCheckbox.checked = false; // Ensure checkbox is off if no scores
             }
              // Generate inputs based on checkbox state, THEN prefill if needed
              generatePastHoleInputs(shouldPrefillHoles ? liveResults.holeScores : null); //

             // Pre-select Golfer if Player ID passed in liveResults
             if (liveResults?.playerId) {
                 console.log("[Submit Form UI Update] Pre-selecting golfer:", liveResults.playerId); //
                 winnerSelect.value = liveResults.playerId; //
             }

        } else { // Not Golf
            // Reset Golf specific fields
            if (golfCourseSelect) golfCourseSelect.value = ''; //
            if (golfTrackCheckbox) golfTrackCheckbox.checked = false; //
            if (golfHoleInputsContainer) golfHoleInputsContainer.innerHTML = ''; //
            // Reset score input properties
            scoreInput.readOnly = false; //
            scoreInput.required = false; // Not required for non-golf by default
            scoreInput.classList.remove('bg-gray-100', 'focus:ring-transparent'); //

            // Ensure winner/loser labels reflect draw state for non-golf
            if (winnerLabel) winnerLabel.textContent = drawCheckbox?.checked ? 'Player 1:*' : 'Winner:*'; //
            if (loserLabel) loserLabel.textContent = drawCheckbox?.checked ? 'Player 2:*' : 'Loser:*'; //
        }
    }; // --- End of updateFormUI ---


    // --- Attach Event Listeners ---
    if (gameTypeSelect) {
        const gameTypeChangeListener = () => updateFormUI(gameTypeSelect.value); //
        gameTypeSelect.removeEventListener('change', gameTypeSelect._listener); //
        gameTypeSelect.addEventListener('change', gameTypeChangeListener); //
        gameTypeSelect._listener = gameTypeChangeListener; // Store listener reference
    }

    if (drawCheckbox) {
        const drawCheckboxListener = (e) => { //
            const isChecked = e.target.checked; //
            // Only update labels if it's NOT golf and elements exist
            if (gameTypeSelect?.value !== 'golf' && winnerLabel && loserLabel && winnerContainer && !winnerContainer.classList.contains('hidden')) { //
                winnerLabel.textContent = isChecked ? 'Player 1:*' : 'Winner:*'; //
                loserLabel.textContent = isChecked ? 'Player 2:*' : 'Loser:*'; //
            }
        };
        drawCheckbox.removeEventListener('change', drawCheckbox._listener); //
        drawCheckbox.addEventListener('change', drawCheckboxListener); //
        drawCheckbox._listener = drawCheckboxListener; //
    }

    // Golf Listeners
    if (golfTrackCheckbox) {
        const golfTrackListener = () => generatePastHoleInputs(null); // Pass null, prefill only happens on initial load
        golfTrackCheckbox.removeEventListener('change', golfTrackCheckbox._listener); //
        golfTrackCheckbox.addEventListener('change', golfTrackListener); //
        golfTrackCheckbox._listener = golfTrackListener; //
    }

    if (golfHolesRadios && golfHolesRadios.length > 0) {
        const golfHolesListener = () => { if (golfTrackCheckbox?.checked) generatePastHoleInputs(null); }; // Pass null here too
        golfHolesRadios.forEach(radio => { //
             radio.removeEventListener('change', radio._listener); //
             radio.addEventListener('change', golfHolesListener); //
             radio._listener = golfHolesListener; //
        });
    }

    // --- Form Submit Listener ---
    // Manage listener to prevent duplicates
    if (form) {
        form.removeEventListener('submit', handleSubmitPastGame); // Remove previous listener
        form.addEventListener('submit', handleSubmitPastGame); // Add the listener (ensure handleSubmitPastGame is accessible)
    }

    // --- Initial Setup ---
    // Populate Game Types dropdown (Ensure populateSelectWithOptions & gameTypesConfig are accessible)
    if (gameTypeSelect && typeof populateSelectWithOptions === 'function') {
        populateSelectWithOptions(gameTypeSelect, gameTypesConfig, 'Select Game Type'); //
        // Value is set by navigateToSubmitScore *before* this runs
    }

    // Populate Player Dropdowns using cache (Ensure populatePlayerDropdown & globalPlayerCache accessible)
    if (winnerSelect && loserSelect && globalPlayerCache && typeof populatePlayerDropdown === 'function') {
        const playersArray = Object.values(globalPlayerCache); //
        populatePlayerDropdown(winnerSelect, playersArray, 'Select Winner/Golfer*'); //
        populatePlayerDropdown(loserSelect, playersArray, 'Select Loser*'); //
        // Golf player pre-selection happens inside updateFormUI
    }

    // Initial call to set up the form based on currently selected game type
    if (gameTypeSelect) {
         await updateFormUI(gameTypeSelect.value || ''); // Await this initial UI setup
    }

    // Set Date if not already set
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0]; //
    }

    console.log("[Submit Form] Listeners and UI setup complete."); //
} // --- END setupSubmitPastGameListeners ---


// --- Submit Past Game Form Handler ---

async function handleSubmitPastGame(event) {
    event.preventDefault(); //
    const form = event.target; //
    console.log("[Submit Past Game] Form submitted."); //
    if (!db) { alert("Database connection error."); return; } //

    // Base Data
    const gameType = form.querySelector('#past-game-type').value; //
    const datePlayedValue = form.querySelector('#past-date-played').value; //
    let isValid = true; //

    // Reset previous errors
    form.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500')); //

    // Validate base fields
    if (!gameType) { form.querySelector('#past-game-type').classList.add('border-red-500'); isValid = false; } //
    if (!datePlayedValue) { form.querySelector('#past-date-played').classList.add('border-red-500'); isValid = false; } //

    // Convert date string to Firebase Timestamp
    let firestoreDate; //
    if (datePlayedValue) {
        try {
             // Use UTC midday to avoid timezone issues near midnight
             const dateObj = new Date(datePlayedValue + 'T12:00:00Z'); //
             if (isNaN(dateObj.getTime())) throw new Error("Invalid date"); //
             firestoreDate = firebase.firestore.Timestamp.fromDate(dateObj); //
        } catch(e) {
             form.querySelector('#past-date-played').classList.add('border-red-500'); //
             isValid = false; //
             alert("Invalid Date Played format."); //
        }
    }

    let gameData = { //
        game_type: gameType, //
        date_played: firestoreDate, //
        // Other fields populated based on game type below
    };
    let finalUpdates = {}; // For player stats/elo
    const FieldValue = firebase.firestore.FieldValue; // Define FieldValue

    // GOLF Specific Handling
    if (gameType === 'golf') { //
        const playerId = form.querySelector('#past-winner').value; // Golfer ID
        const courseId = form.querySelector('#past-golf-course').value; //
        const holesPlayed = Array.from(form.querySelectorAll('input[name="past_golf_holes_played"]')).find(radio => radio.checked)?.value || '18'; //
        const trackScores = form.querySelector('#past-golf-track-holes').checked; //
        const scoreInput = form.querySelector('#past-score'); //
        let score = NaN; //
        let holeScoresData = null; //

        // Validate Golfer and Course
        if (!playerId) { form.querySelector('#past-winner').classList.add('border-red-500'); isValid = false; } //
        if (!courseId) { form.querySelector('#past-golf-course').classList.add('border-red-500'); isValid = false; } //

        // Validate/Get Score
        if (trackScores) { //
             holeScoresData = {}; //
             let calculatedTotal = 0; //
             let firstInvalidHoleInput = null; //
             const holeInputs = form.querySelectorAll('.past-hole-score-input'); //
             if (holeInputs.length === 0) { isValid = false; alert("Hole inputs missing."); } //
             else {
                 let allHolesValid = true; //
                 holeInputs.forEach(input => {
                     const holeNum = input.id.split('-')[2]; // Get hole number from ID like 'past-hole-5'
                     const holeScoreVal = input.value; //
                     const holeScore = parseInt(holeScoreVal, 10); //
                     input.classList.remove('border-red-500'); // Clear previous error
                     if (!holeScoreVal || isNaN(holeScore) || holeScore <= 0) { //
                         if (!firstInvalidHoleInput) firstInvalidHoleInput = input; //
                         input.classList.add('border-red-500'); //
                         allHolesValid = false; //
                     } else {
                         holeScoresData[`hole_${holeNum}`] = holeScore; //
                         calculatedTotal += holeScore; //
                     }
                 });
                 if (!allHolesValid) {
                     isValid = false; //
                     alert("Please enter a valid score for all holes."); //
                     if (firstInvalidHoleInput) firstInvalidHoleInput.focus(); //
                 } else {
                     score = calculatedTotal; // Use calculated total
                 }
             }
        } else { // Not tracking holes, get total score
             const scoreVal = scoreInput.value; //
             score = parseInt(scoreVal, 10); //
             scoreInput.classList.remove('border-red-500'); //
             if (!scoreVal || isNaN(score) || score <= 0) { //
                 scoreInput.classList.add('border-red-500'); //
                 isValid = false; //
                 alert("Please enter a valid total score."); //
             }
        }
         if (!isValid) { console.log("[Submit Past Game] Golf validation failed."); return; } //

        // Populate Golf Game Data
        gameData = {
            ...gameData, // Keep base data (type, date)
            player_id: playerId, //
            score: score, //
            course_id: courseId === 'none' ? null : courseId, //
            outcome: 'Completed', //
            participants: [playerId], // Array with single player ID
            holes_played: holesPlayed, //
            hole_scores: trackScores ? holeScoresData : null, //
        };

        // Prepare Golf Stat Update
        if (playerId) { // Check if player ID is valid
             finalUpdates[playerId] = { games_played: FieldValue.increment(1) }; //
        } else {
             console.error("[Submit Past Game] Cannot prepare stat update: Invalid Golf Player ID."); //
             isValid = false; // Mark as invalid if player ID was somehow lost
        }
        // Handicap update will be triggered separately after save

    }
    // NON-GOLF Specific Handling
    else {
        const winnerId = form.querySelector('#past-winner').value; //
        const loserId = form.querySelector('#past-loser').value; //
        const isDraw = form.querySelector('#past-is-draw').checked; //
        const scoreVal = form.querySelector('#past-score').value.trim() || null; //

        // Validate Players
        if (!winnerId) { form.querySelector('#past-winner').classList.add('border-red-500'); isValid = false; } //
        if (!loserId) { form.querySelector('#past-loser').classList.add('border-red-500'); isValid = false; } //
        if (!isDraw && winnerId && loserId && winnerId === loserId) { //
             alert("Winner and Loser cannot be the same unless it's a draw."); //
             form.querySelector('#past-winner').classList.add('border-red-500'); //
             form.querySelector('#past-loser').classList.add('border-red-500'); //
             isValid = false; //
        }
         if (!isValid) { console.log("[Submit Past Game] Non-Golf validation failed."); return; } //

        // Populate Non-Golf Game Data
        gameData = {
             ...gameData, //
             score: scoreVal, //
             outcome: isDraw ? 'Draw' : 'Win/Loss', //
             participants: isDraw ? [winnerId, loserId].sort() : [winnerId, loserId], //
        };

        // Prepare Elo/Stat Updates (ensure calculateEloUpdate, etc. are accessible)
        // Also ensure ELO_GAME_KEYS is accessible
        let eloUpdates = {}; //
        const player1StatUpdates = { games_played: FieldValue.increment(1) }; //
        const player2StatUpdates = { games_played: FieldValue.increment(1) }; //

        if (ELO_GAME_KEYS.includes(gameType)) { //
             if (!isDraw) { //
                 eloUpdates = await calculateEloUpdate(winnerId, loserId, gameType); //
                 player1StatUpdates.wins = FieldValue.increment(1); //
                 player2StatUpdates.losses = FieldValue.increment(1); //
             } else { // Draw //
                 eloUpdates = await calculateEloUpdateDraw(winnerId, loserId, gameType); //
                 player1StatUpdates.draws = FieldValue.increment(1); //
                 player2StatUpdates.draws = FieldValue.increment(1); //
             }
        } else { // Non-Elo game //
             if (!isDraw) { //
                 player1StatUpdates.wins = FieldValue.increment(1); //
                 player2StatUpdates.losses = FieldValue.increment(1); //
             } else { //
                 player1StatUpdates.draws = FieldValue.increment(1); //
                 player2StatUpdates.draws = FieldValue.increment(1); //
             }
        }
        // Combine updates
        const p1Id = winnerId; const p2Id = loserId; //
        if (p1Id && (eloUpdates[p1Id] || Object.keys(player1StatUpdates).length > 0)) { finalUpdates[p1Id] = { ...(eloUpdates[p1Id] || {}), ...player1StatUpdates }; } //
        if (p2Id && (eloUpdates[p2Id] || Object.keys(player2StatUpdates).length > 0)) { finalUpdates[p2Id] = { ...(eloUpdates[p2Id] || {}), ...player2StatUpdates }; } //
    }

    // Final Check and Save
    if (!isValid) {
         alert("Please correct the errors in the form."); //
         console.log("[Submit Past Game] Overall validation failed."); //
         return;
    }

    console.log("[Submit Past Game] Final Game Data to save:", gameData); //
    console.log("[Submit Past Game] Final Player Updates:", finalUpdates); //

    try {
        // Save Game to Firestore
        const docRef = await db.collection('games').add(gameData); //
        console.log("[Submit Past Game] Game saved with ID:", docRef.id); //

        // Update Player Stats/Elo (ensure updatePlayerElosAndStats is accessible)
        if (Object.keys(finalUpdates).length > 0) { //
             await updatePlayerElosAndStats(finalUpdates); //
             console.log("[Submit Past Game] Player stats/elos updated."); //
        }

        // Trigger Handicap Update if it was a Golf game (ensure updateGolfHandicap is accessible)
        if (gameType === 'golf' && gameData.player_id) { //
             console.log("[Submit Past Game] Triggering handicap update for player:", gameData.player_id); //
             await updateGolfHandicap(gameData.player_id); // Call handicap update
        }

        alert("Past game submitted successfully!"); //
        form.reset(); // Clear the form

        // Navigate to Game Info Screen (ensure populateGameInfoScreen & showSection accessible)
        populateGameInfoScreen(docRef.id, gameData); // Pass ID and data
        showSection('game-info-section'); //

        // Refresh other relevant sections in the background (ensure functions accessible)
        if (typeof populateResultsTable === 'function') populateResultsTable(); //
        if (typeof populateDashboard === 'function') populateDashboard(); //
        if (typeof updateRankingsVisibility === 'function' && document.getElementById('rankings-section') && !document.getElementById('rankings-section').classList.contains('hidden')) { //
             updateRankingsVisibility(); //
        }

    } catch (error) {
        console.error("[Submit Past Game] Error saving data:", error); //
        alert(`Error submitting past game: ${error.message}`); //
    }
} // --- END handleSubmitPastGame ---

// Note: This file assumes that 'db', 'firebase', 'showSection', 'fetchAllPlayersForCache',
// 'playersCachePopulated', 'populateSelectWithOptions', 'populatePlayerDropdown', 'gameTypesConfig',
// 'globalPlayerCache', 'updatePlayerElosAndStats', 'updateGolfHandicap', 'populateGameInfoScreen',
// 'calculateEloUpdate', 'calculateEloUpdateDraw', 'populateResultsTable', 'populateDashboard',
// 'updateRankingsVisibility', 'ELO_GAME_KEYS' are initialized and accessible
// from the global scope or imported/passed appropriately.