// --- live_game.js ---

let liveGameTimerInterval = null;
let liveGameStartTime = null;
let liveGameElapsedTime = 0; // Store elapsed time in seconds
let isLiveGameTimerRunning = false;
let currentLiveGame = null; // Holds the state of the active game { gameKey, startTime, participants, score, etc. }
let liveGameData = null; // Holds current live game state
let liveGameListener = null; // Firestore listener unsubscribe function
let liveGameUpdateTimer = null; // Timer for batching updates
const LIVE_GAME_UPDATE_DEBOUNCE = 1500; // Milliseconds to wait before saving changes
let currentRound = 1; // Add state for round counter tool
let currentHole = 1; // Add state for golf hole tracking

// --- ADDED: Placeholder Utility Functions ---
/** Calculates total par up to a given hole number. */
function calculateTotalPar(parArray, upToHole) {
    if (!parArray || !Array.isArray(parArray)) return 0;
    return parArray.slice(0, upToHole).reduce((sum, par) => sum + (par || 0), 0);
}

/** Gets display text for score relative to par. */
function getScoreRelativeToParDisplay(totalScore, totalPar) {
    if (totalPar === 0) return { text: 'E', class: 'text-gray-500 dark:text-gray-400' }; // Even par or par not available
    const diff = totalScore - totalPar;
    if (diff === 0) return { text: 'E', class: 'text-gray-500 dark:text-gray-400' };
    if (diff > 0) return { text: `+${diff}`, class: 'text-red-600 dark:text-red-400' };
    return { text: `${diff}`, class: 'text-blue-600 dark:text-blue-400' }; // Use blue for under par
}
// --- END ADDED ---

/**
 * Populates a container with checkboxes for selecting participants.
 * @param {HTMLElement} container - The container element (e.g., a div).
 * @param {Array<object>} players - Array of player objects (must have id and name).
 */
function populateParticipantChecklist(container, players) {
    if (!container) {
        console.error("[UI] Participant checklist container not found.");
        return;
    }
    if (!players || players.length === 0) {
        container.innerHTML = '<p class="muted-text">No players found.</p>';
        return;
    }

    let checklistHTML = '<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Players:</label>';
    checklistHTML += '<div class="grid grid-cols-2 md:grid-cols-3 gap-2">'; // Responsive grid

    players.forEach(player => {
        checklistHTML += `
            <div class="flex items-center">
                <input type="checkbox" id="live-player-${player.id}" name="live-players" value="${player.id}"
                       class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2">
                <label for="live-player-${player.id}" class="text-sm text-gray-700 dark:text-gray-300 truncate">${player.name}</label>
            </div>
        `;
    });

    checklistHTML += '</div>';
    container.innerHTML = checklistHTML;
    console.log(`[UI] Populated participant checklist with ${players.length} players.`);
}

/**
 * Starts the live game timer.
 */
function startLiveGameTimer() {
    console.log("[Live Game Timer] Starting timer...");
    if (liveGameTimerInterval) clearInterval(liveGameTimerInterval); // Clear existing timer

    if (!currentLiveGame) return; // Should not happen if called correctly

    currentLiveGame.match_duration = currentLiveGame.match_duration || 0; // Ensure duration exists

    liveGameTimerInterval = setInterval(() => {
        if (currentLiveGame) {
            currentLiveGame.match_duration += 1; // Increment duration in seconds
            updateLiveGameTimerDisplay(); // Update the UI element showing the time
        } else {
            stopLiveGameTimer(); // Stop if game data is lost
        }
    }, 1000); // Update every second
}

/**
 * Stops the live game timer.
 */
function stopLiveGameTimer() {
    console.log("[Live Game Timer] Stopping timer.");
    if (liveGameTimerInterval) {
        clearInterval(liveGameTimerInterval);
        liveGameTimerInterval = null;
    }
}

/**
 * Updates the live game timer display.
 */
