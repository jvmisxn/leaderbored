// --- player_management.js ---

// Map game keys to background image URLs
const gameBackgroundImages = {
    golf: 'images/bg_golf.jpg',
    pool: 'images/bg_pool.jpg',
    chess: 'images/bg_chess.jpg',
    board_game: 'images/bg_boardgame.jpg',
    // ...add more as needed...
};

// Helper: get most played game key for a player
function getMostPlayedGameKey(player) {
    if (!player || !player.games_played) return null;
    let max = 0, maxKey = null;
    for (const [gameKey, count] of Object.entries(player.games_played)) {
        if (count > max) { max = count; maxKey = gameKey; }
    }
    return maxKey;
}

/**
 * Fetches all player documents from Firestore and populates the globalPlayerCache.
 * Sets the playersCachePopulated flag.
 * @returns {Promise<boolean>} True if the cache was populated successfully, false otherwise.
 */
async function fetchAllPlayersForCache() {
    console.log("[Cache] Attempting to fetch all players for cache...");
    if (!db) {
        console.error("[Cache] Firestore DB object not available.");
        playersCachePopulated = false;
        return false;
    }

    try {
        const snapshot = await db.collection('players').get();
        globalPlayerCache = {}; // Reset cache before populating

        if (snapshot.empty) {
            console.warn("[Cache] No player documents found in Firestore.");
            playersCachePopulated = true; // Consider cache populated even if empty
            return true;
        }

        snapshot.forEach(doc => {
            globalPlayerCache[doc.id] = { id: doc.id, ...doc.data() };
        });

        playersCachePopulated = true;
        console.log(`[Cache] Successfully populated globalPlayerCache with ${snapshot.size} players.`);
        return true;

    } catch (error) {
        console.error("[Cache] Error fetching players for cache:", error);
        playersCachePopulated = false;
        globalPlayerCache = {}; // Clear cache on error
        return false;
    }
}

/**
 * Retrieves a player's name from the cache.
 * @param {string} playerId - The ID of the player.
 * @returns {string} The player's name or 'Unknown Player'.
 */
function getPlayerNameFromCache(playerId) {
    if (!playersCachePopulated) {
        console.warn(`[Cache] Attempted to get player name (${playerId}) before cache was populated.`);
    }
    return globalPlayerCache[playerId]?.name || 'Unknown Player';
}

// --- Add Player Modal Functions ---

/**
 * Opens the modal to add a new player.
 */
function openAddPlayerModal() {
    const modalElement = document.getElementById('add-player-modal');
    if (!modalElement) { console.error("Add Player modal element (#add-player-modal) not found."); return; }
    if (!db) { console.error("Add Player modal: DB not ready."); alert("Database connection error."); return; }

    // Define and Inject the specific HTML content for this modal
    const modalContentHTML = `
        <div class="modal-content">
            <button id="close-add-player-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Add New Player</h2>
            <form id="add-player-form">
                <div class="mb-4">
                    <label for="player-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Player Name:</label>
                    <input type="text" id="player-name" name="player-name" class="input-field w-full" required>
                </div>
                <div class="mb-5">
                    <label for="player-icon-url" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Icon URL (Optional):</label>
                    <input type="url" id="player-icon-url" name="player-icon-url" class="input-field w-full" placeholder="https://example.com/icon.png">
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter a URL for the player's avatar/icon.</p>
                </div>
                <p id="add-player-error" class="text-red-500 text-sm mt-2 h-4"></p>
                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="cancel-add-player-modal-btn" class="button button-secondary">Cancel</button>
                    <button type="submit" class="button button-primary">Add Player</button>
                </div>
            </form>
        </div>`;
    modalElement.innerHTML = modalContentHTML;

    // Attach listeners *after* injecting HTML
    modalElement.querySelector('#close-add-player-modal-btn')?.addEventListener('click', closeAddPlayerModal);
    modalElement.querySelector('#cancel-add-player-modal-btn')?.addEventListener('click', closeAddPlayerModal);
    modalElement.querySelector('#add-player-form')?.addEventListener('submit', handleAddPlayerSubmit);

    openModal(modalElement); // Use generic openModal
}

/**
 * Closes the Add Player modal.
 */
