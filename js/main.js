console.log("main.js starting execution"); // <-- ADD THIS LINE FIRST

// --- main.js ---

// Use globals declared in firebase_config.js
// DO NOT redeclare 'db' or 'auth' here

// Temporary stub to prevent navigation errors if admin logic is not yet implemented
window.isCurrentUserAdmin = window.isCurrentUserAdmin || function() { return false; };

let currentSectionId = null; // Keep track of the currently displayed section

// --- Auth Change Handler (Moved Up) ---
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

// --- Auth Callbacks (Moved Up) ---
function handleUserLogin(user, playerProfile) {
    console.log("[Auth Callback] Handling User Login UI updates.");
    if (typeof updateProfileUI === 'function') updateProfileUI(playerProfile);
    else console.error("handleUserLogin: updateProfileUI function not found!");
    if (typeof handleAuthChange === 'function') handleAuthChange(user);
    else console.error("handleUserLogin: handleAuthChange function not found!");
    if (currentSectionId === 'player-login-section') {
        showSection('home-section');
    }
}

function handleUserLogout() {
    console.log("[Auth Callback] Handling User Logout UI updates.");
    if (typeof updateProfileUI === 'function') updateProfileUI(null);
    else console.error("handleUserLogout: updateProfileUI function not found!");
    if (typeof handleAuthChange === 'function') handleAuthChange(null);
    else console.error("handleUserLogout: handleAuthChange function not found!");
    showSection('home-section');
}

function handleHashChange() {
    console.log("[Main] Handling hash change...");
    const hash = window.location.hash.substring(1);
    const sectionId = hash.split('?')[0] || 'home-section'; // Default to home
    const queryParams = new URLSearchParams(hash.split('?')[1] || '');
    if (typeof showSection === 'function') {
        showSection(sectionId, false, queryParams);
    } else {
        console.error("[Main] showSection function not found during hash change!");
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.innerHTML = '<p class="error-text text-center py-10">Error: Core navigation function missing. App cannot load sections.</p>';
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

    // Assign UI elements early
    if (typeof assignElements === 'function') {
        assignElements();
        console.log("[INIT] Called assignElements.");
    } else {
        console.error("[INIT] assignElements function not found! UI Utils may fail.");
    }

    // Initialize Firebase first
    let firebaseReady = false;
    if (typeof initializeFirebase === 'function') {
        firebaseReady = initializeFirebase(); // This now returns true/false
        if (!firebaseReady) {
            console.error("[INIT] Firebase initialization failed! Halting further setup.");
            return; // Stop if Firebase failed
        }
        console.log("[INIT] Firebase initialization reported success.");
    } else {
        console.error("[INIT] initializeFirebase function not found! Halting setup.");
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.innerHTML = '<p class="error-text text-center py-10">Critical Error: Firebase setup function missing. App cannot load.</p>';
        return; // Stop
    }

    // Verify db and auth are available AFTER successful initialization
    if (typeof db === 'undefined' || !db || typeof auth === 'undefined' || !auth) {
        console.error("[INIT] Critical: Firebase 'db' or 'auth' object not available even after successful initialization report. Halting.");
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.innerHTML = '<p class="error-text text-center py-10">Critical Error: Firebase connection components missing. App cannot load.</p>';
        return; // Stop
    } else {
        console.log("[INIT] Firebase 'db' and 'auth' objects confirmed available.");
    }

    // Initialize Dark Mode
    if (typeof initializeDarkMode === 'function') {
        console.log("[INIT] Calling initializeDarkMode...");
        initializeDarkMode();
    } else {
        console.error("[INIT] initializeDarkMode function not found!");
    }

    // Setup Mobile Nav Listeners
    if (typeof setupMobileNavListeners === 'function') {
        setupMobileNavListeners();
    } else {
        console.warn("[INIT] setupMobileNavListeners function not found.");
    }

    // Setup Auth State Listener directly
    if (typeof setupAuthStateListener === 'function') {
        console.log("[INIT] Setting up Auth State Listener...");
        setupAuthStateListener(auth, handleUserLogin, handleUserLogout);
    } else {
        console.error("[INIT] setupAuthStateListener function not found! Auth will not work.");
    }

    // Pre-fetch player cache (ensure fetchAllPlayersForCache exists and handles errors)
    if (typeof fetchAllPlayersForCache === 'function') {
        console.log("[INIT] Pre-fetching player cache...");
        try {
            await fetchAllPlayersForCache();
            console.log("[INIT] Player cache pre-fetch attempt complete.");
        } catch (error) {
            console.error("[INIT] Error during player cache pre-fetch:", error);
        }
    } else {
        console.warn("[INIT] fetchAllPlayersForCache function not found. Player names might be missing initially.");
    }

    // Setup Global Event Listeners (delegation)
    if (typeof setupGlobalEventListeners === 'function') {
        setupGlobalEventListeners();
    } else {
        console.error("[INIT] setupGlobalEventListeners function not found!");
    }

    // Setup hash change listener AFTER initial setup
    window.addEventListener('hashchange', handleHashChange);
    console.log("[INIT] Hash change listener attached.");

    // Handle initial section display based on hash or default (LAST step)
    console.log("[INIT] Triggering initial hash change handler...");
    handleHashChange();

    console.log("[INIT] Initial setup sequence complete.");
});