function updateLiveGameTimerDisplay() {
    // Corrected ID to match the one in updateLiveGameDisplay HTML
    const timerElement = document.getElementById('live-game-timer-display');
    if (timerElement && currentLiveGame) {
        timerElement.textContent = formatTime(currentLiveGame.match_duration);
    } else if (timerElement) {
        // Ensure timer display is reset if game ends or data is missing
        timerElement.textContent = formatTime(0);
    }
}

/**
 * Formats seconds into a readable time string (HH:MM:SS).
 */
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

/**
 * Updates the display area for the currently active live game (e.g., timer, tools).
 */
function updateLiveGameDisplay() {
    // Corrected ID to match the one in index.html template
    const displayArea = document.getElementById('live-game-display-area');
    const gameConfig = window.globalGameConfigs?.[currentLiveGame?.game_type];

    if (!displayArea || !currentLiveGame || !gameConfig) {
        console.error("[Live Game] Cannot update display: Missing elements, game data, or config.");
        if (displayArea) displayArea.innerHTML = '<p class="error-text">Error loading live game display.</p>';
        return;
    }

    console.log("[Live Game] Updating live game display for:", currentLiveGame.game_type, "Round:", currentRound, "Hole:", currentHole);

    let contentHTML = `
        <div class="flex justify-between items-center mb-4 pb-2 border-b dark:border-gray-600">
            <h2 class="text-xl font-semibold">${gameConfig.name} - Live</h2>
            <div id="live-game-timer-display" class="text-lg font-mono ${gameConfig.live_tools?.timer ? '' : 'hidden'}">00:00:00</div>
        </div>
    `;

    // --- Round/Hole Navigation ---
    let navigationHTML = '<div class="flex justify-center items-center space-x-4 mb-4">';
    let hasNavigation = false;

    if (gameConfig.live_tools?.roundCounter) {
        hasNavigation = true;
        const roundName = gameConfig.live_tools.roundCounter.name || 'Round';
        navigationHTML += `
            <button id="live-prev-round-btn" class="button button-secondary-outline button-sm">&lt;</button>
            <span class="font-medium text-lg">${roundName} ${currentRound}</span>
            <button id="live-next-round-btn" class="button button-secondary-outline button-sm">&gt;</button>
        `;
    }
    // Golf specific hole navigation
    if (currentLiveGame.game_type === 'golf') {
         hasNavigation = true;
         const maxHoles = currentLiveGame.holes_played || 18;
         // Add spacing if round counter also exists
         if (gameConfig.live_tools?.roundCounter) {
             navigationHTML += '<span class="mx-2">|</span>'; // Separator
         }
         navigationHTML += `
            <button id="live-prev-hole-btn" class="button button-secondary-outline button-sm">&lt;</button>
            <span class="font-medium text-lg">Hole ${currentHole} / ${maxHoles}</span>
            <button id="live-next-hole-btn" class="button button-secondary-outline button-sm">&gt;</button>
        `;
    }
    navigationHTML += '</div>';
    if (hasNavigation) {
        contentHTML += navigationHTML;
    }

    // --- Score Input Area ---
    contentHTML += '<div id="live-score-input-area" class="space-y-4">';

    if (currentLiveGame.game_type === 'golf') {
        // Golf Specific Display
        const teeData = currentLiveGame.live_data?.teeData;
        const holeIndex = currentHole - 1; // 0-based index
        const currentPar = teeData?.par?.[holeIndex] ?? '-';
        const currentYardage = teeData?.yardage?.[holeIndex] ?? '-';

        contentHTML += `
            <div class="text-center mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                <span class="font-semibold">Hole ${currentHole}:</span> Par ${currentPar}, ${currentYardage} yds
            </div>
        `;

        currentLiveGame.participants.forEach(playerId => {
            const playerName = window.globalPlayerCache[playerId]?.name || `Player ${playerId.substring(0, 4)}`;
            const holeScores = currentLiveGame.live_data?.scores?.[playerId]?.holeScores?.[currentHole] || {};
            const score = holeScores.score ?? ''; // Default to empty string for input
            const putts = holeScores.putts ?? '';
            const drive = holeScores.drive ?? '';

            contentHTML += `
                <div class="grid grid-cols-4 gap-2 items-center border-b dark:border-gray-600 pb-2">
                    <span class="font-medium col-span-1">${playerName}</span>
                    <div class="col-span-1">
                        <label for="live-golf-score-${playerId}" class="text-xs block text-gray-500 dark:text-gray-400">Score</label>
                        <input type="number" id="live-golf-score-${playerId}" data-player-id="${playerId}" data-input-type="score"
                               class="input-field-sm w-full text-center" value="${score}" min="1">
                    </div>
                    <div class="col-span-1 ${gameConfig.live_tools?.golfPutts ? '' : 'hidden'}">
                        <label for="live-golf-putts-${playerId}" class="text-xs block text-gray-500 dark:text-gray-400">Putts</label>
                        <input type="number" id="live-golf-putts-${playerId}" data-player-id="${playerId}" data-input-type="putts"
                               class="input-field-sm w-full text-center" value="${putts}" min="0">
                    </div>
                    <div class="col-span-1 ${gameConfig.live_tools?.golfDrive ? '' : 'hidden'}">
                         <label for="live-golf-drive-${playerId}" class="text-xs block text-gray-500 dark:text-gray-400">Drive</label>
                        <input type="text" id="live-golf-drive-${playerId}" data-player-id="${playerId}" data-input-type="drive"
                               class="input-field-sm w-full text-center" value="${drive}" placeholder="e.g., 250">
                    </div>
                </div>
            `;
        });

        // Display Totals for Golf
        contentHTML += `<div class="mt-4 pt-4 border-t dark:border-gray-600 space-y-1">`;
        contentHTML += `<h3 class="text-lg font-semibold mb-2 text-center">Totals</h3>`;
        currentLiveGame.participants.forEach(playerId => {
            const playerName = window.globalPlayerCache[playerId]?.name || `Player ${playerId.substring(0, 4)}`;
            const totalScore = currentLiveGame.live_data?.scores?.[playerId]?.totalScore ?? 0;
            const { text: relativeParText } = getScoreRelativeToParDisplay(
                totalScore,
                calculateTotalPar(currentLiveGame.live_data?.teeData?.par, currentHole) // Calculate par up to current hole
            );
            contentHTML += `
                <div class="flex justify-between items-center text-sm" id="live-total-display-${playerId}">
                    <span class="font-medium">${playerName}:</span>
                    <span>${totalScore} (${relativeParText})</span>
                </div>
            `;
        });
        contentHTML += `</div>`;

    } else if (gameConfig.live_tools?.scoreInput) {
        // Generic Score Input Display
        currentLiveGame.participants.forEach(playerId => {
            const playerName = window.globalPlayerCache[playerId]?.name || `Player ${playerId.substring(0, 4)}`;
            const currentScore = currentLiveGame.live_data?.scores?.[playerId]?.totalScore || 0;
            contentHTML += `
                <div class="flex justify-between items-center">
                    <label for="live-score-${playerId}" class="font-medium">${playerName}:</label>
                    <input type="number" id="live-score-${playerId}" data-player-id="${playerId}" data-score-type="totalScore"
                           class="input-field-sm w-20 text-center" value="${currentScore}">
                </div>
            `;
        });
    } else {
        // No score input, maybe just show participants
        contentHTML += '<p class="text-center text-gray-500 dark:text-gray-400">Participants:</p><ul class="list-disc list-inside text-center">';
        currentLiveGame.participants.forEach(playerId => {
            const playerName = window.globalPlayerCache[playerId]?.name || `Player ${playerId.substring(0, 4)}`;
            contentHTML += `<li>${playerName}</li>`;
        });
        contentHTML += '</ul>';
    }

    contentHTML += '</div>'; // Close live-score-input-area

    // --- ADDED: Finish Game Button ---
    contentHTML += `
        <div class="mt-6 pt-4 border-t dark:border-gray-600 flex justify-end">
            <button id="finish-live-game-btn" class="button button-success">Finish Game & Submit</button>
        </div>
    `;
    // --- END ADDED ---

    displayArea.innerHTML = contentHTML;
    attachLiveToolListeners(); // Re-attach listeners to new elements
    updateLiveGameTimerDisplay(); // Ensure timer display is correct after redraw
}

