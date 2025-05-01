console.log("[ui_utils.js] Script start."); // <-- ADD LOG

// --- ui_utils.js ---

// --- DOM Element References ---
let navLinks, loginForm, loginError, logoutButton,
    recordGameModal, openRecordGameModalBtn,
    addPlayerModal,
    createTournamentModal,
    addParticipantsModal, // Likely unused, remove if confirmed
    addCourseModal,
    playerInfoModal,
    editTournamentModal,
    darkModeToggle,
    bodyElement,
    mainContentContainer; // Keep reference

// Function to assign elements (called by main.js)
function assignElements() {
    navLinks = document.querySelectorAll('.nav-link');
    loginForm = document.getElementById('login-form');
    loginError = document.getElementById('login-error');
    logoutButton = document.getElementById('logout-button'); // Check if this ID is still used

    // Modals and their trigger buttons (Review which are still needed)
    addPlayerModal = document.getElementById('add-player-modal');
    createTournamentModal = document.getElementById('create-tournament-modal');
    addCourseModal = document.getElementById('add-course-modal');
    playerInfoModal = document.getElementById('player-info-modal'); // Example if needed
    editTournamentModal = document.getElementById('edit-tournament-modal');

    darkModeToggle = document.getElementById('dark-mode-toggle');
    bodyElement = document.body;
    mainContentContainer = document.getElementById('main-content');

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

/**
 * Opens a modal dialog.
 * @param {HTMLElement} modalElement - The modal element to open.
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
 * Closes a modal dialog.
 * @param {HTMLElement} modalElement - The modal element to close.
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
 * Sets up listeners for closing modals (close button, overlay click).
 */
function setupModalCloseListeners() {
    // ...existing code...
}

// --- Dropdown Population ---

/**
 * Populates a select dropdown with game type options from globalGameConfigs.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {string} [prompt='Select Game Type'] - The default prompt option text.
 * @param {string|null} [selectedValue=null] - The value to pre-select.
 */
async function populateGameTypeSelect(selectElement, prompt = 'Select Game Type', selectedValue = null) {
    if (!selectElement) {
        console.error("[UI Utils] populateGameTypeSelect: Select element not provided.");
        return;
    }
    console.log(`[UI Utils] Populating game type select: #${selectElement.id}`);

    // Ensure configs are loaded
    if (!window.globalGameConfigs) {
        console.warn("[UI Utils] Game configs not ready, attempting to fetch...");
        try {
            await fetchAndCacheGameConfigs(); // Ensure fetch completes
        } catch (error) {
            console.error("[UI Utils] Failed to fetch game configs for dropdown:", error);
            selectElement.innerHTML = `<option value="">Error loading games</option>`;
            return;
        }
    }

    // Check again after attempting fetch
    if (!window.globalGameConfigs || Object.keys(window.globalGameConfigs).length === 0) {
        console.error("[UI Utils] Game configs are still empty after fetch attempt.");
        selectElement.innerHTML = `<option value="">No games available</option>`;
        return;
    }

    selectElement.innerHTML = `<option value="">${prompt}</option>`; // Start with prompt

    // Sort game types alphabetically by name
    const sortedGames = Object.entries(window.globalGameConfigs)
        .map(([key, config]) => ({ key, name: config.name || key }))
        .sort((a, b) => a.name.localeCompare(b.name));

    sortedGames.forEach(({ key, name }) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = name;
        if (key === selectedValue) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
    console.log(`[UI Utils] Populated #${selectElement.id} with ${sortedGames.length} game types.`);
}

/**
 * Populates a select dropdown with golf course options from globalGolfCourseCache.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {string} [prompt='Select Course'] - The default prompt option text.
 * @param {string|null} [selectedValue=null] - The value to pre-select.
 */
async function populateGolfCourseSelect(selectElement, prompt = 'Select Course', selectedValue = null) {
    // ...existing code...
}

// --- Theme Management ---

/**
 * Applies the selected theme (light/dark) to the body element.
 * @param {boolean} isDarkMode - True for dark mode, false for light mode.
 */
function applyTheme(isDarkMode) {
    const theme = isDarkMode ? 'dark' : 'light';
    console.log(`[Theme] Applying theme: ${theme}`);
    const htmlElement = document.documentElement; // Target <html> element
    if (!htmlElement) {
        console.error("[Theme] Cannot apply theme: <html> element not found!");
        return;
    }
    const removing = isDarkMode ? 'light' : 'dark';
    const adding = isDarkMode ? 'dark' : 'light';
    htmlElement.classList.remove(removing);
    htmlElement.classList.add(adding);
    console.log(`[Theme] Applied theme. Removed '${removing}', Added '${adding}'. Current <html> classes:`, htmlElement.className);

    // Update toggle state visually
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.checked = isDarkMode;
    }
}

/**
 * Initializes the theme based on localStorage or system preference.
 */
function initializeDarkMode() {
    console.log("[Theme] Initializing dark mode...");
    let preferredTheme = 'light'; // Default to light
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
            preferredTheme = savedTheme;
            console.log(`[Theme] Found saved theme in localStorage: ${preferredTheme}`);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            preferredTheme = 'dark';
            console.log("[Theme] Using system preference: dark");
        } else {
            console.log("[Theme] Using default theme: light");
        }
    } catch (e) {
        console.error("[Theme] Error accessing localStorage or matchMedia:", e);
    }
    applyTheme(preferredTheme === 'dark');
}

