// --- live_game.js ---

// --- Live Game Section Setup ---

function setupLiveGameSection() {
    const gameSelect = document.getElementById('live-game-select');
    const toolsContainer = document.getElementById('live-game-tools-container');
    const submitArea = document.getElementById('live-game-submit-area');

    // Populate game select from config (optional, if not hardcoded in HTML and populateSelectWithOptions is available)
    // Example: if (typeof populateSelectWithOptions === 'function') populateSelectWithOptions(gameSelect, gameTypesConfig, '-- Select a Game --');

    gameSelect?.addEventListener('change', () => {
        const selectedGame = gameSelect.value;
        // Ensure loadLiveGameTools is accessible
        loadLiveGameTools(selectedGame, toolsContainer, submitArea);
    });

    // Listener for the submit button within the live game section
    document.getElementById('submit-live-game-score-btn')?.addEventListener('click', () => {
        const gameKey = document.getElementById('live-game-select')?.value;
        if (!gameKey) {
            alert("Please select a game first.");
            return;
        }
        // Get results from the current tools (ensure getLiveGameResults is accessible)
        const liveResults = getLiveGameResults(gameKey);

        // Add current player ID to results if logged in (ensure currentPlayer is accessible)
        if (currentPlayer && currentPlayer.id) {
            liveResults.playerId = currentPlayer.id; // Add player ID to the results object
            console.log("[Live Submit] Adding current player ID to results:", currentPlayer.id);
        } else {
            console.warn("[Live Submit] Cannot add player ID, currentPlayer not available.");
        }

        // Pass gameKey AND results to navigation function (ensure navigateToSubmitScore is accessible)
        navigateToSubmitScore(gameKey, liveResults); // Pass the updated results object
    });
} // End setupLiveGameSection