/**
 * Attaches event listeners to the dynamically generated live tool elements.
 */
function attachLiveToolListeners() {
    // Remove existing listeners first to avoid duplicates if updateLiveGameDisplay is called multiple times
    document.getElementById('live-prev-round-btn')?.removeEventListener('click', handlePrevRound);
    document.getElementById('live-next-round-btn')?.removeEventListener('click', handleNextRound);
    document.getElementById('live-prev-hole-btn')?.removeEventListener('click', handlePrevHole);
    document.getElementById('live-next-hole-btn')?.removeEventListener('click', handleNextHole);
    // ADDED: Remove listener for finish button
    document.getElementById('finish-live-game-btn')?.removeEventListener('click', handleFinishLiveGame);

    // Add listeners
    document.getElementById('live-prev-round-btn')?.addEventListener('click', handlePrevRound);
    document.getElementById('live-next-round-btn')?.addEventListener('click', handleNextRound);
    document.getElementById('live-prev-hole-btn')?.addEventListener('click', handlePrevHole);
    document.getElementById('live-next-hole-btn')?.addEventListener('click', handleNextHole);
    // ADDED: Add listener for finish button
    document.getElementById('finish-live-game-btn')?.addEventListener('click', handleFinishLiveGame);

    // Score input listeners
    const scoreInputs = document.querySelectorAll('#live-score-input-area input');
    scoreInputs.forEach(input => {
        input.removeEventListener('change', handleScoreInputChange); // Remove previous
        input.removeEventListener('change', handleGolfInputChange); // Remove previous

        if (currentLiveGame?.game_type === 'golf') {
            input.addEventListener('change', handleGolfInputChange);
        } else {
            input.addEventListener('change', handleScoreInputChange);
        }
    });
    console.log(`[Live Game] Attached listeners to ${scoreInputs.length} input elements.`);
}