function closeAddPlayerModal() {
    const modalElement = document.getElementById('add-player-modal');
    if (modalElement) closeModal(modalElement); // Use generic close
}

/**
 * Handles submission of the Add Player modal form.
 */
async function handleAddPlayerSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorElement = form.querySelector('#add-player-error');
    if (!db) { alert("Database connection error."); return; }

    if (errorElement) errorElement.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    const playerName = form.querySelector('#player-name').value.trim();
    const playerIconUrl = form.querySelector('#player-icon-url').value.trim();

    if (!playerName) {
        if (errorElement) errorElement.textContent = "Player name is required.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Player';
        return;
    }

    const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;
    const playerData = {
        name: playerName,
        iconUrl: playerIconUrl || null,
        isAdmin: false, // Default to not admin
        date_created: firebase.firestore.FieldValue.serverTimestamp(),
        elos: { overall: defaultElo },
        elo_overall: defaultElo,
        wins: 0, losses: 0, draws: 0, games_played: 0,
        golf_handicap: null
    };

    try {
        // Add player to Firestore (let Firestore generate the ID)
        const docRef = await db.collection('players').add(playerData);
        console.log(`[FIRESTORE] Player "${playerName}" added successfully with ID: ${docRef.id}`);
        alert(`Player "${playerName}" added successfully!`);

        // Refresh player list UI and cache
        playersCachePopulated = false; // Invalidate cache
        await fetchAllPlayersForCache(); // Repopulate cache
        if (typeof populatePlayersList === 'function' && currentSectionId === 'players-section') {
            await populatePlayersList(); // Refresh grid if function exists and section is active
        }
        // Refresh dropdowns that use players (e.g., submit score)
        if (typeof populatePlayerDropdowns === 'function') { // Assuming a helper function exists
             await populatePlayerDropdowns();
        }

        closeAddPlayerModal(); // Close the modal on success

    } catch (error) {
        console.error("Error adding player:", error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
        alert(`Failed to add player: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Add Player';
    }
}

// --- Player List Population (Players Section) ---

/**
 * Populates the players list grid.
 */
async function populatePlayersList() {
    console.log("[Players] Populating players list...");
    const playersListContainer = document.getElementById('players-list-container');
    const sortFilter = document.getElementById('players-sort-filter');

    if (!playersListContainer || !sortFilter) {
        if (!playersListContainer) {
            console.error("[Players] CRITICAL: Players list container (#players-list-container) not found in the DOM. Check the 'template-players-section' in your HTML.");
        }
        if (!sortFilter) {
            console.error("[Players] CRITICAL: Players sort filter (#players-sort-filter) not found in the DOM. Check the 'template-players-section' in your HTML.");
        }
        if (playersListContainer && !sortFilter) {
             playersListContainer.innerHTML = '<p class="error-text text-center py-5 col-span-full">Error: Player list structure incomplete (missing sort filter).</p>';
        }
        return;
    }

    if (!sortFilter.dataset.listenerAttached) {
        sortFilter.addEventListener('change', populatePlayersList);
        sortFilter.dataset.listenerAttached = 'true';
        console.log("[Players] Attached change listener to sort filter.");
    }

    const addPlayerBtn = document.getElementById('add-player-btn');
    if (addPlayerBtn && !addPlayerBtn.dataset.listenerAttached) {
        addPlayerBtn.addEventListener('click', () => {
            if (typeof openAddPlayerModal === 'function') {
                openAddPlayerModal();
            } else {
                console.error("openAddPlayerModal function not found.");
            }
        });
        addPlayerBtn.dataset.listenerAttached = 'true';
        console.log("[Players] Attached click listener to Add Player button.");
    }

    playersListContainer.innerHTML = '<p class="loading-text text-center py-5 col-span-full text-gray-600 dark:text-gray-400">Loading players...</p>';

    if (!db) {
        playersListContainer.innerHTML = '<p class="error-text text-center py-5 col-span-full">Database connection error.</p>';
        return;
    }

    const sortBy = sortFilter.value || 'name';
    let sortDirection = 'asc';
    if (sortBy === 'elo_overall') {
        sortDirection = 'desc';
    }

    try {
        const snapshot = await db.collection('players').orderBy(sortBy, sortDirection).get();

        if (snapshot.empty) {
            playersListContainer.innerHTML = '<p class="muted-text text-center py-5 col-span-full">No players found.</p>';
            return;
        }

        playersListContainer.innerHTML = '';
        const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;

        snapshot.forEach(doc => {
            const player = { id: doc.id, ...doc.data() };
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card card bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200 flex flex-col items-center text-center cursor-pointer';
            playerCard.dataset.playerId = player.id;

            const avatarUrl = player.iconUrl || player.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || '?')}&background=random&color=fff&size=64`;
            const overallElo = Math.round(player.elo_overall || defaultElo);

            playerCard.innerHTML = `
                <img src="${avatarUrl}" alt="${player.name || 'Player'}'s avatar" class="w-16 h-16 rounded-full mb-3 object-cover border-2 border-gray-200 dark:border-gray-600">
                <h3 class="font-semibold text-base mb-1 truncate w-full">${player.name || 'Unnamed Player'}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Elo: ${overallElo}</p>
            `;

            playerCard.addEventListener('click', () => {
                console.log(`[Players] Player card clicked: ${player.id}`);
                if (typeof showSection === 'function') {
                    showSection('player-profile-section', true, { playerId: player.id });
                } else {
                    console.error("[Players] showSection function not found for navigation.");
                    window.location.hash = `#player-profile-section?playerId=${player.id}`;
                }
            });

            playersListContainer.appendChild(playerCard);
        });

        console.log(`[Players] Populated ${snapshot.size} players, sorted by ${sortBy} ${sortDirection}.`);

    } catch (error) {
        console.error("[Players] Error fetching players:", error);
        playersListContainer.innerHTML = `<p class="error-text text-center py-5 col-span-full">Error loading players: ${error.message}</p>`;
        if (error.code === 'failed-precondition') {
            console.error(`Firestore index required: 'players' collection, '${sortBy}' field (${sortDirection}).`);
        }
    }
}

