// --- game_info.js ---

// --- Game Info Screen Logic ---

function setupGameInfoListeners() {
    // Ensure the share button exists before adding listener
    document.getElementById('share-game-info-btn')?.addEventListener('click', shareGameInfo);
}

async function populateGameInfoScreen(gameId, gameData) {
    // Ensure necessary elements and variables are accessible: gameInfoContentElement, db, playersCachePopulated, fetchAllPlayersForCache, globalPlayerCache, gameTypesConfig
    const contentEl = document.getElementById('game-info-content'); //
    if (!contentEl) {
        console.error("Game Info content element (#game-info-content) not found."); //
        return;
    }

    contentEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading game details...</p>'; // Loading state (with dark mode class)

    let finalGameData = gameData; // Use passed data if available
    // If no data passed, fetch using gameId
    if (!finalGameData && gameId && db) { //
         try {
            const docSnap = await db.collection('games').doc(gameId).get(); //
            if (docSnap.exists) { //
                finalGameData = { id: docSnap.id, ...docSnap.data() }; //
            } else {
                throw new Error("Game not found"); //
            }
         } catch (err) {
             console.error("Error fetching game info:", err); //
             contentEl.innerHTML = `<p class="text-red-500">Error loading game details: ${err.message}</p>`; //
             return; //
         }
    } else if (!finalGameData) {
         contentEl.innerHTML = `<p class="text-red-500">Error: Could not load game details (No ID or data provided).</p>`; //
         return; //
    }

    // Format data for display
    const gameTypeDisplay = gameTypesConfig[finalGameData.game_type] || finalGameData.game_type || 'N/A'; //
    const gameDateStr = finalGameData.date_played?.toDate ? finalGameData.date_played.toDate().toLocaleDateString() : 'N/A'; //
    let description = ''; //
    let playersHtml = ''; //
    let detailsHtml = ''; // For extra details like course or hole scores

    // Ensure player cache is populated for names
    if (!playersCachePopulated) await fetchAllPlayersForCache(); //

    const participants = finalGameData.participants || []; //
    const participantNames = participants.map(id => globalPlayerCache[id]?.name || 'Unknown Player'); //

    // --- Build Description and Player Info ---
    if (finalGameData.game_type === 'golf' && participantNames.length > 0) { // Golf specific
         description = `<b>${participantNames[0]}</b> played ${gameTypeDisplay}`; //
         playersHtml = `<p class="mb-1"><strong>Player:</strong> ${participantNames[0]}</p>`; //
         // Add Course Info if available
         if (finalGameData.course_id && finalGameData.course_id !== 'none') {
             // Try fetching course name (could be cached or fetched on demand)
             // Using a simplified placeholder here. Replace with actual fetch/cache logic if needed.
             // Example: const courseName = await getCourseName(finalGameData.course_id); // Needs getCourseName function
             detailsHtml += `<p class="mb-1 text-sm text-gray-600 dark:text-gray-400"><strong>Course ID:</strong> ${finalGameData.course_id}</p>`; // Placeholder
         } else if (!finalGameData.course_id) {
              detailsHtml += `<p class="mb-1 text-sm text-gray-600 dark:text-gray-400">Course: Not specified</p>`; //
         }
         // Add Holes Played
         detailsHtml += `<p class="mb-1 text-sm text-gray-600 dark:text-gray-400"><strong>Holes:</strong> ${finalGameData.holes_played || '18'}</p>`; //
         // Add Hole Scores if tracked
         if (finalGameData.hole_scores) {
             detailsHtml += '<div class="mt-2 pt-2 border-t dark:border-gray-600"><strong class="text-sm text-gray-600 dark:text-gray-400">Hole Scores:</strong><div class="text-xs grid grid-cols-5 gap-1 mt-1">'; //
             Object.entries(finalGameData.hole_scores).sort((a, b) => parseInt(a[0].split('_')[1]) - parseInt(b[0].split('_')[1])).forEach(([holeKey, score]) => {
                 detailsHtml += `<span class="text-gray-500 dark:text-gray-300">${holeKey.replace('_', ' ')}: ${score}</span>`; //
             });
             detailsHtml += '</div></div>'; //
         }

    } else if (finalGameData.outcome === 'Win/Loss' && participantNames.length >= 2) { // Standard Win/Loss
         description = `<b>${participantNames[0]}</b> defeated ${participantNames[1]} in ${gameTypeDisplay}`; //
         playersHtml = `<p class="mb-1"><strong>Winner:</strong> ${participantNames[0]}</p><p class="mb-1"><strong>Loser:</strong> ${participantNames[1]}</p>`; //
    } else if (finalGameData.outcome === 'Draw' && participantNames.length >= 2) { // Standard Draw
         description = `${participantNames[0]} drew with ${participantNames[1]} in ${gameTypeDisplay}`; //
         playersHtml = `<p class="mb-1"><strong>Player 1:</strong> ${participantNames[0]}</p><p class="mb-1"><strong>Player 2:</strong> ${participantNames[1]}</p>`; //
    } else { // Fallback / Other Outcomes
         description = `Game of ${gameTypeDisplay} played`; //
         playersHtml = `<p class="mb-1"><strong>Participants:</strong> ${participantNames.join(', ')}</p>`; //
    }

    // --- Build Final HTML (with dark mode classes) ---
    contentEl.innerHTML = `
        <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
            <h2 class="text-xl md:text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">${description}</h2>
            <div class="space-y-2 text-gray-700 dark:text-gray-300">
                <p><strong>Date:</strong> ${gameDateStr}</p>
                ${playersHtml}
                ${finalGameData.score ? `<p><strong>Score:</strong> ${finalGameData.score}</p>` : ''}
                ${detailsHtml} </div>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-2 border-t dark:border-gray-600">Game ID: ${finalGameData.id || gameId}</p>
        </div>
    `; //

    // Store game ID for sharing functionality
    contentEl.setAttribute('data-game-id-for-share', finalGameData.id || gameId); //
} // End populateGameInfoScreen

function shareGameInfo() {
    const contentEl = document.getElementById('game-info-content'); //
    const gameId = contentEl?.getAttribute('data-game-id-for-share'); //
    if (navigator.share && gameId) { // Check if Web Share API is supported
         const shareUrl = `${window.location.origin}${window.location.pathname}#game-info-section?gameId=${gameId}`; // Construct share URL
         navigator.share({
             title: 'LeaderBored Game Result', //
             text: `Check out this game result on LeaderBored!`, //
             url: shareUrl, //
         })
         .then(() => console.log('Successful share')) //
         .catch((error) => console.log('Error sharing', error)); //
    } else if (gameId) {
         // Fallback for browsers that don't support Web Share API
         const shareUrl = `${window.location.origin}${window.location.pathname}#game-info-section?gameId=${gameId}`; //
         prompt("Copy this link to share:", shareUrl); // Use prompt as a basic fallback
    } else {
         alert("Could not get game details to share."); //
    }
} // End shareGameInfo

// Note: This file assumes that 'db', 'playersCachePopulated', 'fetchAllPlayersForCache',
// 'globalPlayerCache', 'gameTypesConfig' are initialized and accessible globally or imported.