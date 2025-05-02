// --- game_form_fields.js ---
// Shared form field generation for both live game and submit score

/**
 * Generates HTML for game-specific form fields based on the selected game type.
 * @param {string} gameKey - The key of the selected game (e.g., 'golf', 'pool_8ball').
 * @param {string} context - 'live' or 'submit'.
 * @returns {Promise<string>} - HTML string for the game-specific form fields.
 */
async function generateGameFormFieldsHTML(gameKey, context) {
    console.log(`[Game Fields] Generating ${context} form fields for ${gameKey}`);
    
    // Ensure configs are loaded
    if (!window.globalGameConfigs) {
        console.log(`[Game Fields] Configs not loaded, fetching...`);
        await fetchAndCacheGameConfigs();
    }
    
    // Get game config
    const config = window.globalGameConfigs[gameKey];
    if (!config) {
        return `<p class="error-text">Error: Configuration for ${gameKey} not found.</p>`;
    }
    
    // Shared elements for both live and submit contexts
    let fieldsHTML = '';
    
    // Date, time, & basic info fields (only for submit context)
    if (context === 'submit') {
        const now = new Date();
        // Format date for input: YYYY-MM-DDThh:mm
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        fieldsHTML += `
            <div class="mb-4">
                <label for="submit-date-played" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date & Time Played:</label>
                <input type="datetime-local" id="submit-date-played" name="date_played" class="input-field w-full" value="${formattedDate}" required>
            </div>
            <div class="mb-4">
                <label for="submit-duration" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (Optional):</label>
                <input type="text" id="submit-duration" name="duration" class="input-field w-full" placeholder="e.g., 45 minutes">
            </div>
            <div class="mb-4">
                <label for="submit-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional):</label>
                <textarea id="submit-notes" name="notes" class="input-field w-full h-20" placeholder="Any additional details about the game..."></textarea>
            </div>
        `;
    }
    
    // Game-specific form fields - switch based on game type
    switch(gameKey) {
        case 'golf':
            fieldsHTML += generateGolfFields(context);
            break;
        // Add other game types as needed
        default:
            // Generic score input for unspecified games
            fieldsHTML += `
                <div class="mb-4">
                    <label for="game-player1" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Player:</label>
                    <select id="game-player1" name="player_id" class="input-field w-full" required>
                        <option value="">Select Player</option>
                        <!-- Options populated by JS -->
                    </select>
                </div>
                <div class="mb-4">
                    <label for="game-score-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score:</label>
                    <input type="text" id="game-score-input" name="score" class="input-field w-full" required>
                </div>
            `;
    }
    
    return fieldsHTML;
}

/**
 * Generates golf-specific form fields.
 * @param {string} context - 'live' or 'submit'.
 * @returns {string} - HTML string for golf-specific form fields.
 */
function generateGolfFields(context) {
    const courseSelectID = context === 'live' ? 'live-golf-course-select' : 'game-golf-course-select';
    const holesSelectID = context === 'live' ? 'live-golf-holes-select' : 'game-golf-holes-select';
    const scoreInputID = context === 'live' ? 'live-golf-score-input' : 'game-golf-score-input';
    const holeInputsID = context === 'live' ? 'live-golf-hole-inputs' : 'game-golf-hole-inputs';
    const holeDetailsID = context === 'live' ? 'live-golf-hole-details' : 'game-golf-hole-details';

    // No player select needed in 'live' context form generation
    const playerSelectHTML = context === 'submit' ? `
        <div class="mb-4">
            <label for="game-player1-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Player:</label>
            <select id="game-player1-select" name="player_id" class="input-field w-full" required>
                <option value="">Select Player</option>
                <!-- Options populated by JS -->
            </select>
        </div>
    ` : '';

    // Course select is only needed in 'submit' context here, live uses index.html
    const courseSelectHTML = context === 'submit' ? `
        <div class="mb-4">
            <label for="${courseSelectID}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Golf Course:</label>
            <select id="${courseSelectID}" name="course_id" class="input-field w-full" required>
                <option value="">Loading Courses...</option>
                <!-- Options populated by JS -->
            </select>
        </div>
    ` : '';

    return `
        ${playerSelectHTML}
        ${courseSelectHTML}
        <div class="mb-4">
            <label for="${holesSelectID}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Holes Played:</label>
            <select id="${holesSelectID}" name="holes_played" class="input-field w-full" required>
                <option value="18">18 Holes</option>
                <option value="9">Front 9</option>
                <option value="9_back">Back 9</option>
            </select>
        </div>

        <!-- Container for hole-by-hole score inputs (only shown in submit context for now) -->
        ${context === 'submit' ? `
        <div id="${holeInputsID}" class="mb-4 border-t pt-4 mt-4">
             <h3 class="text-lg font-medium mb-3">Enter Scores Per Hole:</h3>
             <div id="${holeDetailsID}" class="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-3">
                 <!-- Hole inputs generated by JS -->
                 <p class="loading-text col-span-full">Loading hole inputs...</p>
             </div>
             <p id="golf-score-validation-error" class="text-red-500 text-sm mt-2 h-4"></p>
        </div>
        ` : ''}

         <!-- Simple total score input (can be used for live or as fallback) -->
         <div class="mb-4 ${context === 'submit' ? 'border-t pt-4 mt-4' : ''} ${context === 'live' ? 'hidden' : ''}">  <!-- Hide total score input in live context -->
             <label for="${scoreInputID}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Score (Gross):</label>
             <input type="number" id="${scoreInputID}" name="total_score" class="input-field w-full" min="1" placeholder="e.g., 72">
             <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the final gross score. If submitting hole-by-hole, this can be left blank.</p>
         </div>
    `;
}