// --- Navigation & Section Handling ---
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

// Populates the recent golf games table with course name/location columns
async function populateRecentGolfGamesTable() {
    const tableBody = document.querySelector('#recent-golf-games-table tbody');
    if (!tableBody || !db) return;

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500">Loading...</td></tr>';

    try {
        // Fetch recent golf games (limit 10)
        const gamesSnap = await db.collection('games')
            .where('game_type', '==', 'golf')
            .orderBy('date_played', 'desc')
            .limit(10)
            .get();

        if (gamesSnap.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500">No recent golf games found.</td></tr>';
            return;
        }

        // Cache for course info
        const courseCache = {};

        // Fetch all course docs referenced in games
        const courseIds = Array.from(new Set(gamesSnap.docs.map(doc => doc.data().course_id).filter(Boolean)));
        if (courseIds.length > 0) {
            const courseDocs = await Promise.all(courseIds.map(id => db.collection('golf_courses').doc(id).get()));
            courseDocs.forEach(doc => {
                if (doc.exists) courseCache[doc.id] = doc.data();
            });
        }

        // Fetch player names
        if (!window.playersCachePopulated) await fetchAllPlayersForCache();

        tableBody.innerHTML = '';
        gamesSnap.forEach(doc => {
            const game = doc.data();
            const playerId = (game.participants && game.participants[0]) || '';
            const playerName = window.globalPlayerCache?.[playerId]?.name || 'Unknown';
            const course = courseCache[game.course_id] || {};
            const courseName = course.name || 'Unknown';
            const courseLocation = course.location || '-';
            const dateStr = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown';
            const score = typeof game.score === 'number' ? game.score : (game.score || '-');

            tableBody.innerHTML += `
                <tr>
                    <td class="p-2 border">${dateStr}</td>
                    <td class="p-2 border">${playerName}</td>
                    <td class="p-2 border">${score}</td>
                    <td class="p-2 border">${courseName}</td>
                    <td class="p-2 border">${courseLocation}</td>
                </tr>
            `;
        });
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500">Error loading recent golf games: ${err.message}</td></tr>`;
    }
}

/**
 * Attaches specific event listeners and populates data for the currently displayed section.
 * This function is crucial and was previously missing.
 * (Moved Up - Before showSection)
 * @param {string} sectionId - The ID of the section being displayed.
 * @param {URLSearchParams} queryParams - Query parameters from the URL hash.
 */
