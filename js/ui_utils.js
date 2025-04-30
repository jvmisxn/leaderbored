// --- ui_utils.js ---

// --- DOM Element References (Assign these in main initialization) ---
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
    mainContentContainer; // Added main content container reference

// Function to assign elements (call this during initialization)
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

    // Basic checks (optional but recommended)
    if (!mainContentContainer) console.error("Critical Error: Main content container (#main-content) not found!");
    console.log("[UI Utils] Elements assigned.");
}

// --- Page Section Navigation (Refactored for Templates) ---
async function showSection(targetId) {
    if (!mainContentContainer) { console.error("Main content container not assigned yet in showSection"); return; }
    console.log(`[NAV Template] Navigating to: ${targetId}`);
    const cleanTargetId = targetId.startsWith('#') ? targetId.substring(1) : targetId;
    const templateId = `template-${cleanTargetId}`;
    const template = document.getElementById(templateId);

    if (!template) {
        console.warn(`[NAV Template] Template with ID "${templateId}" not found. Showing home.`);
        const homeTemplate = document.getElementById('template-home-section');
        if (homeTemplate) {
            await loadTemplateContent(homeTemplate, 'home-section');
        } else {
            console.error("Critical Error: Home template (#template-home-section) not found as fallback.");
            mainContentContainer.innerHTML = '<p class="error-text text-center py-10">Error: Could not load page content.</p>';
        }
        return;
    }

    await loadTemplateContent(template, cleanTargetId);

    window.location.hash = cleanTargetId;
    window.scrollTo(0, 0);
}

