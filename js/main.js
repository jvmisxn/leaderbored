// --- main.js ---

// Use globals declared in firebase_config.js
// DO NOT redeclare 'db' or 'auth' here

// --- Placeholder Function Definitions ---
// Define these BEFORE they are called in DOMContentLoaded if they are in this file,
// or ensure they are globally available if defined in other files.

function setupEventListeners() {
    console.log("[Main] Setting up event listeners...");
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('data-target');
            if (targetId && typeof showSection === 'function') {
                showSection(targetId);
            }
        });
    });
    console.log("[Main] Event listeners setup complete.");
}

function setupAuthObserver() {
    console.log("[Main] Setting up auth observer...");
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                console.log("[Auth] User logged in:", user.uid);
                // Handle user login logic here
            } else {
                console.log("[Auth] User logged out.");
                // Handle user logout logic here
            }
        });
    } else {
        console.error("[Auth] Firebase Auth object not available.");
    }
}

function handleHashChange() {
    console.log("[Main] Handling hash change...");
    const hash = window.location.hash.substring(1);
    const sectionId = hash.split('?')[0] || 'home-section';
    if (typeof showSection === 'function') {
        showSection(sectionId);
    } else {
        console.error("[Main] showSection function not found!");
    }
}

// --- Navigation Setup ---
function setupNavigation() {
    console.log("[Nav] Setting up navigation listeners.");
    try {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', async (event) => {
                event.preventDefault();
                const targetSectionId = link.getAttribute('data-target');
                if (targetSectionId) {
                    if (typeof showSection === 'function') {
                        await showSection(targetSectionId);
                    } else {
                        console.error("[Nav] showSection function not available!");
                    }
                } else {
                    console.warn("[Nav] Clicked nav link has no data-target:", link);
                }
            });
        });
        console.log("[Nav] Navigation listeners attached successfully."); // Success log
    } catch (error) {
        console.error("[Nav] Error setting up navigation:", error);
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[INIT] DOM fully loaded and parsed.");

    // Initialize Firebase first
    if (typeof initializeFirebase === 'function') {
        const initSuccess = initializeFirebase();
        if (!initSuccess) {
            console.error("[INIT] Firebase initialization failed! Halting setup.");
            // Display critical error
            const mainContent = document.getElementById('main-content');
            if (mainContent) mainContent.innerHTML = '<p class="error-text text-center py-10">Critical Error: Could not connect to Firebase. Please check configuration and network.</p>';
            return; // Stop
        }
        console.log("[INIT] Firebase initialization reported success.");
    } else {
        console.error("[INIT] initializeFirebase function not found! Halting setup.");
        // Display critical error
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.innerHTML = '<p class="error-text text-center py-10">Critical Error: Firebase setup function missing. App cannot load.</p>';
        return; // Stop
    }

    // Verify db is available AFTER initialization attempt
    if (typeof db === 'undefined' || !db) {
        console.error("[INIT] Firestore 'db' object not available after initialization attempt.");
        // Don't return yet, maybe auth observer can still run if auth object exists
    } else {
        console.log("[INIT] Firestore 'db' object confirmed available.");
    }

    // Setup UI listeners (including mobile nav)
    // These should now be defined above or loaded from other scripts
    if (typeof setupEventListeners === 'function') {
        setupEventListeners();
    } else {
        console.error("[INIT] setupEventListeners function STILL not found."); // Changed to error
    }
    if (typeof setupMobileNavListeners === 'function') {
        setupMobileNavListeners();
    } else {
        console.warn("[INIT] setupMobileNavListeners function not found."); // Keep as warn if less critical
    }

    // Setup Auth Observer
    if (typeof setupAuthObserver === 'function') {
        setupAuthObserver();
    } else {
        console.error("[INIT] setupAuthObserver function STILL not found."); // Changed to error
    }

    // Pre-fetch player cache only if db is available
    if (typeof db !== 'undefined' && db) {
        if (typeof fetchAllPlayersForCache === 'function') {
            console.log("[INIT] Pre-fetching player cache...");
            await fetchAllPlayersForCache(); // This might still fail if offline
        } else {
            console.warn("[INIT] fetchAllPlayersForCache function not found.");
        }
    } else {
        console.warn("[INIT] Skipping player cache pre-fetch because db is not available.");
    }

    // Handle initial section display based on hash or default
    // This should now be defined above
    if (typeof handleHashChange === 'function') {
        handleHashChange();
    } else {
        console.error("[INIT] handleHashChange function STILL not found."); // Changed to error
    }

    console.log("[INIT] Initial setup sequence complete (may have errors).");

});