async function attachSectionListeners(sectionId, queryParams) {
    console.log(`[AttachListeners] Attaching listeners/populating for section: ${sectionId}`);

    // Remove previous dynamic listeners if necessary (e.g., filter dropdowns)
    // Example: document.getElementById('some-filter')?.removeEventListener('change', specificHandler);

    switch (sectionId) {
        case 'home-section':
            if (typeof populateDashboard === 'function') {
                await populateDashboard();
            } else { console.error("populateDashboard function not found."); }
            break;

        case 'players-section':
            const sortFilter = document.getElementById('players-sort-filter');
            if (sortFilter) {
                // Populate game options if needed (ensure gameTypesConfig is available)
                if (typeof gameTypesConfig === 'object') {
                    // Clear existing game options first (optional, depends if they change)
                    sortFilter.querySelectorAll('option[value^="elo_"]').forEach(opt => {
                        if (opt.value !== 'elo_overall') opt.remove();
                    });
                    // Add new options
                    Object.entries(gameTypesConfig).forEach(([key, name]) => {
                        if (key !== 'overall') { // Assuming 'overall' is handled separately or not needed here
                            const option = document.createElement('option');
                            option.value = `elo_${key}`;
                            option.textContent = `Sort by ${name} Elo`;
                            sortFilter.appendChild(option);
                        }
                    });
                }
                // Attach listener
                sortFilter.addEventListener('change', () => {
                    if (typeof populatePlayersList === 'function') {
                        populatePlayersList(); // Re-populate list on sort change
                    }
                });
            }
            // Initial population
            if (typeof populatePlayersList === 'function') {
                await populatePlayersList();
            } else { console.error("populatePlayersList function not found."); }
            break;

        case 'rankings-section':
            const rankingsFilter = document.getElementById('rankings-game-filter');
            const rankingsContainer = document.getElementById('ranking-tables-container'); // Get container too

            // *** ADD CHECKS HERE ***
            if (!rankingsFilter || !rankingsContainer) {
                console.error(`[AttachListeners] Rankings filter (#rankings-game-filter) or container (#ranking-tables-container) not found in DOM for section ${sectionId}. Cannot attach listeners or populate.`);
                // Optionally display an error within the section if possible
                const sectionElement = document.getElementById(sectionId);
                if (sectionElement) {
                    sectionElement.innerHTML = '<p class="error-text text-center py-10">Error: Failed to load rankings interface components.</p>';
                }
                break; // Stop processing for this section
            }
            // *** END CHECKS ***

            // Proceed only if elements exist
            if (typeof populateRankingsFilter === 'function') {
                await populateRankingsFilter(); // Populate the filter dropdown first
            } else {
                console.error("populateRankingsFilter function not found.");
            }

            // Attach listener to the filter
            rankingsFilter.addEventListener('change', () => {
                if (typeof updateRankingsVisibility === 'function') {
                    updateRankingsVisibility(); // Call on change
                } else {
                    console.error("updateRankingsVisibility function not found for filter change event.");
                }
            });

            // Initial population based on filter's current value (after population)
            if (typeof updateRankingsVisibility === 'function') {
                 await updateRankingsVisibility(); // Call initially
            } else { console.error("updateRankingsVisibility function not found for initial population."); }
            break;

        case 'results-section':
            const resultsFilter = document.getElementById('results-game-filter');
            if (resultsFilter) {
                if (typeof populateResultsFilter === 'function') await populateResultsFilter();
                resultsFilter.addEventListener('change', () => {
                    if (typeof populateResultsTable === 'function') populateResultsTable(resultsFilter.value);
                });
            }
            // Initial population
            if (typeof populateResultsTable === 'function') {
                 await populateResultsTable(); // Load 'all' initially
            } else { console.error("populateResultsTable function not found."); }
            break;

        case 'tournaments-section':
            const filter = queryParams.get('filter') || 'upcoming'; // Default filter
            // Add logic to highlight active filter tab if you have them
            if (typeof populateTournamentsList === 'function') {
                // Pass the ID of the container in the *full* tournaments section
                await populateTournamentsList('tournaments-list-full', null, filter); // null limit = show all
            } else { console.error("populateTournamentsList function not found."); }
            break;

        case 'tournament-detail-section':
            const tournamentId = queryParams.get('tournamentId');
            if (tournamentId && typeof populateTournamentDetails === 'function') {
                await populateTournamentDetails(tournamentId);
            } else if (!tournamentId) {
                 console.error("Tournament ID missing in query parameters for detail view.");
                 document.getElementById('tournament-detail-content').innerHTML = '<p class="error-text">No tournament specified.</p>';
            } else {
                 console.error("populateTournamentDetails function not found.");
            }
            break;

        case 'sports-section':
             // Populate golf courses list
             if (typeof populateGolfCourses === 'function') {
                 await populateGolfCourses();
             } else { console.error("populateGolfCourses function not found."); }
             // Populate all sports lists
             if (typeof populateAllSportsList === 'function') {
                 populateAllSportsList();
             } else { console.error("populateAllSportsList function not found."); }
             // Add listeners for any buttons within this section (like Add Course)
             // Note: Add Course button listener might already be in global listeners
            break;

        case 'live-game-section':
             if (typeof setupLiveGameSection === 'function') {
                 setupLiveGameSection(); // This function should handle its own population/listeners
             } else { console.error("setupLiveGameSection function not found."); }
            break;

        case 'submit-past-game-section':
             if (typeof setupSubmitPastGameListeners === 'function') {
                 setupSubmitPastGameListeners(queryParams?.prefillData || null);
             } else { console.error("setupSubmitPastGameListeners function not found."); }
            break;

        case 'player-login-section':
             if (typeof setupLoginForm === 'function') {
                 setupLoginForm();
             } else { console.error("setupLoginForm function not found."); }
             // Add signup form setup if separate
            break;

        case 'player-profile-section':
            const playerId = queryParams.get('playerId');
            // *** ADD THIS LOG ***
            console.log(`[AttachListeners Debug] Just before calling populatePlayerProfilePage for ${playerId}, typeof populatePlayerProfilePage is:`, typeof populatePlayerProfilePage);
            // *** END ADDED LOG ***
            if (playerId && typeof populatePlayerProfilePage === 'function') {
                await populatePlayerProfilePage(playerId);
            } else if (!playerId) {
                 console.error("Player ID missing in query parameters for profile view.");
                 // Ensure the content area exists before trying to write error message
                 const profileContent = document.getElementById('player-profile-content');
                 if (profileContent) profileContent.innerHTML = '<p class="error-text">No player specified.</p>';
                 else console.error("Cannot display 'No player specified' error - #player-profile-content not found.");
            } else {
                 // This is the error currently happening
                 console.error("populatePlayerProfilePage function not found.");
                 const profileContent = document.getElementById('player-profile-content');
                 if (profileContent) profileContent.innerHTML = '<p class="error-text">Error loading profile function.</p>';
                 else console.error("Cannot display 'function not found' error - #player-profile-content not found.");
            }
            break;

        case 'game-info-section':
             const gameId = queryParams.get('gameId');
             if (gameId && typeof populateGameInfoScreen === 'function') {
                 await populateGameInfoScreen(gameId);
                 if (typeof setupGameInfoListeners === 'function') setupGameInfoListeners();
             } else if (!gameId) {
                 console.error("Game ID missing in query parameters for game info view.");
                 document.getElementById('game-info-content').innerHTML = '<p class="error-text">No game specified.</p>';
             } else {
                 console.error("populateGameInfoScreen function not found.");
             }
            break;

        case 'sport-details-section':
            const sportKey = queryParams.get('sport');
            const titleEl = document.getElementById('sport-details-title');
            const contentEl = document.getElementById('sport-details-content'); // Main content area for the section
            const descriptionEl = document.getElementById('sport-details-description');
            const formatsContainer = document.getElementById('sport-details-formats');
            const formatsListEl = document.getElementById('sport-details-formats-list');
            const rulesLinkEl = document.getElementById('sport-details-rules-link');
            const resultsTableBody = document.getElementById('sport-details-results-table-body');
            const topPlayersCard = document.getElementById('sport-details-top-players-card');
            const topPlayersListEl = document.getElementById('sport-details-top-players-list');
            const fullRankingsLink = document.getElementById('sport-details-full-rankings-link');
            const allResultsLink = document.getElementById('sport-details-all-results-link');
            // Links in the Quick Links card
            const rankingsLink = document.getElementById('sport-details-rankings-link');
            const resultsLink = document.getElementById('sport-details-results-link'); // Link to full results page
            const submitLink = document.getElementById('sport-details-submit-link');
            const liveLink = document.getElementById('sport-details-live-link');
            const namePlaceholders = document.querySelectorAll(`#${sectionId} .sport-name-placeholder`); // Scope placeholders to the section
            if (!sportKey || typeof gameTypesConfig === 'undefined' || !gameTypesConfig[sportKey]) {
                console.error(`[AttachListeners] Invalid or missing sport key: ${sportKey}`);
                if (titleEl) titleEl.textContent = 'Sport Not Found';
                // Clear out potentially populated areas from previous views
                if (descriptionEl) descriptionEl.textContent = 'The requested sport could not be found.';
                if (resultsTableBody) resultsTableBody.innerHTML = '<tr><td colspan="3" class="error-text text-center py-4">Invalid sport selected.</td></tr>';
                if (formatsContainer) formatsContainer.classList.add('hidden');
                if (rulesLinkEl) rulesLinkEl.classList.add('hidden');
                if (topPlayersCard) topPlayersCard.classList.add('hidden');
                break; // Stop processing for this section
            }
            const sportName = gameTypesConfig[sportKey];
            // Populate Title and Placeholders
            if (titleEl) titleEl.textContent = sportName;
            namePlaceholders?.forEach(el => el.textContent = sportName);
            // Populate Description (Example - could be enhanced later with fetched data)
            if (descriptionEl) {
                 // Basic description, could fetch more details later
                 descriptionEl.textContent = `View rankings, results, rules, and more for ${sportName}.`;
            }
            // Populate Formats (e.g., for Billiards)
            if (formatsContainer && formatsListEl) {
                const relatedFormats = Object.entries(gameTypesConfig)
                    .filter(([key, name]) => key.startsWith(sportKey.split('_')[0]) && key !== sportKey) // Find related keys (e.g., pool_*)
                    .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB));
                if (relatedFormats.length > 0) {
                    formatsListEl.innerHTML = ''; // Clear previous
                    relatedFormats.forEach(([key, name]) => {
                        const li = document.createElement('li');
                        li.innerHTML = `<a href="#sport-details-section?sport=${key}" class="nav-link hover:underline" data-target="sport-details-section">${name}</a>`;
                        // Add click listener to handle navigation correctly
                        li.querySelector('a').addEventListener('click', (e) => {
                            e.preventDefault();
                            showSection('sport-details-section', true, { sport: key });
                        });
                        formatsListEl.appendChild(li);
                    });
                    formatsContainer.classList.remove('hidden');
                } else {
                    formatsContainer.classList.add('hidden');
                }
            }
            // Populate Rules Link (Example - needs actual URLs)
            if (rulesLinkEl) {
                let url = null;
                // Add more rules URLs here
                if (sportKey.startsWith('pool')) url = 'https://wpapool.com/rules-of-play/';
                else if (sportKey === 'chess') url = 'https://www.fide.com/FIDE/handbook/LawsOfChess.pdf';
                else if (sportKey === 'golf') url = 'https://www.usga.org/rules-hub.html';
                if (url) {
                    rulesLinkEl.href = url;
                    rulesLinkEl.classList.remove('hidden');
                } else {
                    rulesLinkEl.classList.add('hidden');
                }
            }
            // Set up Quick Links
            if (rankingsLink) {
                rankingsLink.href = `#rankings-section?game=${sportKey}`;
                rankingsLink.dataset.target = 'rankings-section'; // Ensure nav works
                rankingsLink.onclick = (e) => { e.preventDefault(); showSection('rankings-section', true, { game: sportKey }); };
            }
            if (resultsLink) { // This links to the main results page, filtered
                resultsLink.href = `#results-section?game=${sportKey}`;
                resultsLink.dataset.target = 'results-section';
                resultsLink.onclick = (e) => { e.preventDefault(); showSection('results-section', true, { game: sportKey }); };
            }
            if (submitLink) {
                submitLink.href = `#submit-past-game-section?game=${sportKey}`;
                submitLink.dataset.target = 'submit-past-game-section';
                submitLink.onclick = (e) => { e.preventDefault(); showSection('submit-past-game-section', true, { game: sportKey }); };
            }
            if (liveLink) {
                liveLink.href = `#live-game-section?game=${sportKey}`;
                liveLink.dataset.target = 'live-game-section';
                liveLink.onclick = (e) => { e.preventDefault(); showSection('live-game-section', true, { game: sportKey }); };
            }
            // Link from Top Players card to full rankings
            if (fullRankingsLink) {
                fullRankingsLink.href = `#rankings-section?game=${sportKey}`;
                fullRankingsLink.onclick = (e) => { e.preventDefault(); showSection('rankings-section', true, { game: sportKey }); };
            }
            // Link from results table to full results page
             if (allResultsLink) {
                allResultsLink.href = `#results-section?game=${sportKey}`;
                allResultsLink.onclick = (e) => { e.preventDefault(); showSection('results-section', true, { game: sportKey }); };
            }
            // Populate Recent Games Table for this sport
            if (resultsTableBody && typeof populateResultsTable === 'function') {
                // Call populateResultsTable, but tell it which tbody to use
                await populateResultsTable(sportKey, 10, 'sport-details-results-table-body'); // Limit to 10 recent games
                if (typeof updateResultsTableColumnVisibility === 'function') {
                    updateResultsTableColumnVisibility(sportKey, 'sport-details-results-table');
                }
            } else {
                 if (resultsTableBody) resultsTableBody.innerHTML = '<tr><td colspan="3" class="error-text text-center py-4">Error loading game results function.</td></tr>';
                 console.error("populateResultsTable function not found or resultsTableBody missing.");
            }
            // Populate Top Players for this sport (Optional)
            if (topPlayersCard && topPlayersListEl && typeof populateGameRankings === 'function') {
                try {
                    // Fetch ranked players for the specific game
                    const players = await getRankedPlayersForGame(sportKey, 5); // Need this helper function
                    if (players && players.length > 0) {
                        topPlayersListEl.innerHTML = ''; // Clear loading
                        players.forEach((player, index) => {
                            const li = document.createElement('li');
                            const rating = sportKey === 'golf' ? player.golf_handicap?.toFixed(1) : Math.round(player.elos?.[sportKey] || DEFAULT_ELO);
                            li.innerHTML = `
                                <span class="font-medium">${player.name || 'Unnamed'}</span>
                                <span class="text-gray-500 dark:text-gray-400 text-xs ml-2">(${sportKey === 'golf' ? 'Hcp' : 'Elo'}: ${rating})</span>
                            `;
                            topPlayersListEl.appendChild(li);
                        });
                        topPlayersCard.classList.remove('hidden');
                    } else {
                        topPlayersListEl.innerHTML = '<li class="italic text-gray-500 dark:text-gray-400">No ranked players found.</li>';
                        topPlayersCard.classList.remove('hidden'); // Show the card even if empty
                    }
                } catch (error) {
                    console.error(`Error fetching top players for ${sportKey}:`, error);
                    topPlayersListEl.innerHTML = '<li class="error-text">Error loading rankings.</li>';
                    topPlayersCard.classList.remove('hidden'); // Show card with error
                }
            } else {
                 if (topPlayersCard) topPlayersCard.classList.add('hidden'); // Hide if function not available
                 console.warn("populateGameRankings function or top player elements not available for sport details.");
            }
            console.log(`[AttachListeners] Populated sport details for: ${sportName} (${sportKey})`);
            break;

        default:
            console.warn(`[AttachListeners] No specific listeners or population logic defined for section: ${sectionId}`);
    }
    // Re-apply visibility rules after content is potentially loaded/modified
    if (typeof handleAuthChange === 'function' && typeof auth !== 'undefined') {
        handleAuthChange(auth.currentUser);
    }
}

