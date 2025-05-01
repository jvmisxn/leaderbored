// --- ui_utils.js ---

// --- DOM Element References ---
let navLinks, loginForm, loginError, logoutButton,
    recordGameModal, openRecordGameModalBtn,
    addPlayerModal, openAddPlayerModalBtn,
    createTournamentModal, openCreateTournamentModalBtn,
    addGameModal, openAddGameModalBtn, addParticipantsModal,
    addCourseModal, openAddCourseModalBtn,
    golfRulesModal,
    playerInfoModal,
    editTournamentModal,
    manageTournamentsListContainer,
    darkModeToggle,
    bodyElement,
    mainContentContainer; // Keep reference

// Function to assign elements (called by main.js)
function assignElements() {
    navLinks = document.querySelectorAll('.nav-link');
    loginForm = document.getElementById('login-form');
    loginError = document.getElementById('login-error');
    logoutButton = document.getElementById('logout-button');

    // Modals and their trigger buttons
    recordGameModal = document.getElementById('record-game-modal');
    openRecordGameModalBtn = document.getElementById('open-record-game-modal-btn');
    addPlayerModal = document.getElementById('add-player-modal');
    openAddPlayerModalBtn = document.getElementById('open-add-player-modal-btn');
    createTournamentModal = document.getElementById('create-tournament-modal');
    openCreateTournamentModalBtn = document.getElementById('open-create-tournament-modal-btn');
    addGameModal = document.getElementById('add-game-modal');
    openAddGameModalBtn = document.getElementById('open-add-game-modal-btn');
    addParticipantsModal = document.getElementById('add-participants-modal');
    addCourseModal = document.getElementById('add-course-modal');
    openAddCourseModalBtn = document.getElementById('open-add-course-modal-btn');
    golfRulesModal = document.getElementById('golf-rules-modal');
    playerInfoModal = document.getElementById('player-info-modal');
    editTournamentModal = document.getElementById('edit-tournament-modal');

    // Other UI Areas
    manageTournamentsListContainer = document.getElementById('manage-tournaments-list-container');

    // Main Content Area
    mainContentContainer = document.getElementById('main-content');

    // Dark Mode
    darkModeToggle = document.getElementById('dark-mode-toggle');
    bodyElement = document.body;

    if (!mainContentContainer) console.error("Critical Error: Main content container (#main-content) not found!");
    if (!darkModeToggle) console.warn("Dark mode toggle (#dark-mode-toggle) not found.");
    if (!bodyElement) console.error("Critical Error: Body element not found!");

    console.log("[UI Utils] Elements assigned.");
}

// --- Mobile Navigation ---
/**
 * Toggles the visibility of the mobile navigation menu.
 * @param {boolean} [forceOpen] - If true, opens the menu. If false, closes it. If undefined, toggles.
 */
function toggleMobileMenu(forceOpen) {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (!menu || !overlay) {
        console.error("Mobile menu or overlay element not found.");
        return;
    }

    const isOpen = menu.classList.contains('open');
    const shouldOpen = forceOpen === undefined ? !isOpen : forceOpen;

    if (shouldOpen) {
        menu.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent background scroll when menu is open
    } else {
        menu.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = ''; // Restore background scroll
    }
}

/**
 * Sets up listeners for the mobile navigation (hamburger button, close button, overlay, links).
 */
function setupMobileNavListeners() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeBtn = document.getElementById('mobile-menu-close-btn');
    const overlay = document.getElementById('mobile-menu-overlay');
    const mobileMenu = document.getElementById('mobile-menu');

    hamburgerBtn?.addEventListener('click', () => toggleMobileMenu(true));
    closeBtn?.addEventListener('click', () => toggleMobileMenu(false));
    overlay?.addEventListener('click', () => toggleMobileMenu(false));

    // Add listener to close menu when a link inside it is clicked
    mobileMenu?.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => toggleMobileMenu(false));
    });

    console.log("[UI] Mobile navigation listeners attached.");
}

// --- Generic UI Utilities ---

// Store the overlay click handler to remove it later
let currentOverlayClickHandler = null;

/**
 * Opens a modal dialog.
 * Adds 'modal-active' class to the modal container and 'modal-open' to the body.
 * Adds a listener to close the modal when clicking the overlay.
 * @param {HTMLElement} modalElement - The modal container element.
 */
