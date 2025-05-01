// --- sport_details.js ---

/**
 * Fetches and populates the details for a specific sport/game type.
 * @param {string} sportKey - The key of the sport/game type (e.g., 'pool', 'chess').
 */
async function populateSportDetails(sportKey) {
    console.log(`[Sport Details] Populating details for sport key: ${sportKey}`);
    const section = document.getElementById('sport-details-section');
    const nameEl = document.getElementById('sport-details-name');
    const contentEl = document.getElementById('sport-details-content');
    const rankingsContainer = document.getElementById('sport-details-rankings');
    const resultsContainer = document.getElementById('sport-details-results-table-body');
    const golfCard = document.getElementById('sport-details-golf-card'); // Specific card for golf

    if (!section || !nameEl || !contentEl || !rankingsContainer || !resultsContainer || !golfCard) {
        console.error("[Sport Details] One or more essential elements not found in the DOM.");
        if (contentEl) contentEl.innerHTML = '<p class="error-text text-center py-10">Error: Page structure is missing.</p>';
        return;
    }

    // Set loading states
    nameEl.textContent = 'Loading Sport...';
    contentEl.innerHTML = '<p class="loading-text text-center py-5">Loading details...</p>';
    rankingsContainer.innerHTML = '<p class="loading-text text-center py-3">Loading rankings...</p>';
    resultsContainer.innerHTML = '<tr><td colspan="2" class="loading-text text-center py-6">Loading recent results...</td></tr>';
    golfCard.classList.add('hidden'); // Hide golf card by default

    // Ensure configs are loaded
    try {
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
    } catch (error) {
        console.error("[Sport Details] Failed to load game configs:", error);
        nameEl.textContent = 'Error';
        contentEl.innerHTML = `<p class="error-text text-center py-10">Error loading configuration: ${error.message}</p>`;
        rankingsContainer.innerHTML = '';
        resultsContainer.innerHTML = '';
        return;
    }

    const config = window.globalGameConfigs ? window.globalGameConfigs[sportKey] : null;

    if (!config) {
        console.warn(`[Sport Details] Configuration not found for sport key: ${sportKey}`);
        nameEl.textContent = 'Sport Not Found';
        contentEl.innerHTML = '<p class="text-center py-10 text-gray-500 dark:text-gray-400">The requested sport or activity could not be found.</p>';
        rankingsContainer.innerHTML = '';
        resultsContainer.innerHTML = '';
        return;
    }

    // --- Populate Basic Details ---
    const sportName = config.name || sportKey;
    nameEl.textContent = sportName;
    // Update placeholders in the section
    section.querySelectorAll('.sport-name-placeholder').forEach(el => el.textContent = sportName);

    let detailsHtml = '<ul class="space-y-1 text-sm text-gray-600 dark:text-gray-300">';
    if (config.activityType) detailsHtml += `<li><strong>Type:</strong> ${config.activityType.charAt(0).toUpperCase() + config.activityType.slice(1)}</li>`;
    if (config.rankingSystem) detailsHtml += `<li><strong>Ranking:</strong> ${config.rankingSystem.toUpperCase()}</li>`;
    if (config.scoreUnit) detailsHtml += `<li><strong>Scoring:</strong> ${config.scoreUnit}</li>`;

    // Characteristics
    if (config.characteristics) {
        const chars = Object.entries(config.characteristics)
            .filter(([, value]) => value === true)
            .map(([key]) => {
                // Simple formatting
                return key.replace('is', '').replace(/([A-Z])/g, ' $1').trim();
            })
            .join(', ');
        if (chars) detailsHtml += `<li><strong>Characteristics:</strong> ${chars}</li>`;
    }

    // Supported Formats
    if (config.supports) {
        const formats = Object.entries(config.supports)
            .filter(([, value]) => value === true)
            .map(([key]) => key === '1v1' ? '1 vs 1' : key.charAt(0).toUpperCase() + key.slice(1))
            .join(', ');
        if (formats) detailsHtml += `<li><strong>Supports:</strong> ${formats}</li>`;
    }
    detailsHtml += '</ul>';
    contentEl.innerHTML = detailsHtml;

    // --- Populate Rankings ---
    // Use the existing populateGameRankings function
    const rankingsTableBody = document.createElement('tbody'); // Create a temporary tbody
    if (typeof populateGameRankings === 'function') {
        await populateGameRankings(sportKey, rankingsTableBody, 5); // Fetch top 5
        // Build a simple list or mini-table from the tbody content
        let rankingsHtml = '<ol class="list-decimal list-inside space-y-1 text-sm">';
        const rows = rankingsTableBody.querySelectorAll('tr');
        if (rows.length > 0 && !rows[0].querySelector('.error-text, .loading-text, .muted-text')) {
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    const rank = cells[0].textContent;
                    const playerLink = cells[1].innerHTML; // Keep the link
                    const rating = cells[2].textContent;
                    rankingsHtml += `<li class="flex justify-between items-center"><span>${playerLink}</span> <span class="font-semibold text-gray-700 dark:text-gray-300">${rating}</span></li>`;
                }
            });
             rankingsHtml += '</ol>';
             // Add link to full rankings
             rankingsHtml += `<a href="#rankings-section?game=${sportKey}" class="nav-link text-indigo-600 dark:text-indigo-400 text-sm mt-3 inline-block">View Full Rankings &rarr;</a>`;
        } else {
            // Handle loading/error/no data messages from populateGameRankings
            rankingsHtml = rankingsTableBody.innerHTML; // Use the message directly
        }
        rankingsContainer.innerHTML = rankingsHtml;
    } else {
        console.error("[Sport Details] populateGameRankings function not found.");
        rankingsContainer.innerHTML = '<p class="error-text">Error loading rankings component.</p>';
    }

    // --- Populate Recent Results ---
    // Use a dedicated function or adapt populateResultsTable
    if (typeof populateSportResultsTable === 'function') {
        await populateSportResultsTable(sportKey, resultsContainer, 5); // Fetch 5 recent results
    } else {
        console.error("[Sport Details] populateSportResultsTable function not found.");
        resultsContainer.innerHTML = '<tr><td colspan="2" class="error-text text-center py-6">Error loading results component.</td></tr>';
    }

    // --- Handle Golf Specifics ---
    if (sportKey === 'golf') {
        golfCard.classList.remove('hidden');
        const coursesListEl = document.getElementById('golf-courses-list-details');
        if (coursesListEl && typeof populateGolfCourses === 'function') {
            await populateGolfCourses(coursesListEl); // Populate the list within the card
        } else if (coursesListEl) {
            coursesListEl.innerHTML = '<p class="error-text">Error loading courses component.</p>';
        } else {
            console.error("[Sport Details] Golf courses list element (#golf-courses-list-details) not found.");
        }
    } else {
        golfCard.classList.add('hidden'); // Ensure it's hidden for non-golf sports
    }

    console.log(`[Sport Details] Finished populating details for ${sportKey}.`);
}

