// --- main.js ---

// --- Firebase Initialization ---
let app, db, auth; // Declare Firebase variables globally or within relevant scope

// IMPORTANT: Keep your actual Firebase configuration secure.
// Consider environment variables or a separate config file not committed to public repositories.
const firebaseConfig = {
    apiKey: "AIzaSyCF3az8WEAMVpAx5cbp917EUhNM5cRzvwA",
    authDomain: "leaderbored2.firebaseapp.com",
    projectId: "leaderbored2",
    storageBucket: "leaderbored2.firebasestorage.app",
    messagingSenderId: "449176616925",
    appId: "1:449176616925:web:8149e2e8b43a9a72104034",
    measurementId: "G-8LRFJGV2XY"
};

try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("Firebase config is missing critical values (apiKey or projectId).");
        alert("Firebase configuration is incomplete. Please check the script.");
    } else {
        // Initialize Firebase
        // Ensure 'firebase' object is available (loaded from Firebase SDK script in HTML)
        if (typeof firebase !== 'undefined') {
            app = firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            console.log("[INIT] Firebase Initialized Successfully with Project ID:", firebaseConfig.projectId);
        } else {
            throw new Error("Firebase SDK not loaded. Check your HTML script tags.");
        }
    }
} catch (error) {
    console.error("[INIT] Error initializing Firebase:", error);
    alert(`Could not connect to Firebase: ${error.message}`);
    // Prevent further app execution if Firebase fails to initialize
    throw new Error("Firebase Initialization Failed");
}

