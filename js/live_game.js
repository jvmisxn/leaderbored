// --- live_game.js ---

// --- Live Game Section Setup ---

function setupLiveGameSection() {
    console.log("[Live Game] Setting up section...");
    const gameSelect = document.getElementById('live-game-select');
    const toolsContainer = document.getElementById('live-game-tools-container');
    const submitArea = document.getElementById('live-game-submit-area');
    const submitButton = document.getElementById('submit-live-game-score-btn');

    if (!gameSelect || !toolsContainer || !submitArea || !submitButton) {
        console.error("[Live Game] Required elements (select, tools container, submit area/button) not found.");
        return;
    }

    // Populate game select from config
    if (typeof populateSelectWithOptions === 'function' && typeof gameTypesConfig === 'object') {
        // Filter out non-playable types if necessary, or use all for now
        populateSelectWithOptions(gameSelect, gameTypesConfig, '-- Select a Game --');
        console.log("[Live Game] Populated game select.");
    } else {
        console.error("[Live Game] populateSelectWithOptions or gameTypesConfig not available.");
        gameSelect.innerHTML = '<option value="">Error loading games</option>';
    }

    // Listener for game selection change
    gameSelect.addEventListener('change', (event) => {
        const selectedGameKey = event.target.value;
        console.log(`[Live Game] Game selected: ${selectedGameKey}`);
        if (selectedGameKey) {
            loadLiveGameTools(selectedGameKey, toolsContainer, submitArea);
        } else {
            toolsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">Select a game type above to see available tools.</p>';
            submitArea.style.display = 'none';
        }
    });

    // Listener for the final submit button
    submitButton.addEventListener('click', handleFinishLiveGame);

    // Reset view on initial load (in case user navigates back)
    gameSelect.value = '';
    toolsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">Select a game type above to see available tools.</p>';
    submitArea.style.display = 'none';

    console.log("[Live Game] Section setup complete.");
}

// Loads the appropriate tools based on the selected game
async function loadLiveGameTools(gameKey, container, submitArea) {
    console.log(`[Live Game] Loading tools for: ${gameKey}`);
    container.innerHTML = '<p class="loading-text">Loading tools...</p>'; // Show loading state
    submitArea.style.display = 'none'; // Hide submit initially

    if (!gameKey) {
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">Select a game type above to see available tools.</p>';
        return;
    }

    // Ensure player cache is ready if needed for dropdowns (though live might not need them immediately)
    if (!playersCachePopulated) await fetchAllPlayersForCache();
    const playersArray = Object.values(globalPlayerCache).sort((a, b) => a.name.localeCompare(b.name));

    // Generate HTML using the shared function
    const formHTML = generateGameFormFieldsHTML(gameKey, 'live');
    container.innerHTML = formHTML;

    // --- Attach Dynamic Listeners & Populate Dropdowns (Live Context) ---
    try {
        if (gameKey === 'golf') {
            const courseSelect = container.querySelector('#game-golf-course-select'); // Get the select element
            if (courseSelect && typeof populateLiveGolfCourseSelect === 'function') {
                // Pass the element itself to the population function
                await populateLiveGolfCourseSelect(courseSelect);
                // Add listener AFTER population
                if (typeof handleLiveGolfCourseSelect === 'function') {
                    courseSelect.removeEventListener('change', handleLiveGolfCourseSelect); // Prevent duplicates
                    courseSelect.addEventListener('change', handleLiveGolfCourseSelect);
                }
            } else {
                console.error("[Live Game] Golf course select element or population function not found.");
            }
            // Setup hole inputs if the details section exists
            const holeInputsContainer = container.querySelector('#game-golf-hole-inputs');
            const holesSelect = container.querySelector('#game-golf-holes-select'); // Use the shared ID
            if (holeInputsContainer && holesSelect && typeof setupLiveGolfTool === 'function') {
                setupLiveGolfTool(holeInputsContainer, holesSelect); // Pass container and select
            }
        } else if (['pool_8ball', 'chess', 'ping_pong', 'magic_gathering', 'disney_lorcana', 'warhammer_40k'].includes(gameKey)) {
            // Add listeners specific to live inputs like outcome select or scratches
            const outcomeSelect = container.querySelector('#game-outcome-select');
            // Add listener if needed
            if (gameKey === 'pool_8ball') {
                const scratchesMeInput = container.querySelector('#game-pool-scratches-me');
                const scratchesOppInput = container.querySelector('#game-pool-scratches-opp');
                // Add listeners if needed
            }
        }
        // Add other game-specific setup for the 'live' context as needed

        // Show submit button now that tools are loaded
        submitArea.style.display = 'flex';
        console.log(`[Live Game] Tools loaded and listeners attached for ${gameKey}.`);

    } catch (error) {
        console.error(`[Live Game] Error setting up tools for ${gameKey}:`, error);
        container.innerHTML = `<p class="error-text">Error loading tools for ${gameKey}. Please try again.</p>`;
    }
}