// --- Navigation & Section Handling ---
/**
 * Shows a section by ID and handles templates and population logic.
 * @param {string} sectionId - The ID of the section to show.
 */
async function showSection(sectionId, forceLoad = false, queryParams = {}) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error("[Section] Main content container not found.");
        return;
    }

    // Find the template for the section
    console.log(`[Section Debug] Processing sectionId: '${sectionId}'`); // Log the exact sectionId
    const templateId = `template-${sectionId}`;
    console.log(`[Section] Looking for template with ID: #${templateId}`);
    console.log(`[Section Debug] Document state before getElementById: ${document.readyState}`);
    const template = document.getElementById(templateId);

    // *** Add check for template existence ***
    if (!template) {
        console.error(`[Section] Template NOT FOUND for sectionId: ${sectionId} (Expected ID: #${templateId})`);
        // Log more of the body to see if templates are present at all
        console.log("[Section Debug] document.body.innerHTML (start):", document.body.innerHTML.substring(0, 1000) + "...");
        mainContent.innerHTML = `<p class="error-text text-center py-10">Error: Section content template not found (#${templateId}). Check HTML and template ID.</p>`;
        currentSectionId = null;
        return;
    }
    // *** End check ***

    mainContent.innerHTML = '';
    const clone = template.content.cloneNode(true);
    mainContent.appendChild(clone);
    currentSectionId = sectionId;
    window.location.hash = sectionId;

    console.log(`[Section] Displayed section: ${sectionId}. Populating data...`);

    // --- NEW DEBUG LOG ---
    console.log(`[Section Debug] Before switch: typeof populateTournamentsList = ${typeof populateTournamentsList}`);
    // --- END NEW DEBUG LOG ---

    // Call data population functions based on the section ID
    try {
        switch (sectionId) {
            case 'home-section':
                if (typeof populateDashboard === 'function') {
                    console.log(`[Section] Calling populateDashboard for ${sectionId}.`);
                    await populateDashboard();
                } else {
                    console.error(`[Section] populateDashboard function not found for ${sectionId}.`);
                }
                break;
            case 'players-section':
                if (typeof populatePlayersList === 'function') {
                    console.log(`[Section] Calling populatePlayersList for ${sectionId}.`);
                    await populatePlayersList();
                } else {
                    console.error(`[Section] populatePlayersList function not found for ${sectionId}.`);
                }
                document.getElementById('add-player-btn')?.addEventListener('click', openAddPlayerModal);
                break;
            case 'rankings-section':
                console.log("[Section] Rankings section shown. Calling setup functions..."); // <-- Add Log
                if (typeof populateRankingsFilter === 'function') {
                    console.log("[Section] Calling populateRankingsFilter..."); // <-- Add Log
                    await populateRankingsFilter();
                    console.log("[Section] populateRankingsFilter call finished."); // <-- Add Log
                } else {
                    console.error("[Section] populateRankingsFilter function not found.");
                }
                if (typeof updateRankingsVisibility === 'function') {
                    console.log("[Section] Calling updateRankingsVisibility..."); // <-- Add Log
                    await updateRankingsVisibility();
                    console.log("[Section] updateRankingsVisibility call finished."); // <-- Add Log
                } else {
                    console.error("[Section] updateRankingsVisibility function not found.");
                }
                // Add listener for filter change *after* population
                document.getElementById('rankings-game-filter')?.addEventListener('change', updateRankingsVisibility);
                break;
            case 'results-section':
                console.log("[Section] Results section shown. Calling setup functions..."); // <-- Add Log
                if (typeof populateResultsFilter === 'function') {
                    console.log("[Section] Calling populateResultsFilter..."); // <-- Add Log
                    await populateResultsFilter();
                    console.log("[Section] populateResultsFilter call finished."); // <-- Add Log
                } else {
                    console.error("[Section] populateResultsFilter function not found.");
                }
                if (typeof populateResultsTable === 'function') {
                    console.log("[Section] Calling initial populateResultsTable..."); // <-- Add Log
                    await populateResultsTable(); // Initial load with 'all' games
                    console.log("[Section] Initial populateResultsTable call finished."); // <-- Add Log
                } else {
                    console.error("[Section] populateResultsTable function not found.");
                }
                // Add listener for filter change *after* population
                const resultsFilter = document.getElementById('results-game-filter');
                if (resultsFilter) {
                    resultsFilter.addEventListener('change', async (event) => {
                        const selectedGame = event.target.value;
                        console.log(`[RESULTS FILTER] Filter changed to: ${selectedGame}. Reloading table...`);
                        if (typeof populateResultsTable === 'function') {
                            await populateResultsTable(selectedGame); // Pass selected game key
                        }
                    });
                } else {
                     console.warn("[Section] Results filter dropdown (#results-game-filter) not found for listener attachment.");
                }
                break;
            case 'tournaments-section':
                if (typeof populateTournamentsList === 'function') {
                    console.log('[Section] Populating tournaments list with 20 items...');
                    const hash = window.location.hash;
                    const params = new URLSearchParams(hash.split('?')[1] || '');
                    const filter = params.get('filter') || 'upcoming';
                    await populateTournamentsList('tournaments-list-full', 20, filter);
                    console.log('[Section] Tournament list population complete.');
                } else {
                    console.error('[Section] populateTournamentsList function not found!');
                }
                break;
            default:
                console.log(`[Section] No specific population logic for ${sectionId}.`);
        }
        console.log(`[Section] Data population attempt complete for ${sectionId}.`);
    } catch (error) {
        console.error(`[Section] Error populating data for ${sectionId}:`, error);
        mainContent.innerHTML += `<p class="error-text text-center">Error loading data for this section.</p>`;
    }
}