function openModal(modalElement) {
    if (!modalElement) {
        console.error("openModal: Provided modalElement is null or undefined.");
        return;
    }
    console.log(`[UI Modal] Opening modal: #${modalElement.id}`);
    modalElement.style.display = 'flex';
    console.log(`[UI Modal] Set display for #${modalElement.id} to:`, modalElement.style.display);

    // Use setTimeout to allow the display change to render before adding transition classes
    setTimeout(() => {
        modalElement.classList.add('modal-active');
        console.log(`[UI Modal] Added 'modal-active' class to #${modalElement.id}. Classes:`, modalElement.className);
        document.body.classList.add('modal-open');
        console.log("[UI Modal] Added 'modal-open' class to body.");

        // *** Add listener to close on overlay click ***
        // Define the handler within this scope to capture modalElement
        currentOverlayClickHandler = (event) => {
            // Check if the click target is the modal container itself (the overlay)
            if (event.target === modalElement) {
                console.log("[UI Modal] Clicked on overlay. Closing modal.");
                closeModal(modalElement);
            }
        };
        modalElement.addEventListener('click', currentOverlayClickHandler);
        console.log(`[UI Modal] Added overlay click listener for #${modalElement.id}.`);

    }, 10); // Small delay
}

/**
 * Closes a modal dialog. (Simplified for Debugging)
 * Removes 'modal-active' class, 'modal-open' from body, and sets display: none.
 * @param {HTMLElement} modalElement - The modal container element.
 */
function closeModal(modalElement) {
    console.log(`[UI Modal - closeModal DEBUG] Function called.`);
    if (!modalElement) {
        console.error("[UI Modal - closeModal DEBUG] Error: Provided modalElement is null or undefined.");
        return;
    }
    console.log(`[UI Modal - closeModal DEBUG] Attempting to close modal with ID: #${modalElement.id}`);
    console.log(`[UI Modal - closeModal DEBUG] Current classes on modal:`, modalElement.className);
    console.log(`[UI Modal - closeModal DEBUG] Current classes on body:`, document.body.className);

    modalElement.classList.remove('modal-active');
    document.body.classList.remove('modal-open');
    modalElement.style.display = 'none'; // Hide directly

    console.log(`[UI Modal - closeModal DEBUG] Removed 'modal-active' from #${modalElement.id}. New classes:`, modalElement.className);
    console.log(`[UI Modal - closeModal DEBUG] Removed 'modal-open' from body. New classes:`, document.body.className);
    console.log(`[UI Modal - closeModal DEBUG] Set display: none for #${modalElement.id}.`);

    // Remove overlay listener if it exists
    if (currentOverlayClickHandler) {
        modalElement.removeEventListener('click', currentOverlayClickHandler);
        console.log(`[UI Modal - closeModal DEBUG] Removed overlay click listener for #${modalElement.id}.`);
        currentOverlayClickHandler = null;
    } else {
        console.warn(`[UI Modal - closeModal DEBUG] No overlay click handler was stored for #${modalElement.id} to remove.`);
    }
}

/**
 * Toggles the visibility of the profile dropdown menu.
 */
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (!dropdown) { console.warn("[UI] Profile dropdown element (#profile-dropdown) not found."); return; }
    dropdown.classList.toggle('hidden');
    console.log("[UI] Toggled profile dropdown visibility.");
}

// --- Dark Mode Toggle Logic ---

/**
 * Applies the dark or light theme by toggling the 'dark' and 'light' classes on the <html> element.
 * @param {boolean} isDark - True to apply dark mode, false for light mode.
 */
function applyTheme(isDark) {
    console.log(`[Theme] applyTheme called with isDark: ${isDark}`);
    const htmlElement = document.documentElement;
    if (!htmlElement) {
        console.error("[Theme] Cannot apply theme: <html> element not found!");
        return;
    }
    const removing = isDark ? 'light' : 'dark';
    const adding = isDark ? 'dark' : 'light';
    htmlElement.classList.remove(removing);
    htmlElement.classList.add(adding);
    console.log(`[Theme] Applied theme. Removed '${removing}', Added '${adding}'. Current <html> classes:`, htmlElement.className);
}

/**
 * Initializes the dark mode based on saved preference or system settings,
 * and sets up the toggle switch listener.
 */