async function loadTemplateContent(templateElement, sectionId) {
    if (!mainContentContainer || !templateElement || !templateElement.content) {
        console.error("[NAV Template] Invalid template or main container for loading.");
        return;
    }
    console.log(`[NAV Template] START Load for section: ${sectionId} using template: ${templateElement.id}`);

    console.log(`[NAV Template] Clearing #main-content (before). Current innerHTML length: ${mainContentContainer.innerHTML.length}`);
    mainContentContainer.innerHTML = ''; // Clear existing content
    console.log(`[NAV Template] Cleared #main-content (after). Current innerHTML length: ${mainContentContainer.innerHTML.length}`); // Check if empty

    const clonedContent = templateElement.content.cloneNode(true);
    console.log(`[NAV Template] Cloned template content for ${sectionId}. Node type: ${clonedContent.nodeType}`);

    mainContentContainer.appendChild(clonedContent);
    const sectionAdded = !!mainContentContainer.querySelector(`section#${sectionId}`);
    console.log(`[NAV Template] Appended content for section: ${sectionId}. <section id="${sectionId}"> added? ${sectionAdded}. Current #main-content innerHTML length: ${mainContentContainer.innerHTML.length}`);

    if (!sectionAdded) {
        console.error(`[NAV Template] CRITICAL: Failed to append <section id="${sectionId}"> from template ${templateElement.id}. Aborting population.`);
        mainContentContainer.innerHTML = `<p class="error-text text-center py-10">Error: Failed to load page structure for ${sectionId}.</p>`;
        return;
    }

    try {
        const needsCache = ['home-section', 'results-section', 'players-section', 'rankings-section', 'submit-past-game-section', 'tournament-detail-section', 'sports-section'];
        let cacheReady = playersCachePopulated; // Check initial state

        // If cache is needed but not populated, try fetching it
        if (needsCache.includes(sectionId) && !cacheReady) {
            console.warn(`[NAV Template] Player cache not ready for ${sectionId}, attempting population...`);

            if (!db) { // Check if DB is initialized before attempting fetch
                 console.error("[NAV Template] Cannot fetch cache: Firestore DB not initialized.");
                 cacheReady = false; // Mark cache as not ready
            } else {
                 // Attempt to fetch and update the readiness flag based on success/failure
                 cacheReady = await fetchAllPlayersForCache();
            }

            // If cache fetch failed, display error and stop further population for this section
            if (!cacheReady) {
                console.error(`[NAV Template] Failed to populate cache before loading ${sectionId}. Section content may be incomplete.`);
                const sectionElement = mainContentContainer.querySelector(`#${sectionId}`);
                // Provide a more specific error message in the UI
                if (sectionElement) sectionElement.innerHTML = `<p class="error-text p-4 text-center">Error: Could not load required player data. Cache fetch failed. Check console for details.</p>`;
                return; // Stop processing this section load
            }
            console.log(`[NAV Template] Cache populated successfully for ${sectionId}.`);
        }

        // Proceed with population only if cache is ready OR if the section doesn't need the cache
        if (cacheReady || !needsCache.includes(sectionId)) {
            console.log(`[NAV Template] Checking population functions for section: ${sectionId}`);

            // Add specific logs before and after each call
            if (sectionId === 'home-section' && typeof populateDashboard === 'function') {
                console.log('[NAV Template] Attempting to call populateDashboard...');
                await populateDashboard();
                console.log('[NAV Template] Finished populateDashboard.');
            }
            // --- TEMPORARILY DISABLED POPULATION FOR DEBUGGING ---
            else if (sectionId === 'rankings-section' /* && typeof updateGameTypeDropdowns === 'function' && typeof updateRankingsVisibility === 'function' */) {
                console.log('[NAV Template] SKIPPING rankings population (DEBUGGING). Basic template should load.');
                // updateGameTypeDropdowns();
                // await updateRankingsVisibility();
                // const filterDropdown = mainContentContainer.querySelector('#rankings-game-filter');
                // if (filterDropdown) { ... }
            }
            else if (sectionId === 'results-section' /* && typeof populateResultsTable === 'function' */) {
                console.log('[NAV Template] SKIPPING results population (DEBUGGING). Basic template should load.');
                // await populateResultsTable();
            }
            else if (sectionId === 'players-section' /* && typeof populatePlayersList === 'function' */) {
                console.log('[NAV Template] SKIPPING players population (DEBUGGING). Basic template should load.');
                // await populatePlayersList();
            }
            else if (sectionId === 'tournaments-section' && typeof populateTournamentsList === 'function') {
                console.log('[NAV Template] Attempting to call populateTournamentsList for full list...');
                await populateTournamentsList('tournaments-list-full');
                console.log('[NAV Template] Finished populateTournamentsList.');
            }
            else if (sectionId === 'tournament-detail-section' && typeof populateTournamentDetails === 'function') {
                 // ... existing tournament detail logic ...
            }
            else if (sectionId === 'submit-past-game-section' && typeof setupSubmitPastGameListeners === 'function') {
                console.log('[NAV Template] Attempting to call setupSubmitPastGameListeners...');
                await setupSubmitPastGameListeners();
                console.log('[NAV Template] Finished setupSubmitPastGameListeners.');
            }
            else if (sectionId === 'game-info-section') {
                 console.log('[NAV Template] Setting up game-info section...');
                 // ... existing game-info logic ...
                 console.log('[NAV Template] Finished game-info section setup.');
            }
            else if (sectionId === 'sports-section' /* && typeof setupSportsSectionListeners === 'function' */) {
                console.log('[NAV Template] SKIPPING sports population/listeners (DEBUGGING). Basic template should load.');
                // mainContentContainer.querySelector('#sports-gallery')?.classList.remove('hidden');
                // mainContentContainer.querySelector('#golf-details-view')?.classList.add('hidden');
                // setupSportsSectionListeners();
            }
            else if (sectionId === 'live-game-section' && typeof setupLiveGameSection === 'function') {
                console.log('[NAV Template] Attempting to call setupLiveGameSection...');
                setupLiveGameSection();
                console.log('[NAV Template] Finished setupLiveGameSection.');
            }
            else if (sectionId === 'player-login-section' && typeof setupLoginListeners === 'function') {
                 // ... existing login logic ...
            }
             else if (sectionId === 'player-register-section' && typeof setupRegisterListeners === 'function') {
                 // ... existing register logic ...
             }
             else {
                 console.log(`[NAV Template] No specific population function configured or called for section: ${sectionId}`);
             }
             // --- END OF TEMPORARY DISABLING ---

        }

    } catch (error) {
        console.error(`[NAV Template] Error during population functions for ${sectionId}:`, error);
        const sectionElement = mainContentContainer.querySelector(`#${sectionId}`);
        if (sectionElement) sectionElement.innerHTML = `<p class="error-text p-4 text-center">Error loading content: ${error.message}</p>`;
    }
    console.log(`[NAV Template] END Load for section: ${sectionId}`);
}

