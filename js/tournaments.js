// --- tournaments.js ---

// --- Helper Function for Modals ---

// Helper for populating participant checkboxes in modals
function populateParticipantChecklist(containerElement, playersArray, selectedParticipants = []) {
    if (!containerElement) {
        console.warn("populateParticipantChecklist: Container element not found.");
        return;
    }
    // Ensure player cache is ready
    if (!playersCachePopulated) {
        fetchAllPlayersForCache().then(() => {
            populateParticipantChecklist(containerElement, Object.values(globalPlayerCache), selectedParticipants);
        });
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

// --- Tournament Data Functions ---

/**
 * Fetches tournaments based on status (upcoming, completed, etc.)
 * @param {string} status - 'upcoming', 'completed', 'active', or 'all'.
 * @param {number} limitCount - Max number of tournaments to fetch.
 * @returns {Promise<Array>} - A promise that resolves to an array of tournament objects.
 */
async function fetchTournaments(status = 'upcoming', limitCount = 20) {
    // Ensure db is available before proceeding
    if (!db) {
        console.error("[TOURNAMENTS FETCH] Firestore db object not available.");
        return []; // Return empty array on error
    }
    console.log(`[TOURNAMENTS FETCH] Fetching ${status} tournaments (limit: ${limitCount})...`);
    // ... rest of fetchTournaments function ...
}

/**
 * Populates the tournaments list container.
 * @param {string} containerId - The ID of the container element to populate.
 * @param {number|null} limit - Maximum number of tournaments to show (null for all).
 * @param {string} filter - The filter to apply ('upcoming', 'past', 'all').
 */
async function populateTournamentsList(containerId, limit = null, filter = 'upcoming') {
    const listContainer = document.getElementById(containerId);
    if (!listContainer) {
        console.error(`[Tournaments] Container element #${containerId} not found.`);
        return;
    }

    console.log(`[Tournaments] Populating list #${containerId} (Filter: ${filter}, Limit: ${limit})`);
    listContainer.innerHTML = `<p class="loading-text text-center py-5 text-gray-600 dark:text-gray-400">Loading ${filter} tournaments...</p>`;

    // --- Placeholder Implementation ---
    // TODO: Replace with actual Firestore query and rendering logic
    setTimeout(() => { // Simulate async fetch
        listContainer.innerHTML = `
            <div class="card bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">Placeholder Tournament</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">Date: Sometime soon</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">Game: Placeholder Game</p>
                <p class="text-sm text-gray-500 dark:text-gray-500 mt-2 italic">Tournament functionality not fully implemented yet.</p>
                <a href="#tournament-detail-section?tournamentId=placeholder" class="nav-link text-indigo-600 dark:text-indigo-400 text-sm mt-2 inline-block" data-target="tournament-detail-section">View Details (Placeholder)</a>
            </div>
        `;
        console.log(`[Tournaments] Displayed placeholder content for #${containerId}.`);
    }, 500);
    // --- End Placeholder ---

    // Example of how you might fetch data later:
    /*
    if (!db) {
        console.error("[Tournaments] Firestore DB not available.");
        listContainer.innerHTML = '<p class="error-text">Error connecting to database.</p>';
        return;
    }

    try {
        let query = db.collection('tournaments');

        // Apply filtering based on date
        const now = firebase.firestore.Timestamp.now();
        if (filter === 'upcoming') {
            query = query.where('start_date', '>=', now).orderBy('start_date', 'asc');
        } else if (filter === 'past') {
            query = query.where('start_date', '<', now).orderBy('start_date', 'desc');
        } else { // 'all'
            query = query.orderBy('start_date', 'desc');
        }

        if (limit) {
            query = query.limit(limit);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            listContainer.innerHTML = `<p class="muted-text text-center py-5">No ${filter} tournaments found.</p>`;
            return;
        }

        listContainer.innerHTML = ''; // Clear loading message
        snapshot.forEach(doc => {
            const tournament = { id: doc.id, ...doc.data() };
            const card = document.createElement('div');
            card.className = 'card bg-white dark:bg-gray-800 p-4 rounded-lg shadow';
            // Populate card with tournament details...
            // card.innerHTML = `... HTML for tournament card ...`;
            listContainer.appendChild(card);
        });

    } catch (error) {
        console.error(`[Tournaments] Error fetching tournaments (Filter: ${filter}):`, error);
        listContainer.innerHTML = `<p class="error-text">Error loading tournaments: ${error.message}</p>`;
    }
    */
}

// --- Create Tournament Modal Functions ---

/**
 * Opens the modal to create a new tournament.
 */
async function openCreateTournamentModal() {
    const modalElement = document.getElementById('create-tournament-modal');
    if (!modalElement) { console.error("Create Tournament modal element not found."); return; }
    if (!db) { console.error("Create Tournament modal: DB not ready."); alert("Database connection error."); return; }

    // Ensure necessary data is ready
    try {
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
        if (!playersCachePopulated) await fetchAllPlayersForCache();
    } catch (error) {
        console.error("Error preparing data for create tournament modal:", error);
        alert(`Error loading required data: ${error.message}`);
        return;
    }

    const allPlayers = Object.values(globalPlayerCache || {}).sort((a, b) => a.name.localeCompare(b.name));
    const gameConfigs = window.globalGameConfigs || {};

    // Define and Inject HTML
    const modalContentHTML = `
        <div class="modal-content">
            <button id="close-create-tournament-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Create New Tournament</h2>
            <form id="create-tournament-form">
                <div class="mb-4">
                    <label for="create-tournament-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Tournament Name:</label>
                    <input type="text" id="create-tournament-name" name="name" class="input-field w-full" required>
                </div>
                <div class="mb-4">
                    <label for="create-tournament-game-type" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Game Type:</label>
                    <select id="create-tournament-game-type" name="game_type" class="input-field w-full" required>
                        <option value="">Select Game...</option>
                        ${Object.entries(gameConfigs).map(([key, config]) => `<option value="${key}">${config.name || key}</option>`).join('')}
                    </select>
                </div>
                <div class="mb-4">
                    <label for="create-tournament-start-date" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Start Date:</label>
                    <input type="date" id="create-tournament-start-date" name="start_date" class="input-field w-full" required>
                </div>
                <div class="mb-4">
                    <label for="create-tournament-description" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Description (Optional):</label>
                    <textarea id="create-tournament-description" name="description" class="input-field w-full h-24"></textarea>
                </div>
                <div class="mb-5">
                    <label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Participants:</label>
                    <div id="create-tournament-participants-list" class="max-h-40 overflow-y-auto border dark:border-gray-600 rounded p-2 space-y-1">
                        <!-- Player checkboxes populated by JS -->
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Select players participating in the tournament.</p>
                </div>
                <p id="create-tournament-error" class="text-red-500 text-sm mt-2 h-4"></p>
                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="cancel-create-tournament-modal-btn" class="button button-secondary">Cancel</button>
                    <button type="submit" class="button button-primary">Create Tournament</button>
                </div>
            </form>
        </div>`;
    modalElement.innerHTML = modalContentHTML;

    // Populate participants checklist
    const participantsContainer = modalElement.querySelector('#create-tournament-participants-list');
    populateParticipantChecklist(participantsContainer, allPlayers); // Use helper

    // Attach listeners *after* injecting HTML
    modalElement.querySelector('#close-create-tournament-modal-btn')?.addEventListener('click', closeCreateTournamentModal);
    modalElement.querySelector('#cancel-create-tournament-modal-btn')?.addEventListener('click', closeCreateTournamentModal);
    modalElement.querySelector('#create-tournament-form')?.addEventListener('submit', handleCreateTournamentSubmit);

    openModal(modalElement); // Use generic openModal
}

/**
 * Closes the Create Tournament modal.
 */
function closeCreateTournamentModal() {
    const modalElement = document.getElementById('create-tournament-modal');
    if (modalElement) closeModal(modalElement); // Use generic close
}

/**
 * Handles the submission of the Create Tournament form.
 */
async function handleCreateTournamentSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorMsgElement = form.querySelector('#create-tournament-error');

    if (!db || !firebase || !firebase.firestore) { console.error("Create submit: DB not ready."); alert("Database connection error."); return; }

    submitButton.disabled = true;
    if (errorMsgElement) errorMsgElement.textContent = '';

    const formData = new FormData(form);
    const tournamentData = {};

    // Basic validation and data extraction
    tournamentData.name = formData.get('name')?.trim();
    tournamentData.game_type = formData.get('game_type');
    tournamentData.description = formData.get('description')?.trim() || '';
    const startDateStr = formData.get('start_date');
    tournamentData.participant_ids = formData.getAll('participants'); // Gets all checked values

    if (!tournamentData.name || !tournamentData.game_type || !startDateStr) {
        if (errorMsgElement) errorMsgElement.textContent = "Please fill in Name, Game Type, and Start Date.";
        submitButton.disabled = false;
        return;
    }
    if (!tournamentData.participant_ids || tournamentData.participant_ids.length < 2) {
         if (errorMsgElement) errorMsgElement.textContent = "Please select at least two participants.";
         submitButton.disabled = false;
         return;
    }

    // Convert date string to Firestore Timestamp
    try {
        tournamentData.start_date = firebase.firestore.Timestamp.fromDate(new Date(startDateStr + 'T00:00:00'));
    } catch (e) {
        if (errorMsgElement) errorMsgElement.textContent = "Invalid date format.";
        submitButton.disabled = false;
        return;
    }

    // Set initial status and creation date
    tournamentData.status = 'upcoming'; // Default status
    tournamentData.date_created = firebase.firestore.FieldValue.serverTimestamp();
    // Add other fields like format, rounds, etc. if needed later

    console.log(`[TOURNAMENT CREATE SUBMIT] Creating tournament with data:`, tournamentData);

    try {
        const docRef = await db.collection('tournaments').add(tournamentData);
        console.log(`[TOURNAMENT CREATE SUBMIT] Tournament "${tournamentData.name}" created successfully with ID: ${docRef.id}.`);
        alert(`Tournament "${tournamentData.name}" created successfully!`);
        closeCreateTournamentModal();

        // Refresh the tournaments list if it's the current section
        if (currentSectionId === 'tournaments-section') {
            console.log("[TOURNAMENT CREATE SUBMIT] Refreshing tournaments list view...");
            const filter = currentQueryParams.get('filter') || 'all';
            await populateTournamentsList('tournaments-list-full', filter);
        }

    } catch (error) {
        console.error(`[TOURNAMENT CREATE SUBMIT] Error creating tournament:`, error);
        if (errorMsgElement) errorMsgElement.textContent = `Error creating tournament: ${error.message}`;
    } finally {
        submitButton.disabled = false;
    }
}

/**
 * Handles clicks within the tournaments list (event delegation).
 * Navigates to the tournament detail page if a tournament entry is clicked.
 * @param {Event} event - The click event.
 */
function handleTournamentListClick(event) {
    const tournamentEntry = event.target.closest('.tournament-entry'); // Find the closest parent tournament entry
    if (tournamentEntry) {
        const tournamentId = tournamentEntry.getAttribute('data-tournament-id');
        if (tournamentId) {
            console.log(`[TOURNAMENTS] Clicked tournament entry, ID: ${tournamentId}. Navigating...`);
            // Navigate to the detail section using hash change
            window.location.hash = `tournament-detail-section?tournamentId=${tournamentId}`;
        } else {
            console.warn("[TOURNAMENTS] Clicked tournament entry, but 'data-tournament-id' attribute is missing.");
        }
    }
}

// --- Tournament Detail Section ---

/**
 * Fetches and populates the details for a specific tournament.
 * @param {string} tournamentId - The ID of the tournament to display.
 */
async function populateTournamentDetails(tournamentId) {
    console.log(`[TOURNAMENT DETAIL] Populating details for ID: ${tournamentId}`);
    const nameEl = document.getElementById('tournament-detail-name');
    const contentEl = document.getElementById('tournament-detail-content');
    const gamesEl = document.getElementById('tournament-games-content'); // Container for games/bracket
    const editBtn = document.getElementById('edit-tournament-btn');

    // Ensure elements exist
    if (!nameEl || !contentEl || !gamesEl || !editBtn) {
        console.error("[TOURNAMENT DETAIL] Required elements not found in the DOM.");
        if (contentEl) contentEl.innerHTML = '<p class="error-text text-center py-5">Error: Page structure is missing.</p>';
        return;
    }
     if (!db) {
        console.error("[TOURNAMENT DETAIL] Firestore DB not available.");
        contentEl.innerHTML = '<p class="error-text text-center py-5">Error: Database connection failed.</p>';
        nameEl.textContent = 'Error';
        return;
    }

    // Set loading state
    nameEl.textContent = 'Loading Tournament...';
    contentEl.innerHTML = '<p class="loading-text text-center py-5">Loading details...</p>';
    gamesEl.querySelector('.bg-white').innerHTML = '<p class="loading-text text-center py-3">Loading games...</p>'; // Loading for games area
    editBtn.setAttribute('data-tournament-id', tournamentId); // Set ID for edit button early

    try {
        // Ensure configs are loaded before fetching tournament data
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();

        const docRef = db.collection('tournaments').doc(tournamentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.warn(`[TOURNAMENT DETAIL] Tournament not found with ID: ${tournamentId}`);
            nameEl.textContent = 'Tournament Not Found';
            contentEl.innerHTML = '<p class="text-center py-5 text-gray-500 dark:text-gray-400">The requested tournament could not be found.</p>';
            gamesEl.querySelector('.bg-white').innerHTML = ''; // Clear games loading
            editBtn.style.display = 'none'; // Hide edit button if not found
            return;
        }

        const tournament = { id: docSnap.id, ...docSnap.data() };
        console.log("[TOURNAMENT DETAIL] Fetched tournament data:", tournament);

        // --- Populate Basic Details ---
        nameEl.textContent = tournament.name || 'Unnamed Tournament';
        const gameTypeDisplay = window.globalGameConfigs[tournament.game_type]?.name || tournament.game_type || 'N/A';
        const startDateStr = tournament.start_date?.toDate ? tournament.start_date.toDate().toLocaleDateString() : 'N/A';
        const statusDisplay = tournament.status ? tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1) : 'Unknown';

        let detailsHtml = `
            <p class="mb-2"><strong>Game:</strong> ${gameTypeDisplay}</p>
            <p class="mb-2"><strong>Status:</strong> <span class="font-medium ${tournament.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}">${statusDisplay}</span></p>
            <p class="mb-2"><strong>Date:</strong> ${startDateStr}</p>
            ${tournament.description ? `<p class="mt-4 pt-4 border-t dark:border-gray-600 text-gray-600 dark:text-gray-300">${tournament.description}</p>` : ''}
        `;
        contentEl.innerHTML = detailsHtml;

        // --- Populate Participants (if stored) ---
        // This part depends on how participants are stored (array of IDs, subcollection, etc.)
        // Example assuming an array of player IDs `participant_ids`
        if (tournament.participant_ids && Array.isArray(tournament.participant_ids)) {
            // Ensure player cache is ready
            if (!playersCachePopulated) await fetchAllPlayersForCache();

            let participantsHtml = '<h3 class="text-lg font-semibold mt-6 mb-3">Participants</h3><ul class="list-disc list-inside space-y-1">';
            tournament.participant_ids.forEach(playerId => {
                const playerName = globalPlayerCache[playerId]?.name || 'Unknown Player';
                participantsHtml += `<li class="text-gray-700 dark:text-gray-300">${playerName}</li>`;
            });
            participantsHtml += '</ul>';
            contentEl.innerHTML += participantsHtml; // Append participants list
        }

        // --- Populate Games/Results/Bracket ---
        // This requires a separate function based on the tournament format (e.g., single elim, round robin)
        // Placeholder:
        gamesEl.querySelector('.bg-white').innerHTML = '<p class="text-center py-3 text-gray-500 dark:text-gray-400 italic">Tournament game display not yet implemented.</p>';
        // Example call: await populateTournamentBracket(tournamentId, gamesEl.querySelector('.bg-white'));

    } catch (error) {
        console.error(`[TOURNAMENT DETAIL] Error fetching tournament details for ${tournamentId}:`, error);
        nameEl.textContent = 'Error Loading';
        contentEl.innerHTML = `<p class="error-text text-center py-5">Error loading tournament details: ${error.message}</p>`;
        gamesEl.querySelector('.bg-white').innerHTML = ''; // Clear games loading on error
    }
} // End populateTournamentDetails