// --- Global Event Listeners ---
function setupGlobalEventListeners() {
    const mainContent = document.getElementById('main-content');
    const body = document.body; // For modals potentially outside main-content
    const profileButton = document.getElementById('profile-photo-button'); // Profile dropdown toggle

    if (!mainContent) {
        console.error("Cannot setup global listeners: #main-content not found.");
        return;
    }
    console.log("[Events] Setting up global event listeners on #main-content and body.");

    // --- NEW: Check if closeModal is available when listener is set up ---
    if (typeof closeModal !== 'function') {
        console.error("[Events Setup] CRITICAL: closeModal function is NOT defined when setting up global listeners!");
    } else {
        console.log("[Events Setup] closeModal function confirmed available.");
    }
    // --- END Check ---

    // --- Main Content Click Delegation ---
    mainContent.addEventListener('click', async (event) => {
        // Player Card Click (Players Section)
        const playerEntry = event.target.closest('.player-entry');
        if (playerEntry) {
            console.log("[Event] Click detected inside a .player-entry element."); // <-- Add Log
            const playerId = playerEntry.getAttribute('data-player-id');
            console.log(`[Event] Player entry clicked. ID: ${playerId}`); // <-- Add Log
            if (playerId && typeof openPlayerModal === 'function') {
                console.log(`[Event] Calling openPlayerModal for ID: ${playerId}`); // <-- Add Log
                await openPlayerModal(playerId);
            } else if (!playerId) {
                console.warn("[Event] Player entry clicked, but no data-player-id found.");
            } else {
                console.error("[Event] openPlayerModal function not found!");
            }
            return; // Stop further processing if it was a player card click
        }

        // ... existing tournament link click ...
        // ... existing game link click ...

    }); // End mainContent click listener

    // --- Body Click Delegation (Modals, Dropdowns) ---
    body.addEventListener('click', (event) => {
        // --- Log the actual clicked element and bubble status ---
        console.log("[Event Body Click] Target:", event.target);
        console.log("[Event Body Click] Bubbles:", event.bubbles); // <-- ADD THIS LINE
        // --- END Log ---

        // --- MODIFIED: Use closest() for modal close buttons ---
        const closeButton = event.target.closest('.modal-close-button');
        const cancelButton = event.target.closest('.modal-cancel-button'); // Keep this for cancel buttons if any remain

        if (closeButton || cancelButton) {
            // --- Add check if closeModal exists right before calling ---
            if (typeof closeModal !== 'function') {
                console.error("[Event] closeModal function is NOT available at the moment of click!");
                // Optionally alert the user or provide fallback
                // alert("Error: Cannot close modal. Function missing.");
                return; // Stop if function is missing
            }
            // --- End check ---

            const modal = (closeButton || cancelButton).closest('.modal-container'); // Find parent modal from the button
            if (modal) { // Check modal exists first
                if (closeButton) {
                    console.log(`[Event] Modal 'X' close button (or element inside) clicked for modal: #${modal.id}. Calling closeModal...`);
                } else {
                    console.log(`[Event] Modal cancel button (or element inside) clicked for modal: #${modal.id}. Calling closeModal...`);
                }
                closeModal(modal); // Call the function from ui_utils.js
            } else {
                console.warn("[Event] Close/Cancel button clicked, but couldn't find parent modal container.");
            }
            return; // Stop further processing
        }
        // --- END MODIFICATION ---

        // Close modal by clicking background (overlay)
        // Check if the direct target IS the modal container (overlay)
        if (event.target.matches('.modal-container')) {
            // The openModal function now handles adding/removing this specific listener
            // We might not need this block anymore if openModal's listener works reliably.
            // Let's keep it for now but log if it fires unexpectedly.
            console.log(`[Event Body Click] Click detected directly on modal container background: #${event.target.id}. Should be handled by openModal's listener.`);
            // If openModal's listener isn't working, uncomment the below:
            // if (typeof closeModal === 'function') {
            //     closeModal(event.target);
            // } else {
            //     console.error("[Event] closeModal function not found for background click!");
            // }
            return;
        }

        // Profile Dropdown Toggle
        if (profileButton && profileButton.contains(event.target)) {
            if (typeof toggleProfileDropdown === 'function') {
                toggleProfileDropdown();
            } else {
                console.error("[Event] toggleProfileDropdown function not found!");
            }
            return;
        }

        // Close profile dropdown if clicking outside
        const profileDropdown = document.getElementById('profile-dropdown');
        if (profileDropdown && !profileDropdown.classList.contains('hidden') && !profileDropdown.contains(event.target) && !profileButton.contains(event.target)) {
             if (typeof toggleProfileDropdown === 'function') { // Use toggle to ensure consistent state handling
                 toggleProfileDropdown(); // This will hide it
             } else {
                 console.error("[Event] toggleProfileDropdown function not found!");
             }
             return;
        }

        // Player Info Modal Actions (Edit/Cancel/Save/Delete)
        const playerModal = document.getElementById('player-info-modal');
        if (playerModal && playerModal.contains(event.target)) {
            const targetId = event.target.id;
            console.log(`[Event] Click inside player modal. Target ID: ${targetId}`); // <-- Add Log
            switch (targetId) {
                case 'modal-edit-player-btn':
                    if (typeof togglePlayerModalEdit === 'function') togglePlayerModalEdit(true);
                    else console.error("[Event] togglePlayerModalEdit function not found!");
                    break;
                case 'modal-cancel-edit-player-btn':
                    if (typeof togglePlayerModalEdit === 'function') togglePlayerModalEdit(false);
                    else console.error("[Event] togglePlayerModalEdit function not found!");
                    break;
                case 'modal-save-player-btn':
                    if (typeof savePlayerChanges === 'function') savePlayerChanges();
                    else console.error("[Event] savePlayerChanges function not found!");
                    break;
                case 'modal-delete-player-btn':
                    if (typeof deletePlayer === 'function') deletePlayer();
                    else console.error("[Event] deletePlayer function not found!");
                    break;
            }
            // Don't return here, allow other potential listeners within the modal
        }

        // Logout Link
        if (event.target.id === 'dropdown-logout') {
            event.preventDefault();
            if (typeof logoutUser === 'function') {
                logoutUser();
            } else {
                console.error("[Event] logoutUser function not found!");
            }
            return;
        }

        // Add other global interactions here (e.g., specific button clicks not tied to a section)

    }); // End body click listener

    console.log("[Events] Global event listeners setup complete.");
}