// Helper function to get top N ranked players for a specific game (needs to be defined, likely in rankings_results.js)
async function getRankedPlayersForGame(gameKey, count) {
    if (!db) return []; // Need DB connection
    try {
        let players = [];
        if (gameKey === 'golf') {
            // Fetch all, sort client-side by handicap (ascending, nulls last)
            const snapshot = await db.collection('players').orderBy('name').get();
            players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            players.sort((a, b) => {
                const hA = a.golf_handicap;
                const hB = b.golf_handicap;
                if (hA === null && hB === null) return 0; // Keep original order if both null (or sort by name: a.name.localeCompare(b.name))
                if (hA === null) return 1; // Nulls go last
                if (hB === null) return -1; // Nulls go last
                return hA - hB; // Sort non-nulls numerically ascending
            });
        } else {
            // Fetch sorted by Elo (descending)
            const eloField = `elos.${gameKey}`;
            // Requires composite index for each game's Elo field + overall_elo (or name) if needed
            const snapshot = await db.collection('players')
                                     .orderBy(eloField, 'desc')
                                     .limit(count * 2) // Fetch more initially in case some don't have the Elo field set
                                     .get();
            players = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => p.elos && typeof p.elos[gameKey] === 'number'); // Ensure they have the Elo rating
        }
        return players.slice(0, count); // Return only the requested count
    } catch (error) {
        console.error(`Error in getRankedPlayersForGame for ${gameKey}:`, error);
        if (error.code === 'failed-precondition') {
             console.error(`Firestore index missing for sorting players by 'elos.${gameKey}' (desc).`);
             // Optionally alert the user or show a message in the UI
        }
        return []; // Return empty array on error
    }
}