/** Updates only the total score display for a specific player (Golf). */
function updatePlayerTotalDisplay(playerId) {
    const displayElement = document.getElementById(`live-total-display-${playerId}`);
    if (!displayElement || !currentLiveGame || currentLiveGame.game_type !== 'golf') return;

    const playerName = window.globalPlayerCache[playerId]?.name || `Player ${playerId.substring(0, 4)}`;
    const totalScore = currentLiveGame.live_data?.scores?.[playerId]?.totalScore ?? 0;
    const { text: relativeParText } = getScoreRelativeToParDisplay(
        totalScore,
        calculateTotalPar(currentLiveGame.live_data?.teeData?.par, currentHole) // Calculate par up to current hole
    );

    displayElement.innerHTML = `
        <span class="font-medium">${playerName}:</span>
        <span>${totalScore} (${relativeParText})</span>
    `;
}

// --- ADDED: Event Handlers for Live Game Setup ---

/**
 * Handles changes to the game type selection in live game setup.
 * Shows/hides relevant options based on selected game.
 */
async function handleLiveGameTypeChange(event) {
    const gameType = event.target.value;
    const golfSpecificDiv = document.getElementById('live-golf-specific-options');
    const teeBoxContainer = document.getElementById('live-tee-box-container');
    
    if (gameType === 'golf') {
        if (golfSpecificDiv) golfSpecificDiv.classList.remove('hidden');
        if (teeBoxContainer) teeBoxContainer.classList.add('hidden');
    } else {
        if (golfSpecificDiv) golfSpecificDiv.classList.add('hidden');
        if (teeBoxContainer) teeBoxContainer.classList.add('hidden');
    }
    
    validateGameSetup();
}

/**
 * Handles when a golf course is selected to populate tee boxes
 */