/**
 * Creates the HTML element for a single player card.
 * @param {object} player - The player object { id, name, elos, photoURL, iconUrl, ... }.
 * @returns {HTMLElement} The created player card element.
 */
function createPlayerCardElement(player) {
    const div = document.createElement('div');
    div.className = 'player-entry';
    div.setAttribute('data-player-id', player.id);

    const imgUrl =
        player.iconUrl ||
        player.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || '?')}&background=E0E7FF&color=4F46E5&size=40`;
    const overallElo = player.elos?.overall !== undefined ? Math.round(player.elos.overall) : 'N/A';

    div.innerHTML = `
        <img src="${imgUrl}" alt="${player.name || 'Player'}" class="player-entry-image">
        <div class="player-entry-info">
            <div class="player-entry-name">${player.name || 'Unnamed Player'}</div>
            <div class="player-entry-elo">Overall Elo: ${overallElo}</div>
        </div>
    `;
    return div;
}

// --- Player Profile Page Population ---

/**
 * Fetches and populates the entire player profile page.
 * @param {string} playerId - The ID of the player whose profile to display.
 */
async function populatePlayerProfilePage(playerId) {
    // Only fall back to current user if no playerId is provided
    if (!playerId) {
        if (typeof getCurrentUserId === 'function') {
            playerId = getCurrentUserId();
        }
    }
    
    // If we still don't have a playerId, show error
    if (!playerId) {
        const elements = {
            section: document.getElementById('player-profile-section'),
            name: document.getElementById('player-profile-name'),
            image: document.getElementById('player-profile-image'),
            joined: document.getElementById('player-profile-joined'),
            ratings: document.getElementById('player-profile-elo-ratings'),
            stats: document.getElementById('player-profile-games-played'),
            recentGames: document.getElementById('player-profile-recent-games'),
            backButton: document.getElementById('player-profile-back-button'),
            bio: document.getElementById('player-profile-bio'),
            privacy: document.getElementById('player-profile-privacy'),
            editButton: document.getElementById('player-profile-edit-button')
        };
        showError(elements, 'No player ID provided.');
        return;
    }

    console.log(`[Profile Page] Populating profile for player ID: ${playerId}`);

    // Get all required DOM elements
    const elements = {
        section: document.getElementById('player-profile-section'),
        name: document.getElementById('player-profile-name'),
        image: document.getElementById('player-profile-image'),
        joined: document.getElementById('player-profile-joined'),
        ratings: document.getElementById('player-profile-elo-ratings'),
        stats: document.getElementById('player-profile-games-played'),
        recentGames: document.getElementById('player-profile-recent-games'),
        backButton: document.getElementById('player-profile-back-button'),
        bio: document.getElementById('player-profile-bio'),
        privacy: document.getElementById('player-profile-privacy'),
        editButton: document.getElementById('player-profile-edit-button')
    };

    // Validate all required elements exist (do NOT require editButton)
    const requiredElements = { ...elements };
    delete requiredElements.editButton;
    const missingElements = Object.entries(requiredElements)
        .filter(([_, el]) => !el)
        .map(([key]) => key);
    if (missingElements.length > 0) {
        console.error("[Profile Page] Missing elements:", missingElements);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '<p class="error-text text-center py-10">Error loading profile page structure.</p>';
        }
        return;
    }

    // --- Back Button Logic ---
    let backLink = '#players-section';
    let backText = 'Back to Players';
    const previousHash = sessionStorage.getItem('previousHash') || '';
    const previousUrl = new URL(previousHash, window.location.origin);
    const previousSectionId = previousUrl.hash.split('?')[0].substring(1);
    const previousQueryParams = new URLSearchParams(previousUrl.search);

    if (previousSectionId && previousSectionId !== 'player-profile-section' && previousSectionId !== 'edit-profile-section') {
        const sectionMapping = {
            'rankings-section': 'Rankings',
            'results-section': 'Results',
            'game-info-section': 'Game',
            'tournaments-section': 'Tournaments',
            'tournament-detail-section': 'Tournament',
            'home-section': 'Dashboard',
            'players-section': 'Players'
        };
        
        const section = sectionMapping[previousSectionId] || 'Players';
        backLink = `#${previousSectionId}?${previousQueryParams.toString()}`;
        backText = `Back to ${section}`;
    }

    elements.backButton.href = backLink;
    elements.backButton.textContent = `\u2190 ${backText}`;
    console.log(`[Profile Page] Set back button to: ${backText} (${backLink})`);

    // Set initial loading states
    elements.name.textContent = 'Loading...';
    elements.image.src = `https://ui-avatars.com/api/?name=?&background=E0E7FF&color=4F46E5&size=128`;
    elements.joined.textContent = 'Member since Loading...';
    elements.ratings.innerHTML = '<p class="loading-text">Loading ratings...</p>';
    elements.stats.innerHTML = '<p class="loading-text">Loading stats...</p>';
    elements.recentGames.innerHTML = '<p class="loading-text">Loading recent games...</p>';

    if (!db) {
        console.error("[Profile Page] Firestore DB not available.");
        showError(elements, 'Database connection error');
        return;
    }

    try {
        // Always directly fetch the requested player's data instead of relying on cache first
        const playerDoc = await db.collection('players').doc(playerId).get();
        
        if (!playerDoc.exists) {
            throw new Error(`Player not found with ID: ${playerId}`);
        }
        
        const docData = playerDoc.data();
        const playerData = {
            id: playerDoc.id,
            name: docData.name || 'Unnamed Player',
            email: docData.email || null,
            iconUrl: docData.iconUrl || null,
            photoURL: docData.photoURL || null,
            isAdmin: docData.isAdmin || false,
            date_created: docData.date_created || null,
            elos: docData.elos || { overall: DEFAULT_ELO },
            elo_overall: docData.elo_overall ?? docData.elos?.overall ?? DEFAULT_ELO,
            wins: docData.wins || 0,
            losses: docData.losses || 0,
            draws: docData.draws || 0,
            games_played: docData.games_played || 0,
            golf_handicap: docData.golf_handicap ?? null,
            games_played_by_type: docData.games_played_by_type || {},
            bio: docData.bio || '',
            public: docData.public,
            showStats: docData.showStats
        };

        // Update cache with the fresh data
        globalPlayerCache[playerId] = playerData;

        // Update header section
        elements.name.textContent = playerData.name;
        elements.image.src = playerData.iconUrl || 
                           playerData.photoURL || 
                           `https://ui-avatars.com/api/?name=${encodeURIComponent(playerData.name || '?')}&background=random&color=fff&size=128`;
        elements.image.alt = `${playerData.name}'s Profile`;
        elements.joined.textContent = `Member since ${playerData.date_created?.toDate?.()?.toLocaleDateString() || 'Unknown'}`;

        // Update Bio and Privacy Info
        if (elements.bio) elements.bio.textContent = playerData.bio || '';
        if (elements.privacy) {
            elements.privacy.innerHTML = '';
            if (playerData.public === false) {
                elements.privacy.innerHTML = '<span class="text-xs text-yellow-600 dark:text-yellow-400">Private Profile</span>';
            } else {
                elements.privacy.innerHTML = '<span class="text-xs text-green-600 dark:text-green-400">Public Profile</span>';
            }
            if (playerData.showStats === false) {
                elements.privacy.innerHTML += ' <span class="text-xs text-gray-500">(Stats hidden)</span>';
            }
        }

        // Show edit button if viewing own profile
        if (elements.editButton) {
            const currentUserId = typeof getCurrentUserId === 'function' ? getCurrentUserId() : null;
            if (currentUserId && currentUserId === playerId) {
                elements.editButton.classList.remove('hidden');
                elements.editButton.href = `#edit-profile-section?playerId=${playerId}`;
            } else {
                elements.editButton.classList.add('hidden');
            }
        }

        // Load all sections in parallel
        await Promise.all([
            populatePlayerProfileRatings(elements.ratings, playerData.elos || {}, playerData.golf_handicap),
            populatePlayerProfileGamesPlayed(elements.stats, playerData),
            populatePlayerProfileRecentGames(elements.recentGames, playerId)
        ]);

        // Apply theme based on most played game
        if (!window.globalGameConfigs) {
            await fetchAndCacheGameConfigs();
        }
        
        if (elements.section && window.globalGameConfigs) {
            // Remove previous theme classes
            elements.section.classList.forEach(className => {
                if (className.startsWith('theme-')) {
                    elements.section.classList.remove(className);
                }
            });
            
            // Add new theme
            const mostPlayedKey = getMostPlayedGameKey(playerData);
            if (mostPlayedKey && window.globalGameConfigs[mostPlayedKey]?.themeClass) {
                elements.section.classList.add(window.globalGameConfigs[mostPlayedKey].themeClass);
                console.log(`[Profile Page] Applied theme: ${window.globalGameConfigs[mostPlayedKey].themeClass}`);
            }
        }

        // Make player links clickable
        makePlayerElementsClickable();
        
        console.log(`[Profile Page] Successfully populated profile for ${playerData.name}`);

    } catch (error) {
        console.error(`[Profile Page] Error populating profile for ${playerId}:`, error);
        showError(elements, error.message);
    }
}