/**
 * Generates hole input fields for golf score submission.
 * Includes Score, Putts, and Drive inputs per hole.
 * @param {HTMLElement} container - Container to populate with hole inputs
 * @param {number} holeCount - Number of holes (9 or 18)
 */
function generateGolfHoleInputs(container, holeCount) {
    if (!container) return;

    let html = '';
    // Use a single column layout, each hole gets a block
    html += `<div class="space-y-4">`; // Changed from grid to space-y

    for (let i = 1; i <= holeCount; i++) {
        html += `
            <div class="p-3 border rounded dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                <p class="font-medium text-sm mb-2">Hole ${i}</p>
                <div class="grid grid-cols-3 gap-3">
                    <div>
                        <label for="hole_${i}_score" class="block text-xs mb-1">Score:</label>
                        <input type="number" id="hole_${i}_score" name="hole_${i}_score" class="input-field-sm w-full" min="1" max="15">
                    </div>
                    <div>
                        <label for="hole_${i}_putts" class="block text-xs mb-1">Putts:</label>
                        <input type="number" id="hole_${i}_putts" name="hole_${i}_putts" class="input-field-sm w-full" min="0">
                    </div>
                    <div>
                        <label for="hole_${i}_drive" class="block text-xs mb-1">Drive (yds):</label>
                        <input type="number" id="hole_${i}_drive" name="hole_${i}_drive" class="input-field-sm w-full" min="0">
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Sets up the golf hole inputs when the holes selection changes.
 * @param {Event} event - The change event from the holes select element
 */
function setupSubmitGolfHoleInputs(event) {
    const holesSelect = event.target;
    const holeCount = parseInt(holesSelect.value, 10);

    // Find the hole inputs container - use parent context to support both live and submit
    // MODIFIED: Target the specific container within the holeInputsID div
    const form = holesSelect.closest('form') || holesSelect.closest('#live-game-specific-fields') || holesSelect.closest('#submit-past-game-section'); // Broader search
    const holeInputsContainerParent = form?.querySelector('#game-golf-hole-inputs') || form?.querySelector('#live-golf-hole-inputs'); // Find the outer div
    const holeDetailsContainer = holeInputsContainerParent?.querySelector('#game-golf-hole-details') || holeInputsContainerParent?.querySelector('#live-golf-hole-details'); // Find the inner div where inputs go

    if (!holeDetailsContainer) { // Check if the inner container was found
        console.error("[Golf] Hole details container (#game-golf-hole-details or #live-golf-hole-details) not found within parent.");
        // Optionally clear the parent container if it exists but the child doesn't
        if (holeInputsContainerParent) {
             holeInputsContainerParent.innerHTML = '<p class="error-text">Error finding hole input area.</p>';
        }
        return;
    }

    if (isNaN(holeCount) || (holeCount !== 9 && holeCount !== 18)) {
        holeDetailsContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Select number of holes to enter hole-by-hole scores</p>';
        return;
    }

    generateGolfHoleInputs(holeDetailsContainer, holeCount); // Pass the correct container
}

console.log("[Game Fields] game_form_fields.js loaded");