/**
 * Sets up the dark mode toggle button listener.
 */
function setupThemeToggle() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        if (!darkModeToggle.getAttribute('data-listener-attached')) { // Check if listener already attached
            darkModeToggle.addEventListener('change', (e) => {
                const isDarkMode = e.target.checked;
                applyTheme(isDarkMode);
                try {
                    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
                } catch (e) {
                    console.error("[Theme] Error saving theme to localStorage:", e);
                }
            });
            darkModeToggle.setAttribute('data-listener-attached', 'true');
            console.log("[UI Utils] Attached change listener to dark mode toggle.");
        }
    } else {
         console.warn("[UI Utils] Dark mode toggle (#dark-mode-toggle) not found for listener attachment.");
    }
}

// --- Profile Dropdown ---
/**
 * Toggles the visibility of the profile dropdown menu.
 */
function toggleProfileDropdown() {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) {
        profileDropdown.classList.toggle('hidden');
        console.log("[UI Utils] Toggled profile dropdown visibility.");
    } else {
        console.warn("[UI Utils] Profile dropdown element (#profile-dropdown) not found.");
    }
}

/**
 * Sets up the profile dropdown button listener and logout link listener.
 */
function setupProfileDropdown() {
    console.log("[UI Utils] Setting up profile dropdown listeners...");
    const profileButton = document.getElementById('profile-photo-button');
    const profileDropdown = document.getElementById('profile-dropdown'); // Needed for logout listener
    const logoutLink = profileDropdown?.querySelector('#dropdown-logout');

    if (profileButton) {
        // Remove existing listener to prevent duplicates if called multiple times
        profileButton.removeEventListener('click', toggleProfileDropdown);
        profileButton.addEventListener('click', toggleProfileDropdown);
        console.log("[UI Utils] Attached click listener to profile button.");
    } else {
        console.warn("[UI Utils] Profile button (#profile-photo-button) not found for dropdown setup.");
    }

    if (logoutLink) {
        logoutLink.removeEventListener('click', handleLogoutClick); // Prevent duplicates
        logoutLink.addEventListener('click', handleLogoutClick);
        console.log("[UI Utils] Attached click listener to logout link.");
    } else {
        console.warn("[UI Utils] Logout link (#dropdown-logout) not found inside profile dropdown.");
    }

    // Close dropdown if clicking outside
    document.addEventListener('click', (event) => {
        if (!profileButton?.contains(event.target) && !profileDropdown?.contains(event.target)) {
            profileDropdown?.classList.add('hidden');
        }
    });
}

/**
 * Handles the click event on the logout link.
 * @param {Event} event
 */
