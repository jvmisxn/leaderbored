console.log("main.js starting execution"); // <-- KEEP THIS LINE

// --- main.js ---
console.log("[Main] main.js script executing."); // <-- KEEP THIS LINE

// Use globals declared in firebase_config.js
// DO NOT redeclare 'db' or 'auth' here

// Global Cache Variables
let globalPlayerCache = {}; // Already exists
let playersCachePopulated = false; // Already exists
let globalGolfCourseCache = {}; // ADDED
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

// Helper function to determine if a section needs player cache
function needsPlayerCache(sectionId) {
    return ['home-section', 'players-section', 'rankings-section', 
            'results-section', 'live-game-section', 'submit-score-section',
            'player-profile-section', 'tournaments-section'].includes(sectionId);
}

/**
 * Updates the active state of navigation links based on the current section.
 * @param {string|null} activeSectionId - The ID of the currently active section, or null.
 */
function updateActiveNavLink(activeSectionId) {
    console.log(`[Nav Update] Updating active link for section: ${activeSectionId}`);
    const navLinks = document.querySelectorAll('.nav-link'); // Use a common class for main nav links

    navLinks.forEach(link => {
        const targetSection = link.getAttribute('data-target'); // Use data-target attribute

        // Check if the link's target matches the active section ID
        if (targetSection && targetSection === activeSectionId) {
            link.classList.add('active-nav-link'); // Add your active class (e.g., 'text-indigo-500', 'font-bold')
            link.classList.remove('inactive-nav-link'); // Remove inactive class if you use one
            console.log(`[Nav Update] Activating link for: ${targetSection}`);
        } else {
            link.classList.remove('active-nav-link');
            link.classList.add('inactive-nav-link'); // Add inactive class if needed
        }
    });
}

async function loadTemplateContent(templateElement, sectionId) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) { // Check added earlier
        console.error("[NAV Template] Main content container not found.");
        return false;
    }
    if (!templateElement || !templateElement.content) {
        console.error("[NAV Template] Invalid template element provided for loading.");
        // Avoid modifying mainContent here if it might be in an intermediate state
        return false;
    }
    console.log(`[NAV Template] START Load for section: ${sectionId} using template: ${templateElement.id}`);

    try {
        mainContent.innerHTML = ''; // Clear previous content *safely*
        const clonedContent = templateElement.content.cloneNode(true);
        mainContent.appendChild(clonedContent);
        const sectionAdded = !!mainContent.querySelector(`section#${sectionId}`);
        if (!sectionAdded) {
            console.error(`[NAV Template] CRITICAL: Failed to append <section id="${sectionId}"> from template ${templateElement.id}. Aborting population.`);
            mainContent.innerHTML = `<p class="error-text text-center py-10">Error: Failed to load page structure for ${sectionId}.</p>`;
            return false;
        }
        console.log(`[NAV Template] Successfully loaded template for ${sectionId}.`); // Added success log
        return true;

    } catch (error) {
        console.error(`[NAV Template] Error during template cloning/appending for ${sectionId}:`, error);
        // Attempt to clear and show error, but be cautious
        if (mainContent) {
            mainContent.innerHTML = `<p class="error-text text-center py-10">Error: Failed to build page structure for ${sectionId}.</p>`;
        }
        return false;
    }
}

async function attachSectionListeners(sectionId, params = {}) {
    console.log("[AttachListeners] Attaching listeners/populating for section:", sectionId);
    
    // Ensure game configs are loaded first
    if (!window.globalGameConfigs) {
        console.log("[AttachListeners] Game configs not ready, fetching...");
        await fetchAndCacheGameConfigs();
    }

    // Always pass params as the second argument
    return attachSpecificSectionListeners(sectionId, params);
}