// --- Sports Section Specific Listeners ---

function setupSportsSectionListeners() {
    console.log("[SPORTS] Setting up listeners...");
    const sportsSection = document.getElementById('sports-section');
    if (!sportsSection) {
        console.error("[SPORTS] Sports section container not found.");
        return;
    }

    const galleryView = sportsSection.querySelector('#sports-gallery');
    const golfDetailsView = sportsSection.querySelector('#golf-details-view');
    const backToGalleryBtn = sportsSection.querySelector('#back-to-sports-gallery-btn');
    const openAddCourseBtn = sportsSection.querySelector('#open-add-course-modal-btn'); // Ensure this exists in golf_courses.js or similar
    const showGolfRulesBtn = sportsSection.querySelector('#show-golf-rules-btn'); // Ensure this exists in golf_courses.js or similar

    // Listener for all "View Details" buttons in the gallery
    galleryView?.addEventListener('click', async (event) => {
        const button = event.target.closest('.view-sport-details-btn');
        if (!button) return;

        const sport = button.getAttribute('data-sport');
        console.log(`[SPORTS] Clicked view details for: ${sport}`);

        if (sport === 'golf') {
            galleryView.classList.add('hidden');
            golfDetailsView?.classList.remove('hidden');
            // Populate golf courses list when switching to this view
            if (typeof populateGolfCourses === 'function') {
                console.log("[SPORTS] Populating golf courses...");
                await populateGolfCourses();
            } else {
                console.error("[SPORTS] populateGolfCourses function not found!");
            }
        } else if (sport === 'overall') {
            // Navigate to rankings section, pre-selecting 'overall'
            showSection('rankings-section'); // The rankings section logic handles the 'overall' default
        } else if (gameTypesConfig[sport]) {
            // Navigate to rankings section, pre-selecting the specific game
            // We need a way to pass the preselection hint to the rankings page
            window.location.hash = `rankings-section?game=${sport}`; // Use query param in hash
            // showSection will handle the hash change, but rankings needs to read the param
            // Modification needed in rankings_results.js/updateRankingsVisibility to read this hash param
        } else {
            alert(`Details/Rankings view for "${sport}" not implemented yet.`);
        }
    });

    // Listener for "Back to Sports" button in Golf Details
    backToGalleryBtn?.addEventListener('click', () => {
        golfDetailsView?.classList.add('hidden');
        galleryView?.classList.remove('hidden');
    });

    // Listener for "Add New Course" button (ensure openAddCourseModal is globally accessible)
    if (openAddCourseBtn && typeof openAddCourseModal === 'function') {
        openAddCourseBtn.addEventListener('click', openAddCourseModal);
    } else if (openAddCourseBtn) {
        console.warn("[SPORTS] openAddCourseModal function not found for button.");
    }

    // Listener for "View Golf Rules" button (ensure openGolfRulesModal is globally accessible)
    if (showGolfRulesBtn && typeof openGolfRulesModal === 'function') {
        showGolfRulesBtn.addEventListener('click', openGolfRulesModal);
    } else if (showGolfRulesBtn) {
        console.warn("[SPORTS] openGolfRulesModal function not found for button.");
    }

    console.log("[SPORTS] Listeners setup complete.");
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

// --- End Mobile Navigation ---

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
 * Closes a modal dialog.
 * Removes 'modal-active' class from the modal container and 'modal-open' from the body.
 * Removes the overlay click listener.
 * @param {HTMLElement} modalElement - The modal container element.
 */
function closeModal(modalElement) {
    if (!modalElement) {
        console.error("closeModal: Provided modalElement is null or undefined.");
        return;
    }
    console.log(`[UI Modal] Closing modal: #${modalElement.id}`);
    modalElement.classList.remove('modal-active');
    document.body.classList.remove('modal-open');

    // *** Remove the overlay click listener ***
    if (currentOverlayClickHandler) {
        modalElement.removeEventListener('click', currentOverlayClickHandler);
        console.log(`[UI Modal] Removed overlay click listener for #${modalElement.id}.`);
        currentOverlayClickHandler = null; // Clear the stored handler
    }

    // Wait for transitions to finish before setting display: none
    setTimeout(() => {
        modalElement.style.display = 'none';
        // Optional: Clear modal content after closing to prevent stale data flashing
        // const content = modalElement.querySelector('.modal-content');
        // if (content) content.innerHTML = ''; // Be careful if content structure is complex
    }, 300); // Example: 300ms transition duration
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

// --- Dashboard Population ---

async function populateDashboard() {
    console.log("[DASHBOARD] Populating...");
    if (!db) { console.warn("[DASHBOARD] DB not ready, skipping population."); return; }
    if (!mainContentContainer) { console.error("[DASHBOARD] Main content container not found."); return; }

    const recentGamesList = mainContentContainer.querySelector('#recent-games-list');
    const topPlayersList = mainContentContainer.querySelector('#top-players-list');
    const topTeamsList = mainContentContainer.querySelector('#top-teams-list');
    const dashboardTournamentsListElement = mainContentContainer.querySelector('#dashboard-tournaments-list'); // Get the element

    if (!recentGamesList || !topPlayersList || !topTeamsList || !dashboardTournamentsListElement) { // Check the element
        console.error("[DASHBOARD] One or more dashboard list elements not found within #main-content.");
        return;
    }

    // Pass the ID string 'dashboard-tournaments-list' to populateTournamentsList
    const populateTournamentsPromise = (typeof populateTournamentsList === 'function')
        ? populateTournamentsList('dashboard-tournaments-list', 3) // Pass ID string
        : Promise.resolve();

    await Promise.all([
        populateRecentGamesListElement(recentGamesList, 5),
        populateTopPlayersListElement(topPlayersList, 5),
        populateTopTeamsListElement(topTeamsList, 5),
        populateTournamentsPromise
    ]).catch(error => {
        console.error("[DASHBOARD] Error during concurrent population:", error);
    });
    console.log("[DASHBOARD] Population attempt complete.");
}

async function populateRecentGamesListElement(listElement, limit = 5) {
    if (!listElement || !db) { console.warn(`Recent games list element or DB not ready.`); return; }
    listElement.innerHTML = `<li class="loading-text">Loading recent games...</li>`;
    try {
        const q = db.collection('games').orderBy('date_played', 'desc').limit(limit);
        const snapshot = await q.get();
        if (snapshot.empty) {
            listElement.innerHTML = `<li class="muted-text">No games recorded yet.</li>`;
            return;
        }
        listElement.innerHTML = '';
        if (!playersCachePopulated) await fetchAllPlayersForCache();

        for (const doc of snapshot.docs) {
            const game = { id: doc.id, ...doc.data() };
            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'N/A';
            const gameType = gameTypesConfig[game.game_type] || game.game_type || 'Game';
            let description = gameType;
            const participants = game.participants || [];
            const participantNames = participants.map(id => globalPlayerCache[id]?.name || 'Unknown Player');

            if (game.game_type === 'golf' && participantNames.length > 0) {
                description = `${gameType}: <b>${participantNames[0]}</b>`;
            } else if (participants.length >= 2 && (game.outcome === 'Win/Loss' || game.outcome === 'Draw')) {
                if (game.outcome === 'Win/Loss') {
                     description = `${gameType}: <b>${participantNames[0]}</b> beat ${participantNames[1]}`;
                } else {
                     description = `${gameType}: ${participantNames[0]} drew with ${participantNames[1]}`;
                }
            } else if (participants.length > 0) {
                description = `${gameType}: ${participantNames.join(', ')}`;
            }
            if (game.score) description += ` (${game.score})`;

            const li = document.createElement('li');
            li.className = 'border-b pb-2 mb-2 last:border-0 last:mb-0 last:pb-0 text-sm';
            li.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>${description}</div>
                    <div class="muted-text text-xs ml-2 whitespace-nowrap">${gameDate}</div>
                </div>`;
            listElement.appendChild(li);
        }
    } catch (error) {
        console.error(`Error fetching recent games for element:`, error);
        if (error.code === 'failed-precondition') {
            listElement.innerHTML = `<li class="error-text">Error: Firestore index missing.</li>`;
        } else {
            listElement.innerHTML = `<li class="error-text">Error loading games.</li>`;
        }
    }
}

async function populateTopPlayersListElement(listElement, limit = 5) {
    if (!listElement || !db) { console.warn(`Top players list element or DB not ready.`); return; }
    listElement.innerHTML = '<li class="loading-text">Loading rankings...</li>';
    try {
        const snapshot = await db.collection('players').orderBy('elo_overall', 'desc').limit(limit).get();
        if (snapshot.empty) {
            listElement.innerHTML = '<li class="muted-text">No players found.</li>'; return;
        }
        listElement.innerHTML = '';
        let rank = 1;
        snapshot.forEach(doc => {
            const player = doc.data();
            const li = document.createElement('li');
            li.className = "flex justify-between items-center";
            li.innerHTML = `
                 <span>${rank}. ${player.name || 'Unnamed'}</span>
                 <span class="text-sm font-medium accent-text">${Math.round(player.elo_overall || DEFAULT_ELO)}</span>`;
            listElement.appendChild(li);
            rank++;
        });
    } catch (error) {
        console.error(`Error fetching top players:`, error);
        if (error.code === 'failed-precondition') {
            listElement.innerHTML = `<li class="error-text">Error: Firestore index missing.</li>`;
        } else {
            listElement.innerHTML = `<li class="error-text">Error loading rankings.</li>`;
        }
    }
}

async function populateTopTeamsListElement(listElement, limit = 5) {
    if (listElement) {
        listElement.innerHTML = '<li class="muted-text italic">Team rankings not yet implemented.</li>';
    }
}

// --- Dark Mode Toggle Logic ---

/**
 * Applies the dark or light theme by toggling the 'dark' and 'light' classes on the <html> element.
 * @param {boolean} isDark - True to apply dark mode, false for light mode.
 */
function applyTheme(isDark) {
    document.documentElement.classList.remove(isDark ? 'light' : 'dark');
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    console.log(`[Theme] Applied ${isDark ? 'Dark' : 'Light'} Mode`);
}

/**
 * Initializes the dark mode based on saved preference or system settings,
 * and sets up the toggle switch listener.
 */
function initializeDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) {
        console.warn("[Theme] Dark mode toggle switch not found.");
        return;
    }

    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    
    // Check system preference if no saved theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Determine initial state
    const initialThemeIsDark = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    // Apply initial theme immediately
    applyTheme(initialThemeIsDark);
    toggle.checked = initialThemeIsDark;
    
    // Listener for toggle changes
    toggle.addEventListener('change', (event) => {
        const isDark = event.target.checked;
        applyTheme(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
        if (!localStorage.getItem('theme')) {
            const systemPrefersDark = event.matches;
            applyTheme(systemPrefersDark);
            toggle.checked = systemPrefersDark;
        }
    });

    console.log("[Theme] Dark mode initialized with state:", initialThemeIsDark);
}

console.log("[UI] ui_utils.js loaded. Functions (populateSelectWithOptions, openModal, closeModal, toggleProfileDropdown, setupDarkModeToggle) defined globally.");
