console.log("main.js starting execution"); // <-- ADD THIS LINE FIRST

// --- main.js ---

// Use globals declared in firebase_config.js
// DO NOT redeclare 'db' or 'auth' here

// Global Cache Variables
let globalPlayerCache = {}; // Already exists
let playersCachePopulated = false; // Already exists
let globalGolfCourseCache = {}; // ADDED
let golfCourseCachePopulated = false; // ADDED
// globalGameConfigs = null; // Declared in game_config.js
// isFetchingConfigs = false; // Declared in game_config.js
// configFetchPromise = null; // Declared in game_config.js

// Temporary stub to prevent navigation errors if admin logic is not yet implemented
window.isCurrentUserAdmin = window.isCurrentUserAdmin || function() { return false; };

let currentSectionId = null; // Keep track of the currently displayed section
let currentQueryParams = new URLSearchParams();
let previousSectionId = null; // Added
let previousQueryParams = new URLSearchParams(); // Added
let currentUser = null; // Keep track of the Firebase auth user object

// --- Navigation & Section Handling (Moved Up) ---

async function loadTemplateContent(templateElement, sectionId) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent || !templateElement || !templateElement.content) {
        console.error("[NAV Template] Invalid template or main container for loading.");
        return false;
    }
    console.log(`[NAV Template] START Load for section: ${sectionId} using template: ${templateElement.id}`);

    mainContent.innerHTML = '';
    try {
        const clonedContent = templateElement.content.cloneNode(true);
        mainContent.appendChild(clonedContent);
        const sectionAdded = !!mainContent.querySelector(`section#${sectionId}`);
        if (!sectionAdded) {
            console.error(`[NAV Template] CRITICAL: Failed to append <section id="${sectionId}"> from template ${templateElement.id}. Aborting population.`);
            mainContent.innerHTML = `<p class="error-text text-center py-10">Error: Failed to load page structure for ${sectionId}.</p>`;
            return false;
        }
        return true;

    } catch (error) {
        console.error(`[NAV Template] Error during template cloning/appending for ${sectionId}:`, error);
        mainContent.innerHTML = `<p class="error-text text-center py-10">Error: Failed to build page structure for ${sectionId}.</p>`;
        return false;
    }
}