function initializeDarkMode() {
    console.log("[Theme] initializeDarkMode function started.");
    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) {
        console.warn("[Theme] Dark mode toggle switch (#dark-mode-toggle) not found.");
        return;
    }
    console.log("[Theme] Toggle switch found:", toggle);

    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    console.log("[Theme] localStorage 'theme':", savedTheme);

    // Check system preference if no saved theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log("[Theme] System prefers dark:", prefersDark);

    // Determine initial state
    const initialThemeIsDark = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    console.log("[Theme] Determined initial theme is dark:", initialThemeIsDark);

    // Apply initial theme immediately
    applyTheme(initialThemeIsDark);
    toggle.checked = initialThemeIsDark;
    console.log("[Theme] Initial theme applied. Toggle checked state:", toggle.checked);

    // Listener for toggle changes
    toggle.addEventListener('change', (event) => {
        const isDark = event.target.checked;
        console.log("[Theme] Toggle changed. New checked state (isDark):", isDark);
        applyTheme(isDark);
        try {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            console.log("[Theme] Saved theme to localStorage:", isDark ? 'dark' : 'light');
        } catch (e) {
            console.error("[Theme] Error saving theme to localStorage:", e);
        }
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
        console.log("[Theme] System theme preference changed. Matches dark:", event.matches);
        // Only apply system change if no user preference is saved in localStorage
        if (!localStorage.getItem('theme')) {
            console.log("[Theme] No saved theme in localStorage, applying system preference.");
            const systemPrefersDark = event.matches;
            applyTheme(systemPrefersDark);
            toggle.checked = systemPrefersDark;
        } else {
            console.log("[Theme] Saved theme exists in localStorage, ignoring system change.");
        }
    });

    console.log("[Theme] Dark mode initialization complete.");
}

// --- Helper Functions ---
/**
 * Populates a select dropdown with options from a configuration object or array.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {object|Array} optionsData - An object (key-value pairs) or array of objects [{id, name}, ...].
 * @param {string} [defaultOptionText=''] - Text for the initial disabled/default option.
 * @param {string|null} [selectedValue=null] - The value to pre-select.
 */
function populateSelectWithOptions(selectElement, optionsData, defaultOptionText = '', selectedValue = null) {
    // *** ADD LOGGING HERE ***
    console.log(`[populateSelectWithOptions] Called for element:`, selectElement ? `#${selectElement.id}` : 'null', ` | Default Text: "${defaultOptionText}" | Selected Value: ${selectedValue}`);
    console.log(`[populateSelectWithOptions] Options Data Type: ${typeof optionsData}`, optionsData);
    // *** END LOGGING ***

    if (!selectElement) {
        console.error("populateSelectWithOptions: selectElement is null.");
        return;
    }
    console.log(`[UI] Populating select: #${selectElement.id}`);
    selectElement.innerHTML = ''; // Clear existing options

    // Add default option if provided
    if (defaultOptionText) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = defaultOptionText;
        defaultOption.disabled = true; // Make it non-selectable if it's just a placeholder
        if (!selectedValue) defaultOption.selected = true; // Select it if no other value is pre-selected
        selectElement.appendChild(defaultOption);
    }

    // Add options from data
    if (Array.isArray(optionsData)) { // Array of objects like [{id: 'val1', name: 'Label 1'}, ...]
        optionsData.forEach(item => {
            if (item && typeof item === 'object' && item.hasOwnProperty('id') && item.hasOwnProperty('name')) {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                if (selectedValue && item.id === selectedValue) {
                    option.selected = true;
                    if (defaultOptionText) { // Unselect the default if a value is selected
                         const defaultOpt = selectElement.querySelector('option[value=""]');
                         if (defaultOpt) defaultOpt.selected = false;
                    }
                }
                selectElement.appendChild(option);
            } else {
                console.warn(`[UI] Skipping invalid item in optionsData array for #${selectElement.id}:`, item);
            }
        });
    } else if (typeof optionsData === 'object' && optionsData !== null) { // Object like {'val1': 'Label 1', ...}
        Object.entries(optionsData).forEach(([value, text]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            if (selectedValue && value === selectedValue) {
                option.selected = true;
                 if (defaultOptionText) { // Unselect the default
                     const defaultOpt = selectElement.querySelector('option[value=""]');
                     if (defaultOpt) defaultOpt.selected = false;
                 }
            }
            selectElement.appendChild(option);
        });
    } else {
        console.error(`[UI] Invalid optionsData format for #${selectElement.id}. Expected object or array.`);
    }
     console.log(`[UI] Finished populating select: #${selectElement.id}. Selected value: ${selectElement.value}`);
}