// --- Dark Mode Toggle Logic ---
function setupDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;

    // Function to apply the theme based on toggle state or saved preference
    const applyTheme = (isDark) => {
        if (isDark) {
            body.classList.add('dark');
            if (darkModeToggle) darkModeToggle.checked = true;
        } else {
            body.classList.remove('dark');
            if (darkModeToggle) darkModeToggle.checked = false;
        }
    };

    // Check for saved theme preference in localStorage
    const savedTheme = localStorage.getItem('theme');
    // Check system preference if no saved theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Determine initial theme
    let initialDarkMode = false;
    if (savedTheme === 'dark') {
        initialDarkMode = true;
    } else if (savedTheme === 'light') {
        initialDarkMode = false;
    } else {
        // If no saved theme, use system preference
        initialDarkMode = prefersDark;
    }

    // Apply the initial theme
    applyTheme(initialDarkMode);
    console.log(`[Theme] Initial dark mode set to: ${initialDarkMode} (Saved: ${savedTheme}, Prefers: ${prefersDark})`);


    // Add event listener to the toggle
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            const isChecked = darkModeToggle.checked;
            applyTheme(isChecked);
            // Save the user's preference
            localStorage.setItem('theme', isChecked ? 'dark' : 'light');
            console.log(`[Theme] Theme toggled. Dark mode: ${isChecked}. Preference saved.`);
        });
    } else {
        console.warn("[Theme] Dark mode toggle element (#dark-mode-toggle) not found.");
    }

     // Listen for system theme changes (optional, but good practice)
     window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        // Only apply system change if no explicit user preference is saved
        if (!localStorage.getItem('theme')) {
            console.log("[Theme] System theme changed. Applying system preference.");
            applyTheme(event.matches);
        } else {
            console.log("[Theme] System theme changed, but user preference overrides.");
        }
     });

}
// --- Event Listeners Setup ---
// This function sets up listeners for static elements and delegates others.
// Dependencies: Needs access to handler functions defined in other files
// (e.g., handleNavLinkClick, handlePlayerRegister, openRecordGameModal, etc.)
// and DOM element variables (e.g., openRecordGameModalBtn, playersGrid etc.) assigned by assignElements.
function setupEventListeners() {
    console.log("[LISTENERS] Setting up...");

    // Ensure handler functions are accessible before adding listeners
    const checkFunc = (funcName) => typeof window[funcName] === 'function'; // Basic check

    // --- Navigation & General Links ---
    // Handles main nav links AND other links with data-target
    if (checkFunc('handleNavLinkClick')) {
        document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', handleNavLinkClick));
    } else { console.warn("Listener Setup: handleNavLinkClick not found."); }

    // --- Player Login/Register/Logout/Profile ---
    if (checkFunc('handlePlayerRegister')) {
        document.getElementById('register-form')?.addEventListener('submit', handlePlayerRegister);
    } else { console.warn("Listener Setup: handlePlayerRegister not found."); }

    if (checkFunc('handlePlayerLogin')) {
        document.getElementById('player-login-form')?.addEventListener('submit', handlePlayerLogin);
    } else { console.warn("Listener Setup: handlePlayerLogin not found."); }

    if (checkFunc('handleGoogleSignIn')) {
        document.getElementById('google-signin-button')?.addEventListener('click', handleGoogleSignIn);
    } else { console.warn("Listener Setup: handleGoogleSignIn not found."); }

    // Profile Dropdown Listeners (Requires currentPlayer, openPlayerModal, handlePlayerLogout from other modules)
    const profileButton = document.getElementById('profile-photo-button');
    const profileDropdown = document.getElementById('profile-dropdown');
    const editProfileLink = document.getElementById('dropdown-edit-profile');
    const logoutLink = document.getElementById('dropdown-logout');

    profileButton?.addEventListener('click', (event) => {
        event.stopPropagation();
        profileDropdown?.classList.toggle('hidden');
    });

    if (editProfileLink && checkFunc('openPlayerModal')) {
        editProfileLink.addEventListener('click', (event) => {
            event.preventDefault();
            profileDropdown?.classList.add('hidden');
            // currentPlayer needs to be accessible (likely from auth.js)
            if (currentPlayer && currentPlayer.id) {
                openPlayerModal(currentPlayer.id);
            } else {
                console.warn("Edit profile clicked, but no current player ID found.");
                alert("Please log in to edit your profile.");
                if (checkFunc('showSection')) showSection('player-login-section');
            }
        });
    } else { console.warn("Listener Setup: Edit Profile link or openPlayerModal not found."); }

    if (logoutLink && checkFunc('handlePlayerLogout')) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            profileDropdown?.classList.add('hidden');
            handlePlayerLogout();
        });
    } else { console.warn("Listener Setup: Logout link or handlePlayerLogout not found."); }

    // Close dropdown on outside click
    document.addEventListener('click', (event) => {
        if (!profileButton?.contains(event.target) && !profileDropdown?.contains(event.target)) {
            profileDropdown?.classList.add('hidden');
        }
    });

    // --- Admin Contextual Buttons (Modal Triggers) ---
    // Assumes visibility controlled by CSS/admin state handled elsewhere (e.g., onAuthStateChanged)
    if (openRecordGameModalBtn && checkFunc('openRecordGameModal')) {
        openRecordGameModalBtn.addEventListener('click', openRecordGameModal);
    } else { console.warn("Listener Setup: Record Game button or handler not found."); }

    if (openAddPlayerModalBtn && checkFunc('openAddPlayerModal')) {
        openAddPlayerModalBtn.addEventListener('click', openAddPlayerModal);
    } else { console.warn("Listener Setup: Add Player button or handler not found."); }

    if (openCreateTournamentModalBtn && checkFunc('openCreateTournamentModal')) {
        openCreateTournamentModalBtn.addEventListener('click', openCreateTournamentModal);
    } else { console.warn("Listener Setup: Create Tournament button or handler not found."); }

    if (openAddGameModalBtn && checkFunc('openAddGameModal')) {
        openAddGameModalBtn.addEventListener('click', openAddGameModal);
    } else { console.warn("Listener Setup: Add Game button or handler not found."); }

    if (openAddCourseModalBtn && checkFunc('openAddCourseModal')) {
        openAddCourseModalBtn.addEventListener('click', openAddCourseModal);
    } else { console.warn("Listener Setup: Add Course button or handler not found."); }


    // --- Modal Overlay Click-to-Close (Generic) ---
    // Ensure modal element references and closeModal function are accessible
    const mainModals = [
        recordGameModal, playerInfoModal, addPlayerModal, createTournamentModal,
        addGameModal, editTournamentModal, addParticipantsModal, addCourseModal, golfRulesModal
    ];
    if (checkFunc('closeModal')) {
        mainModals.forEach(modal => {
            modal?.addEventListener('click', (event) => {
                if (event.target === modal) { // Only close if overlay itself is clicked
                    console.log(`[MODAL] Closing modal via overlay click: #${modal.id}`);
                    closeModal(modal);
                }
            });
        });
    } else { console.warn("Listener Setup: closeModal function not found for overlay clicks."); }

    // --- Rankings Filter Dropdown ---
    if (rankingsGameFilter && checkFunc('updateRankingsVisibility')) {
        rankingsGameFilter.addEventListener('change', updateRankingsVisibility);
    } else { console.warn("Listener Setup: Rankings filter or handler not found."); }

    // --- Player Info Modal Buttons (Event Delegation inside modal opening function is often cleaner) ---
    // Keeping structure from original - ensure handlers are accessible
    const playerModalContent = playerInfoModal?.querySelector('.modal-content');
    if (playerModalContent && checkFunc('closePlayerModal') && checkFunc('togglePlayerModalEdit') && checkFunc('savePlayerChanges') && checkFunc('deletePlayer')) {
        playerModalContent.addEventListener('click', (event) => {
            if (event.target.matches('#close-player-modal-btn')) { closePlayerModal(); }
            else if (event.target.matches('#edit-player-modal-btn')) { togglePlayerModalEdit(true); }
            else if (event.target.matches('#save-player-changes-btn')) { savePlayerChanges(); }
            else if (event.target.matches('#cancel-player-edit-btn')) { togglePlayerModalEdit(false); }
            else if (event.target.matches('#delete-player-btn')) { deletePlayer(); }
        });
    } else { console.warn("Listener Setup: Player modal content or one of its handlers not found."); }

    // --- Players Grid Click (Event Delegation) ---
    if (playersGrid && checkFunc('openPlayerModal')) {
        playersGrid.addEventListener('click', (event) => {
            const playerEntry = event.target.closest('.player-entry');
            if (playerEntry) {
                const playerId = playerEntry.getAttribute('data-player-id');
                if (playerId) {
                    console.log(`[Player Grid] Clicked player ID: ${playerId}`);
                    openPlayerModal(playerId);
                }
            }
        });
    } else { console.warn("Listener Setup: Players grid or openPlayerModal handler not found."); }

    // --- Results Table Gear Icon Click (Event Delegation for Edit/Delete) ---
    // Assumes admin-only visibility handled by CSS
    if (resultsTableBody && checkFunc('handleEditGame')) {
        resultsTableBody.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.edit-delete-game-btn');
            if (!targetButton) return;
            const gameId = targetButton.getAttribute('data-game-id');
            if (!gameId) { console.error("Gear button clicked, but no game-id found."); return; }
            console.log(`[Results Table] Edit/Delete gear clicked for game: ${gameId}`);
            handleEditGame(gameId); // Function should open the Edit Game Modal
        });
    } else { console.warn("Listener Setup: Results table body or handleEditGame handler not found."); }


    // --- Body-Level Event Delegation (Dynamically added content) ---
    // Ensure handlers like populateTournamentDetails, openPlayerModal, updateRankingsVisibility, showSection, openAddParticipantsModal, openModal, closeModal are accessible
    document.body.addEventListener('click', async (event) => {
        if (!event || !event.target) return;

        // Handle "View Details" links for tournaments
        const tournamentLink = event.target.closest('.view-tournament-details-link');
        if (tournamentLink && checkFunc('populateTournamentDetails')) {
            event.preventDefault();
            const tournamentId = tournamentLink.getAttribute('data-tournament-id');
            if (tournamentId) {
                console.log(`[NAV Delegation] Viewing tournament details for: ${tournamentId}`);
                await populateTournamentDetails(tournamentId); // Fetch and display details
            } else { console.warn("Clicked view details link without a tournament ID."); }
            return;
        }

        // Handle clicks on player names (e.g., in tournament participant lists)
        const playerLink = event.target.closest('.player-link');
        if (playerLink && checkFunc('openPlayerModal')) {
            event.preventDefault();
            const playerId = playerLink.getAttribute('data-player-id');
            if (playerId) {
                console.log(`[PLAYER LINK Delegation] Clicked for player ID: ${playerId}`);
                openPlayerModal(playerId);
            } else { console.warn("Clicked player link without a player ID."); }
            return;
        }

        // Handle "View Details" buttons in the Sports Gallery
        const sportDetailsButton = event.target.closest('.view-sport-details-btn');
        if (sportDetailsButton && checkFunc('showSection') && checkFunc('populateGolfCourses') && checkFunc('updateRankingsVisibility')) {
            event.preventDefault();
            const sportKey = sportDetailsButton.getAttribute('data-sport');
            const sportsGallery = document.getElementById('sports-gallery');
            const golfDetailsView = document.getElementById('golf-details-view');
            console.log(`[SPORTS Delegation] Clicked details for sport: ${sportKey}`);

            if (sportKey === 'golf' && sportsGallery && golfDetailsView) {
                sportsGallery.classList.add('hidden');
                golfDetailsView.classList.remove('hidden');
                window.scrollTo(0, 0);
                await populateGolfCourses(); // Populate Golf Data when view is shown
            } else if (['overall', 'pool', 'chess', 'board_game'].includes(sportKey)) { // Example keys
                console.log(`Navigating to main section for ${sportKey}`);
                await showSection('rankings-section'); // Navigate to rankings
                 if (rankingsGameFilter) { // Pre-select filter
                     rankingsGameFilter.value = sportKey;
                     await updateRankingsVisibility();
                 }
            } else { console.warn(`Unhandled sport key clicked: ${sportKey}`); }
            return;
        }

        // Handle "Back to Sports Gallery" button
        const backToGalleryButton = event.target.closest('#back-to-sports-gallery-btn');
        if (backToGalleryButton) {
            event.preventDefault();
            document.getElementById('golf-details-view')?.classList.add('hidden');
            document.getElementById('sports-gallery')?.classList.remove('hidden');
            window.scrollTo(0, 0);
            console.log("[SPORTS Delegation] Clicking back to gallery.");
            return;
        }

        // Handle "View Official Rules" button (Golf Page)
        const rulesBtn = event.target.closest('#show-golf-rules-btn');
        if (rulesBtn && golfRulesModal && checkFunc('openModal')) {
            console.log("[MODAL] Opening golf rules modal.");
            const rulesIframe = document.getElementById('golf-rules-iframe');
            if (rulesIframe) {
                // Set src only when opening, avoid reloading if already open
                if (rulesIframe.src === 'about:blank' || !rulesIframe.src) {
                    rulesIframe.src = 'https://www.randa.org/en/rog/the-rules-of-golf';
                }
                openModal(golfRulesModal);
            } else { console.error("Could not find golf rules iframe element."); }
            return;
        }

        // Handle closing the Golf Rules modal via its specific close button
        const closeRulesBtn = event.target.closest('#close-golf-rules-modal-btn');
        if (closeRulesBtn && golfRulesModal && checkFunc('closeModal')) {
            console.log("[MODAL] Closing golf rules modal via button.");
            closeModal(golfRulesModal);
            return;
        }

        // Handle '+' button in tournament details to add participants
        const addParticipantsButton = event.target.closest('#add-participant-plus-btn');
        if (addParticipantsButton && checkFunc('openAddParticipantsModal')) {
             const tournamentId = addParticipantsButton.closest('section')?.querySelector('#tournament-detail-content h2')?.getAttribute('data-tournament-id'); // Example way to find ID if not on button
             // Better: Ensure button has data-tournament-id attribute set in populateTournamentDetails
             // const tournamentId = addParticipantsButton.getAttribute('data-tournament-id');
             if (tournamentId) {
                 openAddParticipantsModal(tournamentId);
             } else { console.warn("Add participants button clicked without tournament ID."); }
             return;
        }

        // Add other body-level delegated listeners here...

    }); // End of body click listener

    console.log("[LISTENERS] Setup complete.");
} // End setupEventListeners