// --- Attach Section Listeners ---
/**
 * Handles clicks within the tournament lists using event delegation.
 * Navigates to the tournament detail page if a 'View Details' link is clicked.
 * Handles clicks on 'Opt-In' buttons.
 * @param {Event} event - The click event object.
 */
function handleTournamentListClick(event) {
    // Find the closest ancestor anchor tag with the specific class
    const detailsLink = event.target.closest('a.view-tournament-details-link');
    const optInButton = event.target.closest('button.opt-in-tournament-btn');

    if (detailsLink) {
        event.preventDefault(); // Prevent default anchor behavior
        const tournamentId = detailsLink.getAttribute('data-tournament-id');
        console.log(`[Nav] Tournament details link clicked. ID: ${tournamentId}`);
        if (tournamentId) {
            const targetHash = `#tournament-detail-section?tournamentId=${tournamentId}`;
            console.log(`[Nav] Navigating to hash: ${targetHash}`);
            window.location.hash = targetHash; // Change the hash to trigger navigation
        } else {
            console.warn("[Nav] Clicked tournament details link, but data-tournament-id attribute was missing or empty.");
        }
    } else if (optInButton) {
        event.preventDefault();
        const tournamentId = optInButton.getAttribute('data-tournament-id');
        console.log(`[Tournament Opt-In] Opt-In button clicked. ID: ${tournamentId}`);
        if (tournamentId && typeof optIntoTournament === 'function') {
            optIntoTournament(tournamentId, optInButton); // Pass button for UI feedback
        } else {
            console.warn("[Tournament Opt-In] Clicked opt-in button, but ID or function was missing.");
            alert("Could not process opt-in request.");
        }
    }
} // End handleTournamentListClick

