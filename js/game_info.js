// --- game_info.js ---

let currentGameData = null;

/**
 * Fetches and populates the game information page.
 * @param {string} gameId - The ID of the game to display.
 */
async function populateGameInfo(gameId) {
    console.log(`[Game Info] Populating game info for game ID: ${gameId}`);
    const loadingEl = document.getElementById('game-info-loading');
    const errorEl = document.getElementById('game-info-error');
    const contentEl = document.getElementById('game-info-content');
    const titleEl = document.getElementById('game-info-title');
    const dateEl = document.getElementById('game-info-date');
    const typeBadgeEl = document.getElementById('game-info-type-badge');
    const participantsEl = document.getElementById('game-info-participants');
    const eloEl = document.getElementById('game-info-elo');
    const specificsEl = document.getElementById('game-info-specifics');
    const backButton = document.getElementById('game-info-back-button');
    const deleteButton = document.getElementById('delete-game-btn');
    const adminErrorEl = document.getElementById('game-info-admin-error');

    // Reset state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    contentEl.classList.add('hidden');
    participantsEl.innerHTML = '<p class="loading-text">Loading participants...</p>';
    eloEl.innerHTML = '<h2 class="text-lg font-semibold">Elo Change</h2><p class="loading-text">Loading Elo changes...</p>';
    specificsEl.innerHTML = '<h2 class="text-lg font-semibold">Game Specifics</h2><p class="muted-text italic">No game-specific details available.</p>';
    if (adminErrorEl) adminErrorEl.textContent = '';
    if (deleteButton) deleteButton.disabled = false;

    if (!db) {
        showGameInfoError("Database connection error.");
        return;
    }

    try {
        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new Error(`Game not found with ID: ${gameId}`);
        }

        const game = { id: gameDoc.id, ...gameDoc.data() };

        // --- Back Button Logic ---
        const previousHash = sessionStorage.getItem('previousHash') || '';
        const previousUrl = new URL(previousHash, window.location.origin);
        const previousSectionId = previousUrl.hash.split('?')[0].substring(1);
        const previousQueryParams = new URLSearchParams(previousUrl.search);
        let backLink = '#results-section'; // Default back link
        let backText = 'Back to Results';

        if (previousSectionId && previousSectionId !== 'game-info-section') {
             // Keep previous query params if going back to the same section type
             if (previousSectionId === 'results-section') {
                 backLink = `#results-section?${previousQueryParams.toString()}`;
                 backText = 'Back to Results';
             } else if (previousSectionId === 'player-profile-section') {
                 backLink = `#player-profile-section?${previousQueryParams.toString()}`;
                 backText = 'Back to Profile';
             } else if (previousSectionId === 'tournament-detail-section') {
                 backLink = `#tournament-detail-section?${previousQueryParams.toString()}`;
                 backText = 'Back to Tournament';
             }
             // Add other relevant sections if needed
        }
        backButton.href = backLink;
        backButton.textContent = `\u2190 ${backText}`;
        // --- End Back Button Logic ---

        // Ensure necessary caches/configs are loaded
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
        if (!playersCachePopulated) await fetchAllPlayersForCache();

        const gameConfig = window.globalGameConfigs?.[game.game_type];
        const gameTypeName = gameConfig?.name || game.game_type || 'Unknown Game';

        // Populate Header
        titleEl.textContent = `${gameTypeName} Details`;
        dateEl.textContent = `Date Played: ${game.date_played?.toDate ? game.date_played.toDate().toLocaleString() : 'Unknown'}`;
        typeBadgeEl.textContent = gameTypeName;

        // Populate Participants & Score
        populateGameParticipants(participantsEl, game);

        // Populate Elo Changes
        populateGameEloChanges(eloEl, game);

        // Populate Game Specifics
        populateGameSpecifics(specificsEl, game);

        // Setup Admin Actions (Delete Button)
        if (deleteButton) {
            // Remove previous listener to avoid duplicates
            const newDeleteButton = deleteButton.cloneNode(true);
            deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);

            newDeleteButton.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete this game (${gameTypeName} on ${dateEl.textContent})? This action cannot be undone.`)) {
                    newDeleteButton.disabled = true;
                    if(adminErrorEl) adminErrorEl.textContent = 'Deleting...';
                    try {
                        await deleteGame(gameId);
                        alert('Game deleted successfully.');
                        // Navigate back after deletion
                        if (typeof showSection === 'function') {
                            // Go back to the previous section determined by backButton logic
                            const targetSection = backButton.href.split('#')[1].split('?')[0];
                            const targetParams = Object.fromEntries(new URLSearchParams(backButton.href.split('?')[1]));
                            showSection(targetSection || 'results-section', true, targetParams);
                        } else {
                            window.location.hash = backButton.href.split('#')[1] || 'results-section'; // Fallback
                        }
                    } catch (error) {
                        console.error("Error deleting game:", error);
                        if(adminErrorEl) adminErrorEl.textContent = `Error: ${error.message}`;
                        newDeleteButton.disabled = false;
                    }
                }
            });
        }

        // Show content
        loadingEl.style.display = 'none';
        contentEl.classList.remove('hidden');

        // Make player links navigable
        makePlayerLinksNavigable();

    } catch (error) {
        console.error(`[Game Info] Error populating game info for ${gameId}:`, error);
        showGameInfoError(error.message);
    }
}

/** Helper function to show errors */
function showGameInfoError(message) {
    const loadingEl = document.getElementById('game-info-loading');
    const errorEl = document.getElementById('game-info-error');
    const contentEl = document.getElementById('game-info-content');

    loadingEl.style.display = 'none';
    contentEl.classList.add('hidden');
    errorEl.querySelector('p').textContent = `Error: ${message}`;
    errorEl.style.display = 'block';
}

/**
 * Populates the participants and score section.
 * @param {HTMLElement} container - The container element.
 * @param {object} game - The game data object.
 */
function populateGameParticipants(container, game) {
    let html = `<h2 class="text-lg font-semibold mb-3">Participants & Score</h2>`;
    html += '<div class="space-y-3">';

    if (!game.participants || game.participants.length === 0) {
        html += '<p class="muted-text italic">No participant information available.</p>';
    } else if (game.game_type === 'golf' && game.scores) {
        // Golf: List players with scores, strokes, putts etc.
        game.scores.sort((a, b) => (a.score || 999) - (b.score || 999)); // Sort by score ascending
        game.scores.forEach((scoreEntry, index) => {
            const player = globalPlayerCache[scoreEntry.playerId];
            const playerName = player?.name || 'Unknown Player';
            const playerAvatar = player?.iconUrl || player?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=random&color=fff&size=32`;
            const isWinner = game.winner_id === scoreEntry.playerId; // Golf winner might be lowest score

            html += `
                <div class="flex items-center justify-between p-2 rounded ${isWinner ? 'bg-green-50 dark:bg-green-900/50' : ''}">
                    <div class="flex items-center">
                        <img src="${playerAvatar}" alt="${playerName}" class="w-8 h-8 rounded-full mr-3 object-cover">
                        <a href="#player-profile-section?playerId=${scoreEntry.playerId}" class="nav-link font-medium text-indigo-600 dark:text-indigo-400 hover:underline" data-player-id="${scoreEntry.playerId}">${playerName}</a>
                    </div>
                    <div class="text-right">
                        <span class="font-semibold text-lg">${scoreEntry.score ?? '-'}</span>
                        ${scoreEntry.strokes ? `<span class="text-sm text-gray-500 dark:text-gray-400 ml-2">(${scoreEntry.strokes} strokes)</span>` : ''}
                        ${scoreEntry.putts ? `<span class="text-xs text-gray-400 dark:text-gray-500 ml-2">P:${scoreEntry.putts}</span>` : ''}
                    </div>
                </div>`;
        });

    } else if (game.participants.length <= 2 && game.scores && game.scores.length === game.participants.length) {
        // 1v1 or Solo (non-golf) with scores array
        const player1Id = game.participants[0];
        const player2Id = game.participants.length > 1 ? game.participants[1] : null;
        const player1 = globalPlayerCache[player1Id];
        const player2 = player2Id ? globalPlayerCache[player2Id] : null;
        const score1 = game.scores.find(s => s.playerId === player1Id)?.score ?? '-';
        const score2 = player2Id ? (game.scores.find(s => s.playerId === player2Id)?.score ?? '-') : null;

        const player1Name = player1?.name || 'Unknown Player 1';
        const player2Name = player2?.name || 'Unknown Player 2';
        const player1Avatar = player1?.iconUrl || player1?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(player1Name)}&background=random&color=fff&size=40`;
        const player2Avatar = player2 ? (player2.iconUrl || player2.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(player2Name)}&background=random&color=fff&size=40`) : null;

        const player1OutcomeClass = game.winner_id === player1Id ? 'bg-green-50 dark:bg-green-900/50' : (game.loser_id === player1Id ? 'bg-red-50 dark:bg-red-900/50' : (game.is_draw ? 'bg-yellow-50 dark:bg-yellow-900/50' : ''));
        const player2OutcomeClass = game.winner_id === player2Id ? 'bg-green-50 dark:bg-green-900/50' : (game.loser_id === player2Id ? 'bg-red-50 dark:bg-red-900/50' : (game.is_draw ? 'bg-yellow-50 dark:bg-yellow-900/50' : ''));

        html += `
            <div class="flex items-center justify-between p-3 rounded ${player1OutcomeClass}">
                <div class="flex items-center">
                    <img src="${player1Avatar}" alt="${player1Name}" class="w-10 h-10 rounded-full mr-4 object-cover">
                    <a href="#player-profile-section?playerId=${player1Id}" class="nav-link font-medium text-indigo-600 dark:text-indigo-400 hover:underline" data-player-id="${player1Id}">${player1Name}</a>
                </div>
                <span class="font-semibold text-xl">${score1}</span>
            </div>`;
        if (player2Id && player2) {
             html += `<div class="text-center text-sm font-bold my-1 text-gray-500 dark:text-gray-400">vs</div>`;
             html += `
                <div class="flex items-center justify-between p-3 rounded ${player2OutcomeClass}">
                    <div class="flex items-center">
                        <img src="${player2Avatar}" alt="${player2Name}" class="w-10 h-10 rounded-full mr-4 object-cover">
                        <a href="#player-profile-section?playerId=${player2Id}" class="nav-link font-medium text-indigo-600 dark:text-indigo-400 hover:underline" data-player-id="${player2Id}">${player2Name}</a>
                    </div>
                    <span class="font-semibold text-xl">${score2}</span>
                </div>`;
        }

    } else {
        // Generic participant list (e.g., teams or no score breakdown)
        game.participants.forEach(playerId => {
            const player = globalPlayerCache[playerId];
            const playerName = player?.name || 'Unknown Player';
            const playerAvatar = player?.iconUrl || player?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&background=random&color=fff&size=32`;
            const isWinner = game.winner_id === playerId;
            const isLoser = game.loser_id === playerId;
            const outcomeClass = isWinner ? 'bg-green-50 dark:bg-green-900/50' : (isLoser ? 'bg-red-50 dark:bg-red-900/50' : (game.is_draw ? 'bg-yellow-50 dark:bg-yellow-900/50' : ''));

            html += `
                <div class="flex items-center p-2 rounded ${outcomeClass}">
                    <img src="${playerAvatar}" alt="${playerName}" class="w-8 h-8 rounded-full mr-3 object-cover">
                    <a href="#player-profile-section?playerId=${playerId}" class="nav-link font-medium text-indigo-600 dark:text-indigo-400 hover:underline" data-player-id="${playerId}">${playerName}</a>
                    ${isWinner ? '<span class="ml-auto text-xs font-bold text-green-700 dark:text-green-300">WINNER</span>' : ''}
                    ${isLoser ? '<span class="ml-auto text-xs font-bold text-red-700 dark:text-red-300">LOSER</span>' : ''}
                    ${game.is_draw ? '<span class="ml-auto text-xs font-bold text-yellow-700 dark:text-yellow-300">DRAW</span>' : ''}
                </div>`;
        });
        if (game.score) {
             html += `<div class="mt-3 text-center text-lg font-semibold">Final Score: ${game.score}</div>`;
        }
    }

    html += '</div>'; // Close space-y-3
    container.innerHTML = html;
}

/**
 * Populates the Elo changes section.
 * @param {HTMLElement} container - The container element.
 * @param {object} game - The game data object.
 */
function populateGameEloChanges(container, game) {
    let html = `<h2 class="text-lg font-semibold mb-2">Elo Change</h2>`;
    if (!game.elo_change || game.elo_change.length === 0) {
        html += '<p class="muted-text italic">No Elo change recorded for this game.</p>';
    } else {
        html += '<ul class="space-y-1 text-sm">';
        game.elo_change.forEach(change => {
            const player = globalPlayerCache[change.playerId];
            const playerName = player?.name || 'Unknown Player';
            const changeValue = change.change;
            const newElo = change.newElo;
            const changeClass = changeValue > 0 ? 'text-green-600 dark:text-green-400' : (changeValue < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400');
            const sign = changeValue > 0 ? '+' : '';

            html += `
                <li class="flex justify-between items-center">
                    <span><a href="#player-profile-section?playerId=${change.playerId}" class="nav-link hover:underline" data-player-id="${change.playerId}">${playerName}</a>:</span>
                    <span class="text-right">
                        <span class="${changeClass} font-medium">${sign}${changeValue.toFixed(1)}</span>
                        <span class="text-gray-500 dark:text-gray-400 text-xs ml-1">(New: ${Math.round(newElo)})</span>
                    </span>
                </li>`;
        });
        html += '</ul>';
    }
    container.innerHTML = html;
}

/**
 * Populates the game-specific details section (e.g., Golf course, hole scores).
 * @param {HTMLElement} container - The container element.
 * @param {object} game - The game data object.
 */
async function populateGameSpecifics(container, game) {
    let html = `<h2 class="text-lg font-semibold mb-2">Game Specifics</h2>`;
    let specificsFound = false;

    if (game.game_type === 'golf') {
        specificsFound = true;
        html += '<div class="space-y-4">';

        // Display Golf Course Info
        if (game.course_id) {
            // Fetch course details (consider caching these)
            try {
                const courseDoc = await db.collection('golf_courses').doc(game.course_id).get();
                if (courseDoc.exists) {
                    const course = courseDoc.data();
                    html += `<div><strong>Course:</strong> ${course.name || 'Unknown Course'}${course.location ? ` (${course.location})` : ''}</div>`;
                } else {
                    html += `<div><strong>Course:</strong> Course data not found (ID: ${game.course_id})</div>`;
                }
            } catch (err) {
                 html += `<div><strong>Course:</strong> Error loading course data.</div>`;
                 console.error("Error fetching course data:", err);
            }
        } else {
             html += `<div><strong>Course:</strong> Not specified</div>`;
        }

        // Display Hole-by-Hole Scores (if available)
        if (game.scores && game.scores.some(s => s.hole_scores)) {
            html += '<div class="mt-4 overflow-x-auto">';
            html += '<h3 class="text-md font-medium mb-2">Hole Scores:</h3>';
            html += '<table class="min-w-full text-xs border border-gray-200 dark:border-gray-700">';
            html += '<thead class="bg-gray-50 dark:bg-gray-700">';
            html += '<tr><th class="p-1 border-r dark:border-gray-600">Player</th>';
            for (let i = 1; i <= 18; i++) {
                html += `<th class="p-1 text-center w-8">${i}</th>`;
            }
            html += '<th class="p-1 border-l dark:border-gray-600 font-semibold">Total</th>';
            html += '</tr></thead>';
            html += '<tbody class="divide-y divide-gray-200 dark:divide-gray-700">';

            game.scores.forEach(scoreEntry => {
                const player = globalPlayerCache[scoreEntry.playerId];
                const playerName = player?.name || 'Unknown';
                html += `<tr><td class="p-1 border-r dark:border-gray-600 font-medium"><a href="#player-profile-section?playerId=${scoreEntry.playerId}" class="nav-link hover:underline" data-player-id="${scoreEntry.playerId}">${playerName}</a></td>`;
                let totalScore = 0;
                for (let i = 1; i <= 18; i++) {
                    const holeScore = scoreEntry.hole_scores?.[`hole_${i}`];
                    html += `<td class="p-1 text-center">${holeScore ?? '-'}</td>`;
                    if (holeScore) totalScore += holeScore;
                }
                 // Verify total against stored score if needed
                 const displayedTotal = scoreEntry.score ?? totalScore;
                html += `<td class="p-1 border-l dark:border-gray-600 font-semibold text-center">${displayedTotal}</td>`;
                html += '</tr>';
            });

            html += '</tbody></table>';
            html += '</div>'; // Close overflow-x-auto
        }

        html += '</div>'; // Close space-y-4
    }

    // Add more game types here...
    // else if (game.game_type === 'chess') { ... }

    if (!specificsFound) {
        html += '<p class="muted-text italic">No game-specific details available.</p>';
    }

    container.innerHTML = html;
}

/**
 * Deletes a game document from Firestore.
 * TODO: Implement recalculation of Elo/stats if necessary, or handle this via cloud functions.
 * @param {string} gameId - The ID of the game to delete.
 */
async function deleteGame(gameId) {
    if (!db) throw new Error("Database connection error.");
    if (!gameId) throw new Error("Game ID is required.");

    console.log(`[Admin] Attempting to delete game: ${gameId}`);
    // For now, just delete the game document.
    // WARNING: This does NOT automatically update player stats or Elo.
    // A more robust solution would involve a Cloud Function triggered on delete
    // or a batch update process here to revert player stats.
    await db.collection('games').doc(gameId).delete();
    console.log(`[Admin] Game document ${gameId} deleted.`);
    // Consider invalidating caches if necessary
    // resultsCache = null; // Example if you have a results cache
}

/**
 * Makes player links within the game info section navigable.
 * Uses a data attribute to prevent adding multiple listeners.
 */
function makePlayerLinksNavigable() {
    const container = document.getElementById('game-info-content');
    if (!container) return;

    container.querySelectorAll('a[data-player-id]').forEach(link => {
        if (link.dataset.gameInfoListenerAttached === 'true') {
            return; // Skip if listener already exists
        }
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const playerId = link.getAttribute('data-player-id');
            console.log(`[Game Info] Player link clicked: ID ${playerId}`);
            if (playerId && typeof showSection === 'function') {
                 // Store current hash before navigating
                 sessionStorage.setItem('previousHash', window.location.hash);
                 showSection('player-profile-section', true, { playerId });
            }
        });
        link.dataset.gameInfoListenerAttached = 'true'; // Mark as attached
    });
}

console.log("[Game Info] game_info.js loaded.");