async function showSection(sectionId, forceLoad = false, queryParams = {}) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error("[Section] Main content container not found.");
        return;
    }
    // *** ADD PREFILL DATA HANDLING ***
    let prefillData = null;
    if (typeof queryParams === 'object' && queryParams !== null && queryParams.prefillData) {
        prefillData = queryParams.prefillData;
        // Remove prefillData from queryParams so it doesn't end up in the hash
        delete queryParams.prefillData;
        console.log("[Section] Prefill data received:", prefillData);
    }
    // *** END PREFILL DATA HANDLING ***
    if (sectionId === currentSectionId && !forceLoad) {
        console.log(`[Section] Section ${sectionId} is already displayed. Skipping reload.`);
        // --- PATCH: Always update submit-past-game-section with new prefillData ---
        if (sectionId === 'submit-past-game-section' && typeof setupSubmitPastGameListeners === 'function') {
            // Prefer prefillData from queryParams, fallback to null
            await setupSubmitPastGameListeners(queryParams?.prefillData || null);
            console.log("[Section] Re-applied submit form listeners and prefill data.");
        }
        // *** ADD PREFILL CHECK EVEN IF SECTION IS CURRENT ***
        if (prefillData && sectionId === 'submit-past-game-section' && typeof applySubmitFormPrefill === 'function') {
            console.log("[Section] Applying prefill data to already visible submit section.");
            applySubmitFormPrefill(prefillData);
        }
        // *** END PREFILL CHECK ***
        return;
    }
    console.log(`[Section Debug] Processing sectionId: '${sectionId}'`);
    const templateId = `template-${sectionId}`;
    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`[Section] Template NOT FOUND for sectionId: ${sectionId} (Expected ID: #${templateId})`);
        mainContent.innerHTML = `<p class="error-text text-center py-10">Error: Section content template not found (#${templateId}). Check HTML and template ID.</p>`;
        currentSectionId = null;
        return;
    }
    const loadSuccess = await loadTemplateContent(template, sectionId);
    if (!loadSuccess) {
        console.error(`[Section] Failed to load template content for ${sectionId}. Halting further processing for this section.`);
        currentSectionId = null;
        return;
    }
    currentSectionId = sectionId;
    // Ensure queryParams is a URLSearchParams object for consistent handling
    let searchParams;
    if (queryParams instanceof URLSearchParams) {
        searchParams = queryParams;
    } else {
        searchParams = new URLSearchParams();
        for (const key in queryParams) {
            if (Object.hasOwnProperty.call(queryParams, key)) {
                searchParams.set(key, queryParams[key]);
            }
        }
    }
    let hashString = sectionId;
    const queryString = searchParams.toString(); // Use the URLSearchParams object
    if (queryString) {
        hashString += `?${queryString}`;
    }
    if (window.location.hash !== `#${hashString}`) {
        window.location.hash = hashString;
    }
    window.scrollTo(0, 0);
    console.log(`[Section] Displayed section: ${sectionId}. Attaching listeners and populating data...`);
    if (typeof attachSectionListeners === 'function') {
        try {
            // Pass the guaranteed URLSearchParams object
            await attachSectionListeners(sectionId, searchParams);
            console.log(`[Section] Successfully attached listeners/populated data for ${sectionId}.`);
            // *** APPLY PREFILL AFTER LISTENERS ARE ATTACHED ***
            if (prefillData && sectionId === 'submit-past-game-section' && typeof applySubmitFormPrefill === 'function') {
                console.log("[Section] Applying prefill data after loading submit section.");
                applySubmitFormPrefill(prefillData);
            }
            // *** END APPLY PREFILL ***
        } catch (error) {
            console.error(`[Section] Error during attachSectionListeners for ${sectionId}:`, error);
            const sectionElement = document.getElementById(sectionId);
            if (sectionElement) {
                sectionElement.innerHTML = `<p class="error-text text-center py-10">Error loading section content: ${error.message}</p>`;
            }
        }
    } else {
        console.error(`[Section] attachSectionListeners function not found! Cannot populate data or attach listeners for ${sectionId}.`);
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
            sectionElement.innerHTML = `<p class="error-text text-center py-10">Error: Application setup incomplete (attachSectionListeners missing).</p>`;
        }
    }
    if (sectionId === 'submit-past-game-section') {
        // Pass prefillData from queryParams if present
        await setupSubmitPastGameListeners(queryParams?.prefillData || null);
    }
    console.log(`[Section] Processing complete for ${sectionId}.`);
}

