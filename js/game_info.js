// --- game_info.js ---

// --- Game Info Screen Logic ---

function setupGameInfoListeners() {
    // Ensure the share button exists before adding listener
    document.getElementById('share-game-info-btn')?.addEventListener('click', shareGameInfo);
}

async function populateGameInfoScreen(gameId, gameData) {
    // Ensure necessary elements and variables are accessible: gameInfoContentElement, db, playersCachePopulated, fetchAllPlayersForCache, globalPlayerCache
    const contentEl = document.getElementById('game-info-content');
    if (!contentEl) {
        console.error("Game Info content element (#game-info-content) not found.");
        return;
    }

    contentEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading game details...</p>'; // Loading state

    let finalGameData = gameData; // Use passed data if available

    try {
        // Ensure configs are loaded before fetching/processing game data
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();

        // If no data passed, fetch using gameId
        if (!finalGameData && gameId && db) {
             const docSnap = await db.collection('games').doc(gameId).get();
             if (docSnap.exists) {
                 finalGameData = { id: docSnap.id, ...docSnap.data() };
             } else {
                 throw new Error("Game not found");
             }
        } else if (!finalGameData) {
             throw new Error("Could not load game details (No ID or data provided).");
        }

        // Format data for display
        // Use window.globalGameConfigs
        const gameTypeDisplay = window.globalGameConfigs[finalGameData.game_type]?.name || finalGameData.game_type || 'N/A';
        const gameDateStr = finalGameData.date_played?.toDate ? finalGameData.date_played.toDate().toLocaleDateString() : 'N/A';
        const formatDisplay = finalGameData.format ? ` (${finalGameData.format})` : ''; // Display format if available
        let description = '';
        let playersHtml = '';
        let detailsHtml = ''; // For extra details like course or hole scores

        // Ensure player cache is populated for names
        if (!playersCachePopulated) await fetchAllPlayersForCache();

        const participants = finalGameData.participants || [];
        const participantNames = participants.map(id => globalPlayerCache[id]?.name || 'Unknown Player');
        const team1Names = (finalGameData.team1_participants || []).map(id => globalPlayerCache[id]?.name || 'Unknown Player');
        const team2Names = (finalGameData.team2_participants || []).map(id => globalPlayerCache[id]?.name || 'Unknown Player');

        // --- Build Description and Player Info ---
        if (finalGameData.game_type === 'golf' && participantNames.length > 0) { // Golf specific
             description = `<b>${participantNames[0]}</b> played ${gameTypeDisplay}`;
             playersHtml = `<p class="mb-1"><strong>Player:</strong> ${participantNames[0]}</p>`;
             // Add Course Info if available
             if (finalGameData.course_id && finalGameData.course_id !== 'none') {
                 detailsHtml += `<p class="mb-1 text-sm text-gray-600 dark:text-gray-400"><strong>Course ID:</strong> ${finalGameData.course_id}</p>`; // Placeholder
             } else if (!finalGameData.course_id) {
                  detailsHtml += `<p class="mb-1 text-sm text-gray-600 dark:text-gray-400">Course: Not specified</p>`;
             }
             // Add Holes Played
             detailsHtml += `<p class="mb-1 text-sm text-gray-600 dark:text-gray-400"><strong>Holes:</strong> ${finalGameData.holes_played || '18'}</p>`;
             // Add Hole Details if tracked
             if (finalGameData.hole_details) {
                 detailsHtml += '<div class="mt-2 pt-2 border-t dark:border-gray-600"><strong class="text-sm text-gray-600 dark:text-gray-400">Hole Details:</strong>';
                 detailsHtml += `<div class="overflow-x-auto mt-1"><table class="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                                <thead><tr class="bg-gray-100 dark:bg-gray-700">
                                    <th class="border p-1">Hole</th>
                                    <th class="border p-1">Score</th>
                                    <th class="border p-1">Putts</th>
                                    <th class="border p-1">Drive</th>
                                </tr></thead><tbody>`;
                 Object.entries(finalGameData.hole_details)
                     .sort((a, b) => parseInt(a[0].split('_')[1]) - parseInt(b[0].split('_')[1]))
                     .forEach(([holeKey, details]) => {
                         detailsHtml += `<tr class="text-center">
                                            <td class="border p-1">${holeKey.split('_')[1]}</td>
                                            <td class="border p-1">${details.score ?? '-'}</td>
                                            <td class="border p-1">${details.putts ?? '-'}</td>
                                            <td class="border p-1">${details.drive_distance ? details.drive_distance + ' yds' : '-'}</td>
                                         </tr>`;
                 });
                 detailsHtml += '</tbody></table></div></div>';
             }

        } else if (finalGameData.outcome === 'Team Win' && team1Names.length > 0 && team2Names.length > 0) { // Team Win
             description = `<b>Team (${team1Names.join(', ')})</b> defeated Team (${team2Names.join(', ')}) in ${gameTypeDisplay}${formatDisplay}`;
             playersHtml = `<p class="mb-1"><strong>Winning Team:</strong> ${team1Names.join(', ')}</p><p class="mb-1"><strong>Losing Team:</strong> ${team2Names.join(', ')}</p>`;
        } else if (finalGameData.outcome === 'Win/Loss' && participantNames.length >= 2) { // Standard 1v1 Win/Loss
             description = `<b>${participantNames[0]}</b> defeated ${participantNames[1]} in ${gameTypeDisplay}${formatDisplay}`;
             playersHtml = `<p class="mb-1"><strong>Winner:</strong> ${participantNames[0]}</p><p class="mb-1"><strong>Loser:</strong> ${participantNames[1]}</p>`;
             // Add 1v1 specific details
             if (finalGameData.game_type === 'pool_8ball') {
                 if (finalGameData.ball_type_winner) detailsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400">Winner played ${finalGameData.ball_type_winner}.</p>`;
                 if (finalGameData.scratches_winner !== null || finalGameData.scratches_loser !== null) {
                     detailsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400">Scratches: ${finalGameData.scratches_winner ?? 0} (W) / ${finalGameData.scratches_loser ?? 0} (L)</p>`;
                 }
             } else if (finalGameData.game_type === 'chess' && finalGameData.chess_outcome) {
                 detailsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400">Outcome: ${finalGameData.chess_outcome}</p>`;
             } else if ((finalGameData.game_type === 'magic_gathering' || finalGameData.game_type === 'disney_lorcana') && finalGameData.format) {
                 detailsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400">Format: ${finalGameData.format}</p>`;
             } else if (finalGameData.game_type === 'warhammer_40k' && finalGameData.points_value) {
                 detailsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400">Points: ${finalGameData.points_value}</p>`;
             }
        } else if (finalGameData.outcome === 'Draw' && participantNames.length >= 2) { // Standard Draw (1v1 or Team)
             if (team1Names.length > 0 && team2Names.length > 0) { // Team Draw
                 description = `Team (${team1Names.join(', ')}) drew with Team (${team2Names.join(', ')}) in ${gameTypeDisplay}${formatDisplay}`;
                 playersHtml = `<p class="mb-1"><strong>Team 1:</strong> ${team1Names.join(', ')}</p><p class="mb-1"><strong>Team 2:</strong> ${team2Names.join(', ')}</p>`;
             } else { // 1v1 Draw
                 description = `${participantNames[0]} drew with ${participantNames[1]} in ${gameTypeDisplay}${formatDisplay}`;
                 playersHtml = `<p class="mb-1"><strong>Player 1:</strong> ${participantNames[0]}</p><p class="mb-1"><strong>Player 2:</strong> ${participantNames[1]}</p>`;
             }
             if (finalGameData.game_type === 'chess' && finalGameData.chess_outcome) {
                 detailsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400">Outcome: ${finalGameData.chess_outcome}</p>`;
             }
        } else if (finalGameData.outcome === 'Cutthroat Win' && participantNames.length >= 3) {
             const winnerName = globalPlayerCache[finalGameData.participants.find(pId => !finalGameData.participants.slice(1).includes(pId))]?.name || 'Unknown'; // Find winner
             const loserNames = finalGameData.participants.filter(pId => finalGameData.participants.find(pId => !finalGameData.participants.slice(1).includes(pId)) !== pId).map(id => globalPlayerCache[id]?.name || 'Unknown');
             description = `<b>${winnerName}</b> won ${gameTypeDisplay}${formatDisplay}`;
             playersHtml = `<p class="mb-1"><strong>Winner:</strong> ${winnerName}</p><p class="mb-1"><strong>Others:</strong> ${loserNames.join(', ')}</p>`;
        } else if (finalGameData.outcome === 'Solo Complete' && participantNames.length === 1) {
             description = `<b>${participantNames[0]}</b> completed ${gameTypeDisplay}${formatDisplay}`;
             playersHtml = `<p class="mb-1"><strong>Player:</strong> ${participantNames[0]}</p>`;
             if (finalGameData.points !== null) detailsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400">Points: ${finalGameData.points}</p>`;
        } else { // Fallback / Other Outcomes (e.g., 'Single' for bowling)
             description = `Game of ${gameTypeDisplay}${formatDisplay} played`;
             playersHtml = `<p class="mb-1"><strong>Participants:</strong> ${participantNames.join(', ')}</p>`;
        }

        // --- Build Final HTML (with dark mode classes) ---
        contentEl.innerHTML = `
            <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                <h2 class="text-xl md:text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">${description}</h2>
                <div class="space-y-2 text-gray-700 dark:text-gray-300">
                    <p><strong>Date:</strong> ${gameDateStr}</p>
                    ${playersHtml}
                    ${finalGameData.score ? `<p><strong>${finalGameData.outcome === 'Solo Complete' ? 'Time (s)' : 'Score/Notes'}:</strong> ${finalGameData.score}</p>` : ''}
                    ${finalGameData.elo_change ? `<p class="text-xs ${finalGameData.elo_change > 0 ? 'text-green-600 dark:text-green-400' : (finalGameData.elo_change < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400')}">Elo Change: ${finalGameData.elo_change > 0 ? '+' : ''}${finalGameData.elo_change}</p>` : ''}
                    ${detailsHtml}
                </div>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-2 border-t dark:border-gray-600">Game ID: ${finalGameData.id || gameId}</p>
            </div>
        `;

        // Store game ID for sharing functionality
        contentEl.setAttribute('data-game-id-for-share', finalGameData.id || gameId);

    } catch (err) {
        console.error("Error populating game info:", err);
        contentEl.innerHTML = `<p class="text-red-500">Error loading game details: ${err.message}</p>`;
    }
} // End populateGameInfoScreen

function shareGameInfo() {
    const contentEl = document.getElementById('game-info-content');
    const gameId = contentEl?.getAttribute('data-game-id-for-share');
    if (navigator.share && gameId) {
        const shareUrl = `${window.location.origin}${window.location.pathname}#game-info-section?gameId=${gameId}`;
        navigator.share({
            title: 'LeaderBored Game Result',
            text: 'Check out this game result!',
            url: shareUrl,
        })
        .then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
    } else if (gameId) {
        // Fallback for browsers that don't support navigator.share
        const shareUrl = `${window.location.origin}${window.location.pathname}#game-info-section?gameId=${gameId}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Game link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            alert('Failed to copy game link.');
        });
    } else {
        alert('Could not get game details to share.');
    }
} // End shareGameInfo

// Note: This file assumes that 'db', 'playersCachePopulated', 'fetchAllPlayersForCache',
// 'globalPlayerCache', 'fetchAndCacheGameConfigs', 'window.globalGameConfigs'
// are initialized and accessible globally or imported.