/**
 * Retrieves the final results from the currently displayed live game tools.
 * @param {string} gameKey - The key of the game currently selected (e.g., 'golf', 'pool').
 * @returns {object} An object containing results like score, courseId, holesPlayed, holeScores.
 */
function getLiveGameResults(gameKey) {
    console.log(`[Live Game] Getting results for: ${gameKey}`);
    const container = document.getElementById('live-game-tools-container');
    if (!container) return { game_type: gameKey };

    const results = { game_type: gameKey };
    const currentUserId = getCurrentUserId(); // Assume this function exists

    switch (gameKey) {
        case 'golf':
            const courseSelect = container.querySelector('#game-golf-course-select');
            const holesSelect = container.querySelector('#game-golf-holes-select');
            const scoreInput = container.querySelector('#game-golf-score-input');
            const holeDetailsContainer = container.querySelector('#game-golf-hole-inputs');

            results.course_id = courseSelect?.value || null;
            results.holes_played = holesSelect ? parseInt(holesSelect.value, 10) : 18; // Default to 18 if select not found
            results.score = scoreInput?.value ? parseInt(scoreInput.value, 10) : null;
            results.participants = currentUserId ? [currentUserId] : []; // Assume single player for live golf

            // Gather hole-by-hole scores if container exists
            if (holeDetailsContainer) {
                results.hole_details = {};
                let calculatedScore = 0;
                let holesTracked = 0;
                const holeScoreInputs = holeDetailsContainer.querySelectorAll('input[id^="live-hole-"]'); // Assuming setupLiveGolfTool uses this pattern
                holeScoreInputs.forEach(input => {
                    const holeNumMatch = input.id.match(/live-hole-(\d+)-score/);
                    if (holeNumMatch) {
                        const holeNum = holeNumMatch[1];
                        const score = input.value ? parseInt(input.value, 10) : null;
                        if (score !== null && !isNaN(score)) {
                            if (!results.hole_details[`hole_${holeNum}`]) results.hole_details[`hole_${holeNum}`] = {};
                            results.hole_details[`hole_${holeNum}`].score = score;
                            calculatedScore += score;
                            holesTracked++;
                        }
                        // Add putts/drive if tracked similarly
                    }
                });
                // If holes were tracked, use the calculated score
                if (holesTracked > 0) {
                    results.score = calculatedScore;
                }
            }
            break;

        case 'bowling':
            const bowlingScoreInput = container.querySelector('#game-score-input');
            results.score = bowlingScoreInput?.value ? parseInt(bowlingScoreInput.value, 10) : null;
            results.participants = currentUserId ? [currentUserId] : [];
            break;

        case 'pool_8ball':
        case 'pool_9ball':
        case 'chess':
        case 'ping_pong':
        case 'magic_gathering':
        case 'disney_lorcana':
        case 'warhammer_40k':
            const outcomeSelect = container.querySelector('#game-outcome-select');
            const outcome = outcomeSelect?.value; // 'win', 'loss', 'draw'

            if (outcome === 'win') {
                results.outcome = 'Win/Loss';
                results.player1_id = currentUserId; // Prefill winner
                results.player2_id = null; // Needs selection in submit form
            } else if (outcome === 'loss') {
                results.outcome = 'Win/Loss';
                results.player1_id = null; // Needs selection in submit form
                results.player2_id = currentUserId; // Prefill loser
            } else if (outcome === 'draw') {
                results.outcome = 'Draw';
                // Need both players for submit, prefill one
                results.player1_id = currentUserId;
                results.player2_id = null;
            } else {
                results.outcome = null;
            }
            results.participants = currentUserId ? [currentUserId] : []; // Store current user, opponent added in submit

            // Add game-specific details
            if (gameKey === 'pool_8ball') {
                const scratchesMeInput = container.querySelector('#game-pool-scratches-me');
                const scratchesOppInput = container.querySelector('#game-pool-scratches-opp');
                const scratchesMe = scratchesMeInput?.value ? parseInt(scratchesMeInput.value, 10) : 0;
                const scratchesOpp = scratchesOppInput?.value ? parseInt(scratchesOppInput.value, 10) : 0;

                if (outcome === 'win') {
                    results.scratches_winner = scratchesMe;
                    results.scratches_loser = scratchesOpp;
                } else if (outcome === 'loss') {
                    results.scratches_winner = scratchesOpp;
                    results.scratches_loser = scratchesMe;
                } else { // Draw or unknown outcome
                    results.scratches_winner = scratchesMe; // Assign arbitrarily for now
                    results.scratches_loser = scratchesOpp;
                }
            }
            break;

        // Add cases for other game types using 'game-' prefixed IDs

        default:
            console.warn(`[Live Game] No result gathering logic for game type: ${gameKey}`);
            // Try a generic score input
            const genericScoreInput = container.querySelector('#game-score-input') || container.querySelector('#game-score-details');
            if (genericScoreInput) {
                results.score = genericScoreInput.value || null;
            }
            break;
    }
    console.log(`[Live Game] Gathered results:`, results);
    return results;
}

