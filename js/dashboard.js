// Dashboard specific functions will go here.

/**
 * Populates all elements in the dashboard section.
 */
async function populateDashboard() {
    console.log("[Dashboard] Populating dashboard elements...");
    
    // Instead of checking for all elements at once, handle each section separately
    // This allows partial dashboard rendering even if some elements are missing
    try {
        // Ensure configs are loaded
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
        // Ensure player cache is populated
        if (!playersCachePopulated) await fetchAllPlayersForCache();
        
        await populateWelcomeMessage();
        await populateRecentGames();
        await populateTopPlayers();
        await populateNextTournament();
        
        console.log("[Dashboard] Dashboard population complete.");
    } catch (error) {
        console.error("[Dashboard] Error populating dashboard:", error);
        // Display a general error if dashboard itself exists
        const dashboardSection = document.getElementById('home-section');
        if (dashboardSection) {
            dashboardSection.innerHTML = `
                <div class="text-center py-10">
                    <p class="text-red-500 mb-2">Error loading dashboard content.</p>
                    <p class="text-sm text-gray-500">Please try refreshing the page. If the problem persists, contact support.</p>
                </div>`;
        }
    }
}

/**
 * Populates the welcome message on the dashboard.
 */
async function populateWelcomeMessage() {
    const welcomeContainer = document.getElementById('dashboard-welcome');
    if (!welcomeContainer) {
        console.log("[Dashboard] Welcome container not found, skipping welcome message.");
        return;
    }
    
    try {
        const playerName = currentPlayer?.name || 'Guest';
        const isPlayerLoggedIn = !!currentPlayer;
        
        const welcomeHtml = `
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Welcome, ${playerName}!
            </h1>
            <p class="text-gray-600 dark:text-gray-300 mb-6">
                ${isPlayerLoggedIn 
                    ? 'Track your games, view stats, and compete with friends.' 
                    : 'Sign in to track your games and compete with friends.'}
            </p>
            ${!isPlayerLoggedIn ? `
                <a href="#player-login-section" class="button button-primary inline-block nav-link" data-target="player-login-section">
                    Sign In
                </a>
            ` : ''}
        `;
        
        welcomeContainer.innerHTML = welcomeHtml;
        console.log("[Dashboard] Welcome message populated.");
    } catch (error) {
        console.error("[Dashboard] Error populating welcome message:", error);
        welcomeContainer.innerHTML = '<p class="text-gray-600 dark:text-gray-300">Welcome to LeaderBored!</p>';
    }
}

/**
 * Populates the recent games list on the dashboard.
 */
async function populateRecentGames() {
    const recentGamesContainer = document.getElementById('dashboard-recent-games');
    if (!recentGamesContainer) {
        console.log("[Dashboard] Recent games container not found, skipping recent games.");
        return;
    }
    
    try {
        // Find the actual list element within the container
        const listElement = recentGamesContainer.querySelector('ul') || recentGamesContainer;
        
        if (typeof populateRecentGamesListElement === 'function') {
            await populateRecentGamesListElement(listElement, 5);
            console.log("[Dashboard] Recent games populated.");
        } else {
            listElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400 py-2">Recent games component not available.</li>';
            console.warn("[Dashboard] populateRecentGamesListElement function not found.");
        }
    } catch (error) {
        console.error("[Dashboard] Error populating recent games:", error);
        recentGamesContainer.innerHTML = '<p class="text-red-500">Error loading recent games.</p>';
    }
}

/**
 * Populates a list element with recent games.
 * @param {HTMLElement} listElement - The UL element to populate.
 * @param {number} limit - Max number of games to show.
 */
async function populateRecentGamesListElement(listElement, limit) {
    if (!listElement || !db) {
        return;
    }
    
    try {
        listElement.innerHTML = '<li class="text-center py-2"><span class="loading-text">Loading recent games...</span></li>';
        
        const gamesQuery = db.collection('games')
            .orderBy('date_played', 'desc')
            .limit(limit);
            
        const snapshot = await gamesQuery.get();
        
        if (snapshot.empty) {
            listElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400 text-center py-2">No games found.</li>';
            return;
        }
        
        listElement.innerHTML = '';
        snapshot.forEach(doc => {
            const game = { id: doc.id, ...doc.data() };
            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
            const gameType = window.globalGameConfigs[game.game_type]?.name || game.game_type;
            const participantNames = (game.participants || []).map(id => getPlayerNameFromCache(id));
            let description = `${gameType} played by ${participantNames.join(', ')}`;
            // Add simple outcome if available
            if (game.outcome === 'Win/Loss' && participantNames.length >= 1) description = `${participantNames[0]} won ${gameType}`;
            else if (game.outcome === 'Draw') description = `${gameType} ended in a draw`;
            
            const li = document.createElement('li');
            li.className = 'border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0';
            li.innerHTML = `
                <a href="#game-info-section?gameId=${game.id}" class="nav-link block hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded text-sm" data-target="game-info-section">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-gray-800 dark:text-gray-200 truncate">${description}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">${gameDate}</span>
                    </div>
                </a>`;
            listElement.appendChild(li);
        });
    } catch (error) {
        console.error("[Dashboard] Error fetching recent games:", error);
        listElement.innerHTML = `<li class="text-red-500 text-center py-2">Error loading recent games: ${error.message}</li>`;
    }
}