function handleLogoutClick(event) {
    event.preventDefault(); // Prevent default link behavior
    console.log("[UI Utils] Logout link clicked.");
    if (typeof logoutUser === 'function') {
        logoutUser(); // Call the function from auth.js
        // Hide dropdown immediately
        const profileDropdown = document.getElementById('profile-dropdown');
        if (profileDropdown) profileDropdown.classList.add('hidden');
    } else {
        console.error("[UI Utils] logoutUser function not found!");
        alert("Logout function is unavailable. Please try again later.");
    }
}

// --- NEW Placeholder Function ---
/**
 * Sets up navigation links and dropdowns. (Placeholder)
 */
function setupNavigation() {
    console.log("[UI Utils - Placeholder] Setting up navigation...");
    // TODO: Implement actual navigation setup, including dropdown population and hamburger menu logic.
    const playDropdown = document.getElementById('play-dropdown');
    if (playDropdown) playDropdown.innerHTML = '<a href="#" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Play (TBD)</a>';
    // Add similar placeholders for other dropdowns if needed.
}
// --- END NEW Placeholder Function ---

/**
 * Sets up common UI elements like navigation, theme toggle, etc.
 */
function setupCommonUI() {
    console.log("[UI Utils] Setting up common UI elements...");
    setupNavigation(); // Call the (now defined) placeholder
    setupThemeToggle();
    setupProfileDropdown(); // Ensure profile dropdown structure is ready

    // Ensure the profile button has an img tag inside it
    const profileButton = document.getElementById('profile-photo-button');
    if (profileButton && !profileButton.querySelector('img')) {
        const img = document.createElement('img');
        img.id = 'profile-photo-img'; // Give it an ID for easier targeting
        img.className = 'h-full w-full object-cover'; // Make it fill the button
        img.src = `https://ui-avatars.com/api/?name=?&background=E0E7FF&color=4F46E5&size=40`; // Default placeholder
        img.alt = 'My Profile';
        profileButton.appendChild(img);
        console.log("[UI Utils] Added profile image element to button.");
    }

    // Add other common UI setup tasks here
    console.log("[UI Utils] Common UI setup complete.");
}

// --- NEW Placeholder Functions for Dashboard ---

/**
 * Populates a list element with recent games. (Placeholder)
 * @param {HTMLElement} listElement - The ul or ol element to populate.
 * @param {number} limit - Maximum number of games to show.
 */
async function populateRecentGamesListElement(listElement, limit = 5) {
    if (!listElement) return;
    console.log(`[UI Utils - Placeholder] Populating recent games list (limit: ${limit})...`);
    listElement.innerHTML = '<li class="loading-text">Loading recent games...</li>';
    // TODO: Implement actual fetching and rendering logic
    setTimeout(() => { // Simulate fetch
        listElement.innerHTML = '<li class="muted-text italic">Recent games functionality not yet implemented.</li>';
    }, 500);
}

/**
 * Populates a list element with top players. (Placeholder)
 * @param {HTMLElement} listElement - The ul or ol element to populate.
 * @param {number} limit - Maximum number of players to show.
 */
async function populateTopPlayersListElement(listElement, limit = 5) {
    if (!listElement) return;
    console.log(`[UI Utils - Placeholder] Populating top players list (limit: ${limit})...`);
    listElement.innerHTML = '<li class="loading-text">Loading top players...</li>';
    // TODO: Implement actual fetching and rendering logic using populateGameRankings or similar
    setTimeout(() => { // Simulate fetch
        listElement.innerHTML = '<li class="muted-text italic">Top players functionality not yet implemented.</li>';
    }, 500);
}

/**
 * Populates a list element with top teams. (Placeholder)
 * @param {HTMLElement} listElement - The ul or ol element to populate.
 * @param {number} limit - Maximum number of teams to show.
 */
async function populateTopTeamsListElement(listElement, limit = 5) {
    if (!listElement) return;
    console.log(`[UI Utils - Placeholder] Populating top teams list (limit: ${limit})...`);
    listElement.innerHTML = '<li class="loading-text">Loading top teams...</li>';
    // TODO: Implement actual fetching and rendering logic for teams
    setTimeout(() => { // Simulate fetch
        listElement.innerHTML = '<li class="muted-text italic">Top teams functionality not yet implemented.</li>';
    }, 500);
}

// --- END NEW Placeholder Functions ---

console.log("[UI Utils] ui_utils.js loaded.");