// Handles the "Finish Game & Submit Score" button click
async function handleFinishLiveGame() {
    console.log("[Live Game] Finish Game button clicked.");
    const gameSelect = document.getElementById('live-game-select');
    const gameKey = gameSelect?.value;

    if (!gameKey) {
        alert("Please select a game type first.");
        return;
    }

    // Gather results from the tools
    const results = getLiveGameResults(gameKey);
    results.date_played = new Date();

    // Submit directly using the same logic as handleSubmitPastGame
    if (typeof submitLiveGameResultDirect === 'function') {
        await submitLiveGameResultDirect(results);
    } else {
        alert("Error: Submission handler not found.");
    }
}

// --- Live Golf Tool Specific Functions ---

// Cache for fetched course data to avoid re-fetching
let liveGolfCourseDataCache = {};

// Fetches courses and populates the dropdown in the live golf section
async function populateLiveGolfCourseSelect(selectElement) {
    if (!selectElement) {
        console.error("[Live Golf] populateLiveGolfCourseSelect: Select element not provided.");
        return;
    }
    if (!db) {
        console.error("[Live Golf] DB not available for populating courses.");
        selectElement.innerHTML = '<option value="">Error loading (DB)</option>';
        return;
    }

    console.log("[Live Golf] Populating course select...");
    selectElement.innerHTML = '<option value="">Loading Courses...</option>'; // Loading state
    liveGolfCourseDataCache = {}; // Clear cache

    try {
        const snapshot = await db.collection('golf_courses').orderBy('name').get();
        selectElement.innerHTML = '<option value="">-- Select a Course --</option>'; // Default

        if (snapshot.empty) {
            selectElement.innerHTML = '<option value="">No courses found</option>';
            return;
        }

        snapshot.forEach(doc => {
            const course = { id: doc.id, ...doc.data() };
            liveGolfCourseDataCache[course.id] = course; // Store in cache
            const option = new Option(`${course.name} (Par ${course.total_par || 'N/A'})`, course.id);
            selectElement.add(option);
        });
        console.log(`[Live Golf] Populated ${snapshot.size} courses.`);

    } catch (error) {
        console.error("[Live Golf] Error fetching courses:", error);
        selectElement.innerHTML = '<option value="">Error loading courses</option>';
        if (error.code === 'failed-precondition') {
            console.error("Firestore index required: 'golf_courses' collection, 'name' field (ascending).");
            alert("Database Error: A required index for golf courses is missing.");
        }
    }
}