// --- Application Initialization ---
// Dependencies: Needs access to assignElements, fetchAllPlayersForCache, updateGameTypeDropdowns,
// setupEventListeners, setupLiveGameSection, setupDarkMode, showSection, and the auth.onAuthStateChanged listener logic.
async function initializeApp() {
    try {
        console.log("[INIT] Initializing App...");
        // Ensure utility functions are available
        if (typeof assignElements !== 'function' || typeof fetchAllPlayersForCache !== 'function' || typeof setupDarkMode !== 'function' || typeof updateGameTypeDropdowns !== 'function' || typeof setupEventListeners !== 'function' || typeof setupLiveGameSection !== 'function' || typeof showSection !== 'function') {
            throw new Error("Core UI or setup functions are missing.");
        }

        assignElements(); // Assign DOM elements to variables
        if (!db || !auth) { throw new Error("Firebase DB or Auth connection failed."); }

        await fetchAllPlayersForCache(); // Populate player cache first

        setupDarkMode(); // Setup dark mode toggle and initial theme
        updateGameTypeDropdowns(); // Populate dropdowns with initial game types
        setupEventListeners(); // Setup general listeners
        setupLiveGameSection(); // Setup listeners specific to live game section

        // --- Auth Listener (defined in auth.js, but potentially invoked here or after SDK load) ---
        // Ensure the auth.onAuthStateChanged listener is set up correctly, possibly by calling a function
        // defined in auth.js or having its setup logic here if preferred (less modular).
        // Example: if (typeof setupAuthListener === 'function') setupAuthListener();

        // Handle initial page load based on hash/query params
        // Separate hash and query parameters
        const hash = window.location.hash.split('?')[0];
        const initialHash = hash || '#home-section';
        let initialSectionId = 'home-section';

        if (initialHash && initialHash !== '#') {
            const targetIdFromHash = initialHash.substring(1);
            // Verify the hash corresponds to a valid section ID
            const targetSection = document.getElementById(targetIdFromHash);
            if (targetSection?.classList.contains('page-section')) {
                initialSectionId = targetIdFromHash;
            } else {
                console.warn(`[INIT] Hash '#${targetIdFromHash}' does not correspond to a valid section. Defaulting to home.`);
            }
        }

        // Show the initial section AFTER setting up listeners
        await showSection(initialSectionId);

        console.log("[INIT] App Initialized Successfully.");

    } catch (error) {
        console.error("Error during app initialization:", error);
        // Display a user-friendly error message on the page using CSS classes
        document.body.innerHTML = `<div class="app-error-container p-4 border rounded">
            <h2 class="text-xl font-semibold error-title">Application Error</h2>
            <p class="error-text">Could not initialize the application: ${error.message}</p>
            <p class="error-text text-sm">Please check the console for details and ensure Firebase is configured correctly.</p>
        </div>`;
        // Add styles for .app-error-container, .error-title, .error-text in styles.css
    }
} // End initializeApp


// --- Run Initialization on DOM Load ---
// Ensure this runs only once and after all scripts are potentially loaded if using modules
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoaded has already fired
    initializeApp();
}

// Note: This file coordinates the startup sequence. It relies heavily on functions
// defined in the other .js files (auth.js, players.js, ui_utils.js, etc.).
// Ensure those files are loaded correctly in your HTML before this script runs,
// or use JavaScript modules (import/export) for better dependency management.