async function handleGolfCourseChangeForTees(event) {
    const courseId = event.target.value;
    const teeBoxSelect = document.getElementById('live-tee-box-select');
    const teeBoxContainer = document.getElementById('live-tee-box-container');
    
    if (!courseId || !teeBoxSelect || !teeBoxContainer) return;
    
    try {
        const courseDoc = await db.collection('golf_courses').doc(courseId).get();
        if (!courseDoc.exists) {
            console.error('[Live Game] Course not found:', courseId);
            return;
        }
        
        const course = courseDoc.data();
        const teeBoxes = course.tee_boxes || [];
        
        teeBoxSelect.innerHTML = `
            <option value="">Select Tee Box</option>
            ${teeBoxes.map(tee => `<option value="${tee.color}">${tee.color} (${tee.yards} yards)</option>`).join('')}
        `;
        
        teeBoxContainer.classList.remove('hidden');
    } catch (error) {
        console.error('[Live Game] Error loading tee boxes:', error);
    }
}

/**
 * Handles the change event for the golf course select dropdown.
 * Populates the tee box select based on the chosen course.
 */
async function handleGolfCourseChangeForTees(event) {
    const courseId = event.target.value;
    const teeBoxSelect = document.getElementById('live-tee-box-select');
    console.log(`[Live Game Setup] Golf course changed to: ${courseId}`);

    if (!teeBoxSelect) {
        console.error("[Live Game Setup] Tee box select element not found.");
        return;
    }

    if (!courseId) {
        teeBoxSelect.innerHTML = '<option value="">-- Select Course First --</option>';
        teeBoxSelect.disabled = true;
        return;
    }

    if (typeof populateTeeBoxDropdown === 'function') {
        await populateTeeBoxDropdown(teeBoxSelect, courseId);
    } else {
        console.error("[Live Game Setup] populateTeeBoxDropdown function not found.");
        teeBoxSelect.innerHTML = '<option value="">Error loading tees</option>';
        teeBoxSelect.disabled = true;
    }
}

/**
 * Handles the click event for the "Start Game" button.
 * Validates selections and initializes the live game state.
 */
