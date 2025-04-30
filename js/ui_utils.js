// --- ui_utils.js ---

// --- DOM Element References (Assign these in main initialization) ---
let sections, navLinks, loginForm, loginError, logoutButton,
    recordGameModal, openRecordGameModalBtn,
    addPlayerModal, openAddPlayerModalBtn,
    createTournamentModal, openCreateTournamentModalBtn,
    addGameModal, openAddGameModalBtn, addParticipantsModal, // Added participants modal ref
    addCourseModal, openAddCourseModalBtn, // Added course modal ref
    golfRulesModal, // Added golf rules modal ref
    rankingsGameFilter, rankingTablesContainer,
    resultsTableBody,
    playersGrid,
    playerInfoModal,
    editTournamentModal, // Added edit tournament modal ref
    manageTournamentsListContainer, // Might be unused but was in original assign
    tournamentDetailSection,
    darkModeToggle, // Added dark mode toggle ref
    bodyElement; // Added body element ref

// Function to assign elements (call this during initialization)
function assignElements() {
    sections = document.querySelectorAll('.page-section');
    navLinks = document.querySelectorAll('.nav-link');
    loginForm = document.getElementById('login-form'); // Check if needed here or in auth.js
    loginError = document.getElementById('login-error'); // Check if needed here or in auth.js
    logoutButton = document.getElementById('logout-button'); // Check if needed here or in auth.js

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
    rankingsGameFilter = document.getElementById('rankings-game-filter');
    rankingTablesContainer = document.getElementById('ranking-tables-container');
    resultsTableBody = document.getElementById('results-table-body');
    playersGrid = document.querySelector('#players-section #players-grid');
    manageTournamentsListContainer = document.getElementById('manage-tournaments-list-container'); // Example ID if used
    tournamentDetailSection = document.getElementById('tournament-detail-section');

    // Dark Mode
    darkModeToggle = document.getElementById('dark-toggle');
    bodyElement = document.body;

    // Basic checks (optional but recommended)
    if (!sections || sections.length === 0) console.error("Critical Error: No '.page-section' elements found!");
    if (!resultsTableBody) console.error("Critical Error: Results table body (#results-table-body) not found!");
    if (!playersGrid) console.error("Critical Error: Players grid container (#players-grid) not found!");
    if (!tournamentDetailSection) console.error("Critical Error: Tournament Detail Section (#tournament-detail-section) not found!");
    console.log("[UI Utils] Elements assigned.");
}