// --- Profile Summary and Settings Section Logic ---
async function populateProfileSummary(sectionElement) {
    const summaryDiv = sectionElement.querySelector('#profile-summary');
    summaryDiv.innerHTML = '<p class="loading-text">Loading profile...</p>';
    let player = window.currentPlayer;
    if (!player) {
        // Try to get from cache if available
        const userId = typeof getCurrentUserId === 'function' ? getCurrentUserId() : null;
        if (userId && window.globalPlayerCache && window.globalPlayerCache[userId]) {
            player = window.globalPlayerCache[userId];
        }
    }
    if (!player) {
        summaryDiv.innerHTML = '<p class="error-text">Not logged in.</p>';
        return;
    }
    summaryDiv.innerHTML = `
        <div class="flex items-center gap-4 mb-4">
            <img src="${player.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || '?')}&background=E0E7FF&color=4F46E5&size=64`}" alt="Avatar" class="w-16 h-16 rounded-full object-cover border border-gray-300 dark:border-gray-600">
            <div>
                <h2 class="text-xl font-bold">${player.name || ''}</h2>
                <p class="text-sm text-gray-500">${player.email || ''}</p>
            </div>
        </div>
        <p class="text-gray-700 dark:text-gray-300 mb-2">${player.bio ? player.bio : ''}</p>
        <p class="text-xs text-gray-500">${player.public === false ? 'Private Profile' : 'Public Profile'}</p>
    `;
}

function setupSettingsSection(sectionElement) {
    const form = document.getElementById('settings-profile-form');
    if (!form) return;
    const nameInput = form.querySelector('#settings-profile-name');
    const iconUrlInput = form.querySelector('#settings-profile-icon-url');
    const avatarPreview = form.querySelector('#settings-profile-avatar-preview');
    const bioInput = form.querySelector('#settings-profile-bio');
    const publicCheckbox = form.querySelector('#settings-profile-public');
    const showStatsCheckbox = form.querySelector('#settings-profile-show-stats');
    const errorElement = form.querySelector('#settings-profile-error');

    // Load current player data
    const userId = getCurrentUserId();
    if (!userId || !playersCachePopulated) {
        fetchAllPlayersForCache().then(() => setupSettingsSection(sectionElement));
        return;
    }
    const player = globalPlayerCache[userId];
    if (!player) {
        if (errorElement) errorElement.textContent = 'Could not load your profile.';
        return;
    }
    nameInput.value = player.name || '';
    iconUrlInput.value = player.iconUrl || '';
    bioInput.value = player.bio || '';
    publicCheckbox.checked = player.public !== false; // default to true
    showStatsCheckbox.checked = player.showStats !== false; // default to true
    avatarPreview.src = player.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || '?')}&background=E0E7FF&color=4F46E5&size=64`;

    // Instant avatar preview
    iconUrlInput.addEventListener('input', () => {
        const url = iconUrlInput.value.trim();
        avatarPreview.src = url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput.value || '?')}&background=E0E7FF&color=4F46E5&size=64`;
    });
    nameInput.addEventListener('input', () => {
        if (!iconUrlInput.value.trim()) {
            avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput.value || '?')}&background=E0E7FF&color=4F46E5&size=64`;
        }
    });

    // Save changes
    form.onsubmit = async (e) => {
        e.preventDefault();
        errorElement.textContent = '';
        const updates = {
            name: nameInput.value.trim(),
            iconUrl: iconUrlInput.value.trim() || null,
            bio: bioInput.value.trim(),
            public: publicCheckbox.checked,
            showStats: showStatsCheckbox.checked
        };
        if (!updates.name) {
            errorElement.textContent = 'Display name is required.';
            return;
        }
        try {
            await db.collection('players').doc(userId).update(updates);
            playersCachePopulated = false;
            await fetchAllPlayersForCache();
            alert('Profile updated!');
            // Optionally, refresh the profile page if open
        } catch (err) {
            errorElement.textContent = 'Error saving profile: ' + err.message;
        }
    };
}

