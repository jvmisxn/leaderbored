// --- sports_management.js --- // Renamed from golf_courses.js
console.log("[Sports Management] sports_management.js starting execution."); // <-- Add log

// Cache for fetched course data
let globalGolfCourseCache = {};

// ... existing code ...

/**
 * Populates the main list of all available sports/activities.
 */
async function populateAllSportsList() {
    console.log("[SPORTS/ALL] Attempting to populate all sports list..."); // Added log
    const listElement = document.getElementById('all-sports-list'); // Use the correct ID from the template
    if (!listElement) {
        console.error("[SPORTS/ALL] Container element #all-sports-list not found.");
        return;
    }

    listElement.innerHTML = '<p class="loading-text col-span-full text-center py-5">Loading activities...</p>';

    try {
        // Ensure game configs are loaded
        if (!window.globalGameConfigs) {
            console.log("[SPORTS/ALL] Game configs not found, attempting to fetch...");
            if (typeof fetchAndCacheGameConfigs === 'function') {
                await fetchAndCacheGameConfigs();
                console.log("[SPORTS/ALL] Game configs fetch attempt complete.");
            } else {
                throw new Error("fetchAndCacheGameConfigs function is not available.");
            }
        }

        // Check again after attempting fetch
        const configs = window.globalGameConfigs;
        console.log("[SPORTS/ALL] Game configs available:", !!configs); // Added log

        if (!configs || typeof configs !== 'object' || Object.keys(configs).length === 0) {
            console.error("[SPORTS/ALL] window.globalGameConfigs is not available or not an object after fetch attempt.");
            // Ensure loading message is replaced if fetch failed after showing loading
            if (!listElement.querySelector('.error-text')) {
                 listElement.innerHTML = '<p class="error-text col-span-full text-center py-5">Error loading activities configuration data.</p>';
            }
            // Still ensure auth visibility is handled below
        } else {
            console.log("[SPORTS/ALL] Populating all sports list using window.globalGameConfigs...");
            listElement.innerHTML = ''; // Clear loading message or previous error

            const sortedGames = Object.entries(configs) // Use the fetched configs
                .map(([key, config]) => ({ key, name: config.name || key })) // Ensure name exists
                .sort((a, b) => a.name.localeCompare(b.name));

            if (sortedGames.length === 0) {
                listElement.innerHTML = '<p class="muted-text col-span-full text-center py-5">No activities configured yet.</p>';
            } else {
                sortedGames.forEach(({ key, name }) => {
                    const div = document.createElement('div');
                    div.className = 'sport-card bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow duration-200 overflow-hidden'; // Added sport-card class
                    // Link the whole card
                    div.innerHTML = `
                        <a href="#sport-details-section?sport=${key}" class="block p-4">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${name}</h3>
                            <!-- Add more details here if needed, e.g., icon -->
                        </a>
                    `;
                    listElement.appendChild(div);
                });
                console.log(`[SPORTS/ALL] Populated list with ${sortedGames.length} sports.`); // Added log
            }
        }

        // Update auth visibility for admin-only elements within this section if needed
        if (typeof handleAuthChange === 'function' && typeof auth !== 'undefined') {
            handleAuthChange(auth.currentUser);
        }

    } catch (error) {
        console.error("[SPORTS/ALL] Error populating sports list:", error);
        listElement.innerHTML = `<p class="error-text col-span-full text-center py-5">Error loading activities: ${error.message}</p>`;
    }
}
console.log("[Sports Management] populateAllSportsList defined:", typeof populateAllSportsList); // <-- Add log

/**
 * Opens the modal to add a new sport/activity.
 */