/**
 * Fetches recent results for a specific sport and populates the table body.
 * @param {string} sportKey - The key of the sport/game type.
 * @param {HTMLElement} tableBodyElement - The tbody element to populate.
 * @param {number} [limit=5] - Maximum number of results to show.
 */
async function populateSportResultsTable(sportKey, tableBodyElement, limit = 5) {
    if (!tableBodyElement) {
        console.error("[Sport Results Table] Table body element not provided.");
        return;
    }
    console.log(`[Sport Results Table] Populating results for ${sportKey} (limit: ${limit})`);
    tableBodyElement.innerHTML = `<tr><td colspan="2" class="loading-text px-4 py-6 text-center">Loading recent results...</td></tr>`;

    if (!db) {
        console.error("[Sport Results Table] Firestore DB not available.");
        tableBodyElement.innerHTML = `<tr><td colspan="2" class="error-text px-4 py-6 text-center">Database error.</td></tr>`;
        return;
    }

    // Ensure necessary caches are ready
    try {
        if (!playersCachePopulated) await fetchAllPlayersForCache();
        // Configs should already be loaded by populateSportDetails
    } catch (error) {
        console.error("[Sport Results Table] Error preparing player cache:", error);
        tableBodyElement.innerHTML = `<tr><td colspan="2" class="error-text px-4 py-6 text-center">Error loading player data.</td></tr>`;
        return;
    }

    try {
        const query = db.collection('games')
                        .where('game_type', '==', sportKey)
                        .orderBy('date_played', 'desc')
                        .limit(limit);

        const snapshot = await query.get();

        if (snapshot.empty) {
            tableBodyElement.innerHTML = `<tr><td colspan="2" class="muted-text px-4 py-6 text-center">No recent results found for this sport.</td></tr>`;
            return;
        }

        tableBodyElement.innerHTML = ''; // Clear loading message
        snapshot.forEach(doc => {
            const game = { id: doc.id, ...doc.data() };
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 dark:border-gray-700 last:border-b-0';

            const gameDate = game.date_played?.toDate ? game.date_played.toDate().toLocaleDateString() : 'Unknown Date';
            let description = '';

            // Simplified description logic (similar to results.js but maybe shorter)
            const participants = game.participants || [];
            const participantNames = participants.map(id => getPlayerNameFromCache(id));

            if (game.outcome === 'Win/Loss' && participantNames.length >= 2) {
                description = `${participantNames[0]} beat ${participantNames[1]}`;
            } else if (game.outcome === 'Draw' && participantNames.length >= 2) {
                description = `${participantNames[0]} drew with ${participantNames[1]}`;
            } else if (game.outcome === 'Solo Complete' && participantNames.length === 1) {
                description = `${participantNames[0]} completed`;
            } else {
                description = `Game played`; // Generic fallback
            }

            if (game.score) {
                description += ` (${game.score})`;
            }

            tr.innerHTML = `
                <td class="px-4 py-3 text-gray-500 dark:text-gray-400">${gameDate}</td>
                <td class="px-4 py-3">
                    <a href="#game-info-section?gameId=${game.id}" class="nav-link hover:text-indigo-600 dark:hover:text-indigo-400" data-target="game-info-section">${description}</a>
                </td>
            `;
            tableBodyElement.appendChild(tr);
        });

    } catch (error) {
        console.error(`[Sport Results Table] Error fetching results for ${sportKey}:`, error);
        tableBodyElement.innerHTML = `<tr><td colspan="2" class="error-text px-4 py-6 text-center">Error loading results: ${error.message}</td></tr>`;
    }
}


console.log("[Sport Details] sport_details.js loaded.");