/**
 * Handles the click event for the "Edit Tournament" button.
 * Opens the edit tournament modal.
 * @param {Event} event - The click event.
 */
function handleEditTournamentClick(event) {
    const button = event.currentTarget; // Use currentTarget in case of nested elements
    const tournamentId = button.getAttribute('data-tournament-id');
    if (tournamentId) {
        console.log(`[TOURNAMENT EDIT] Edit button clicked for ID: ${tournamentId}`);
        if (typeof openEditTournamentModal === 'function') {
            openEditTournamentModal(tournamentId);
        } else {
            console.error("[TOURNAMENT EDIT] openEditTournamentModal function not found!");
            alert("Error: Cannot open edit form.");
        }
    } else {
        console.error("[TOURNAMENT EDIT] Edit button clicked, but data-tournament-id attribute is missing or empty.");
    }
} // End handleEditTournamentClick


// --- Edit Tournament Modal ---

/**
 * Fetches tournament data and opens the modal for editing.
 * @param {string} tournamentId - The ID of the tournament to edit.
 */
async function openEditTournamentModal(tournamentId) {
    const modalElement = document.getElementById('edit-tournament-modal');
    if (!modalElement) { console.error("Edit Tournament modal element not found."); return; }
    if (!db) { console.error("Edit Tournament modal: DB not ready."); alert("Database connection failed."); return; }

    modalElement.innerHTML = '<div class="modal-content"><p class="loading-text p-5">Loading tournament data for editing...</p></div>';
    openModal(modalElement); // Open modal with loading state

    try {
        // Ensure configs are loaded before fetching tournament data
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();

        const docRef = db.collection('tournaments').doc(tournamentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new Error("Tournament not found.");
        }

        const tournament = { id: docSnap.id, ...docSnap.data() };

        // Ensure player cache is ready for participant selection
        if (!playersCachePopulated) await fetchAllPlayersForCache();
        const allPlayers = Object.entries(globalPlayerCache || {}).map(([id, data]) => ({ id, name: data.name })).sort((a, b) => a.name.localeCompare(b.name));

        // Format dates for input fields (YYYY-MM-DD)
        const startDateValue = tournament.start_date?.toDate ? tournament.start_date.toDate().toISOString().split('T')[0] : '';

        // Build HTML for the modal form
        const modalContentHTML = `
            <div class="modal-content">
                <button id="close-edit-tournament-modal-btn" class="modal-close-button">&times;</button>
                <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Edit Tournament</h2>
                <form id="edit-tournament-form" data-tournament-id="${tournament.id}">
                    <div class="mb-4">
                        <label for="edit-tournament-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Tournament Name:</label>
                        <input type="text" id="edit-tournament-name" name="name" value="${tournament.name || ''}" class="input-field" required>
                    </div>
                    <div class="mb-4">
                        <label for="edit-tournament-game-type" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Game Type:</label>
                        <select id="edit-tournament-game-type" name="game_type" class="input-field" required>
                            ${Object.entries(window.globalGameConfigs).map(([key, config]) => `<option value="${key}" ${key === tournament.game_type ? 'selected' : ''}>${config.name || key}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-4">
                        <label for="edit-tournament-start-date" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Start Date:</label>
                        <input type="date" id="edit-tournament-start-date" name="start_date" value="${startDateValue}" class="input-field" required>
                    </div>
                    <div class="mb-4">
                        <label for="edit-tournament-description" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Description (Optional):</label>
                        <textarea id="edit-tournament-description" name="description" class="input-field h-24">${tournament.description || ''}</textarea>
                    </div>
                     <div class="mb-4">
                        <label for="edit-tournament-status" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Status:</label>
                        <select id="edit-tournament-status" name="status" class="input-field" required>
                            <option value="upcoming" ${tournament.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
                            <option value="active" ${tournament.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="completed" ${tournament.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                    <div class="mb-5">
                        <label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Participants:</label>
                        <div id="edit-tournament-participants-list" class="max-h-40 overflow-y-auto border dark:border-gray-600 rounded p-2 space-y-1">
                            ${allPlayers.map(player => `
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="participant_ids" value="${player.id}" class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-500 dark:border-gray-400" ${(tournament.participant_ids || []).includes(player.id) ? 'checked' : ''}>
                                    <span class="text-gray-700 dark:text-gray-300">${player.name}</span>
                                </label>
                            `).join('')}
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Select players participating in the tournament.</p>
                    </div>

                    <div class="mt-6 flex justify-end space-x-3">
                        <button type="button" id="cancel-edit-tournament-modal-btn" class="button button-secondary">Cancel</button>
                        <button type="submit" class="button button-primary">Save Changes</button>
                    </div>
                    <p id="edit-tournament-error" class="text-red-500 text-sm mt-2 h-4"></p>
                </form>
            </div>`;

        modalElement.innerHTML = modalContentHTML;

        // Attach listeners within the modal
        modalElement.querySelector('#close-edit-tournament-modal-btn')?.addEventListener('click', closeEditTournamentModal);
        modalElement.querySelector('#cancel-edit-tournament-modal-btn')?.addEventListener('click', closeEditTournamentModal);
        modalElement.querySelector('#edit-tournament-form')?.addEventListener('submit', handleEditTournamentSubmit);

    } catch (error) {
        console.error(`Error loading tournament ${tournamentId} for editing:`, error);
        modalElement.innerHTML = `<div class="modal-content"><button class="modal-close-button" onclick="closeEditTournamentModal()">&times;</button><p class="error-text p-5">Error loading tournament data: ${error.message}</p></div>`;
    }
} // End openEditTournamentModal

/**
 * Closes the Edit Tournament modal.
 */
function closeEditTournamentModal() {
    const modalElement = document.getElementById('edit-tournament-modal');
    if (modalElement) closeModal(modalElement); // Use generic close
} // End closeEditTournamentModal

/**
 * Handles the submission of the Edit Tournament form.
 * @param {Event} event - The form submission event.
 */
async function handleEditTournamentSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const tournamentId = form.getAttribute('data-tournament-id');
    const submitButton = form.querySelector('button[type="submit"]');
    const errorMsgElement = form.querySelector('#edit-tournament-error');

    if (!tournamentId) { console.error("Edit submit: Missing tournament ID."); return; }
    if (!db || !firebase || !firebase.firestore) { console.error("Edit submit: DB not ready."); alert("Database connection error."); return; }

    submitButton.disabled = true;
    if (errorMsgElement) errorMsgElement.textContent = '';

    const formData = new FormData(form);
    const updatedData = {};

    // Basic validation and data extraction
    updatedData.name = formData.get('name')?.trim();
    updatedData.game_type = formData.get('game_type');
    updatedData.description = formData.get('description')?.trim() || '';
    updatedData.status = formData.get('status');
    const startDateStr = formData.get('start_date');

    if (!updatedData.name || !updatedData.game_type || !startDateStr || !updatedData.status) {
        if (errorMsgElement) errorMsgElement.textContent = "Please fill in all required fields.";
        submitButton.disabled = false;
        return;
    }

    // Convert date string to Firestore Timestamp
    try {
        updatedData.start_date = firebase.firestore.Timestamp.fromDate(new Date(startDateStr + 'T00:00:00')); // Use T00:00:00 to avoid timezone issues if only date is needed
    } catch (e) {
        if (errorMsgElement) errorMsgElement.textContent = "Invalid date format.";
        submitButton.disabled = false;
        return;
    }

    // Get participant IDs
    updatedData.participant_ids = formData.getAll('participant_ids'); // Gets all checked values

    console.log(`[TOURNAMENT EDIT SUBMIT] Updating tournament ${tournamentId} with data:`, updatedData);

    try {
        const docRef = db.collection('tournaments').doc(tournamentId);
        await docRef.update(updatedData);

        console.log(`[TOURNAMENT EDIT SUBMIT] Tournament ${tournamentId} updated successfully.`);
        alert("Tournament updated successfully!");
        closeEditTournamentModal();

        // Refresh the tournament detail view if it's the current section
        if (currentSectionId === 'tournament-detail-section') {
            console.log("[TOURNAMENT EDIT SUBMIT] Refreshing tournament detail view...");
            await populateTournamentDetails(tournamentId);
        }
        // Optionally refresh the main tournaments list if needed (e.g., if status changed)
        // await populateTournamentsList('tournaments-list-full');

    } catch (error) {
        console.error(`[TOURNAMENT EDIT SUBMIT] Error updating tournament ${tournamentId}:`, error);
        if (errorMsgElement) errorMsgElement.textContent = `Error saving changes: ${error.message}`;
    } finally {
        submitButton.disabled = false;
    }
} // End handleEditTournamentSubmit

console.log("[TOURNAMENTS] Module loaded."); // Keep a simple load confirmation