async function attachSectionListeners(sectionId, queryParams) {
    console.log(`[AttachListeners] Attaching listeners/populating for section: ${sectionId}`);
    // Ensure configs are loaded before attaching listeners that might need them
    if (!window.globalGameConfigs && typeof fetchAndCacheGameConfigs === 'function') {
        console.warn(`[AttachListeners] Configs not ready for ${sectionId}, awaiting fetch...`);
        await fetchAndCacheGameConfigs();
    }

    switch (sectionId) {
        case 'home-section':
            if (typeof populateDashboard === 'function') {
                await populateDashboard();
            } else {
                console.error("populateDashboard function not found.");
            }
            break;
        case 'players-section':
            if (typeof populatePlayersList === 'function') {
                await populatePlayersList(); // This handles its own listeners internally
            } else {
                console.error("populatePlayersList function not found.");
            }
            break;
        case 'rankings-section':
            if (typeof populateRankings === 'function') {
                await populateRankings();
            } else {
                console.error("populateRankings function not found.");
                const container = document.getElementById('ranking-tables-container');
                if (container) container.innerHTML = '<p class="error-text text-center py-10">Error: Rankings component failed to load.</p>';
            }
            break;
        case 'results-section':
            if (typeof populateResults === 'function') {
                await populateResults();
            } else {
                console.error("populateResults function not found.");
                const container = document.getElementById('results-table-body');
                if (container) container.innerHTML = `<tr><td colspan="6" class="error-text text-center py-4">Error: Results component failed to load.</td></tr>`;
            }
            break;
        case 'sports-section':
            // Now calls function from sports_list.js
            if (typeof populateAllSportsList === 'function') {
                await populateAllSportsList();
            } else {
                console.error("populateAllSportsList function not found (expected in sports_list.js).");
                const container = document.getElementById('all-sports-list');
                if (container) container.innerHTML = '<p class="error-text text-center py-10">Error: Sports list component failed to load.</p>';
            }
            break;
        case 'sport-details-section':
            // Now calls function from sport_details.js
            if (queryParams.get('sport')) {
                const sportKey = queryParams.get('sport');
                if (typeof populateSportDetails === 'function') {
                    await populateSportDetails(sportKey); // Pass the key
                } else {
                    console.error("populateSportDetails function not found (expected in sport_details.js).");
                    const container = document.getElementById('sport-details-content');
                    if (container) container.innerHTML = '<p class="error-text text-center py-10">Error: Sport details component failed to load.</p>';
                }
            } else {
                console.warn("[AttachListeners] Sport details section loaded without 'sport' query parameter.");
                const container = document.getElementById('sport-details-content');
                if (container) container.innerHTML = '<p class="error-text text-center py-10">Error: No sport specified.</p>';
            }
            break;
        case 'player-profile-section':
            if (queryParams.get('playerId')) {
                const playerId = queryParams.get('playerId');
                if (typeof populatePlayerProfilePage === 'function') {
                    await populatePlayerProfilePage(playerId);
                } else {
                    console.error("populatePlayerProfilePage function not found.");
                    const container = document.getElementById('player-profile-content');
                    if (container) container.innerHTML = '<p class="error-text text-center py-10">Error: Player profile component failed to load.</p>';
                }
            } else {
                console.warn("[AttachListeners] Player profile section loaded without 'playerId' query parameter.");
                const container = document.getElementById('player-profile-content');
                if (container) container.innerHTML = '<p class="error-text text-center py-10">Error: No player specified.</p>';
            }
            break;
        case 'edit-profile-section':
            if (typeof setupEditProfileForm === 'function') {
                setupEditProfileForm();
            } else {
                console.error("setupEditProfileForm function not found.");
            }
            break;
        case 'player-login-section':
            const loginSectionElement = document.getElementById(sectionId);
            if (loginSectionElement && typeof setupLoginForm === 'function') {
                setupLoginForm(loginSectionElement);
            } else {
                console.error("setupLoginForm function not found or section element missing.");
            }
            break;
        case 'live-game-section':
            if (typeof setupLiveGameSection === 'function') {
                setupLiveGameSection();
            } else {
                console.error("setupLiveGameSection function not found.");
            }
            break;
        case 'submit-past-game-section':
            if (typeof setupSubmitPastGameListeners === 'function') {
                await setupSubmitPastGameListeners(); // Attaches form submit and game type change listeners
            } else {
                console.error("setupSubmitPastGameListeners function not found.");
            }
            break;
        case 'add-sport-section': // This remains in sports.js
            if (typeof setupAddSportForm === 'function') {
                setupAddSportForm();
            } else {
                console.error("setupAddSportForm function not found (expected in sports.js).");
            }
            break;
        case 'tournaments-section':
            if (typeof populateTournamentsList === 'function') {
                const filter = queryParams.get('filter') || 'all'; // Default to 'all' if no filter
                await populateTournamentsList('tournaments-list-full', filter);
            } else {
                console.error("populateTournamentsList function not found.");
            }
            break;
        case 'tournament-detail-section':
            if (queryParams.get('tournamentId')) {
                const tournamentId = queryParams.get('tournamentId');
                if (typeof populateTournamentDetails === 'function') {
                    await populateTournamentDetails(tournamentId);
                } else {
                    console.error("populateTournamentDetails function not found.");
                }
            } else {
                console.warn("[AttachListeners] Tournament detail section loaded without 'tournamentId'.");
            }
            break;
        case 'game-info-section':
            if (queryParams.get('gameId')) {
                const gameId = queryParams.get('gameId');
                if (typeof populateGameInfo === 'function') {
                    await populateGameInfo(gameId);
                } else {
                    console.error("populateGameInfo function not found.");
                }
            } else {
                console.warn("[AttachListeners] Game info section loaded without 'gameId'.");
            }
            break;
        // ADDED Case for the new Add Golf Course section
        case 'add-golf-course-section':
            if (typeof setupAddGolfCoursePage === 'function') {
                setupAddGolfCoursePage(); // Call the setup function from golf_courses.js
            } else {
                console.error("setupAddGolfCoursePage function not found (expected in golf_courses.js).");
                const container = document.getElementById('add-course-form-container');
                if (container) container.innerHTML = '<p class="error-text text-center py-10">Error: Add course form component failed to load.</p>';
            }
            break;
        default:
            console.warn(`[AttachListeners] No specific listeners or population logic defined for section: ${sectionId}`);
    }
    // Update visibility based on auth status after populating
    if (typeof handleAuthChange === 'function' && typeof auth !== 'undefined') {
        handleAuthChange(auth.currentUser);
    } else {
        console.warn("[AttachListeners] handleAuthChange or auth not available to update element visibility.");
    }
}