async function handleStartLiveGame(event) {
    event.preventDefault();
    const errorElement = document.getElementById('live-game-setup-error');
    const setupDiv = document.getElementById('live-game-setup');
    const displayArea = document.getElementById('live-game-display-area');
    const gameTypeSelect = document.getElementById('live-game-type-select');
    const golfCourseSelect = document.getElementById('live-golf-course-select');
    const teeBoxSelect = document.getElementById('live-tee-box-select');
    const playerCheckboxes = document.querySelectorAll('#live-player-select-container input[name="live-players"]:checked');

    if (errorElement) errorElement.textContent = '';

    const gameKey = gameTypeSelect.value;
    const selectedPlayerIds = Array.from(playerCheckboxes).map(cb => cb.value);

    // Basic Validation
    if (!gameKey) {
        if (errorElement) errorElement.textContent = 'Please select a game type.';
        return;
    }
    if (selectedPlayerIds.length === 0) {
        if (errorElement) errorElement.textContent = 'Please select at least one player.';
        return;
    }

    const gameConfig = window.globalGameConfigs?.[gameKey];
    if (!gameConfig) {
         if (errorElement) errorElement.textContent = 'Invalid game configuration.';
         return;
    }

    // --- MODIFIED: Player count validation for Golf --- 
    if (gameKey === 'golf') {
        const currentUserUid = auth?.currentUser?.uid;
        let currentPlayerId = null;
        if (currentUserUid && window.globalPlayerCache) {
             for (const [id, player] of Object.entries(window.globalPlayerCache)) {
                if (player.uid === currentUserUid) {
                    currentPlayerId = id;
                    break;
                }
            }
        }

        if (!currentUserUid || !currentPlayerId) {
             if (errorElement) errorElement.textContent = 'You must be logged in to start a solo golf game.';
             return;
        }
        if (selectedPlayerIds.length !== 1 || selectedPlayerIds[0] !== currentPlayerId) {
            if (errorElement) errorElement.textContent = 'Golf can only be started as a solo game with the current user selected.';
            return;
        }
        console.log("[Live Game Start] Validated solo golf game for current user.");
    } else {
        // Existing validation for other game types (if any)
        if (gameConfig.supports?.solo && selectedPlayerIds.length !== 1) {
            // ... existing solo check (might need adjustment based on golf logic) ...
        }
        if (gameConfig.supports?.['1v1'] && selectedPlayerIds.length !== 2) {
            // ... existing 1v1 check ...
        }
        // Add checks for team games if/when supported
    }
    // --- END MODIFIED ---

    // Golf Specific Validation
    let courseId = null;
    let teeBoxId = null;
    let teeData = null;
    if (gameKey === 'golf') {
        courseId = golfCourseSelect.value;
        teeBoxId = teeBoxSelect.value;
        if (!courseId || !teeBoxId) {
            if (errorElement) errorElement.textContent = 'Please select a golf course and tee box.';
            return;
        }
        // --- CORRECTED Cache Variable --- 
        // Fetch tee data (assuming fetchAllGolfCourses cached it)
        const courseData = window.golfCoursesCache?.[courseId]; // Corrected from allGolfCoursesCache
        // --- END CORRECTION ---
        teeData = courseData?.tees?.[teeBoxId];
        if (!teeData) {
             if (errorElement) errorElement.textContent = 'Selected tee box data not found. Please re-select.';
             // Log details for debugging
             console.error(`[Live Game Start] Tee data missing for Course ID: ${courseId}, Tee ID: ${teeBoxId}. Course Data:`, courseData);
             return;
        }
    }

    console.log(`[Live Game Start] Starting ${gameKey} with players: ${selectedPlayerIds.join(', ')}`);
    if (gameKey === 'golf') {
        console.log(`[Live Game Start] Golf details: Course ${courseId}, Tee ${teeBoxId}`);
    }

    // --- Initialize Game State ---
    currentRound = 1; // Reset round/hole
    currentHole = 1;
    currentLiveGame = {
        game_type: gameKey,
        participants: selectedPlayerIds,
        start_time: firebase.firestore.Timestamp.now(),
        status: 'live', // 'live', 'finished'
        match_duration: 0, // In seconds
        live_data: { // Store dynamic data like scores here
            scores: {}, // PlayerID -> { totalScore: X, holeScores: { 1: { score: Y, putts: Z, ... }, ... } }
            currentRound: 1,
            currentHole: 1,
            // Golf specific
            course_id: courseId,
            tee_box_id: teeBoxId,
            teeData: teeData // Store par/yardage etc.
        }
    };

    // Initialize scores structure
    selectedPlayerIds.forEach(playerId => {
        currentLiveGame.live_data.scores[playerId] = {
            totalScore: 0,
            holeScores: {} // Initialize empty hole scores for golf
        };
    });


    // Hide setup, show display area
    if (setupDiv) setupDiv.classList.add('hidden');
    if (displayArea) displayArea.classList.remove('hidden');

    // Start timer if enabled
    if (gameConfig.live_tools?.timer) {
        startLiveGameTimer();
    }

    // Initial display update
    updateLiveGameDisplay();

    // TODO: Consider saving initial state to Firestore if persistence is needed immediately
    // await saveLiveGameState();
}

/**
 * Handles the click event for the "Finish Game" button.
 * Stops the timer, finalizes data, and navigates to the submit score screen.
 */