// Helper function to show error state
function showError(elements, message) {
    elements.name.textContent = 'Error Loading Profile';
    elements.joined.textContent = 'Error';
    elements.image.src = `https://ui-avatars.com/api/?name=X&background=FEE2E2&color=DC2626&size=128`;
    elements.ratings.innerHTML = `<p class="error-text">Error: ${message}</p>`;
    elements.stats.innerHTML = `<p class="error-text">Error: ${message}</p>`;
    elements.recentGames.innerHTML = `<p class="error-text">Error: ${message}</p>`;
    // Also clear bio and privacy
    const bioEl = document.getElementById('player-profile-bio');
    const privacyEl = document.getElementById('player-profile-privacy');
    if (bioEl) bioEl.textContent = '';
    if (privacyEl) privacyEl.innerHTML = '';
}

/**
 * Populates the Elo ratings section of the player profile.
 * @param {HTMLElement} container - The container element for ratings.
 * @param {object} elos - The player's elos object (e.g., { overall: 1050, pool: 1100 }).
 * @param {number|null} golfHandicap - The player's golf handicap.
 */
async function populatePlayerProfileRatings(container, elos, golfHandicap) {
    if (!container) return;
    let ratingsHtml = '<ul class="space-y-1 text-sm">';
    let hasRatings = false;
    const defaultElo = typeof DEFAULT_ELO !== 'undefined' ? DEFAULT_ELO : 1000;

    const ratingsMap = new Map();

    // Ensure game configs are loaded to get names
    if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();

    // 1. Add Overall Elo
    const overallRating = elos?.overall !== undefined && elos.overall !== null ? Math.round(elos.overall) : defaultElo;
    ratingsMap.set('overall', { name: 'Overall Elo', rating: overallRating });
    hasRatings = true; // Assume overall always exists or defaults

    // 2. Add Game-Specific Elos
    if (elos && typeof window.globalGameConfigs === 'object' && window.globalGameConfigs !== null) {
        const sortedGameElos = Object.entries(elos)
            .filter(([key, value]) => key !== 'overall' && key !== 'golf_handicap' && value !== undefined && value !== null && window.globalGameConfigs[key]) // Ensure game exists in config
            .map(([key, rating]) => ({
                key,
                name: window.globalGameConfigs[key]?.name || key, // Get name from config
                rating: Math.round(rating)
            }))
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by game name

        sortedGameElos.forEach(item => {
            ratingsMap.set(item.key, item);
            hasRatings = true;
        });
    }

    // 3. Add Golf Handicap (if applicable)
    if (golfHandicap !== undefined && golfHandicap !== null) {
        ratingsMap.set('golf_handicap', { name: 'Golf Handicap', rating: golfHandicap.toFixed(1) });
        hasRatings = true;
    }

    // Generate HTML
    if (hasRatings) {
        // Display Overall first, then others alphabetically
        if (ratingsMap.has('overall')) {
            const item = ratingsMap.get('overall');
            ratingsHtml += `<li class="flex justify-between"><span>${item.name}:</span> <strong class="font-medium">${item.rating}</strong></li>`;
            ratingsMap.delete('overall'); // Remove from map so it's not repeated
        }
        // Display Golf Handicap next if present
        if (ratingsMap.has('golf_handicap')) {
            const item = ratingsMap.get('golf_handicap');
            ratingsHtml += `<li class="flex justify-between"><span>${item.name}:</span> <strong class="font-medium">${item.rating}</strong></li>`;
            ratingsMap.delete('golf_handicap');
        }
        // Display remaining game Elos (already sorted)
        ratingsMap.forEach(item => {
            ratingsHtml += `<li class="flex justify-between"><span>${item.name} Elo:</span> <strong class="font-medium">${item.rating}</strong></li>`;
        });
    } else {
        ratingsHtml += '<li class="muted-text italic">No ratings available yet.</li>';
    }

    ratingsHtml += '</ul>';
    container.innerHTML = ratingsHtml;
}