/**
 * Populates the top players list on the dashboard.
 */
async function populateTopPlayers() {
    const topPlayersContainer = document.getElementById('dashboard-top-players');
    if (!topPlayersContainer) {
        console.log("[Dashboard] Top players container not found, skipping top players.");
        return;
    }
    
    try {
        // Find the actual list element within the container
        const listElement = topPlayersContainer.querySelector('ul') || topPlayersContainer;
        
        listElement.innerHTML = '<li class="text-center py-2"><span class="loading-text">Loading top players...</span></li>';
        
        // Ensure player cache is populated
        if (!playersCachePopulated) await fetchAllPlayersForCache();
        
        // Get players sorted by overall Elo
        const players = Object.values(globalPlayerCache)
            .filter(player => player.elo_overall) // Only include players with an Elo
            .sort((a, b) => (b.elo_overall || 0) - (a.elo_overall || 0)) // Sort by Elo descending
            .slice(0, 5); // Top 5
            
        if (players.length === 0) {
            listElement.innerHTML = '<li class="text-gray-500 dark:text-gray-400 text-center py-2">No player rankings found.</li>';
            return;
        }
        
        listElement.innerHTML = '';
        players.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'border-b border-gray-200 dark:border-gray-700 pb-2 last:border-b-0';
            li.innerHTML = `
                <a href="#player-profile-section?playerId=${player.id}" class="nav-link block hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded" data-target="player-profile-section">
                    <div class="flex items-center">
                        <span class="text-gray-500 dark:text-gray-400 w-6 text-center">#${index + 1}</span>
                        <span class="font-medium text-gray-800 dark:text-gray-200 flex-1">${player.name || 'Unnamed Player'}</span>
                        <span class="text-sm text-gray-600 dark:text-gray-400">${Math.round(player.elo_overall || 0)}</span>
                    </div>
                </a>`;
            listElement.appendChild(li);
        });
        
        console.log("[Dashboard] Top players populated.");
    } catch (error) {
        console.error("[Dashboard] Error populating top players:", error);
        topPlayersContainer.innerHTML = '<p class="text-red-500">Error loading top players.</p>';
    }
}

/**
 * Populates the next tournament information on the dashboard.
 */
async function populateNextTournament() {
    const tournamentContainer = document.getElementById('dashboard-upcoming-tournament');
    if (!tournamentContainer) {
        console.log("[Dashboard] Tournament container not found, skipping tournament info.");
        return;
    }
    
    try {
        tournamentContainer.innerHTML = '<p class="text-center py-2"><span class="loading-text">Loading tournament info...</span></p>';
        
        if (!db) {
            tournamentContainer.innerHTML = '<p class="text-red-500">Database connection error.</p>';
            return;
        }
        
        const now = firebase.firestore.Timestamp.now();
        const tournamentQuery = db.collection('tournaments')
            .where('start_date', '>=', now)
            .orderBy('start_date', 'asc')
            .limit(1);
            
        const snapshot = await tournamentQuery.get();
        
        if (snapshot.empty) {
            tournamentContainer.innerHTML = `
                <p class="text-gray-500 dark:text-gray-400 text-center">No upcoming tournaments.</p>
                <a href="#tournaments-section" class="nav-link button button-secondary w-full mt-3 text-center" data-target="tournaments-section">View All Tournaments</a>
            `;
            return;
        }
        
        const tournament = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        const startDate = tournament.start_date?.toDate ? tournament.start_date.toDate().toLocaleDateString() : 'Date TBD';
        const gameType = window.globalGameConfigs[tournament.game_type]?.name || tournament.game_type || 'Game';
        
        tournamentContainer.innerHTML = `
            <div class="bg-gray-50 dark:bg-gray-700 rounded p-4">
                <h3 class="font-semibold text-lg mb-1">${tournament.name || 'Upcoming Tournament'}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span class="font-medium">${gameType}</span> • ${startDate}
                </p>
                ${tournament.description ? `<p class="text-sm text-gray-500 dark:text-gray-500 mb-3">${tournament.description}</p>` : ''}
                <a href="#tournament-detail-section?tournamentId=${tournament.id}" class="nav-link text-indigo-600 dark:text-indigo-400 text-sm font-medium" data-target="tournament-detail-section">View Details &rarr;</a>
            </div>
        `;
        
        console.log("[Dashboard] Tournament info populated.");
    } catch (error) {
        console.error("[Dashboard] Error populating tournament info:", error);
        tournamentContainer.innerHTML = '<p class="text-red-500">Error loading tournament info.</p>';
    }
}

console.log("[Dashboard] dashboard.js loaded.");