async function handleFinishLiveGame() {
    console.log("[Live Game] Finish Game button clicked.");
    stopLiveGameTimer(); // Stop the timer

    if (!currentLiveGame) {
        console.error("[Live Game] Cannot finish game, no current game data.");
        alert("Error: No live game data found.");
        return;
    }

    // Finalize game state
    currentLiveGame.status = 'finished';
    currentLiveGame.end_time = firebase.firestore.Timestamp.now();

    // TODO: Perform any final calculations (e.g., determine winner if possible)

    // Prepare results object for submit score screen
    const results = {
        duration: currentLiveGame.match_duration,
        // Extract relevant scores/data based on game type
    };

    if (currentLiveGame.game_type === 'golf') {
        results.courseId = currentLiveGame.live_data.course_id;
        results.teeBoxId = currentLiveGame.live_data.tee_box_id;
        results.scores = []; // Format for submit_score
        currentLiveGame.participants.forEach(playerId => {
            const playerData = currentLiveGame.live_data.scores[playerId];
            results.scores.push({
                playerId: playerId,
                score: playerData.totalScore, // Final total score
                hole_scores: playerData.holeScores // Pass all hole details
                // Include putts/drive totals if tracked and needed
            });
        });
        // Determine winner (lowest score) for golf
        if (results.scores.length > 0) {
            results.scores.sort((a, b) => a.score - b.score);
            results.winner_id = results.scores[0].playerId;
            if (results.scores.length > 1 && results.scores[0].score === results.scores[1].score) {
                 results.is_draw = true; // Handle ties
                 results.winner_id = null; // Or handle multiple winners if needed
            } else if (results.scores.length > 1) {
                 results.loser_id = results.scores[results.scores.length - 1].playerId; // Highest score is loser
            }
        }

    } else {
        // Generic score handling (assuming totalScore was updated)
        results.scores = [];
         currentLiveGame.participants.forEach(playerId => {
            const playerData = currentLiveGame.live_data.scores[playerId];
            results.scores.push({
                playerId: playerId,
                score: playerData.totalScore
            });
        });
        // TODO: Add generic winner determination logic if applicable (e.g., highest score wins?)
    }


    console.log("[Live Game] Navigating to submit score with results:", results);

    // Navigate to submit score screen, passing the results
    if (typeof navigateToSubmitScore === 'function') {
        // Pass data via history state to avoid long URLs
        window.history.pushState({ prefillData: results }, '', `#submit-score-section?gameKey=${currentLiveGame.game_type}`);
        await navigateToSubmitScore(currentLiveGame.game_type, results); // Call the function to handle navigation logic
    } else {
        console.error("[Live Game] navigateToSubmitScore function not found.");
        alert("Error navigating to submit score screen.");
    }

    // Clean up live game state
    currentLiveGame = null;
    // TODO: Detach Firestore listener if one was attached
}

/**
 * Sets up the initial state of the Live Game section.
 * Populates dropdowns and attaches listeners for game setup.
 * @param {URLSearchParams} params - Query parameters passed during navigation (currently unused).
 */