// --- Page Section Navigation ---
// Handles showing/hiding sections and populating content
// Depends on: db, populateDashboard, populateRankingsVisibility, populateResultsTable, populatePlayersList, populateTournamentsList, setupSubmitPastGameListeners, setupGameInfoListeners, populateGameInfoScreen, fetchAllPlayersForCache, playersCachePopulated
async function showSection(targetId) {
     if (!sections) { console.error("Sections variable is not assigned yet in showSection"); return; } //
     console.log(`[NAV] Navigating to: ${targetId}`); //
     const cleanTargetId = targetId.startsWith('#') ? targetId.substring(1) : targetId; //
     let sectionFound = false; //

     // Hide all sections first
     sections.forEach(section => {
         if (section && section.id) section.classList.add('hidden'); //
     });

     const targetSection = document.getElementById(cleanTargetId); //
     if (targetSection && targetSection.classList.contains('page-section')) { //
         console.log(`[NAV] Showing section: ${targetSection.id}`); //
         targetSection.classList.remove('hidden'); //
         sectionFound = true; //

         // --- Handle Game Info Section Query Param ---
         if (cleanTargetId === 'game-info-section') { //
            const urlParams = new URLSearchParams(window.location.search); // Check query params first
            let gameId = urlParams.get('gameId'); //
            if (!gameId) { // If not in query, check hash (less ideal)
                const hashParts = window.location.hash.split('?gameId='); //
                if (hashParts.length > 1) gameId = hashParts[1]; //
            }
            // Ensure populateGameInfoScreen is accessible
            if (gameId && typeof populateGameInfoScreen === 'function') { //
                console.log(`[NAV] Found gameId parameter: ${gameId}. Populating game info.`); //
                await populateGameInfoScreen(gameId, null); // Fetch data using ID
            } else {
                console.log("[NAV] Navigated to game info section without a gameId."); //
                // Optionally clear the content or show a default message
                document.getElementById('game-info-content').innerHTML = '<p class="text-gray-500 dark:text-gray-400">No specific game selected.</p>'; // Added dark mode class
            }
         }
         // --- END Game Info Check ---

         // Populate content if DB is ready (ensure db is accessible)
         if (db) { //
             // Ensure Cache is Ready for Relevant Sections (ensure playersCachePopulated, fetchAllPlayersForCache accessible)
             const needsCache = ['home-section', 'results-section', 'players-section', 'rankings-section', 'submit-past-game-section']; //
             if (needsCache.includes(cleanTargetId) && !playersCachePopulated) { //
                 console.warn(`[NAV] Player cache not ready for ${cleanTargetId}, attempting population...`); //
                 await fetchAllPlayersForCache(); //
                 if (!playersCachePopulated) { //
                      console.error(`[NAV] Failed to populate cache before showing ${cleanTargetId}. Section content may be incomplete.`); //
                      if(targetSection) targetSection.innerHTML = `<p class="text-red-500 p-4 text-center">Error: Could not load required player data.</p>`; //
                 }
             }
             // --- End Cache Check ---

             // Populate Section Content (Ensure population/setup functions are accessible)
             if (playersCachePopulated || !needsCache.includes(cleanTargetId)) { //
                 if (cleanTargetId === 'home-section' && typeof populateDashboard === 'function') await populateDashboard(); //
                 if (cleanTargetId === 'rankings-section' && rankingTablesContainer && typeof updateRankingsVisibility === 'function' && typeof updateGameTypeDropdowns === 'function') { //
                     updateGameTypeDropdowns(); // Sync function
                     await updateRankingsVisibility(); // Async function
                 }
                 if (cleanTargetId === 'results-section' && resultsTableBody && typeof populateResultsTable === 'function') await populateResultsTable(); // Async function
                 if (cleanTargetId === 'players-section' && playersGrid && typeof populatePlayersList === 'function') await populatePlayersList(); // Async function
                 if (cleanTargetId === 'tournaments-section' && document.getElementById('tournaments-list-full') && typeof populateTournamentsList === 'function') await populateTournamentsList('tournaments-list-full'); // Async function
                 if (cleanTargetId === 'submit-past-game-section' && typeof setupSubmitPastGameListeners === 'function') await setupSubmitPastGameListeners(); // Use await if it's async
                 if (cleanTargetId === 'game-info-section' && typeof setupGameInfoListeners === 'function') setupGameInfoListeners(); // Setup share button listener
                 if (cleanTargetId === 'sports-section') { // Handle sports section population (golf details)
                    // Reset to main gallery view initially
                    document.getElementById('sports-gallery')?.classList.remove('hidden');
                    document.getElementById('golf-details-view')?.classList.add('hidden');
                    // Populate specific details only when navigated to (handled by button clicks in setupEventListeners)
                 }
             } else if (needsCache.includes(cleanTargetId)) {
                  console.error(`[NAV] Cannot populate ${cleanTargetId} because player cache failed to load.`); //
             }

         } else {
             console.warn(`[NAV] DB not ready, skipping population for section ${cleanTargetId}`); //
         }

     } else { // Section not found
          console.warn(`[NAV] Section with ID "${cleanTargetId}" not found or invalid. Showing home.`); //
          const homeSection = document.getElementById('home-section'); //
          if (homeSection) { //
              homeSection.classList.remove('hidden'); //
              // Populate home if possible
              if (db && typeof populateDashboard === 'function') { //
                   if(!playersCachePopulated && typeof fetchAllPlayersForCache === 'function') await fetchAllPlayersForCache(); // Attempt cache fetch
                   if(playersCachePopulated) await populateDashboard(); // Async call
                   else console.error("[NAV] Cannot populate home section because player cache failed to load."); //
              } else if (!db) {
                    console.warn("[NAV] DB not ready, skipping population for home section fallback."); //
              }
          } else {
              console.error("Critical Error: Home section (#home-section) not found as fallback."); //
          }
     }

     if (sectionFound) {
          // Update hash, removing query params if they exist to avoid confusion
          window.location.hash = cleanTargetId; //
          window.scrollTo(0, 0); // Scroll to top
     }
} // End showSection