// --- Global Event Listeners ---
function setupGlobalEventListeners() {
    const mainContent = document.getElementById('main-content');
    const body = document.body;
    const profileButton = document.getElementById('profile-photo-button');
    if (!mainContent) {
        console.error("Cannot setup global listeners: #main-content not found.");
        return;
    }
    console.log("[Events] Setting up global event listeners on #main-content and body.");
    mainContent.addEventListener('click', async (event) => {
        const playerEntry = event.target.closest('.player-entry');
        if (playerEntry) {
            const playerId = playerEntry.getAttribute('data-player-id');
            if (playerId) {
                console.log(`[Event] Player entry clicked for ID: ${playerId}. Navigating to profile...`);
                await showSection('player-profile-section', true, { playerId: playerId });
            } else {
                console.warn("[Event] Player entry clicked, but no data-player-id found.");
            }
            return;
        }
        const gameLink = event.target.closest('.nav-link[data-target="game-info-section"]');
        if (gameLink && gameLink.href) {
            event.preventDefault();
            const url = new URL(gameLink.href);
            const hash = url.hash.substring(1);
            const sectionId = hash.split('?')[0];
            const queryParams = new URLSearchParams(hash.split('?')[1] || '');
            if (sectionId === 'game-info-section') {
                console.log(`[Event] Game link clicked. Navigating to ${sectionId} with params:`, queryParams.toString());
                await showSection(sectionId, true, queryParams);
                return;
            }
        }
    });
    body.addEventListener('click', (event) => {
        const closeButton = event.target.closest('.modal-close-button');
        const cancelButton = event.target.closest('.modal-cancel-button');
        if (closeButton || cancelButton) {
            const modal = (closeButton || cancelButton).closest('.modal-container');
            if (modal && typeof closeModal === 'function') {
                closeModal(modal);
            }
        }
        if (profileButton && profileButton.contains(event.target)) {
            if (typeof toggleProfileDropdown === 'function') {
                toggleProfileDropdown();
            } else {
                console.error("[Event] toggleProfileDropdown function not found!");
            }
            return;
        }
        const profileDropdown = document.getElementById('profile-dropdown');
        if (profileDropdown && !profileDropdown.classList.contains('hidden') && !profileDropdown.contains(event.target) && !profileButton.contains(event.target)) {
            if (typeof toggleProfileDropdown === 'function') {
                toggleProfileDropdown();
            } else {
                console.error("[Event] toggleProfileDropdown function not found!");
            }
            return;
        }
        if (event.target.id === 'dropdown-logout') {
            event.preventDefault();
            if (typeof logoutUser === 'function') {
                logoutUser();
            } else {
                console.error("[Event] logoutUser function not found!");
            }
            return;
        }
        // --- Add Course Button Listener (if not handled elsewhere) ---
        const addCourseBtn = event.target.closest('#add-course-btn');
        if (addCourseBtn && typeof openAddCourseModal === 'function') {
            openAddCourseModal();
            return;
        }
        // --- Add Player Button Listener (if not handled elsewhere) ---
        const addPlayerBtn = event.target.closest('#add-player-btn');
        if (addPlayerBtn && typeof openAddPlayerModal === 'function') {
            openAddPlayerModal();
            return;
        }
        // --- Create Tournament Button Listener (if not handled elsewhere) ---
        const createTournamentBtn = event.target.closest('#create-tournament-btn');
        if (createTournamentBtn && typeof openCreateTournamentModal === 'function') {
            openCreateTournamentModal();
            return;
        }
        // --- Edit Tournament Button Listener (if not handled elsewhere) ---
        const editTournamentBtn = event.target.closest('#edit-tournament-btn');
        if (editTournamentBtn && typeof openEditTournamentModal === 'function') {
            const tournamentId = editTournamentBtn.dataset.tournamentId;
            if (tournamentId) {
                openEditTournamentModal(tournamentId);
            } else {
                console.warn("Edit tournament button clicked, but no tournament ID found.");
            }
            return;
        }
    });
    console.log("[Events] Global event listeners setup complete.");
}