// Attach to navigation logic
const origAttachSpecificSectionListeners = typeof attachSpecificSectionListeners === 'function' ? attachSpecificSectionListeners : null;
async function attachSpecificSectionListeners(sectionId, params = {}) {
    console.log(`[Router] Attaching listeners for section: ${sectionId}, Params:`, params);

    // Ensure caches are populated early for common sections
    if (['home-section', 'rankings-section', 'results-section', 'submit-score-section', 'live-game-section'].includes(sectionId)) {
        if (!window.globalGameConfigs) fetchAndCacheGameConfigs().catch(console.error);
        if (!playersCachePopulated) fetchAllPlayersForCache().catch(console.error);
    }

    try {
        switch (sectionId) {
            case 'home-section':
                if (typeof populateDashboard === 'function') await populateDashboard(params);
                break;
            case 'players-section':
                if (typeof populatePlayersList === 'function') await populatePlayersList(params);
                break;
            case 'rankings-section':
                if (typeof populateRankings === 'function') await populateRankings(params);
                break;
            case 'results-section':
                if (typeof populateResultsTable === 'function') await populateResultsTable(params);
                break;
            case 'sports-section':
                if (typeof populateAllSportsList === 'function') await populateAllSportsList(params);
                break;
            case 'sport-details-section':
                if (typeof populateSportDetails === 'function') {
                    await populateSportDetails(params.sport, params);
                }
                break;
            case 'submit-score-section':
                if (typeof loadSubmitGameFormFields === 'function') await loadSubmitGameFormFields(params);
                break;
            case 'live-game-section':
                if (typeof setupLiveGameSection === 'function') await setupLiveGameSection(params);
                break;
            case 'game-info-section':
                if (typeof populateGameInfo === 'function') {
                    await populateGameInfo(params.gameId, params);
                }
                break;
            case 'player-profile-section':
                if (typeof populatePlayerProfilePage === 'function') {
                    await populatePlayerProfilePage(params.playerId);
                }
                break;
            case 'edit-profile-section':
                // ...existing code...
        }
    } catch (error) {
        console.error(`[Router] Error attaching listeners or populating section ${sectionId}:`, error);
        // Optionally display a generic error message in the section
        if (params) {
            params.innerHTML = `<p class="error-text text-center p-5">Error loading this section.</p>`;
        }
    }

    // Make player links clickable after content is potentially loaded
    if (typeof makePlayerElementsClickable === 'function') {
        makePlayerElementsClickable(); // Always use default (document)
    }
}

/**
 * Runs specific update logic for a section after it has been loaded and listeners attached.
 * Useful for refreshing data that might change while the user is on the page.
 * @param {string} sectionId
 * @param {HTMLElement} sectionElement
 * @param {boolean} isReload - Indicates if this is a forced reload or initial load.
 */
async function runSectionSpecificUpdates(sectionId, sectionElement, isReload) {
    console.log(`[Section Update] Running updates for ${sectionId}, isReload: ${isReload}`);

    // Always re-attach player click listeners in case dynamic content was added
    if (needsPlayerCache(sectionId)) {
        makePlayerElementsClickable(sectionElement);
    }

    // Add specific update logic here if needed for certain sections
    switch (sectionId) {
        case 'home-section':
            // Example: if (isReload && typeof populateRecentGames === 'function') await populateRecentGames();
            break;
        case 'rankings-section':
            // Example: if (isReload && typeof populateRankings === 'function') await populateRankings(sectionElement);
            break;
        // Add other sections needing refresh logic
        default:
            console.log(`[Section Update] No specific update logic defined for section: ${sectionId}`);
    }

    console.log(`[Section Update] Finished updates for ${sectionId}.`);
}

// --- MAIN NAVIGATION FUNCTION ---
/**
 * Navigates to and loads a given section by ID, optionally forcing reload and passing params.
 * @param {string} sectionId - The ID of the section to show (e.g., 'home-section').
 * @param {boolean} [forceReload=false] - If true, reloads the section even if already active.
 * @param {object} [params={}] - Optional query params to pass (will be encoded in hash).
 */
