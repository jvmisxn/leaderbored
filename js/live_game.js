// --- live_game.js ---

let liveGameTimerInterval = null;
let liveGameStartTime = null;
let liveGameElapsedTime = 0; // Store elapsed time in seconds
let isLiveGameTimerRunning = false;
let liveGameData = {}; // Store collected data
let currentLiveGame = null; // Holds the state of the active game

/**
 * Sets up the live game section, populating dropdowns and adding listeners.
 */
async function setupLiveGameSection() {
    console.log("[Live Game] Setting up live game section...");
    const gameTypeSelect = document.getElementById('live-game-type-select');
    const formFieldsContainer = document.getElementById('live-game-form-fields');
    const startGameButton = document.getElementById('start-live-game-btn');
    const liveGameDisplay = document.getElementById('live-game-display'); // Area to show ongoing game

    if (!gameTypeSelect || !formFieldsContainer || !startGameButton || !liveGameDisplay) {
        console.error("[Live Game] One or more essential elements not found for setup.");
        return;
    }

    // 1. Populate Game Type Dropdown (Ensure configs are ready first)
    try {
        // Use populateGameTypeSelect from ui_utils.js
        if (typeof populateGameTypeSelect === 'function') {
            // Await ensures configs are fetched if needed within populateGameTypeSelect
            await populateGameTypeSelect(gameTypeSelect, 'Select Game Type');
        } else {
            console.error("[Live Game] populateGameTypeSelect function not found."); // Updated function name
            gameTypeSelect.innerHTML = '<option value="">Error loading games</option>';
        }
    } catch (error) {
        console.error("[Live Game] Error populating game type dropdown:", error);
        gameTypeSelect.innerHTML = '<option value="">Error loading games</option>';
    }

    // 2. Add Listener for Game Type Change
    gameTypeSelect.removeEventListener('change', handleLiveGameTypeChange); // Prevent duplicates
    gameTypeSelect.addEventListener('change', handleLiveGameTypeChange);

    // 3. Add Listener for Start Game Button
    startGameButton.removeEventListener('click', handleStartLiveGame); // Prevent duplicates
    startGameButton.addEventListener('click', handleStartLiveGame);

    // 4. Initial State: Hide form fields and display area
    formFieldsContainer.innerHTML = ''; // Clear any previous fields
    formFieldsContainer.classList.add('hidden');
    startGameButton.classList.add('hidden');
    liveGameDisplay.classList.add('hidden');
    liveGameDisplay.innerHTML = ''; // Clear previous game display

    console.log("[Live Game] Setup complete. Waiting for game type selection.");
}

/**
 * Handles the change event when a game type is selected in the live game section.
 * Loads the appropriate form fields.
 */
async function handleLiveGameTypeChange() {
    const gameTypeSelect = document.getElementById('live-game-type-select');
    const gameKey = gameTypeSelect.value;
    const formFieldsContainer = document.getElementById('live-game-form-fields');
    const startGameButton = document.getElementById('start-live-game-btn');

    console.log(`[Live Game] Game type changed to: ${gameKey}`);
    liveGameData = { game_type: gameKey }; // Reset data with new game type

    // Clear previous content
    formFieldsContainer.innerHTML = '';
    formFieldsContainer.classList.add('hidden');
    startGameButton.classList.add('hidden');

    if (!gameKey) {
        console.log("[Live Game] No game type selected.");
        return;
    }

    try {
        // Ensure configs are loaded
        await fetchAndCacheGameConfigs();

        // Load specific data entry fields using the unified function with 'live' context
        if (typeof loadSubmitGameFormFields === 'function') {
            // Pass the formFieldsContainer element directly and 'live' context
            await loadSubmitGameFormFields(gameKey, formFieldsContainer, 'live');
            formFieldsContainer.classList.remove('hidden');
            startGameButton.classList.remove('hidden');
        } else {
            console.error("[Live Game] loadSubmitGameFormFields function not found.");
            formFieldsContainer.innerHTML = '<p class="error-text">Error loading game details fields.</p>';
        }
    } catch (error) {
        console.error(`[Live Game] Error handling game type change for ${gameKey}:`, error);
        formFieldsContainer.innerHTML = '<p class="error-text">Error loading game details.</p>';
    }
}

/**
 * Handles the click event to start a new live game session.
 */
async function handleStartLiveGame() {
    const liveGameDisplay = document.getElementById('live-game-display');
    const formFieldsContainer = document.getElementById('live-game-form-fields');
    const startGameButton = document.getElementById('start-live-game-btn');

    console.log("[Live Game] Starting live game...");
    liveGameDisplay.innerHTML = ''; // Clear previous game display
    liveGameDisplay.classList.remove('hidden');
    formFieldsContainer.classList.add('hidden');
    startGameButton.classList.add('hidden');

    // Initialize live game state
    currentLiveGame = { ...liveGameData, startTime: new Date() };
    console.log("[Live Game] Live game started:", currentLiveGame);

    // Update display area
    updateLiveGameDisplay();
}