// --- Generic UI Utilities ---

// Handles clicks on nav links or elements with data-target for section navigation
function handleNavLinkClick(event) {
    if (!event || !event.target) return; //
    // Find the closest ancestor with data-target
    const linkElement = event.target.closest('[data-target]'); //
    if (linkElement) { //
        event.preventDefault(); //
        const targetId = linkElement.getAttribute('data-target'); //
        // Ensure showSection is accessible
        if (targetId && typeof showSection === 'function') { //
            console.log(`[NAV Link Click] Target section: ${targetId}`); //
            // Special handling for submit past game link to allow pre-filling logic
            if (targetId === 'submit-past-game-section' && typeof navigateToSubmitScore === 'function') {
                navigateToSubmitScore(null); // Use the specific navigation function
            } else {
                 showSection(targetId); // Normal navigation for other links
            }
        } else if (!targetId) {
            console.warn("[NAV Link Click] Clicked link has no data-target attribute:", linkElement); //
        }
    }
} // End handleNavLinkClick

// Populates a select dropdown from an object { key: value, ... }
function populateSelectWithOptions(selectElement, optionsObject, prompt = 'Select...') {
     if (!selectElement) { console.warn("populateSelectWithOptions: Provided selectElement is null or undefined."); return; } //
     const currentValue = selectElement.value; // Preserve current selection if possible
     selectElement.innerHTML = `<option value="">${prompt}</option>`; // Clear and add prompt
     for (const key in optionsObject) { //
         if (Object.hasOwnProperty.call(optionsObject, key)) { //
             const value = optionsObject[key]; //
             const optionElement = document.createElement('option'); //
             optionElement.value = key; // Use the key as the value
             optionElement.textContent = value; // Use the value as the display text
             if (key === currentValue) { //
                 optionElement.selected = true; //
             }
             selectElement.appendChild(optionElement); //
         }
     }
 } // End populateSelectWithOptions


// --- Modal Utilities ---