/**
 * Fetches and populates the games played stats section using player data object.
 * @param {HTMLElement} container - The container element for stats.
 * @param {object} player - The player data object from Firestore/cache.
 */
async function populatePlayerProfileGamesPlayed(container, player) {
    if (!container || !player) {
        container.innerHTML = '<p class="error-text">Player data missing.</p>';
        return;
    }

    try {
        const totalGames = player.games_played || 0;
        const wins = player.wins || 0;
        const losses = player.losses || 0;
        const draws = player.draws || 0;
        const totalDecided = wins + losses;
        const winRate = totalDecided > 0 ? ((wins / totalDecided) * 100).toFixed(1) : 'N/A';

        let statsHtml = `<ul class="space-y-1 text-sm">`;
        statsHtml += `<li class="flex justify-between"><span>Total Played:</span> <strong>${totalGames}</strong></li>`;
        statsHtml += `<li class="flex justify-between"><span>Wins:</span> <strong class="text-green-600 dark:text-green-400">${wins}</strong></li>`;
        statsHtml += `<li class="flex justify-between"><span>Losses:</span> <strong class="text-red-600 dark:text-red-400">${losses}</strong></li>`;
        statsHtml += `<li class="flex justify-between"><span>Draws:</span> <strong class="text-gray-600 dark:text-gray-400">${draws}</strong></li>`;
        statsHtml += `<li class="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600"><span>Win Rate:</span> <strong>${winRate}${winRate !== 'N/A' ? '%' : ''}</strong></li>`;
        statsHtml += '</ul>';

        // Add 'By Game' stats if available
        if (player.games_played_by_type && Object.keys(player.games_played_by_type).length > 0) {
             // Ensure game configs are loaded for names
             if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();

             statsHtml += '<h3 class="text-md font-semibold mt-4 mb-2 pt-2 border-t border-gray-200 dark:border-gray-600">By Game:</h3>';
             statsHtml += '<ul class="space-y-1 text-xs">';
             const sortedGames = Object.entries(player.games_played_by_type)
                .map(([key, count]) => ({
                    key,
                    name: window.globalGameConfigs?.[key]?.name || key, // Use optional chaining
                    count
                }))
                .sort((a, b) => a.name.localeCompare(b.name)); // Sort by game name

             sortedGames.forEach(({ name, count }) => {
                 statsHtml += `<li class="flex justify-between text-gray-600 dark:text-gray-400"><span>${name}:</span> <span>${count} played</span></li>`;
             });
             statsHtml += '</ul>';
        }

        container.innerHTML = statsHtml;

    } catch (error) {
        console.error("[Profile Page] Error processing games played stats:", error);
        container.innerHTML = `<p class="error-text">Error loading stats: ${error.message}</p>`;
    }
}