/**
 * Generates the HTML string for dynamic form fields based on the game key.
 * This function centralizes the form structure for both live and past game submission.
 * Uses generic 'game-' prefixed IDs based primarily on the original live game structure.
 * @param {string} gameKey - The key of the selected game (e.g., 'golf', 'pool_8ball').
 * @param {string} context - Optional context ('live' or 'submit') for minor variations if needed.
 * @returns {string} The HTML string for the form fields.
 */
function generateGameFormFieldsHTML(gameKey, context = 'submit') {
    console.log(`[UI Utils] Generating form fields for game: ${gameKey}, context: ${context}`);
    let html = '';
    // Use generic 'game-' prefixed IDs

    switch (gameKey) {
        case 'golf':
            // IDs based on original live_game structure, plus player select
            html = `
                ${context === 'submit' ? `
                <div>
                    <label for="game-player1" class="block mb-1">Player:</label>
                    <select id="game-player1" name="player1" class="input-field" required></select>
                </div>
                ` : ''}
                <div>
                    <label for="game-golf-course-select" class="block mb-1">Course:</label>
                    <select id="game-golf-course-select" name="course_id" class="input-field"></select>
                </div>
                <div>
                    <label for="game-golf-holes-select" class="block mb-1">Holes Played:</label>
                    <select id="game-golf-holes-select" name="past_golf_holes_played" class="input-field">
                        <option value="18" selected>18 Holes</option>
                        <option value="9F">Front 9</option>
                        <option value="9B">Back 9</option>
                    </select>
                </div>
                <div>
                    <label for="game-golf-score-input" class="block mb-1">Total Score:</label>
                    <input type="number" id="game-golf-score-input" name="score" min="1" class="input-field" ${context === 'submit' ? 'required' : ''}>
                     <span class="text-xs text-gray-500 dark:text-gray-400">Enter total score if not tracking hole-by-hole.</span>
                </div>
                <!-- Hole-by-hole tracking section -->
                <details id="game-golf-hole-details" class="mt-4">
                    <summary class="cursor-pointer font-medium text-indigo-600 dark:text-indigo-400">Track Hole-by-Hole (Optional)</summary>
                    <div id="game-golf-hole-inputs" class="mt-2 space-y-3 p-4 border rounded-md bg-gray-50 dark:bg-gray-700">
                        <!-- Hole inputs will be generated by JS based on context -->
                        <p class="text-sm text-gray-500 dark:text-gray-400">Hole inputs will appear here based on selection.</p>
                    </div>
                </details>
                 ${context === 'submit' ? `
                 <hr class="my-4">
                 <div>
                     <label for="submit-date-played" class="block mb-1">Date Played:</label>
                     <input type="date" id="submit-date-played" name="date_played" class="input-field" required>
                 </div>
                 <div>
                     <label for="submit-time-played" class="block mb-1">Time Played (Optional):</label>
                     <input type="time" id="submit-time-played" name="time_played" class="input-field">
                 </div>
                 <div>
                    <label for="submit-notes" class="block mb-1">Notes (Optional):</label>
                    <textarea id="submit-notes" name="notes" rows="2" class="input-field"></textarea>
                 </div>
                 ` : ''}
            `;
            break;
        case 'bowling':
             // IDs based on original live_game structure (assuming simple score input)
            html = `
                ${context === 'submit' ? `
                <div>
                    <label for="game-player1" class="block mb-1">Player:</label>
                    <select id="game-player1" name="player1" class="input-field" required></select>
                </div>
                ` : ''}
                <div>
                    <label for="game-score-input" class="block mb-1">Final Score:</label>
                    <input type="number" id="game-score-input" name="score" min="0" max="300" class="input-field" required>
                </div>
                 ${context === 'submit' ? `
                 <hr class="my-4">
                 <div>
                     <label for="submit-date-played" class="block mb-1">Date Played:</label>
                     <input type="date" id="submit-date-played" name="date_played" class="input-field" required>
                 </div>
                 <div>
                     <label for="submit-time-played" class="block mb-1">Time Played (Optional):</label>
                     <input type="time" id="submit-time-played" name="time_played" class="input-field">
                 </div>
                 <div>
                    <label for="submit-notes" class="block mb-1">Notes (Optional):</label>
                    <textarea id="submit-notes" name="notes" rows="2" class="input-field"></textarea>
                 </div>
                 ` : ''}
            `;
            break;
        case 'pool_8ball':
        case 'pool_9ball':
        case 'chess':
        case 'ping_pong':
        case 'magic_gathering':
        case 'disney_lorcana':
        case 'warhammer_40k':
            // Standard 1v1 Win/Loss/Draw
             if (context === 'live') {
                 // Simplified live outcome selection
                 html = `
                     <div>
                         <label for="game-outcome-select" class="block mb-1">Outcome:</label>
                         <select id="game-outcome-select" name="outcome" class="input-field" required>
                             <option value="">-- Select Outcome --</option>
                             <option value="win">I Won</option>
                             <option value="loss">I Lost</option>
                             <option value="draw">Draw</option>
                         </select>
                     </div>
                     <!-- Add live-specific fields like scratches for pool -->
                     ${gameKey === 'pool_8ball' ? `
                     <div class="grid grid-cols-2 gap-4 mt-4">
                         <div>
                             <label for="game-pool-scratches-me" class="block mb-1 text-sm">My Scratches:</label>
                             <input type="number" id="game-pool-scratches-me" name="scratches_me" min="0" value="0" class="input-field w-full">
                         </div>
                         <div>
                             <label for="game-pool-scratches-opp" class="block mb-1 text-sm">Opponent Scratches:</label>
                             <input type="number" id="game-pool-scratches-opp" name="scratches_opp" min="0" value="0" class="input-field w-full">
                         </div>
                     </div>
                     ` : ''}
                 `;
             } else { // context === 'submit'
                 html = `
                     <div>
                         <label for="game-winner-select" class="block mb-1">Winner:</label>
                         <select id="game-winner-select" name="winner" class="input-field" required></select>
                     </div>
                     <div>
                         <label for="game-loser-select" class="block mb-1">Loser:</label>
                         <select id="game-loser-select" name="loser" class="input-field" required></select>
                     </div>
                     <div>
                         <label for="game-score-details" class="block mb-1">Score/Details (Optional):</label>
                         <input type="text" id="game-score-details" name="score" class="input-field">
                     </div>
                     <div class="flex items-center mt-2">
                         <input type="checkbox" id="submit-is-draw" name="is_draw" class="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                         <label for="submit-is-draw">Record as Draw</label>
                     </div>
                     <!-- Add submit-specific fields like pool scratches, chess outcome -->
                     ${gameKey === 'pool_8ball' ? `
                     <div class="grid grid-cols-2 gap-4 mt-4">
                         <div>
                             <label for="submit-pool-scratches-winner" class="block mb-1 text-sm">Winner Scratches:</label>
                             <input type="number" id="submit-pool-scratches-winner" name="scratches_winner" min="0" class="input-field w-full">
                         </div>
                         <div>
                             <label for="submit-pool-scratches-loser" class="block mb-1 text-sm">Loser Scratches:</label>
                             <input type="number" id="submit-pool-scratches-loser" name="scratches_loser" min="0" class="input-field w-full">
                         </div>
                     </div>
                     ` : ''}
                     ${gameKey === 'chess' ? `
                     <div class="mt-4">
                        <label for="submit-chess-outcome" class="block mb-1 text-sm">Outcome Detail:</label>
                        <select id="submit-chess-outcome" name="chess_outcome" class="input-field">
                            <option value="">-- Optional --</option>
                            <option value="checkmate">Checkmate</option>
                            <option value="resignation">Resignation</option>
                            <option value="timeout">Timeout</option>
                            <option value="stalemate">Stalemate (Draw)</option>
                            <option value="agreement">Agreement (Draw)</option>
                            <option value="repetition">Repetition (Draw)</option>
                            <option value="insufficient_material">Insufficient Material (Draw)</option>
                        </select>
                     </div>
                     ` : ''}
                     <hr class="my-4">
                     <div>
                         <label for="submit-date-played" class="block mb-1">Date Played:</label>
                         <input type="date" id="submit-date-played" name="date_played" class="input-field" required>
                     </div>
                     <div>
                         <label for="submit-time-played" class="block mb-1">Time Played (Optional):</label>
                         <input type="time" id="submit-time-played" name="time_played" class="input-field">
                     </div>
                     <div>
                        <label for="submit-notes" class="block mb-1">Notes (Optional):</label>
                        <textarea id="submit-notes" name="notes" rows="2" class="input-field"></textarea>
                     </div>
                 `;
             }
            break;
        // Add cases for other game types (pool_cutthroat, team games, etc.)
        // Ensure IDs and names are consistent where data represents the same thing.
        default:
            html = `<p class="text-gray-500 dark:text-gray-400 italic">Form fields for this game type are not yet configured.</p>`;
            break;
    }
    return html;
}

console.log("[UI] ui_utils.js loaded. Functions defined globally.");