function openAddSportModal() {
    const modalElement = document.getElementById('add-sport-modal');
    if (!modalElement) { console.error("Add Sport modal element (#add-sport-modal) not found."); return; }
    if (!db) { console.error("Add Sport modal: DB not ready."); alert("Database connection error."); return; }

    // Define and Inject the HTML content for the Add Sport modal
    const modalContentHTML = `
        <div class="modal-content max-w-lg">
            <button id="close-add-sport-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Add New Sport/Activity</h2>
            <form id="add-sport-form">
                <div class="mb-4">
                    <label for="sport-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Sport Name <span class="text-red-500">*</span></label>
                    <input type="text" id="sport-name" name="sport-name" class="input-field w-full" required placeholder="e.g., Table Tennis, Chess, Cornhole">
                </div>
                <div class="mb-4">
                    <label for="sport-description" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Description (Optional):</label>
                    <textarea id="sport-description" name="sport-description" class="input-field w-full h-20" placeholder="Briefly describe the activity or rules link location"></textarea>
                </div>
                 <div class="mb-4">
                    <label for="sport-rules-url" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Rules URL (Optional):</label>
                    <input type="url" id="sport-rules-url" name="sport-rules-url" class="input-field w-full" placeholder="https://example.com/rules">
                </div>

                <fieldset class="mb-5 border dark:border-gray-600 p-3 rounded">
                     <legend class="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Supported Formats <span class="text-red-500">*</span></legend>
                     <div class="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="sport-supports-1v1" name="sport-supports-1v1" class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-500 dark:border-gray-400">
                            <span class="text-gray-700 dark:text-gray-300 text-sm">1 vs 1</span>
                        </label>
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="sport-supports-teams" name="sport-supports-teams" class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-500 dark:border-gray-400">
                            <span class="text-gray-700 dark:text-gray-300 text-sm">Teams</span>
                        </label>
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="sport-supports-solo" name="sport-supports-solo" class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-500 dark:border-gray-400">
                            <span class="text-gray-700 dark:text-gray-300 text-sm">Single Player (Score-based)</span>
                        </label>
                     </div>
                     <p id="format-error" class="text-red-500 text-xs mt-1 h-3"></p>
                </fieldset>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="sport-ranking-system" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Ranking System:</label>
                        <select id="sport-ranking-system" name="sport-ranking-system" class="input-field w-full">
                            <option value="elo" selected>Elo Rating (for 1v1/Teams)</option>
                            <option value="handicap">Handicap (e.g., Golf)</option>
                            <option value="points">Cumulative Points</option>
                            <option value="none">None (Manual Outcome Only)</option>
                        </select>
                    </div>
                    <div>
                        <label for="sport-scoring-goal" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Scoring Goal:</label>
                        <select id="sport-scoring-goal" name="sport-scoring-goal" class="input-field w-full">
                            <option value="high_score" selected>High Score Wins</option>
                            <option value="low_score">Low Score Wins (e.g., Golf)</option>
                            <option value="target_score">Reach Target Score</option>
                            <option value="time">Fastest Time Wins</option>
                            <option value="manual">Manual Outcome (Win/Loss/Draw)</option>
                        </select>
                    </div>
                </div>
                 <div class="mb-4">
                    <label for="sport-score-unit" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Score Unit (Optional):</label>
                    <input type="text" id="sport-score-unit" name="sport-score-unit" class="input-field w-full" placeholder="e.g., points, strokes, seconds, goals">
                </div>

                 <p id="add-sport-error" class="text-red-500 text-sm mt-2 h-4"></p>
                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="cancel-add-sport-modal-btn" class="button button-secondary">Cancel</button>
                    <button type="submit" class="button button-primary">Add Sport</button>
                </div>
            </form>
        </div>`;
    modalElement.innerHTML = modalContentHTML;

    // Attach listeners *after* injecting HTML
    modalElement.querySelector('#close-add-sport-modal-btn')?.addEventListener('click', closeAddSportModal);
    modalElement.querySelector('#cancel-add-sport-modal-btn')?.addEventListener('click', closeAddSportModal);
    modalElement.querySelector('#add-sport-form')?.addEventListener('submit', handleAddSportSubmit);

    // Validate format selection on submit
    const form = modalElement.querySelector('#add-sport-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            const supports1v1 = form.querySelector('#sport-supports-1v1').checked;
            const supportsTeams = form.querySelector('#sport-supports-teams').checked;
            const supportsSolo = form.querySelector('#sport-supports-solo').checked;
            const formatErrorElement = form.querySelector('#format-error');
            if (!supports1v1 && !supportsTeams && !supportsSolo) {
                e.preventDefault(); // Stop submission
                if (formatErrorElement) formatErrorElement.textContent = "Select at least one supported format.";
            } else {
                 if (formatErrorElement) formatErrorElement.textContent = ""; // Clear error if valid
            }
        });
    }


    openModal(modalElement); // Use generic openModal
}

/**
 * Closes the Add Sport modal.
 */
function closeAddSportModal() {
    const modalElement = document.getElementById('add-sport-modal');
    if (modalElement) closeModal(modalElement); // Use generic close
}