function loadLiveGameTools(gameKey, container, submitArea) {
    if (!container || !submitArea) return;

    container.innerHTML = ''; // Clear previous tools
    submitArea.style.display = 'none'; // Hide submit button initially

    if (!gameKey) {
        container.innerHTML = '<p class="text-gray-500 italic">Select a game to see available tools.</p>';
        return;
    }

    console.log(`Loading tools for: ${gameKey}`);
    let toolsHtml = '';

    // Define HTML templates for each game's tools
    switch (gameKey) {
        case 'golf':
            toolsHtml = `
                <div id="golf-tools">
                    <h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Live Golf Round</h3>
                    <div class="mb-6">
                        <label for="live-golf-course-select" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Select Course:</label>
                        <select id="live-golf-course-select" name="live-golf-course-select" class="shadow border rounded-lg w-full md:w-2/3 py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Select a Course --</option>
                        </select>
                    </div>
                    <div id="live-golf-scorecard-area" class="mt-4 border-t dark:border-gray-600 pt-4 hidden">
                        <h4 id="live-golf-course-name" class="text-lg font-medium mb-3 text-center dark:text-gray-200">Course Name</h4>
                        <div class="overflow-x-auto bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-inner">
                            <table class="w-full text-sm border-collapse border border-gray-300 dark:border-gray-600 min-w-[400px]">
                                <thead>
                                    <tr class="bg-gray-100 dark:bg-gray-600">
                                        <th class="border border-gray-300 dark:border-gray-500 p-2 dark:text-gray-200">Hole</th>
                                        <th class="border border-gray-300 dark:border-gray-500 p-2 dark:text-gray-200">Par</th>
                                        <th class="border border-gray-300 dark:border-gray-500 p-2 dark:text-gray-200">Score</th>
                                        <th class="border border-gray-300 dark:border-gray-500 p-2 dark:text-gray-200">Putts</th>
                                    </tr>
                                </thead>
                                <tbody id="live-golf-scorecard-body" class="dark:text-gray-300">
                                    <tr><td colspan="4" class="text-center p-4 text-gray-500 dark:text-gray-400 italic">Select a course to view scorecard.</td></tr>
                                </tbody>
                                <tfoot>
                                    <tr class="bg-gray-100 dark:bg-gray-600 font-semibold">
                                         <td class="border border-gray-300 dark:border-gray-500 p-2 text-center dark:text-gray-200">Total</td>
                                         <td id="live-golf-total-par" class="border border-gray-300 dark:border-gray-500 p-2 text-center dark:text-gray-200">-</td>
                                         <td id="live-golf-total-score" class="border border-gray-300 dark:border-gray-500 p-2 text-center dark:text-gray-200">-</td>
                                         <td id="live-golf-total-puts" class="border border-gray-300 dark:border-gray-500 p-2 text-center dark:text-gray-200">-</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>`;
            break;
        case 'pool':
            toolsHtml = `
                <div id="pool-tools" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="border dark:border-gray-600 p-4 rounded-lg">
                        <h3 class="text-lg font-semibold mb-3 dark:text-gray-200">Pool Score (Rounds)</h3>
                        <div id="pool-scoring-area" class="space-y-3">
                            <p class="text-sm mb-2 dark:text-gray-300">Game: <span id="pool-game-status">Best 2 out of 3</span></p>
                            <div class="flex items-center justify-between">
                                <label for="score-pool-p1" class="dark:text-gray-300">Player 1:</label>
                                <input type="number" id="score-pool-p1" value="0" min="0" class="border rounded px-2 py-1 score-input w-20 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
                            </div>
                            <div class="flex items-center justify-between">
                                <label for="score-pool-p2" class="dark:text-gray-300">Player 2:</label>
                                <input type="number" id="score-pool-p2" value="0" min="0" class="border rounded px-2 py-1 score-input w-20 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
                            </div>
                        </div>
                        <button id="pool-next-round-btn" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm w-full">Record Round Winner</button>
                    </div>

                    <div class="border dark:border-gray-600 p-4 rounded-lg">
                        <h3 class="text-lg font-semibold mb-3 dark:text-gray-200">Timer</h3>
                        <div id="pool-timer-display" class="timer-display text-center dark:text-gray-100">00:00</div>
                        <div class="mb-3 flex justify-center space-x-4">
                             <label class="inline-flex items-center dark:text-gray-300">
                                 <input type="radio" name="pool-timer-mode" value="up" checked class="form-radio text-indigo-600 dark:bg-gray-500"> <span class="ml-1 text-sm">Count Up</span>
                             </label>
                             <label class="inline-flex items-center dark:text-gray-300">
                                 <input type="radio" name="pool-timer-mode" value="down" class="form-radio text-indigo-600 dark:bg-gray-500"> <span class="ml-1 text-sm">Count Down</span>
                             </label>
                        </div>
                        <div id="pool-timer-settings-down" class="mb-3 hidden text-center">
                              <label for="pool-timer-start-minutes" class="text-sm mr-1 dark:text-gray-300">Mins:</label>
                              <input type="number" id="pool-timer-start-minutes" value="5" min="1" class="border rounded px-2 py-1 w-16 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
                        </div>
                        <div class="flex justify-center space-x-2">
                            <button id="pool-timer-start" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">Start</button>
                            <button id="pool-timer-pause" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm">Pause</button>
                            <button id="pool-timer-reset" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">Reset</button>
                        </div>
                    </div>

                    <div class="border dark:border-gray-600 p-4 rounded-lg text-center md:col-span-2">
                        <h3 class="text-lg font-semibold mb-3 dark:text-gray-200">Coin Flip (for Break/Turn)</h3>
                        <div id="pool-coin-result" class="text-4xl font-bold my-4 dark:text-gray-100">🪙</div>
                        <button id="pool-flip-coin-btn" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm">Flip Coin</button>
                    </div>
                </div>`;
            break;
        case 'chess':
             toolsHtml = `
                <div id="chess-tools">
                    <h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Chess Timers</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="border dark:border-gray-600 p-4 rounded-lg text-center">
                            <h4 class="text-lg font-medium mb-2 dark:text-gray-200">Player 1 Clock</h4>
                            <div id="chess-timer-p1" class="timer-display dark:text-gray-100">10:00</div>
                            <button id="chess-switch-p1" class="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm w-full mt-2">Switch to Player 2</button>
                        </div>
                        <div class="border dark:border-gray-600 p-4 rounded-lg text-center">
                            <h4 class="text-lg font-medium mb-2 dark:text-gray-200">Player 2 Clock</h4>
                            <div id="chess-timer-p2" class="timer-display dark:text-gray-100">10:00</div>
                            <button id="chess-switch-p2" class="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm w-full mt-2" disabled>Switch to Player 1</button>
                        </div>
                        <div class="md:col-span-2 border dark:border-gray-600 p-4 rounded-lg">
                            <h4 class="text-lg font-medium mb-3 text-center dark:text-gray-200">Game Controls</h4>
                            <div class="flex justify-center space-x-2">
                                <button id="chess-timer-start" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">Start Game</button>
                                <button id="chess-timer-pause" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm">Pause</button>
                                <button id="chess-timer-reset" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">Reset Clocks</button>
                            </div>
                            <div class="mt-3 text-center">
                                 <label for="chess-time-control" class="text-sm mr-1 dark:text-gray-300">Time (mins):</label>
                                 <input type="number" id="chess-time-control" value="10" min="1" class="border rounded px-2 py-1 w-16 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
                            </div>
                        </div>
                    </div>
                </div>`;
            break;
        case 'board_game': // Generic board game
            toolsHtml = `
                 <div id="board_game-tools" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="border dark:border-gray-600 p-4 rounded-lg text-center">
                        <h3 class="text-lg font-semibold mb-3 dark:text-gray-200">Dice Roller</h3>
                        <div id="board-dice-result" class="dice-result dark:text-gray-100">🎲</div>
                        <button id="board-roll-dice-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm">Roll Dice</button>
                    </div>

                    <div class="border dark:border-gray-600 p-4 rounded-lg text-center">
                        <h3 class="text-lg font-semibold mb-3 dark:text-gray-200">Coin Flip</h3>
                        <div id="board-coin-result" class="text-4xl font-bold my-4 dark:text-gray-100">🪙</div>
                        <button id="board-flip-coin-btn" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm">Flip Coin</button>
                    </div>

                    <div class="border dark:border-gray-600 p-4 rounded-lg md:col-span-2">
                        <h3 class="text-lg font-semibold mb-3 dark:text-gray-200">Simple Timer</h3>
                        <div id="board-timer-display" class="timer-display text-center dark:text-gray-100">00:00</div>
                        <div class="mb-3 flex justify-center space-x-4">
                             <label class="inline-flex items-center dark:text-gray-300">
                                 <input type="radio" name="board-timer-mode" value="up" checked class="form-radio text-indigo-600 dark:bg-gray-500"> <span class="ml-1 text-sm">Count Up</span>
                             </label>
                             <label class="inline-flex items-center dark:text-gray-300">
                                 <input type="radio" name="board-timer-mode" value="down" class="form-radio text-indigo-600 dark:bg-gray-500"> <span class="ml-1 text-sm">Count Down</span>
                             </label>
                        </div>
                        <div id="board-timer-settings-down" class="mb-3 hidden text-center">
                              <label for="board-timer-start-minutes" class="text-sm mr-1 dark:text-gray-300">Mins:</label>
                              <input type="number" id="board-timer-start-minutes" value="15" min="1" class="border rounded px-2 py-1 w-16 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200">
                        </div>
                        <div class="flex justify-center space-x-2">
                            <button id="board-timer-start" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">Start</button>
                            <button id="board-timer-pause" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm">Pause</button>
                            <button id="board-timer-reset" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">Reset</button>
                        </div>
                    </div>
                </div>`;
            break;
        default:
            toolsHtml = '<p class="text-gray-500 dark:text-gray-400 italic">No specific tools configured for this game.</p>';
    }

    container.innerHTML = toolsHtml;
    submitArea.style.display = 'block'; // Show the submit button area

    // Re-attach listeners for dynamically added elements
    // Ensure attachDynamicToolListeners is accessible
    attachDynamicToolListeners(gameKey);
} // End loadLiveGameTools