// Handles selection of a course, fetches par data, and updates the scorecard UI
function handleLiveGolfCourseSelect() {
    const selectElement = document.getElementById('game-golf-course-select');
    const scorecardContainer = document.getElementById('live-golf-scorecard-container');
    const courseId = selectElement.value;

    if (!scorecardContainer) {
         console.warn("[Live Golf] Scorecard container not found.");
         return;
    }

    if (!courseId) {
        scorecardContainer.classList.add('hidden');
        return;
    }

    console.log(`[Live Golf] Course selected: ${courseId}`);
    const courseData = liveGolfCourseDataCache[courseId];

    if (!courseData) {
        console.error(`[Live Golf] Course data not found in cache for ID: ${courseId}`);
        scorecardContainer.classList.add('hidden');
        return;
    }

    // Update Par Row
    const parRow = document.getElementById('live-golf-par-row');
    let totalPar = 0;
    if (parRow && courseData.par_data) { // Assuming par_data is { hole_1: 4, hole_2: 5, ... }
        for (let i = 1; i <= 18; i++) {
            const parCell = parRow.querySelector(`#live-par-${i}`);
            const par = courseData.par_data[`hole_${i}`] || '-';
            if (parCell) parCell.textContent = par;
            if (par !== '-') totalPar += par;
        }
        const totalParCell = parRow.querySelector('#live-par-total');
        if (totalParCell) totalParCell.textContent = totalPar > 0 ? totalPar : (courseData.total_par || '-');
    } else if (parRow && courseData.total_par) {
        // Fallback if only total_par is available
        for (let i = 1; i <= 18; i++) {
            const parCell = parRow.querySelector(`#live-par-${i}`);
            if (parCell) parCell.textContent = '-';
        }
        const totalParCell = parRow.querySelector('#live-par-total');
        if (totalParCell) totalParCell.textContent = courseData.total_par;
    } else {
        console.warn("[Live Golf] Could not update par row - element or par data missing.");
    }

    // Clear existing scores and show scorecard
    document.querySelectorAll('.live-golf-score-input').forEach(input => input.value = '');
    updateLiveGolfTotals(); // Reset total display
    scorecardContainer.classList.remove('hidden');
    console.log("[Live Golf] Scorecard displayed and par updated.");
}

// Calculates and updates the total row in the live scorecard
function updateLiveGolfTotals() {
    let totalScore = 0;
    let holesWithScore = 0;
    document.querySelectorAll('.live-golf-score-input').forEach(input => {
        const score = parseInt(input.value);
        if (!isNaN(score) && score > 0) {
            totalScore += score;
            holesWithScore++;
        }
    });

    const totalScoreCell = document.getElementById('live-score-total');
    if (totalScoreCell) {
        totalScoreCell.textContent = holesWithScore > 0 ? totalScore : '-';
    }
    // console.log(`[Live Golf] Total score updated: ${totalScoreCell.textContent}`); // Can be noisy
}

// --- End Live Golf ---

// --- Game Specific Tool Helpers (Timers, Dice, Coin Flip) ---