async function showSection(sectionId, forceLoad = false, queryParams = {}) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error("[Section] Main content container not found.");
        return;
    }

    // Ensure queryParams is a URLSearchParams object for consistency
    const searchParams = (queryParams instanceof URLSearchParams) ? queryParams : new URLSearchParams(queryParams);

    // Store previous state *before* updating current state
    if (currentSectionId && currentSectionId !== sectionId) {
        previousSectionId = currentSectionId;
        previousQueryParams = currentQueryParams;
        console.log(`[Section] Storing previous section: ${previousSectionId}?${previousQueryParams.toString()}`);
    } else if (currentSectionId === sectionId && currentQueryParams.toString() !== searchParams.toString()) {
         // If staying on the same section but params change, store the state before param change
         previousSectionId = currentSectionId;
         previousQueryParams = currentQueryParams;
         console.log(`[Section] Storing previous state (same section, new params): ${previousSectionId}?${previousQueryParams.toString()}`);
    }


    if (sectionId === currentSectionId && !forceLoad) {
        // Check if query params are different, if so, force reload listeners
        if (currentQueryParams.toString() === searchParams.toString()) {
            console.log(`[Section] Section ${sectionId} with same params is already displayed. Skipping reload.`);
            return;
        } else {
            console.log(`[Section] Section ${sectionId} is displayed, but query params changed. Reloading listeners.`);
            forceLoad = true; // Force listener reload, but not template reload
        }
    }

    // Only reload template if not already loaded or forced
    if (sectionId !== currentSectionId || forceLoad) {
        const templateId = `template-${sectionId}`;
        const template = document.getElementById(templateId);

        if (!template) {
            console.error(`[Section] Template not found for section ID: ${sectionId} (Expected ID: ${templateId})`);
            mainContent.innerHTML = `<p class="error-text text-center py-10">Error: Section template not found.</p>`;
            // Clear state on error
            currentSectionId = null;
            currentQueryParams = new URLSearchParams();
            previousSectionId = null;
            previousQueryParams = new URLSearchParams();
            return;
        }

        const loadSuccess = await loadTemplateContent(template, sectionId);
        if (!loadSuccess) {
            console.error(`[Section] Failed to load template content for ${sectionId}. Aborting.`);
             // Clear state on error
            currentSectionId = null;
            currentQueryParams = new URLSearchParams();
            previousSectionId = null;
            previousQueryParams = new URLSearchParams();
            return;
        }
    }


    currentSectionId = sectionId;
    currentQueryParams = searchParams; // Update current query params

    let hashString = sectionId;
    const queryString = searchParams.toString(); // Use the ensured URLSearchParams object
    if (queryString) {
        hashString += `?${queryString}`;
    }
    // Update hash only if it's different to avoid redundant hashchange events
    if (window.location.hash !== `#${hashString}`) {
        window.history.replaceState(null, '', `#${hashString}`);
    }
    window.scrollTo(0, 0);

    console.log(`[Section] Displayed section: ${sectionId}. Attaching listeners and populating data...`);

    if (typeof attachSectionListeners === 'function') {
        try {
            // Pass the ensured URLSearchParams object
            await attachSectionListeners(sectionId, searchParams);
            console.log(`[Section] Successfully attached listeners/populated data for ${sectionId}.`);
        } catch (error) {
            console.error(`[Section] Error during attachSectionListeners for ${sectionId}:`, error);
        }
    } else {
        console.error(`[Section] attachSectionListeners function not found! Cannot populate data or attach listeners for ${sectionId}.`);
    }
}

function handleAuthChange(user) {
    const isAdmin = user ? isCurrentUserAdmin() : false;
    console.log(`[Auth Change] Updating visibility. User: ${!!user}, Admin: ${isAdmin}`);

    document.querySelectorAll('.public-only').forEach(el => el.style.display = user ? 'none' : 'block');
    document.querySelectorAll('.player-only').forEach(el => el.style.display = user ? 'block' : 'none');
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = user && isAdmin ? 'block' : 'none');

    document.querySelectorAll('.player-only-flex').forEach(el => el.style.display = user ? 'flex' : 'none');
    document.querySelectorAll('.admin-only-flex').forEach(el => el.style.display = user && isAdmin ? 'flex' : 'none');

    const profileSection = document.getElementById('profile-section');
    if (profileSection) profileSection.style.display = user ? 'block' : 'none';

    const loginLink = document.getElementById('player-login-link');
    if (loginLink) loginLink.style.display = user ? 'none' : 'block';

    console.log("[Auth Change] Visibility update complete.");
}