/**
 * Updates the display area for the currently active live game.
 */
function updateLiveGameDisplay() {
    const liveGameDisplay = document.getElementById('live-game-display');
    if (!liveGameDisplay || !currentLiveGame) return;

    liveGameDisplay.innerHTML = `
        <h3>Live Game: ${currentLiveGame.game_type}</h3>
        <p>Started at: ${currentLiveGame.startTime}</p>
        <!-- Add more details as needed -->
    `;
}

/**
 * Ends the current live game and potentially prompts for score submission.
 */
function endLiveGame() {
    if (!currentLiveGame) {
        console.warn("[Live Game] No active game to end.");
        return;
    }

    console.log("[Live Game] Ending live game:", currentLiveGame);
    currentLiveGame = null;

    const liveGameDisplay = document.getElementById('live-game-display');
    if (liveGameDisplay) {
        liveGameDisplay.innerHTML = '<p>Game ended. You can now submit the score.</p>';
    }
}

// --- Golf Specific Live Game Functions ---

/**
 * Loads the specific form fields for Golf into the live game container.
 * Includes player selection and course selection.
 */
async function loadLiveGolfFields() {
    const formFieldsContainer = document.getElementById('live-game-form-fields');
    if (!formFieldsContainer) {
        console.error("[Live Game] Form fields container not found.");
        return;
    }

    formFieldsContainer.innerHTML = `
        <label for="live-game-golf-course-select">Select Golf Course:</label>
        <select id="live-game-golf-course-select"></select>
        <!-- Add more golf-specific fields here -->
    `;

    await populateLiveGolfCourseSelect();
}

/**
 * Populates the Golf Course dropdown in the live game section.
 */
async function populateLiveGolfCourseSelect() {
    const selectElement = document.getElementById('live-game-golf-course-select');
    if (!selectElement) {
        console.warn("[Live Game] Golf course select element (#live-game-golf-course-select) not found.");
        return;
    }
    if (!db) {
        console.error("[Live Game] DB not available for populating golf courses.");
        selectElement.innerHTML = '<option value="">Error loading courses (DB)</option>';
        return;
    }

    console.log("[Live Game] Populating golf course select...");
    selectElement.innerHTML = '<option value="">Loading Courses...</option>';

    try {
        if (typeof ensureGolfCourseCache === 'function') {
            await ensureGolfCourseCache();
        } else {
            console.error("[Live Game] ensureGolfCourseCache function not found.");
            throw new Error("Cache function missing.");
        }

        selectElement.innerHTML = '<option value="">-- Select a Course --</option>';

        if (!golfCourseCachePopulated || Object.keys(globalGolfCourseCache).length === 0) {
            selectElement.innerHTML = '<option value="">No courses found</option>';
            console.warn("[Live Game] Golf course cache is empty or not populated.");
            return;
        }

        const sortedCourses = Object.values(globalGolfCourseCache).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        sortedCourses.forEach(course => {
            const option = new Option(`${course.name} (Par ${course.total_par || 'N/A'})`, course.id);
            selectElement.add(option);
        });
        console.log(`[Live Game] Populated ${sortedCourses.length} golf courses from global cache.`);
    } catch (error) {
        console.error("[Live Game] Error populating golf courses:", error);
        selectElement.innerHTML = '<option value="">Error loading courses</option>';
    }
}

/**
 * Sets up the live scoring interface for Golf.
 */
function setupLiveGolfScoring() {
    // ...existing code...
}

/**
 * Updates the live Golf score display.
 */
function updateLiveGolfScoreDisplay() {
    // ...existing code...
}

/**
 * Ends the live Golf game and prepares results.
 */
function endLiveGolfGame() {
    // ...existing code...
}

// --- Other Game Specific Loaders (Example: Pool) ---
async function loadLivePoolFields() {
    const formFieldsContainer = document.getElementById('live-game-form-fields');
    if (!formFieldsContainer) {
        console.error("[Live Game] Form fields container not found.");
        return;
    }

    formFieldsContainer.innerHTML = `
        <label for="live-game-pool-table-select">Select Pool Table:</label>
        <select id="live-game-pool-table-select"></select>
        <!-- Add more pool-specific fields here -->
    `;

    // Populate pool-specific fields if needed
}

// --- Timer Functions ---

function startLiveGameTimer() {
    // ...existing code...
}

function stopLiveGameTimer() {
    // ...existing code...
}

function formatTime(seconds) {
    // ...existing code...
}

console.log("[Live Game] live_game.js loaded.");