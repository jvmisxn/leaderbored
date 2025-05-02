// --- sport_details.js ---

/**
 * Populates the sport details page with information about a specific sport.
 * @param {string} sportKey - The key of the sport to display
 */
async function populateSportDetails(sportKey) {
    console.log(`[Sport Details] Populating details for sport key: ${sportKey}`);
    
    // Get essential UI elements
    const nameElement = document.getElementById('sport-details-name');
    const infoElement = document.getElementById('sport-details-info');
    const rankingsTable = document.getElementById('sport-details-rankings-tbody');
    const resultsElement = document.getElementById('sport-details-results');
    
    // Check if elements exist
    if (!nameElement || !infoElement || !rankingsTable || !resultsElement) {
        console.error("[Sport Details] One or more essential elements not found in the DOM.");
        const sectionElement = document.getElementById('sport-details-section');
        if (sectionElement) {
            sectionElement.innerHTML = '<p class="error-text text-center py-10">Error: Sport details page structure is missing.</p>';
        }
        return;
    }
    
    if (!sportKey) {
        nameElement.textContent = 'Error';
        infoElement.innerHTML = '<p class="error-text">No sport specified.</p>';
        rankingsTable.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-gray-500 dark:text-gray-400">No sport specified</td></tr>';
        resultsElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">Please select a sport to view results.</p>';
        return;
    }
    
    // Display loading state
    nameElement.textContent = 'Loading...';
    infoElement.innerHTML = '<p class="loading-text">Loading details...</p>';
    rankingsTable.innerHTML = '<tr><td colspan="3" class="loading-text text-center py-3">Loading rankings...</td></tr>';
    resultsElement.innerHTML = '<p class="loading-text">Loading results...</p>';
    
    try {
        // Ensure configs are loaded
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
        
        // Get sport config from cache
        const sportConfig = window.globalGameConfigs[sportKey];
        
        if (!sportConfig) {
            throw new Error(`Sport "${sportKey}" not found in configurations.`);
        }
        
        // Update name
        nameElement.textContent = sportConfig.name || sportKey;
        
        // Populate info card
        let infoHTML = '<dl class="space-y-2">';
        infoHTML += `<dt class="font-medium">Type:</dt><dd class="ml-2">${sportConfig.activityType || 'Not specified'}</dd>`;
        
        if (sportConfig.characteristics) {
            infoHTML += '<dt class="font-medium mt-2">Characteristics:</dt><dd class="ml-2">';
            const chars = [];
            if (sportConfig.characteristics.isPhysical) chars.push('Physical');
            if (sportConfig.characteristics.isOutdoor) chars.push('Outdoor');
            if (sportConfig.characteristics.requiresVenue) chars.push('Venue Required');
            if (sportConfig.characteristics.isTurnBased) chars.push('Turn-Based');
            infoHTML += chars.length ? chars.join(', ') : 'None specified';
            infoHTML += '</dd>';
        }
        
        if (sportConfig.supports) {
            infoHTML += '<dt class="font-medium mt-2">Formats:</dt><dd class="ml-2">';
            const formats = [];
            if (sportConfig.supports['1v1']) formats.push('1v1');
            if (sportConfig.supports.teams) formats.push('Teams');
            if (sportConfig.supports.solo) formats.push('Solo');
            infoHTML += formats.length ? formats.join(', ') : 'None specified';
            infoHTML += '</dd>';
        }
        
        if (sportConfig.rankingSystem) {
            infoHTML += `<dt class="font-medium mt-2">Ranking System:</dt><dd class="ml-2">${sportConfig.rankingSystem || 'None'}</dd>`;
        }
        
        infoHTML += '</dl>';
        infoElement.innerHTML = infoHTML;
        
        // Populate rankings - can be implemented later
        await populateSportRankings(rankingsTable, sportKey);
        
        // Populate results - can be implemented later
        await populateSportResults(resultsElement, sportKey);
        
    } catch (error) {
        console.error(`[Sport Details] Error loading sport details for ${sportKey}:`, error);
        nameElement.textContent = 'Error';
        infoElement.innerHTML = `<p class="error-text">Error loading sport details: ${error.message}</p>`;
        rankingsTable.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-red-500">Error loading rankings</td></tr>';
        resultsElement.innerHTML = '<p class="text-red-500">Error loading results.</p>';
    }
}

