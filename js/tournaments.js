// --- tournaments.js ---

// --- Helper Function for Modals ---

// Helper for populating participant checkboxes in modals
function populateParticipantChecklist(containerElement, playersArray, selectedParticipants = []) {
    if (!containerElement) {
        console.warn("populateParticipantChecklist: Container element not found."); //
        return;
    }
    containerElement.innerHTML = ''; // Clear existing content
    if (!playersArray || playersArray.length === 0) {
        containerElement.innerHTML = '<p class="muted-text p-2 italic">No players found.</p>';
        return;
    }
    playersArray.forEach(player => {
        const div = document.createElement('div'); //
        div.className = 'flex items-center'; //
        const isChecked = selectedParticipants.includes(player.id); // Check if player is already selected
        div.innerHTML = `
            <input type="checkbox" id="participant-${player.id}" name="participants" value="${player.id}" class="form-checkbox h-4 w-4" ${isChecked ? 'checked' : ''}>
            <label for="participant-${player.id}" class="ml-2 text-sm">${player.name || 'Unnamed'}</label>
        `;
        containerElement.appendChild(div); //
    });
    console.log(`[UI] Populated participant checklist in ${containerElement.id || '(no id)'} with ${playersArray.length} players.`); //
}


// --- Create Tournament Modal Functions ---

async function openCreateTournamentModal() {
    // ... existing code ...
}
function closeCreateTournamentModal() {
    // ... existing code ...
}
async function handleCreateTournamentSubmit(event) {
    // ... existing code ...
}


// --- Tournament List Population ---
async function populateTournamentsList(listElementId, limit = 10, filter = 'upcoming') {
    console.log(`[TOURNAMENTS] Starting populateTournamentsList for #${listElementId} with filter: ${filter}`);

    // INITIALIZATION CHECK
    if (typeof firebase === 'undefined' || !firebase.app) {
        console.error('[TOURNAMENTS] Firebase not initialized');
        return;
    }
    if (typeof db === 'undefined') {
        console.error('[TOURNAMENTS] Firestore db object not initialized');
        return;
    }

    const listElement = document.getElementById(listElementId);
    if (!listElement) {
        console.error(`[TOURNAMENTS] List element #${listElementId} not found in DOM`);
        return;
    }

    console.log(`[TOURNAMENTS] Populating list #${listElementId} with filter: ${filter}...`);
    listElement.innerHTML = `<li class="loading-text text-base">Loading tournaments...</li>`;

    try {
        let query = db.collection('tournaments');

        // Apply filter based on status
        switch (filter) {
            case 'completed':
                query = query.where('status', 'in', ['Completed', 'Cancelled']);
                break;
            case 'upcoming':
                query = query.where('status', 'in', ['Upcoming', 'Active']);
                break;
            case 'all':
                break;
            default:
                console.warn(`[TOURNAMENTS] Unknown filter '${filter}', defaulting to 'upcoming'.`);
                query = query.where('status', 'in', ['Upcoming', 'Active']);
        }

        // Apply ordering and limit
        query = query.orderBy('date_created', 'desc').limit(limit);

        console.log(`[TOURNAMENTS] Executing query...`, query);
        const snapshot = await query.get();
        console.log(`[TOURNAMENTS] Query complete. Found ${snapshot.size} tournaments.`);

        if (snapshot.empty) {
            listElement.innerHTML = `<li class="text-center py-4 text-gray-500">No tournaments found.</li>`;
            return;
        }

        // Clear and populate list
        listElement.innerHTML = '';
        snapshot.forEach(doc => {
            const tournament = { id: doc.id, ...doc.data() };
            const li = document.createElement('li');
            li.className = `border dark:border-gray-700 p-4 rounded-lg mb-4`;

            const status = tournament.status || 'Upcoming';
            const gameType = (typeof gameTypesConfig !== 'undefined' && gameTypesConfig[tournament.game_type]) 
                ? gameTypesConfig[tournament.game_type] 
                : (tournament.game_type || 'N/A');

            li.innerHTML = `
                <div class="flex justify-between items-start mb-2 flex-wrap gap-2">
                    <h3 class="text-lg font-semibold">${tournament.name || 'Unnamed Tournament'}</h3>
                    <span class="text-sm font-medium status-${status.toLowerCase()} px-2 py-0.5 rounded">${status}</span>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Game: ${gameType}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Format: ${tournament.format || 'N/A'}</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-500">${tournament.date_created ? new Date(tournament.date_created.seconds * 1000).toLocaleDateString() : 'Date unknown'}</span>
                    <a href="#tournament-detail-section?tournamentId=${tournament.id}" 
                       class="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        View Details &rarr;
                    </a>
                </div>`;

            listElement.appendChild(li);
        });

    } catch (error) {
        console.error('[TOURNAMENTS] Error populating tournaments:', error);
        listElement.innerHTML = `<li class="error-text text-center py-4">Error loading tournaments: ${error.message}</li>`;
    }
}

// Add this initialization check at the end of the file
console.log('[TOURNAMENTS] Module loaded. Testing DB connection...');
if (typeof firebase !== 'undefined' && firebase.app) {
    console.log('[TOURNAMENTS] Firebase available');
    if (typeof db !== 'undefined') {
        console.log('[TOURNAMENTS] Firestore db object available');
    } else {
        console.error('[TOURNAMENTS] Firestore db object not initialized');
    }
} else {
    console.error('[TOURNAMENTS] Firebase not initialized');
}