// Dashboard specific functions will go here.

async function populateDashboard() {
    console.log("[Dashboard] Populating dashboard elements...");

    // Ensure dependent functions are available
    const recentGamesList = document.getElementById('recent-games-list');
    const topPlayersList = document.getElementById('top-players-list');
    const topTeamsList = document.getElementById('top-teams-list');
    const tournamentsList = document.getElementById('dashboard-tournaments-list'); // Element itself

    // Check if elements exist before proceeding
    if (!recentGamesList || !topPlayersList || !topTeamsList || !tournamentsList) {
        console.error("[Dashboard] One or more required dashboard list elements not found in the DOM.");
        // Optionally display an error in the UI if critical elements are missing
        return;
    }

    // Set loading states
    recentGamesList.innerHTML = '<li class="loading-text">Loading recent games...</li>';
    topPlayersList.innerHTML = '<li class="loading-text">Loading top players...</li>';
    topTeamsList.innerHTML = '<li class="loading-text">Loading top teams...</li>';
    tournamentsList.innerHTML = '<li class="loading-text">Loading tournaments...</li>';

    // Call functions to populate each section (these should be defined elsewhere, e.g., ui_utils.js)
    const promises = [];

    if (typeof populateRecentGamesListElement === 'function') {
        console.log("[Dashboard] Calling populateRecentGamesListElement...");
        promises.push(populateRecentGamesListElement(recentGamesList, 5));
    } else {
        console.error("[Dashboard] populateRecentGamesListElement function not found.");
        recentGamesList.innerHTML = '<li class="error-text">Error: Recent games component failed to load.</li>'; // Updated error
    }

    if (typeof populateTopPlayersListElement === 'function') {
        console.log("[Dashboard] Calling populateTopPlayersListElement...");
        promises.push(populateTopPlayersListElement(topPlayersList, 5));
    } else {
        console.error("[Dashboard] populateTopPlayersListElement function not found.");
        topPlayersList.innerHTML = '<li class="error-text">Error: Top players component failed to load.</li>'; // Updated error
    }

    if (typeof populateTopTeamsListElement === 'function') {
        console.log("[Dashboard] Calling populateTopTeamsListElement...");
        promises.push(populateTopTeamsListElement(topTeamsList, 5)); // This function currently shows 'not implemented'
    } else {
         console.error("[Dashboard] populateTopTeamsListElement function not found.");
         topTeamsList.innerHTML = '<li class="error-text">Error: Top teams component failed to load.</li>'; // Updated error
    }

    if (typeof populateTournamentsList === 'function') {
        console.log("[Dashboard] Calling populateTournamentsList for dashboard...");
        // Pass the ID string 'dashboard-tournaments-list'
        promises.push(populateTournamentsList('dashboard-tournaments-list', 3));
    } else {
        console.error("[Dashboard] populateTournamentsList function not found.");
        tournamentsList.innerHTML = '<li class="error-text">Error loading tournaments function.</li>';
    }

    // Wait for all population functions to complete
    try {
        await Promise.all(promises);
        console.log("[Dashboard] All population promises settled.");
    } catch (error) {
        console.error("[Dashboard] Error during population:", error);
        // Specific error handling might already be inside the individual functions
    }

    console.log("[Dashboard] Population attempt complete.");
}

// Add other dashboard-specific helper functions if needed.