// --- Auth Callbacks ---
function handleUserLogin(user, playerProfile) {
    console.log("[Auth Callback] Handling User Login UI updates.");
    currentUser = user; // Update the global user object
    // Add detailed logging for the received playerProfile
    console.log("[Auth Callback] Received playerProfile:", JSON.stringify(playerProfile)); // currentPlayer is already set globally by ensurePlayerProfile

    if (typeof updateProfileUI === 'function') {
        console.log("[Auth Callback] Calling updateProfileUI...");
        updateProfileUI(playerProfile); // Pass the received profile
    } else {
        console.error("handleUserLogin: updateProfileUI function not found!");
    }

    if (typeof handleAuthChange === 'function') {
        console.log("[Auth Callback] Calling handleAuthChange...");
        handleAuthChange(user); // Update general UI visibility
    } else {
        console.error("handleUserLogin: handleAuthChange function not found!");
    }

    console.log(`[Auth Callback] Login processed. Current section: ${currentSectionId}.`);

    // Check if user is stuck on a public-only page after login
    const currentSectionElement = document.getElementById(currentSectionId);
    if (currentSectionElement && (currentSectionElement.matches('.public-only') || currentSectionId === 'player-login-section' || currentSectionId === 'player-signup-section')) {
        console.log(`[Auth Callback] User logged in but on public section (${currentSectionId}). Triggering navigation.`);
        handleNavigation(); // Re-evaluate navigation based on current hash or default to home
    }
}

function handleUserLogout() {
    console.log("[Auth Callback] Handling User Logout UI updates.");
    currentUser = null; // Clear the global user object
    // currentPlayer is set to null by the auth listener in auth.js
    if (typeof updateProfileUI === 'function') updateProfileUI(null);
    else console.error("handleUserLogout: updateProfileUI function not found!");
    if (typeof handleAuthChange === 'function') handleAuthChange(null);
    else console.error("handleUserLogout: handleAuthChange function not found!");

    // Navigate to home section on logout
    console.log("[Auth Callback] Navigating to home section after logout.");
    showSection('home-section', true); // Force reload home section
}