async function setupLiveGameSection(params) {
    console.log("[Live Game Setup] Setting up live game section...");
    const gameTypeSelect = document.getElementById('live-game-type-select');
    if (!gameTypeSelect) { console.error("[Live Game Setup] Element not found: #live-game-type-select"); return; } // Added check

    const golfCourseSelect = document.getElementById('live-golf-course-select');
    if (!golfCourseSelect) { console.error("[Live Game Setup] Element not found: #live-golf-course-select"); return; } // Added check

    const teeBoxSelect = document.getElementById('live-tee-box-select');
    if (!teeBoxSelect) { console.error("[Live Game Setup] Element not found: #live-tee-box-select"); return; } // Added check

    const playerSelectContainer = document.getElementById('live-player-select-container');
    if (!playerSelectContainer) { console.error("[Live Game Setup] Element not found: #live-player-select-container"); return; } // Added check

    const startGameBtn = document.getElementById('start-live-game-btn');
    if (!startGameBtn) { console.error("[Live Game Setup] Element not found: #start-live-game-btn"); return; } // Added check

    const golfSpecificDiv = document.getElementById('live-golf-specific-options');
    if (!golfSpecificDiv) { console.error("[Live Game Setup] Element not found: #live-golf-specific-options"); return; } // Added check

    const displayArea = document.getElementById('live-game-display-area');
    if (!displayArea) { console.error("[Live Game Setup] Element not found: #live-game-display-area"); return; } // Added check

    // Original check (now redundant but harmless)
    if (!gameTypeSelect || !golfCourseSelect || !teeBoxSelect || !playerSelectContainer || !startGameBtn || !golfSpecificDiv || !displayArea) {
        console.error("[Live Game Setup] One or more required elements not found in the DOM (redundant check).");
        if (displayArea) displayArea.innerHTML = '<p class="error-text text-center py-10">Error loading live game interface.</p>';
        return;
    }

    // Reset display area
    displayArea.innerHTML = '';
    currentLiveGame = null; // Ensure no previous game state persists visually initially

    try {
        // 1. Ensure necessary data is loaded
        console.log("[Live Game Setup] Ensuring data caches are populated...");
        await Promise.all([
            fetchAndCacheGameConfigs(),
            fetchAllPlayersForCache(),
            fetchAllGolfCourses() // Ensure golf courses are ready for the dropdown
        ]);
        console.log("[Live Game Setup] Data caches populated.");

        // 2. Populate Game Type Dropdown
        // Corrected function name: populateGameTypeSelect
        if (typeof populateGameTypeSelect === 'function') {
            await populateGameTypeSelect(gameTypeSelect, 'Select Game Type', null); // Use correct function
        } else {
            console.error("[Live Game Setup] populateGameTypeSelect function not found.");
            gameTypeSelect.innerHTML = '<option value="">Error loading games</option>';
        }

        // 3. Populate Player Selection (using checkboxes for multi-select)
        // Check if the function exists AND player cache is available
        if (typeof populateParticipantChecklist === 'function' && window.globalPlayerCache && Object.keys(window.globalPlayerCache).length > 0) {
            const playersArray = Object.values(window.globalPlayerCache).sort((a, b) => a.name.localeCompare(b.name));
            populateParticipantChecklist(playerSelectContainer, playersArray); // Populate checkboxes
        } else {
            // Log error or warning, but don't necessarily halt execution
            console.warn("[Live Game Setup] populateParticipantChecklist function or player cache not available/empty.");
            if (playerSelectContainer) {
                playerSelectContainer.innerHTML = '<p class="muted-text italic">Player list unavailable.</p>';
            }
        }

        // 4. Populate Golf Course Dropdown (will be hidden initially)
        if (typeof populateGolfCourseDropdown === 'function') {
            await populateGolfCourseDropdown(golfCourseSelect);
        } else {
            console.error("[Live Game Setup] populateGolfCourseDropdown function not found.");
            golfCourseSelect.innerHTML = '<option value="">Error loading courses</option>';
        }
        teeBoxSelect.innerHTML = '<option value="">-- Select Course First --</option>';
        teeBoxSelect.disabled = true;

        // 5. Attach Event Listeners (ensure only once)
        if (!gameTypeSelect.dataset.listenerAttached) {
            gameTypeSelect.addEventListener('change', handleLiveGameTypeChange);
            gameTypeSelect.dataset.listenerAttached = 'true';
        }
        if (!golfCourseSelect.dataset.listenerAttached) {
            golfCourseSelect.addEventListener('change', handleGolfCourseChangeForTees);
            golfCourseSelect.dataset.listenerAttached = 'true';
        }
        if (!startGameBtn.dataset.listenerAttached) {
            startGameBtn.addEventListener('click', handleStartLiveGame);
            startGameBtn.dataset.listenerAttached = 'true';
        }

        // 6. Initial UI State
        golfSpecificDiv.classList.add('hidden'); // Hide golf options initially
        startGameBtn.disabled = true; // Disable start button until selections are valid

        console.log("[Live Game Setup] Live game section setup complete.");

    } catch (error) {
        console.error("[Live Game Setup] Error setting up live game section:", error);
        displayArea.innerHTML = `<p class="error-text text-center py-10">Error initializing live game: ${error.message}</p>`;
    }
}

console.log("[Live Game] live_game.js loaded");