/**
 * Populates the rankings table for a specific sport.
 * @param {HTMLElement} tableElement - The table body element to populate
 * @param {string} sportKey - The key of the sport
 */
async function populateSportRankings(tableElement, sportKey) {
    if (!tableElement) return;
    
    try {
        // Ensure player cache is populated
        if (!playersCachePopulated) await fetchAllPlayersForCache();
        
        // Get players with this sport's Elo
        const players = Object.values(globalPlayerCache)
            .filter(player => player.elos && (player.elos[sportKey] !== undefined || player.elos.overall !== undefined))
            .map(player => ({
                id: player.id,
                name: player.name || 'Unnamed Player',
                elo: player.elos[sportKey] || player.elos.overall || DEFAULT_ELO
            }))
            .sort((a, b) => b.elo - a.elo) // Sort by Elo descending
            .slice(0, 10); // Get top 10
            
        if (!players.length) {
            tableElement.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-gray-500 dark:text-gray-400">No player rankings found for this activity</td></tr>';
            return;
        }
        
        let html = '';
        players.forEach((player, index) => {
            html += `<tr class="border-b dark:border-gray-600 last:border-0">
                <td class="py-2 px-1">${index + 1}</td>
                <td class="py-2 px-1"><a href="#player-profile-section?playerId=${player.id}" class="nav-link hover:underline text-indigo-600 dark:text-indigo-400" data-target="player-profile-section">${player.name}</a></td>
                <td class="py-2 px-1 text-right">${Math.round(player.elo)}</td>
            </tr>`;
        });
        
        tableElement.innerHTML = html;
        
    } catch (error) {
        console.error(`[Sport Details] Error loading rankings for ${sportKey}:`, error);
        tableElement.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-red-500">Error loading rankings</td></tr>';
    }
}

/**
 * Populates the results section for a specific sport.
 * @param {HTMLElement} container - The container element to populate
 * @param {string} sportKey - The key of the sport
 */
async function populateSportResults(container, sportKey) {
    if (!container) return;
    
    try {
        if (!db) {
            container.innerHTML = '<p class="error-text">Database connection error.</p>';
            return;
        }
        
        // Ensure player cache is populated
        if (!playersCachePopulated) await fetchAllPlayersForCache();
        
        // Fetch recent games for this sport
        const query = db.collection('games')
            .where('game_type', '==', sportKey)
            .orderBy('date_played', 'desc')
            .limit(10);
            
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">No games found for this activity.</p>';
            return;
        }
        
        let html = '<div class="space-y-4">';
        snapshot.forEach(doc => {
            const game = { id: doc.id, ...doc.data() };
            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
            const participants = (game.participants || []).map(id => globalPlayerCache[id]?.name || 'Unknown Player');
            
            let resultText = '';
            if (game.outcome === 'Win/Loss' && participants.length >= 2) {
                resultText = `<span class="font-medium">${participants[0]}</span> defeated ${participants[1]}`;
            } else if (game.outcome === 'Draw' && participants.length >= 2) {
                resultText = `<span class="font-medium">${participants.join(' and ')}</span> drew`;
            } else if (game.outcome === 'Solo Complete' && participants.length >= 1) {
                resultText = `<span class="font-medium">${participants[0]}</span> completed a game`;
            } else {
                resultText = participants.join(', ') + ' played';
            }
            
            html += `
                <div class="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <div class="flex justify-between items-center">
                        <div class="text-sm font-medium">${resultText}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${gameDate}</div>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <a href="#game-info-section?gameId=${game.id}" class="nav-link text-indigo-600 dark:text-indigo-400 hover:underline" data-target="game-info-section">View Details</a>
                    </div>
                </div>`;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error(`[Sport Details] Error loading results for ${sportKey}:`, error);
        container.innerHTML = `<p class="error-text">Error loading results: ${error.message}</p>`;
    }
}

console.log("[Sport Details] sport_details.js loaded.");