// --- Navigation ---
function handleNavigation() {
    console.log("[Main] Handling hash change...");
    const hash = window.location.hash.substring(1);
    let sectionId = hash.split('?')[0] || 'home-section';
    let queryParams = new URLSearchParams(hash.split('?')[1] || ''); // Already a URLSearchParams object here

    // --- Section Validation ---
    if (sectionId === 'sport-details-section' && !queryParams.get('sport')) {
        console.warn("[Main] Sport details requested without sport key. Redirecting to sports list.");
        sectionId = 'sports-section';
        queryParams = new URLSearchParams(); // Reset params
        window.history.replaceState(null, '', `#${sectionId}`);
    }
    if (sectionId === 'player-profile-section' && !queryParams.get('playerId')) {
        console.warn("[Main] Player profile requested without player ID. Redirecting to players list.");
        sectionId = 'players-section';
        queryParams = new URLSearchParams(); // Reset params
        window.history.replaceState(null, '', `#${sectionId}`);
    }
    if (sectionId === 'tournament-detail-section' && !queryParams.get('tournamentId')) {
        console.warn("[Main] Tournament details requested without ID. Redirecting to tournaments list.");
        sectionId = 'tournaments-section';
        queryParams = new URLSearchParams(); // Reset params
        window.history.replaceState(null, '', `#${sectionId}`);
    }
    if (sectionId === 'game-info-section' && !queryParams.get('gameId')) {
        console.warn("[Main] Game info requested without ID. Redirecting to results list.");
        sectionId = 'results-section';
        queryParams = new URLSearchParams(); // Reset params
        window.history.replaceState(null, '', `#${sectionId}`);
    }
    // Add validation for add-sport-section (e.g., require admin?)
    if (sectionId === 'add-sport-section' && !isCurrentUserAdmin()) {
        console.warn("[Main] Non-admin attempted to access add-sport-section. Redirecting home.");
        sectionId = 'home-section';
        queryParams = new URLSearchParams(); // Reset params
        window.history.replaceState(null, '', `#${sectionId}`);
    }
    // ADDED: Validation for add-golf-course-section (require admin)
    if (sectionId === 'add-golf-course-section' && !isCurrentUserAdmin()) {
        console.warn("[Main] Non-admin attempted to access add-golf-course-section. Redirecting home.");
        sectionId = 'home-section';
        queryParams = new URLSearchParams(); // Reset params
        window.history.replaceState(null, '', `#${sectionId}`);
    }


    if (typeof showSection === 'function') {
        // Pass the URLSearchParams object directly
        showSection(sectionId, false, queryParams);
    } else {
        console.error("[Main] showSection function not found during hash change!");
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.innerHTML = '<p class="error-text text-center py-10">Error: Core navigation function missing. App cannot load sections.</p>';
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[Main] DOM fully loaded and parsed.");

    // Initialize Firebase
    if (typeof initializeFirebase === 'function') {
        let firebaseInitialized = false;
        try {
            firebaseInitialized = initializeFirebase();

            if (firebaseInitialized && typeof db !== 'undefined' && typeof auth !== 'undefined') {
                console.log("[Main] Firebase initialized successfully and db/auth globals confirmed.");

                // --- Fetch Game Configs Early ---
                let configPromise = null;
                if (typeof fetchAndCacheGameConfigs === 'function') {
                    console.log("[Main] Initiating game config fetch...");
                    configPromise = fetchAndCacheGameConfigs();
                } else {
                    console.error("[Main] fetchAndCacheGameConfigs function not found!");
                    document.body.innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Critical Error: Cannot load game configurations.</p>';
                    return;
                }

                // --- Setup Auth Listener (using auth.js) ---
                // This listener handles setting currentPlayer and calling our callbacks
                if (auth && typeof setupAuthStateListener === 'function') {
                    setupAuthStateListener(auth, handleUserLogin, handleUserLogout);
                    console.log("[Main] Auth state listener setup initiated via auth.js.");
                } else {
                     console.error("[Main] Firebase Auth instance or setupAuthStateListener function is not available.");
                     document.body.innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Critical Error: Authentication system failed to initialize.</p>';
                     return;
                }

                // --- Wait for Configs Before Initial UI Setup & Nav ---
                try {
                    console.log("[Main] Waiting for game configs before initial UI setup...");
                    await configPromise;
                    console.log("[Main] Game configs ready.");

                    // Fetch players AFTER configs are ready (needed for profile page ratings etc.)
                    if (typeof fetchAllPlayersForCache === 'function') {
                        await fetchAllPlayersForCache();
                    } else {
                        console.error("fetchAllPlayersForCache function not found.");
                    }

                    // Setup common UI elements like nav, theme toggle
                    if (typeof setupCommonUI === 'function') {
                        setupCommonUI();
                        console.log("[Main] setupCommonUI completed.");
                    } else {
                        console.error("[Main] setupCommonUI function not found!");
                    }

                    // Initial navigation based on URL hash or default
                    // This runs *after* configs are loaded and auth listener is attached.
                    // The first auth event might still be pending, but navigation will proceed.
                    // handleUserLogin/Logout will correct if needed.
                    handleNavigation();
                    console.log("[Main] Initial navigation handled.");

                    // Add listener for hash changes
                    if (!window.hasHashChangeListener) {
                        window.addEventListener('hashchange', handleNavigation);
                        window.hasHashChangeListener = true;
                        console.log("[Main] Hash change listener added.");
                    }

                    // Note: Initial handleAuthChange is now handled by the callbacks
                    // handleUserLogin/handleUserLogout which are triggered by the auth.js listener.

                } catch (error) {
                     console.error("[Main] Error waiting for configs or during initial setup:", error);
                     const mainContent = document.getElementById('main-content');
                     if(mainContent) mainContent.innerHTML = `<p class="error-text text-center py-10">Error during application initialization: ${error.message}</p>`;
                }

            } else {
                console.error("[Main] Firebase initialization failed or db/auth globals not set.");
                if (!firebaseInitialized) {
                     console.error("[Main] initializeFirebase() returned false.");
                } else {
                     console.error(`[Main] db defined: ${typeof db !== 'undefined'}, auth defined: ${typeof auth !== 'undefined'}`);
                     document.body.innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Critical Error: Firebase connection incomplete. Check console.</p>';
                }
            }

        } catch (error) {
            console.error("[Main] Error during Firebase initialization call:", error);
            document.body.innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Critical Error: Firebase initialization threw an exception. Please check console.</p>';
        }
    } else {
        console.error("[Main] initializeFirebase function not found!");
        document.body.innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Critical Error: Firebase setup function missing.</p>';
    }
});

console.log("main.js finished execution");