/**
 * Fetches and populates the recent games list for the player profile.
 * @param {HTMLElement} container - The container element for the list.
 * @param {string} playerId - The ID of the player.
 * @param {number} [limit=10] - Maximum number of games to show.
 */
async function populatePlayerProfileRecentGames(container, playerId, limit = 10) {
    if (!container || !db) {
        if (container) container.innerHTML = '<p class="error-text">Database connection error.</p>';
        return;
    }
    container.innerHTML = '<p class="loading-text">Loading recent games...</p>'; // Set loading state

    try {
        const gamesQuery = db.collection('games')
                             .where('participants', 'array-contains', playerId)
                             .orderBy('date_played', 'desc')
                             .limit(limit);

        const snapshot = await gamesQuery.get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic text-center py-4">No recent games found.</p>';
            return;
        }

        // Ensure necessary caches are populated
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
        if (!playersCachePopulated) await fetchAllPlayersForCache();

        let gamesHtml = '<ul class="space-y-3">';
        snapshot.forEach(doc => {
            const game = { id: doc.id, ...doc.data() };
            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
            const gameConfig = window.globalGameConfigs?.[game.game_type];
            const gameType = gameConfig?.name || game.game_type || 'Unknown Game';
            let opponentName = 'N/A';
            let resultText = ''; // Will hold Win/Loss/Draw + score
            let description = `Played ${gameType}`;

            // Determine opponent(s) and basic description
            if (game.participants && game.participants.length > 1) {
                const opponentIds = game.participants.filter(pId => pId !== playerId);
                if (opponentIds.length > 0) {
                    opponentName = opponentIds.map(id => getPlayerNameFromCache(id)).join(' & '); // Handle multiple opponents/teammates if needed
                    description += ` vs ${opponentName}`;
                }
            } else if (game.participants && game.participants.length === 1) {
                description = `Played ${gameType} (Solo)`; // Solo game like Golf
            }

            // Determine result text (Win/Loss/Draw and Score)
            let playerOutcome = 'N/A';
            if (game.winner_id === playerId) playerOutcome = 'Win';
            else if (game.loser_id === playerId) playerOutcome = 'Loss';
            else if (game.is_draw) playerOutcome = 'Draw';
            else if (game.participants?.length === 1 && game.game_type === 'golf') playerOutcome = 'Completed'; // Golf solo round

            // Format score based on game type
            let scoreDisplay = game.score || ''; // Default to score string if present
            if (game.game_type === 'golf' && game.scores && game.scores.length > 0) {
                const playerScore = game.scores.find(s => s.playerId === playerId);
                if (playerScore) {
                    scoreDisplay = `Score: ${playerScore.score}`;
                    if (playerScore.strokes) scoreDisplay += ` (${playerScore.strokes} strokes)`;
                } else {
                    scoreDisplay = 'Score N/A';
                }
            } else if (game.scores && game.scores.length === 2) { // Simple 1v1 score display
                 const score1 = game.scores.find(s => s.playerId === game.participants[0])?.score ?? '-';
                 const score2 = game.scores.find(s => s.playerId === game.participants[1])?.score ?? '-';
                 scoreDisplay = `${score1} - ${score2}`;
            }

            // Combine outcome and score
            if (playerOutcome !== 'N/A') {
                resultText = playerOutcome;
                if (scoreDisplay) resultText += ` (${scoreDisplay})`;
            } else if (scoreDisplay) {
                resultText = scoreDisplay; // Fallback if outcome unknown but score exists
            } else {
                resultText = 'Result Unknown';
            }


            gamesHtml += `
                <li class="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                    <a href="#game-info-section?gameId=${game.id}" class="nav-link block hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors duration-150" data-target="game-info-section">
                        <div class="flex justify-between items-center text-sm mb-1">
                            <span class="font-medium text-gray-800 dark:text-gray-200">${description}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${gameDate}</span>
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-300">${resultText}</div>
                    </a>
                </li>`;
        });
        gamesHtml += '</ul>';

        container.innerHTML = gamesHtml;
        // Make the newly added game links navigable
        makePlayerElementsClickable(container); // Pass the container to scope the listener attachment

    } catch (error) {
        console.error(`[Profile Page] Error fetching recent games for player ${playerId}:`, error);
        container.innerHTML = `<p class="error-text text-center py-4">Error loading recent games: ${error.message}</p>`;
    }
}