function attachDynamicToolListeners(gameKey) {
    console.log(`Attaching listeners for ${gameKey} tools`);

    switch (gameKey) {
        case 'pool':
            document.getElementById('pool-timer-start')?.addEventListener('click', startPoolTimer);
            document.getElementById('pool-timer-pause')?.addEventListener('click', pausePoolTimer);
            document.getElementById('pool-timer-reset')?.addEventListener('click', resetPoolTimer);
            document.querySelectorAll('input[name="pool-timer-mode"]').forEach(radio => {
                 radio.addEventListener('change', (e) => {
                    document.getElementById('pool-timer-settings-down').classList.toggle('hidden', e.target.value !== 'down');
                 });
            });
            document.getElementById('pool-flip-coin-btn')?.addEventListener('click', flipPoolCoin);
            document.getElementById('pool-next-round-btn')?.addEventListener('click', () => alert('Pool round scoring not implemented'));
            break;
        case 'chess':
             document.getElementById('chess-timer-start')?.addEventListener('click', () => alert('Chess timer start not implemented'));
             document.getElementById('chess-timer-pause')?.addEventListener('click', () => alert('Chess timer pause not implemented'));
             document.getElementById('chess-timer-reset')?.addEventListener('click', () => alert('Chess timer reset not implemented'));
             document.getElementById('chess-switch-p1')?.addEventListener('click', () => alert('Chess switch P1 not implemented'));
             document.getElementById('chess-switch-p2')?.addEventListener('click', () => alert('Chess switch P2 not implemented'));
            break;
        case 'board_game':
             document.getElementById('board-timer-start')?.addEventListener('click', startBoardTimer);
             document.getElementById('board-timer-pause')?.addEventListener('click', pauseBoardTimer);
             document.getElementById('board-timer-reset')?.addEventListener('click', resetBoardTimer);
             document.querySelectorAll('input[name="board-timer-mode"]').forEach(radio => {
                 radio.addEventListener('change', (e) => {
                    document.getElementById('board-timer-settings-down').classList.toggle('hidden', e.target.value !== 'down');
                 });
             });
             document.getElementById('board-roll-dice-btn')?.addEventListener('click', rollBoardDice);
             document.getElementById('board-flip-coin-btn')?.addEventListener('click', flipBoardCoin);
            break;
        case 'golf':
            // Ensure golf helper functions are accessible
            populateLiveGolfCourseSelect(); // Fetch courses and fill the dropdown
            const courseSelect = document.getElementById('live-golf-course-select');
            courseSelect?.addEventListener('change', handleLiveGolfCourseSelect); // Add listener for course selection
            // Scorecard input listeners are added/handled within handleLiveGolfCourseSelect/updateLiveGolfTotals
            break;
    }
} // End attachDynamicToolListeners