// Pool Timer
let poolTimerInterval = null, poolTimerSeconds = 0, poolTimerRunning = false, poolCountdownStartSeconds = 0;
function updatePoolTimerDisplay() {
    const display = document.getElementById('pool-timer-display');
    if (!display) return;
    const minutes = Math.floor(poolTimerSeconds / 60);
    const seconds = poolTimerSeconds % 60;
    display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function startPoolTimer() {
    if (poolTimerRunning) return;
    poolTimerRunning = true;
    document.getElementById('pool-timer-start').textContent = 'Running...';
    document.getElementById('pool-timer-pause').textContent = 'Pause';
    poolTimerInterval = setInterval(() => {
        poolTimerSeconds++;
        updatePoolTimerDisplay();
    }, 1000);
    console.log("[Live Game Tool] Pool Timer Started");
}
function pausePoolTimer() {
    if (!poolTimerRunning) return;
    poolTimerRunning = false;
    clearInterval(poolTimerInterval);
    document.getElementById('pool-timer-start').textContent = 'Resume';
    document.getElementById('pool-timer-pause').textContent = 'Paused';
    console.log("[Live Game Tool] Pool Timer Paused");
}
function resetPoolTimer() {
    poolTimerRunning = false;
    clearInterval(poolTimerInterval);
    poolTimerSeconds = 0;
    updatePoolTimerDisplay();
    document.getElementById('pool-timer-start').textContent = 'Start';
    document.getElementById('pool-timer-pause').textContent = 'Pause';
    console.log("[Live Game Tool] Pool Timer Reset");
}

// Pool Coin Flip
function flipPoolCoin() {
    const resultDisplay = document.getElementById('pool-coin-result');
    if (!resultDisplay) return;
    resultDisplay.textContent = '...';
    setTimeout(() => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        resultDisplay.textContent = result;
        console.log(`[Live Game Tool] Pool Coin Flip: ${result}`);
    }, 300);
}

// Board Game Timer
let boardTimerInterval = null, boardTimerSeconds = 0, boardTimerRunning = false, boardCountdownStartSeconds = 0;
function updateBoardTimerDisplay() {
    const display = document.getElementById('board-timer-display');
    if (!display) return;
    const minutes = Math.floor(boardTimerSeconds / 60);
    const seconds = boardTimerSeconds % 60;
    display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function startBoardTimer() {
    if (boardTimerRunning) return;
    boardTimerRunning = true;
    document.getElementById('board-timer-start').textContent = 'Running...';
    document.getElementById('board-timer-pause').textContent = 'Pause';
    boardTimerInterval = setInterval(() => {
        boardTimerSeconds++;
        updateBoardTimerDisplay();
    }, 1000);
    console.log("[Live Game Tool] Board Timer Started");
}
function pauseBoardTimer() {
    if (!boardTimerRunning) return;
    boardTimerRunning = false;
    clearInterval(boardTimerInterval);
    document.getElementById('board-timer-start').textContent = 'Resume';
    document.getElementById('board-timer-pause').textContent = 'Paused';
    console.log("[Live Game Tool] Board Timer Paused");
}
function resetBoardTimer() {
    boardTimerRunning = false;
    clearInterval(boardTimerInterval);
    boardTimerSeconds = 0;
    updateBoardTimerDisplay();
    document.getElementById('board-timer-start').textContent = 'Start';
    document.getElementById('board-timer-pause').textContent = 'Pause';
    console.log("[Live Game Tool] Board Timer Reset");
}

// Board Game Dice Roll
function rollBoardDice() {
    const resultDisplay = document.getElementById('board-dice-result');
    if (!resultDisplay) return;
    resultDisplay.textContent = '...';
    setTimeout(() => {
        const result = Math.floor(Math.random() * 6) + 1;
        resultDisplay.textContent = result;
        console.log(`[Live Game Tool] Board Dice Roll: ${result}`);
    }, 300);
}

// Board Game Coin Flip (can reuse Pool version or keep separate)
function flipBoardCoin() {
    const resultDisplay = document.getElementById('board-coin-result');
    if (!resultDisplay) return;
    resultDisplay.textContent = '...';
    setTimeout(() => {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        resultDisplay.textContent = result;
        console.log(`[Live Game Tool] Board Coin Flip: ${result}`);
    }, 300);
}

// Note: Ensure that shared variables like 'db', 'currentPlayer', and functions like
// 'navigateToSubmitScore', 'populateSelectWithOptions', 'getCurrentUserId' are accessible in the global scope
// or are properly imported/passed when using a module system