function openModal(modalElement) {
    if (!modalElement) {
        console.error("openModal: Provided modalElement is null or undefined."); //
        return;
    }
    console.log(`[MODAL] Opening modal: #${modalElement.id}`); //
    modalElement.classList.add('active'); // Make the modal overlay visible
    // Ensure bodyElement is accessible
    if (bodyElement) bodyElement.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal(modalElement) {
    if (!modalElement) {
        console.error("closeModal: Provided modalElement is null or undefined."); //
        return;
    }
    console.log(`[MODAL] Closing modal: #${modalElement.id}`); //
    modalElement.classList.remove('active'); // Hide the modal overlay
    // Ensure bodyElement is accessible
    if (bodyElement) bodyElement.style.overflow = ''; // Restore background scrolling

    // Clear the modal's content IF it's dynamically generated each time
    const modalsToClear = [
        'record-game-modal', // Used for record AND edit game
        'add-player-modal',
        'create-tournament-modal',
        'add-game-modal',
        'add-course-modal',
        'edit-tournament-modal',
        'add-participants-modal'
        // Note: player-info-modal and golf-rules-modal content is usually preserved or reset specifically
    ];
    if (modalsToClear.includes(modalElement.id)) {
         modalElement.innerHTML = ''; // Clear dynamic content
         console.log(`[MODAL] Cleared content for #${modalElement.id}`); //
    }

     // Special handling for player info modal cleanup
     if (modalElement.id === 'player-info-modal') {
         modalElement.classList.remove('modal-editing'); // Reset edit state if applicable
         modalElement.removeAttribute('data-current-player-id'); // Clear stored ID
         console.log(`[MODAL] Reset state for #player-info-modal`); //
     }

     // Special handling for edit tournament modal cleanup
     if (modalElement.id === 'edit-tournament-modal') {
        currentTournamentData = null; // Clear temporary data (ensure variable is accessible)
        console.log(`[MODAL] Cleared temporary data for #edit-tournament-modal`); //
     }

     // Special handling for golf rules modal (reset iframe?)
     if (modalElement.id === 'golf-rules-modal') {
         const iframe = modalElement.querySelector('#golf-rules-iframe');
         if (iframe) {
             iframe.src = 'about:blank'; // Reset iframe to avoid keeping page loaded
             console.log(`[MODAL] Reset iframe for #golf-rules-modal`); //
         }
     }
} // End closeModal


// --- Dashboard Population ---

// Main function to populate dashboard sections
async function populateDashboard() {
    console.log("[DASHBOARD] Populating..."); //
    // Ensure db is accessible
    if (!db) { console.warn("[DASHBOARD] DB not ready, skipping population."); return; } //
    // Ensure population helper functions are accessible
    await Promise.all([
        populateRecentGamesList('recent-games-list', 5), //
        populateTopPlayersList('top-players-list', 5), // Shows overall Elo
        populateTopTeamsList('top-teams-list', 5), // Placeholder for team rankings
        (typeof populateTournamentsList === 'function') ? populateTournamentsList('dashboard-tournaments-list', 3) : Promise.resolve() // Check if func exists
    ]).catch(error => {
        console.error("[DASHBOARD] Error during concurrent population:", error);
        // Handle error display on dashboard if needed
    });
    console.log("[DASHBOARD] Population attempt complete."); //
} // End populateDashboard

// Populates the Recent Games list on the dashboard
async function populateRecentGamesList(elementId = 'recent-games-list', limit = 5) {
    // Ensure db, gameTypesConfig, globalPlayerCache are accessible
    const listElement = document.getElementById(elementId); //
    if (!listElement || !db) { console.warn(`Recent games list #${elementId} or DB not ready.`); return; } //
    listElement.innerHTML = `<li class="text-gray-500 dark:text-gray-400">Loading recent games...</li>`; // Added dark mode class
    try {
        // Requires index: games: date_played (desc)
        const q = db.collection('games').orderBy('date_played', 'desc').limit(limit); //
        const snapshot = await q.get(); //
        if (snapshot.empty) {
            listElement.innerHTML = `<li class="text-gray-500 dark:text-gray-400">No games recorded yet.</li>`; // Added dark mode class
            return; //
        }
        listElement.innerHTML = ''; // Clear loading

        // Use globalPlayerCache if populated
        if (!playersCachePopulated && typeof fetchAllPlayersForCache === 'function') await fetchAllPlayersForCache(); // Ensure cache is ready

        // Process each recent game
        for (const doc of snapshot.docs) { //
            const game = { id: doc.id, ...doc.data() }; //
            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'N/A'; //
            const gameType = gameTypesConfig[game.game_type] || game.game_type || 'Game'; // Use config display name
            let description = gameType; //

            const participants = game.participants || []; //
            const participantNames = participants.map(id => globalPlayerCache[id]?.name || 'Unknown Player'); // Use cache

            // Build description based on type/outcome
            if (game.game_type === 'golf' && participantNames.length > 0) {
                description = `${gameType}: <b>${participantNames[0]}</b>`;
            } else if (participants.length >= 2 && (game.outcome === 'Win/Loss' || game.outcome === 'Draw')) {
                if (game.outcome === 'Win/Loss') {
                     description = `${gameType}: <b>${participantNames[0]}</b> beat ${participantNames[1]}`; //
                } else { // Draw
                     description = `${gameType}: ${participantNames[0]} drew with ${participantNames[1]}`; //
                }
            } else if (participants.length > 0) { // Fallback
                description = `${gameType}: ${participantNames.join(', ')}`; //
            }
            if (game.score) description += ` (${game.score})`; // Append score

            const li = document.createElement('li'); //
            // Added dark mode classes
            li.className = 'border-b dark:border-gray-700 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0 text-sm text-gray-800 dark:text-gray-200'; //
            li.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>${description}</div>
                    <div class="text-gray-500 dark:text-gray-400 text-xs ml-2 whitespace-nowrap">${gameDate}</div>
                </div>`; //
            listElement.appendChild(li); //
        }
    } catch (error) {
        console.error(`Error fetching recent games for ${elementId}:`, error); //
         if (error.code === 'failed-precondition') { //
             listElement.innerHTML = `<li class="text-red-500">Error: Firestore index missing for date sorting. Check console.</li>`; //
             console.error("Firestore index needed: games collection, date_played (descending)."); //
         } else {
            listElement.innerHTML = `<li class="text-red-500">Error loading games: ${error.message}</li>`; //
         }
    }
} // End populateRecentGamesList

// Populates the Top Players list on the dashboard (Overall Elo)
async function populateTopPlayersList(elementId = 'top-players-list', limit = 5) {
     // Ensure db, DEFAULT_ELO are accessible
     const listElement = document.getElementById(elementId); //
     if (!listElement || !db) { console.warn(`Top players list #${elementId} or DB not ready.`); return; } //
     listElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400">Loading rankings...</li>'; // Added dark mode class
     try {
         // Requires index: players: elo_overall (desc)
         const snapshot = await db.collection('players').orderBy('elo_overall', 'desc').limit(limit).get(); //
         if (snapshot.empty) {
             listElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400">No players found.</li>'; return; // Added dark mode class
         }
         listElement.innerHTML = ''; // Clear loading
         let rank = 1; //
         snapshot.forEach(doc => {
             const player = doc.data(); //
             const li = document.createElement('li'); //
             // Added dark mode classes
             li.className = "flex justify-between items-center text-gray-800 dark:text-gray-200"; //
             li.innerHTML = `
                 <span>${rank}. ${player.name || 'Unnamed'}</span>
                 <span class="text-sm font-medium text-indigo-600 dark:text-indigo-400">${Math.round(player.elo_overall || DEFAULT_ELO)}</span>`; //
             listElement.appendChild(li); //
             rank++; //
         });
     } catch (error) {
         console.error(`Error fetching top players:`, error); //
          if (error.code === 'failed-precondition') { //
             listElement.innerHTML = `<li class="text-red-500">Error: Firestore index missing for overall Elo sorting. Check console.</li>`; //
             console.error("Firestore index needed: players collection, elo_overall (descending)."); //
         } else {
            listElement.innerHTML = `<li class="text-red-500">Error loading rankings.</li>`; //
         }
     }
} // End populateTopPlayersList

// Placeholder for Top Teams list
async function populateTopTeamsList(elementId = 'top-teams-list', limit = 5) {
     const listElement = document.getElementById(elementId); //
     if (listElement) { //
         listElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400 italic">Team rankings not yet implemented.</li>'; // Added dark mode class
     }
} // End populateTopTeamsList


// --- Dark Mode Toggle Logic ---

// Applies the theme (dark/light) to the body
const applyTheme = (isDark) => {
  // Ensure bodyElement is accessible
  if (!bodyElement) { console.error("Cannot apply theme: bodyElement not assigned."); return; }
  if (isDark) {
    bodyElement.classList.add('dark');
  } else {
    bodyElement.classList.remove('dark');
  }
};

// Sets up listeners and initial state for the dark mode toggle
function setupDarkMode() {
    // Ensure darkModeToggle and bodyElement are assigned
    if (!darkModeToggle || !bodyElement) {
        console.warn("Dark mode toggle or body element not found. Skipping setup.");
        return;
    }

    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      darkModeToggle.checked = isDark;
      applyTheme(isDark);
    } else {
      // Optional: Check for system preference if no explicit choice saved
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      darkModeToggle.checked = prefersDark;
      applyTheme(prefersDark);
    }

    // Add event listener for the toggle change
    darkModeToggle.addEventListener('change', () => {
      const isDark = darkModeToggle.checked;
      applyTheme(isDark);
      // Save the preference to localStorage
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // Optional: Listen for system theme changes
    // Note: This listener might conflict if user has explicitly set a preference
    try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
           // Only apply system preference if no user preference is stored
           if (!localStorage.getItem('theme')) {
               const isDark = event.matches;
               darkModeToggle.checked = isDark;
               applyTheme(isDark);
           }
        });
    } catch (e) {
        console.warn("Error adding system theme change listener (might be older browser):", e);
    }
    console.log("[UI Utils] Dark mode setup complete.");
} // End setupDarkMode

// Note: This file assumes that 'db', 'firebase', 'populateTournamentsList',
// 'populateResultsTable', 'populatePlayersList', 'updateRankingsVisibility', 'updateGameTypeDropdowns',
// 'navigateToSubmitScore', 'setupSubmitPastGameListeners', 'setupGameInfoListeners',
// 'populateGameInfoScreen', 'fetchAllPlayersForCache', 'playersCachePopulated',
// 'globalPlayerCache', 'gameTypesConfig', 'DEFAULT_ELO', 'currentTournamentData'
// and various DOM element variables (sections, navLinks, modal elements etc.) are accessible
// from the global scope or imported/passed appropriately.