// --- Live Game Result Gathering ---

/**
 * Retrieves the final results from the currently displayed live game tools.
 * @param {string} gameKey - The key of the game currently selected (e.g., 'golf', 'pool').
 * @returns {object} An object containing results like score, courseId, holesPlayed, holeScores.
 */
 function getLiveGameResults(gameKey) {
    let results = {
        score: null,
        courseId: null,
        holesPlayed: null, // Default or common value
        holeScores: null, // Add properties for golf details
        // Add other game-specific result properties here if needed
        playerId: null // Will be added by the caller if available
    };
    console.log(`[Live Results] Getting results for game: ${gameKey}`);

    switch (gameKey) {
        case 'golf':
            const totalScoreEl = document.getElementById('live-golf-total-score');
            const scoreValue = totalScoreEl?.textContent;
            if (scoreValue && scoreValue !== '-' && !isNaN(parseInt(scoreValue))) {
                results.score = scoreValue; // Store as string initially, might be parsed later
            } else {
                 console.warn("[Live Results] Golf score not found or invalid in #live-golf-total-score.");
            }

            results.courseId = document.getElementById('live-golf-course-select')?.value || null;

            // Assuming holesPlayed is implicitly 18 for live golf, or you add radio buttons later
            // If you add radio buttons like in the submit form, get the value here:
            // const holesRadios = document.querySelectorAll('#golf-tools input[name="live-golf-holes-played"]');
            // results.holesPlayed = Array.from(holesRadios).find(radio => radio.checked)?.value || '18';
            results.holesPlayed = '18'; // Defaulting for now

            // Get hole scores if they exist
            const holeScoreInputs = document.querySelectorAll('#live-golf-scorecard-body .score-input');
            if (holeScoreInputs.length > 0) {
                results.holeScores = {};
                holeScoreInputs.forEach(input => {
                    const holeNum = input.getAttribute('data-hole');
                    const score = parseInt(input.value, 10);
                    if (holeNum && !isNaN(score) && score > 0) {
                        results.holeScores[`hole_${holeNum}`] = score; // Store as hole_1, hole_2 etc.
                    }
                });
                if (Object.keys(results.holeScores).length === 0) {
                    results.holeScores = null; // Set back to null if no valid scores entered
                }
            }
            break;

        case 'pool':
            const p1ScoreEl = document.getElementById('score-pool-p1');
            const p2ScoreEl = document.getElementById('score-pool-p2');
            const p1Score = p1ScoreEl?.value;
            const p2Score = p2ScoreEl?.value;
            if (p1Score && p2Score && !isNaN(parseInt(p1Score)) && !isNaN(parseInt(p2Score)) ) {
                 results.score = `${p1Score}-${p2Score}`; // Format as string score
            } else {
                 console.warn("[Live Results] Pool scores not found or invalid.");
            }
            // Add other pool results if needed (e.g., time elapsed)
            break;

        case 'chess':
            // Get remaining time? Or just mark as completed?
            results.score = null; // Chess outcome often decided differently than score
            break;

        case 'board_game':
            // Potentially get timer value or other results
            results.score = null; // Often no score in simple board game tools
            break;

        default:
            console.log(`[Live Results] No specific result gathering implemented for ${gameKey}`);
            results.score = null;
    }

    console.log("[Live Results] Gathered results:", results);
    return results;
} // End getLiveGameResults