/**
 * Attaches necessary event listeners after a section's content is loaded into the DOM.
 * Also triggers data population for the section.
 * @param {string} sectionId - The ID of the section that was just loaded.
 */
async function attachSectionListeners(sectionId) {
    console.log(`[Listeners] Attaching listeners and populating data for: ${sectionId}`);

    const hash = window.location.hash;
    const hashParts = hash.split('?');
    const params = new URLSearchParams(hashParts[1] || '');

    try {
        switch (sectionId) {
            // ... existing cases for home, live-game, submit-past-game, players, rankings, results, sports, player-login ...

            case 'tournaments-section':
                // Remove this section as we're now handling population in showSection
                break;

            case 'tournament-detail-section':
                const tournamentId = params.get('tournamentId'); // Get ID from params
                console.log(`[Listeners] Current hash for tournament detail: ${hash}`);
                console.log(`[Listeners] Extracted tournamentId from URL params: ${tournamentId}`);

                if (tournamentId && typeof populateTournamentDetails === 'function') {
                    console.log(`[Listeners] Calling populateTournamentDetails with ID: ${tournamentId}`);
                    await populateTournamentDetails(tournamentId);
                } else if (!tournamentId) {
                    console.warn("[Listeners] No tournamentId found or extracted from URL for tournament-detail-section");
                    document.getElementById('tournament-detail-content').innerHTML = '<p class="error-text">No tournament ID specified in the URL.</p>';
                    document.getElementById('tournament-detail-name').textContent = 'Error';
                } else {
                     console.error("[Listeners] populateTournamentDetails function not found!");
                }
                // Add listener for edit button
                const editBtn = document.getElementById('edit-tournament-btn');
                if (editBtn) {
                    editBtn.style.display = isAdmin ? 'inline-block' : 'none'; // Show only for admin
                    editBtn.removeEventListener('click', handleEditTournamentClick); // Use a wrapper if needed
                    editBtn.addEventListener('click', handleEditTournamentClick); // Add listener
                }
                break;

            case 'game-info-section':
                const params = new URLSearchParams(window.location.hash.split('?')[1]);
                const gameId = params.get('gameId');
                if (gameId && typeof populateGameInfoScreen === 'function') {
                    await populateGameInfoScreen(gameId);
                } else {
                    console.warn("[Listeners] No gameId found in URL for game-info-section");
                    document.getElementById('game-info-content').innerHTML = '<p class="error-text">No game ID specified.</p>';
                }
                if (typeof setupGameInfoListeners === 'function') setupGameInfoListeners();
                break;

            default:
                console.log(`[Listeners] No specific listeners or population needed for ${sectionId}`);
        }
    } catch (error) {
        console.error(`[Listeners] Error during setup for section ${sectionId}:`, error);
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.innerHTML = `<p class="error-text text-center py-10">Error loading section: ${error.message}</p>`;
    }

    // Re-apply visibility based on auth state after loading new content
    if (typeof handleAuthChange === 'function' && typeof firebase !== 'undefined' && firebase.auth) {
        handleAuthChange(firebase.auth().currentUser);
    } else {
        console.warn("[Listeners] handleAuthChange or firebase.auth not available for visibility update.");
    }

} // End attachSectionListeners

// Helper function to handle edit button click (to avoid recreating anonymous function)
function handleEditTournamentClick() {
    const hash = window.location.hash;
    const hashParts = hash.split('?');
    const params = new URLSearchParams(hashParts[1] || '');
    const tournamentId = params.get('tournamentId');
    if (tournamentId && typeof openEditTournamentModal === 'function') {
        openEditTournamentModal(tournamentId);
    } else {
        alert("Cannot edit: Tournament ID is missing or function unavailable.");
    }
}

// ... Auth Callbacks ...
function handleUserLogin(user, playerProfile) {
    // ...existing code...
}

function handleUserLogout() {
    // ...existing code...
}

// ... Utility ...
function debounce(func, wait) {
    // ...existing code...
};

console.log("[Main] main.js loaded.");