async function showSection(sectionId, forceReload = false, params = {}) {
    console.log(`[NAV] showSection called for: ${sectionId}, forceReload: ${forceReload}, Params:`, params);
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error("[NAV] Main content container not found.");
        return;
    }
    // Prevent duplicate navigation
    if (!forceReload && currentSectionId === sectionId && JSON.stringify(params) === JSON.stringify(currentQueryParams)) {
        console.log(`[NAV] Section ${sectionId} already active, skipping reload.`);
        return;
    }
    // Store previous section for back button logic
    previousSectionId = currentSectionId;
    previousQueryParams = currentQueryParams;
    currentSectionId = sectionId;
    currentQueryParams = params ? new URLSearchParams(params) : new URLSearchParams();

    // Update URL hash
    let hash = `#${sectionId}`;
    if (Object.keys(params).length > 0) {
        hash += '?' + (new URLSearchParams(params)).toString();
    }
    if (window.location.hash !== hash) {
        window.location.hash = hash;
    }

    // Find the template for this section
    const template = document.getElementById(`template-${sectionId}`);
    if (!template) {
        mainContent.innerHTML = `<p class="error-text text-center py-10">Error: No template found for section <b>${sectionId}</b>.</p>`;
        console.error(`[NAV] No template found for section: ${sectionId}`);
        return;
    }

    // Load the template content
    const loaded = await loadTemplateContent(template, sectionId);
    if (!loaded) {
        console.error(`[NAV] Failed to load template for section: ${sectionId}`);
        return;
    }

    // Update nav link active state
    updateActiveNavLink(sectionId);

    // Attach listeners and populate section, passing the PARAMS object
    await attachSectionListeners(sectionId, params);
    await runSectionSpecificUpdates(sectionId, mainContent, true);

    // Scroll to top for new section
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Log success
    console.log(`[NAV] Section ${sectionId} loaded successfully.`);
}

// --- APP INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('[App Init] DOMContentLoaded fired. Initializing app...');
        // --- FIREBASE INIT ---
        if (typeof initializeFirebase === 'function') {
            const firebaseOk = initializeFirebase();
            if (!firebaseOk) {
                console.error('[App Init] Firebase initialization failed. Aborting app startup.');
                return;
            }

            // Set up auth state listener immediately after Firebase init
            if (typeof setupAuthStateListener === 'function' && auth) {
                // Pass only ONE callback function (handleAuthChange)
                setupAuthStateListener(auth, handleAuthChange);
                console.log('[App Init] Auth state listener initialized.');
            } else {
                console.error('[App Init] Could not setup auth listener - missing function or auth instance.');
            }
        } else {
            console.error('[App Init] initializeFirebase function not found! Aborting app startup.');
            return;
        }
        
        // --- END FIREBASE INIT ---

        if (typeof setupCommonUI === 'function') {
            setupCommonUI();
        } else {
            console.warn('[App Init] setupCommonUI not found. Skipping UI setup.');
        }

        // Parse initial hash and show the correct section
        function getSectionFromHash() {
            const hash = window.location.hash || '#home-section';
            const [section, query] = hash.replace('#', '').split('?');
            const params = new URLSearchParams(query || '');
            return { sectionId: section || 'home-section', params };
        }

        async function handleNavigation(forceReload = false) {
            const { sectionId, params } = getSectionFromHash(); // Get section and params
            // Add detailed log for initial load diagnosis
            console.log(`[NAV] Handling navigation. Section requested: '${sectionId}', Force Reload: ${forceReload}, Params:`, params); 
            // Pass params object correctly
            await showSection(sectionId, forceReload, Object.fromEntries(params.entries()));
        }

        // Initial navigation
        await handleNavigation(true);

        // Listen for hash changes (SPA navigation)
        window.addEventListener('hashchange', () => {
            handleNavigation(false);
        });

        console.log('[App Init] Initialization complete.');
    } catch (err) {
        console.error('[App Init] Critical error during initialization:', err);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '<p class="error-text text-center py-10">Critical error loading app. Please refresh or contact support.</p>';
        }
    }
});