// ... other functions like populateGolfCourses, handleAddSportSubmit, etc. ...

/**
 * Handles the submission of the Add Sport form.
 */
async function handleAddSportSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorElement = form.querySelector('#add-sport-error'); // Ensure this ID exists in the modal HTML

    if (errorElement) errorElement.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    const formData = new FormData(form);
    const sportName = formData.get('sport-name')?.trim();
    const sportDescription = formData.get('sport-description')?.trim();
    const sportRulesUrl = formData.get('sport-rules-url')?.trim();
    const rankingSystem = formData.get('sport-ranking-system');
    const scoringGoal = formData.get('sport-scoring-goal');
    const scoreUnit = formData.get('sport-score-unit')?.trim();
    const supports1v1 = formData.get('sport-supports-1v1') === 'on';
    const supportsTeams = formData.get('sport-supports-teams') === 'on';
    const supportsSolo = formData.get('sport-supports-solo') === 'on';

    if (!sportName) {
        if (errorElement) errorElement.textContent = "Sport name is required.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Sport';
        return;
    }
    if (!rankingSystem || !scoringGoal) {
         if (errorElement) errorElement.textContent = "Ranking System and Scoring Goal are required.";
         submitButton.disabled = false;
         submitButton.textContent = 'Add Sport';
         return;
    }

    // Generate a Firestore-friendly key (lowercase, underscores)
    const sportKey = sportName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!sportKey) {
        if (errorElement) errorElement.textContent = "Could not generate a valid key from the sport name.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Sport';
        return;
    }

    const sportData = {
        name: sportName,
        description: sportDescription || null,
        rulesUrl: sportRulesUrl || null,
        rankingSystem: rankingSystem, // 'elo', 'handicap', 'points', 'none'
        scoringGoal: scoringGoal, // 'high_score', 'low_score', 'target_score', 'time', 'manual'
        scoreUnit: scoreUnit || null,
        supports_1v1: supports1v1,
        supports_teams: supportsTeams,
        supports_single_player: supportsSolo, // Firestore field name
        formats: [], // Start with empty formats array - could be expanded later
        date_created: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log(`[ADD SPORT] Attempting to add sport with key: ${sportKey}`, sportData);

    try {
        const docRef = db.collection('game_types').doc(sportKey);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            throw new Error(`A sport with the key "${sportKey}" (derived from "${sportName}") already exists.`);
        }

        await docRef.set(sportData);
        console.log(`[FIRESTORE] Sport "${sportName}" added successfully with key: ${sportKey}`);
        alert(`Sport "${sportName}" added successfully!`);

        closeAddSportModal(); // Close the modal

        // Invalidate cache and refresh config
        window.globalGameConfigs = null; // Clear cache
        await fetchAndCacheGameConfigs(); // Reload config

        // Refresh UI
        await populateAllSportsList(); // Refresh the sports grid

        // Refresh dropdowns that use game types
        console.log("[ADD SPORT] Refreshing game type dropdowns...");
        if (typeof populateGameTypeDropdown === 'function') {
            const submitGameSelect = document.getElementById('game-type-select');
            if (submitGameSelect) await populateGameTypeDropdown(submitGameSelect, 'Select Game Type...');
            const liveGameSelect = document.getElementById('live-game-type-select');
            if (liveGameSelect) await populateGameTypeDropdown(liveGameSelect, 'Select Game Type...');
        }
        // Refresh rankings filter specifically
        const rankingsFilterSelect = document.getElementById('rankings-game-filter');
        if (rankingsFilterSelect && typeof populateRankingsFilter === 'function') {
             await populateRankingsFilter();
        }


    } catch (error) {
        console.error("Error adding sport:", error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
    } finally {
        // Ensure button is re-enabled even if closing fails
        submitButton.disabled = false;
        submitButton.textContent = 'Add Sport';
    }
}

async function populateSportDetails(sportKey) {
    // ... existing code ...
}
console.log("[Sports Management] populateSportDetails defined:", typeof populateSportDetails); // <-- Add log

// Note: This file assumes that 'db', 'firebase', 'openModal', 'closeModal',
// 'populateLiveGolfCourseSelect', 'populateGolfCourseSelectForSubmit',
// 'gameTypesConfig', 'showSection'
// are initialized and accessible globally or imported.

console.log("[Sports Management] sports_management.js finished execution."); // <-- Add log