// --- Live Golf Tool Specific Functions ---

// Cache for fetched course data to avoid re-fetching
let liveGolfCourseDataCache = {};

// Fetches courses and populates the dropdown in the live golf section
async function populateLiveGolfCourseSelect() {
    const selectElement = document.getElementById('live-golf-course-select');
    // Ensure db is accessible
    if (!selectElement || !db) {
        console.warn("[Live Golf] Course select element or DB not found.");
        if (selectElement) selectElement.innerHTML = '<option value="">Error loading courses</option>';
        return;
    }
    console.log("[Live Golf] Populating course select...");
    selectElement.innerHTML = '<option value="">Loading Courses...</option>';

    try {
        // Requires Firestore index: golf_courses: name (asc)
        const snapshot = await db.collection('golf_courses').orderBy('name').get();
        selectElement.innerHTML = '<option value="">-- Select a Course --</option>';

        if (snapshot.empty) {
            console.warn("[Live Golf] No golf courses found in Firestore.");
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
} // End populateLiveGolfCourseSelect

// Handles selection of a course, fetches par data, and updates the scorecard UI
function handleLiveGolfCourseSelect() {
    const selectElement = document.getElementById('live-golf-course-select');
    const scorecardArea = document.getElementById('live-golf-scorecard-area');
    const scorecardBody = document.getElementById('live-golf-scorecard-body');
    const courseNameEl = document.getElementById('live-golf-course-name');
    const totalParEl = document.getElementById('live-golf-total-par');
    // Removed elements no longer used in the updateLiveGolfTotals logic shown:
    // const totalScoreEl = document.getElementById('live-golf-total-score');
    // const totalPutsEl = document.getElementById('live-golf-total-puts');

    if (!selectElement || !scorecardArea || !scorecardBody || !courseNameEl || !totalParEl) {
        console.error("[Live Golf] Scorecard elements not found.");
        return;
    }

    const selectedCourseId = selectElement.value;

    if (!selectedCourseId) {
        scorecardArea.classList.add('hidden');
        scorecardBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-gray-500 dark:text-gray-400 italic">Select a course to view scorecard.</td></tr>';
        return;
    }

    console.log(`[Live Golf] Course selected: ${selectedCourseId}`);
    const courseData = liveGolfCourseDataCache[selectedCourseId];
    if (!courseData) {
        console.error(`[Live Golf] Course data not found in cache for ID: ${selectedCourseId}`);
        alert("Error: Could not retrieve course details. Please refresh and try again.");
        scorecardArea.classList.add('hidden');
        return;
    }

    // Update UI
    courseNameEl.textContent = courseData.name || 'Unnamed Course';
    const totalPar = courseData.total_par || 0;
    totalParEl.textContent = totalPar || '-';
    scorecardBody.innerHTML = ''; // Clear previous

    // Assume 18 holes for live play scorecard generation
    const avgPar = totalPar > 0 ? Math.round(totalPar / 18) : '?';
    for (let i = 1; i <= 18; i++) {
        const tr = document.createElement('tr');
        tr.className = 'text-center';
        const parForHole = avgPar; // Placeholder - ideally use per-hole par data if available
        tr.innerHTML = `
            <td class="border border-gray-300 dark:border-gray-600 p-2 font-medium">${i}</td>
            <td class="border border-gray-300 dark:border-gray-600 p-2 par-cell">${parForHole}</td>
            <td class="border border-gray-300 dark:border-gray-600 p-2"><input type="number" class="w-16 p-1 border rounded text-center score-input dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200" data-hole="${i}" min="1"></td>
            <td class="border border-gray-300 dark:border-gray-600 p-2"><input type="number" class="w-16 p-1 border rounded text-center puts-input dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200" data-hole="${i}" min="0"></td>
        `;
        scorecardBody.appendChild(tr);
    }

    // Add listener to update totals
    scorecardBody.removeEventListener('input', updateLiveGolfTotals); // Remove previous listener first
    scorecardBody.addEventListener('input', updateLiveGolfTotals);
    updateLiveGolfTotals(); // Initial calculation

    scorecardArea.classList.remove('hidden'); // Show the scorecard
} // End handleLiveGolfCourseSelect

// Calculates and updates the total row in the live scorecard
function updateLiveGolfTotals() {
    const scorecardBody = document.getElementById('live-golf-scorecard-body');
    const totalScoreEl = document.getElementById('live-golf-total-score');
    const totalPutsEl = document.getElementById('live-golf-total-puts');

    if (!scorecardBody || !totalScoreEl || !totalPutsEl) return;

    let currentTotalScore = 0;
    let currentTotalPuts = 0;

    scorecardBody.querySelectorAll('.score-input').forEach(input => {
        const score = parseInt(input.value, 10);
        if (!isNaN(score) && score > 0) {
            currentTotalScore += score;
        }
    });

    scorecardBody.querySelectorAll('.puts-input').forEach(input => {
        const puts = parseInt(input.value, 10);
        if (!isNaN(puts) && puts >= 0) {
            currentTotalPuts += puts;
        }
    });

    totalScoreEl.textContent = currentTotalScore > 0 ? currentTotalScore : '-';
    totalPutsEl.textContent = currentTotalPuts >= 0 ? currentTotalPuts : '-'; // Show 0 if applicable

} // End updateLiveGolfTotals

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
    const mode = document.querySelector('input[name="pool-timer-mode"]:checked')?.value || 'up';
    if (mode === 'down' && poolTimerSeconds <= 0) {
        const minutesInput = document.getElementById('pool-timer-start-minutes');
        poolCountdownStartSeconds = (parseInt(minutesInput?.value, 10) || 5) * 60;
        poolTimerSeconds = poolCountdownStartSeconds;
        if (poolTimerSeconds <= 0) { alert("Set countdown time."); poolTimerRunning = false; return; }
    }
    updatePoolTimerDisplay();
    poolTimerInterval = setInterval(() => {
        if (mode === 'up') poolTimerSeconds++;
        else {
            poolTimerSeconds--;
            if (poolTimerSeconds < 0) {
                clearInterval(poolTimerInterval); poolTimerRunning = false; poolTimerSeconds = 0;
                alert("Pool time's up!");
                // Add sound effect here?
            }
        }
        updatePoolTimerDisplay();
    }, 1000);
}
function pausePoolTimer() { clearInterval(poolTimerInterval); poolTimerRunning = false; }
function resetPoolTimer() {
    clearInterval(poolTimerInterval); poolTimerRunning = false;
    const mode = document.querySelector('input[name="pool-timer-mode"]:checked')?.value || 'up';
    const minutesInput = document.getElementById('pool-timer-start-minutes');
    countdownStartSeconds = (parseInt(minutesInput?.value, 10) || 5) * 60; // Update start seconds on reset
    poolTimerSeconds = (mode === 'down' && countdownStartSeconds > 0) ? countdownStartSeconds : 0;
    updatePoolTimerDisplay();
}

// Pool Coin Flip
function flipPoolCoin() {
    const resultEl = document.getElementById('pool-coin-result');
    if (!resultEl) return;
    const outcomes = ['Heads', 'Tails']; // More descriptive than emoji only
    resultEl.textContent = 'Flipping...'; // Indicate activity
    // Basic animation
    resultEl.classList.add('animate-pulse');
    setTimeout(() => {
        resultEl.textContent = outcomes[Math.floor(Math.random() * outcomes.length)];
        resultEl.classList.remove('animate-pulse');
    }, 300); // Short delay for effect
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
    const mode = document.querySelector('input[name="board-timer-mode"]:checked')?.value || 'up';
    if (mode === 'down' && boardTimerSeconds <= 0) {
        const minutesInput = document.getElementById('board-timer-start-minutes');
        boardCountdownStartSeconds = (parseInt(minutesInput?.value, 10) || 15) * 60;
        boardTimerSeconds = boardCountdownStartSeconds;
        if(boardTimerSeconds <= 0){ alert("Set countdown time."); boardTimerRunning = false; return; }
    }
    updateBoardTimerDisplay();
    boardTimerInterval = setInterval(() => {
        if (mode === 'up') boardTimerSeconds++;
        else {
            boardTimerSeconds--;
            if (boardTimerSeconds < 0) {
                clearInterval(boardTimerInterval); boardTimerRunning = false; boardTimerSeconds = 0;
                alert("Board game time's up!");
                // Add sound effect?
            }
        }
        updateBoardTimerDisplay();
    }, 1000);
}
function pauseBoardTimer() { clearInterval(boardTimerInterval); boardTimerRunning = false; }
function resetBoardTimer() {
    clearInterval(boardTimerInterval); boardTimerRunning = false;
    const mode = document.querySelector('input[name="board-timer-mode"]:checked')?.value || 'up';
    const minutesInput = document.getElementById('board-timer-start-minutes');
    boardCountdownStartSeconds = (parseInt(minutesInput?.value, 10) || 15) * 60; // Update start seconds on reset
    boardTimerSeconds = (mode === 'down' && boardCountdownStartSeconds > 0) ? boardCountdownStartSeconds : 0;
    updateBoardTimerDisplay();
}

// Board Game Dice Roll
function rollBoardDice() {
    const diceResultEl = document.getElementById('board-dice-result');
    if (!diceResultEl) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    diceResultEl.textContent = 'Rolling...';
    diceResultEl.classList.add('animate-spin'); // Simple animation
     setTimeout(() => {
        diceResultEl.textContent = diceFaces[roll - 1];
        diceResultEl.classList.remove('animate-spin');
    }, 500); // Animation duration
}

// Board Game Coin Flip (can reuse Pool version or keep separate)
function flipBoardCoin() {
    const resultEl = document.getElementById('board-coin-result');
    if (!resultEl) return;
     const outcomes = ['Heads', 'Tails'];
    resultEl.textContent = 'Flipping...';
    resultEl.classList.add('animate-pulse');
    setTimeout(() => {
        resultEl.textContent = outcomes[Math.floor(Math.random() * outcomes.length)];
        resultEl.classList.remove('animate-pulse');
    }, 300);
}

// Note: Ensure that shared variables like 'db', 'currentPlayer', and functions like
// 'navigateToSubmitScore', 'populateSelectWithOptions' are accessible in the global scope
// or are properly imported/passed when using a module system.