/**
 * Makes all player references (names, images, links with data-player-id) clickable to navigate to player profiles.
 * This function should be called after dynamically adding content that might contain player links/cards.
 * @param {HTMLElement} [rootElement=document] - The root element to search within. Defaults to the entire document.
 */
function makePlayerElementsClickable(rootElement = document) {
    console.log(`[UI] Attaching/Re-attaching player click listeners within ${rootElement === document ? 'document' : 'specific element'}...`);
    const elementsToProcess = rootElement.querySelectorAll('.player-card, .player-link, a[data-player-id]');

    elementsToProcess.forEach(element => {
        // Check if listener already attached using a data attribute
        if (element.dataset.playerClickListenerAttached === 'true') {
            return; // Skip if listener already exists
        }

        const playerId = element.dataset.playerId || element.getAttribute('data-player-id');

        if (playerId) {
            element.addEventListener('click', (e) => {
                // Prevent default link behavior only if it's an anchor tag
                if (element.tagName === 'A') {
                    e.preventDefault();
                }
                console.log(`[UI] Player element clicked: ID ${playerId}`);
                if (typeof showSection === 'function') {
                    // Store current hash before navigating
                    sessionStorage.setItem('previousHash', window.location.hash);
                    showSection('player-profile-section', true, { playerId });
                } else {
                    console.error("[UI] showSection function not found for navigation.");
                    // Fallback navigation (less ideal as it doesn't use the SPA router)
                    // window.location.hash = `#player-profile-section?playerId=${playerId}`;
                }
            });
            // Mark the element as having the listener attached
            element.dataset.playerClickListenerAttached = 'true';

            // Add cursor pointer styling if it's not an anchor tag already
            if (element.tagName !== 'A') {
                 element.style.cursor = 'pointer';
            }
        } else {
            // console.warn("[UI] Found player element without data-player-id:", element);
        }
    });
    console.log(`[UI] Processed ${elementsToProcess.length} potential player elements for click listeners within the specified scope.`);
}

/**
 * Sets up the Edit Profile form: loads current values, handles preview, and saves changes.
 * Should be called when the edit profile section is shown.
 */
async function setupEditProfileForm(sectionElement) {
    const form = document.getElementById('edit-profile-form');
    if (!form) return;
    const nameInput = form.querySelector('#edit-profile-name');
    const iconUrlInput = form.querySelector('#edit-profile-icon-url');
    const avatarPreview = form.querySelector('#edit-profile-avatar-preview');
    const bioInput = form.querySelector('#edit-profile-bio');
    const publicCheckbox = form.querySelector('#edit-profile-public');
    const showStatsCheckbox = form.querySelector('#edit-profile-show-stats');
    const errorElement = form.querySelector('#edit-profile-error');

    // Load current player data
    const userId = getCurrentUserId();
    if (!userId || !playersCachePopulated) await fetchAllPlayersForCache();
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
            showSection('player-profile-section', true, { playerId: userId });
        } catch (err) {
            errorElement.textContent = 'Error saving profile: ' + err.message;
        }
    };
}

console.log("[Player Mgmt] player_management.js loaded.");
