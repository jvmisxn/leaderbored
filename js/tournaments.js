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
        // Show loading state while fetching cache
        containerElement.innerHTML = '<p class="loading-text p-2 italic">Loading players...</p>';
        fetchAllPlayersForCache().then(() => {
            // Repopulate after cache is ready
            populateParticipantChecklist(containerElement, Object.values(globalPlayerCache), selectedParticipants);
        }).catch(error => {
             console.error("Error fetching player cache for checklist:", error);
             containerElement.innerHTML = '<p class="error-text p-2 italic">Error loading players.</p>';
        });
        return; // Exit while cache is fetching
    }

    containerElement.innerHTML = ''; // Clear existing content (loading or previous)
    if (!playersArray || playersArray.length === 0) {
        containerElement.innerHTML = '<p class="muted-text p-2 italic">No players found.</p>';
        return;
    }
    playersArray.forEach(player => {
        const div = document.createElement('div'); //
        div.className = 'flex items-center'; //
        const isChecked = selectedParticipants.includes(player.id); // Check if player is already selected
        div.innerHTML = `
            <input type="checkbox" id="participant-${player.id}-${containerElement.id}" name="participants" value="${player.id}" class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-600 dark:border-gray-500 focus:ring-indigo-500" ${isChecked ? 'checked' : ''}>
            <label for="participant-${player.id}-${containerElement.id}" class="ml-2 text-sm text-gray-700 dark:text-gray-300">${player.name || 'Unnamed'}</label>
        `;
        containerElement.appendChild(div); //
    });
    // console.log(`[UI] Populated participant checklist in ${containerElement.id || '(no id)'} with ${playersArray.length} players.`); // Can be noisy
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
    let query = db.collection('tournaments');
    const now = firebase.firestore.Timestamp.now();

    try {
        switch (status) {
            case 'upcoming':
                query = query.where('start_date', '>=', now).orderBy('start_date', 'asc');
                break;
            case 'completed':
                query = query.where('status', '==', 'completed').orderBy('start_date', 'desc');
                break;
            case 'active':
                query = query.where('status', '==', 'active').orderBy('start_date', 'desc');
                break;
            case 'past': // Includes completed and potentially old active ones
                 query = query.where('start_date', '<', now).orderBy('start_date', 'desc');
                 break;
            case 'all':
            default:
                query = query.orderBy('start_date', 'desc');
                break;
        }

        if (limitCount) {
            query = query.limit(limitCount);
        }

        const snapshot = await query.get();
        const tournaments = [];
        snapshot.forEach(doc => tournaments.push({ id: doc.id, ...doc.data() }));
        console.log(`[TOURNAMENTS FETCH] Fetched ${tournaments.length} tournaments.`);
        return tournaments;

    } catch (error) {
        console.error(`[TOURNAMENTS FETCH] Error fetching ${status} tournaments:`, error);
         if (error.code === 'failed-precondition') {
            console.error(`Firestore index required for fetching tournaments (status: ${status}). Check query details.`);
         }
        return []; // Return empty on error
    }
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
    listContainer.innerHTML = `<p class="loading-text text-center py-5 text-gray-600 dark:text-gray-400 col-span-full">Loading ${filter} tournaments...</p>`; // Added col-span-full

    try {
        // Ensure configs are ready for game names
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();

        const tournaments = await fetchTournaments(filter, limit); // Use the fetch function

        if (!tournaments || tournaments.length === 0) {
            listContainer.innerHTML = `<p class="muted-text text-center py-5 col-span-full">No ${filter} tournaments found.</p>`; // Added col-span-full
            return;
        }

        listContainer.innerHTML = ''; // Clear loading message
        tournaments.forEach(tournament => {
            const card = document.createElement('div');
            // Added tournament-entry class and data-tournament-id for click handling
            card.className = 'tournament-entry card bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200';
            card.setAttribute('data-tournament-id', tournament.id);

            const gameTypeDisplay = window.globalGameConfigs[tournament.game_type]?.name || tournament.game_type || 'N/A';
            const startDateStr = tournament.start_date?.toDate ? tournament.start_date.toDate().toLocaleDateString() : 'N/A';
            const statusDisplay = tournament.status ? tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1) : 'Unknown';
            const participantCount = tournament.participant_ids?.length || 0;

            card.innerHTML = `
                <h3 class="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-1">${tournament.name || 'Unnamed Tournament'}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span class="font-medium">${gameTypeDisplay}</span> - ${startDateStr}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-500 mb-2">
                    Status: <span class="font-medium ${tournament.status === 'completed' ? 'text-green-600 dark:text-green-400' : (tournament.status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400')}">${statusDisplay}</span>
                    <span class="mx-2">|</span> ${participantCount} Participants
                </p>
                ${tournament.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 italic mb-3 truncate">${tournament.description}</p>` : ''}
                <a href="#tournament-detail-section?tournamentId=${tournament.id}" class="nav-link text-indigo-600 dark:text-indigo-400 text-sm mt-2 inline-block font-medium" data-target="tournament-detail-section">View Details &rarr;</a>
            `;
            listContainer.appendChild(card);
        });

        // Add event listener to the container for delegation (if not already added)
        if (!listContainer.dataset.listenerAttached) {
             listContainer.addEventListener('click', handleTournamentListClick);
             listContainer.dataset.listenerAttached = 'true';
             console.log(`[Tournaments] Click listener attached to #${containerId}`);
        }

    } catch (error) {
        console.error(`[Tournaments] Error populating list #${containerId}:`, error);
        listContainer.innerHTML = `<p class="error-text text-center py-5 col-span-full">Error loading tournaments: ${error.message}</p>`; // Added col-span-full
    }
}

// --- Create Tournament Modal Functions ---

/**
 * Opens the modal to create a new tournament.
 */
async function openCreateTournamentModal() {
    const modalElement = document.getElementById('create-tournament-modal');
    if (!modalElement) { console.error("Create Tournament modal element not found."); return; }
    if (!db) { console.error("Create Tournament modal: DB not ready."); alert("Database connection error."); return; }

    // Show loading state in modal immediately
    modalElement.innerHTML = '<div class="modal-content"><p class="loading-text p-5">Loading form...</p></div>';
    openModal(modalElement);

    // Ensure necessary data is ready
    try {
        if (!window.globalGameConfigs) await fetchAndCacheGameConfigs();
        if (!playersCachePopulated) await fetchAllPlayersForCache();
    } catch (error) {
        console.error("Error preparing data for create tournament modal:", error);
        modalElement.innerHTML = `<div class="modal-content"><button class="modal-close-button" onclick="closeCreateTournamentModal()">&times;</button><p class="error-text p-5">Error loading required data: ${error.message}</p></div>`;
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
                        ${Object.entries(gameConfigs).sort(([,a],[,b])=>a.name.localeCompare(b.name)).map(([key, config]) => `<option value="${key}">${config.name || key}</option>`).join('')}
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
                    <div id="create-tournament-participants-list" class="max-h-40 overflow-y-auto border dark:border-gray-600 rounded p-2 space-y-1 bg-gray-50 dark:bg-gray-700">
                        <!-- Player checkboxes populated by JS -->
                        <p class="loading-text p-2 italic">Loading players...</p>
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

    // Modal is already open, just filled content
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
        // Ensure date string is treated as local date, not UTC midnight
        const localDate = new Date(startDateStr + 'T00:00:00');
        if (isNaN(localDate.getTime())) throw new Error("Invalid date value");
        
        // Make sure we're creating a proper Firestore Timestamp
        tournamentData.start_date = firebase.firestore.Timestamp.fromDate(localDate);
    } catch (e) {
        if (errorMsgElement) errorMsgElement.textContent = "Invalid date format.";
        submitButton.disabled = false;
        return;
    }

    // Set initial status and creation date - IMPORTANT FOR UPCOMING FILTER
    tournamentData.status = 'upcoming'; // Default status
    tournamentData.date_created = firebase.firestore.FieldValue.serverTimestamp();
    
    // Create with required fields for tournament functionality
    tournamentData.matches = []; // Empty array for tournament matches
    tournamentData.format = 'single_elimination'; // Default tournament format
    
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
            await populateTournamentsList('tournaments-list-full', null, filter); // Pass null limit, use current filter
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
    // Find the closest ancestor which is a tournament entry link or card
    const tournamentLink = event.target.closest('a[data-target="tournament-detail-section"]');
    const tournamentCard = event.target.closest('.tournament-entry[data-tournament-id]');

    let tournamentId = null;
    let targetElement = null;

    if (tournamentLink) {
        const href = tournamentLink.getAttribute('href');
        const params = new URLSearchParams(href.split('?')[1]);
        tournamentId = params.get('tournamentId');
        targetElement = tournamentLink;
    } else if (tournamentCard) {
        // If clicked on card but not the link itself, get ID from card
        tournamentId = tournamentCard.getAttribute('data-tournament-id');
        targetElement = tournamentCard;
    }

    if (tournamentId && targetElement) {
        console.log(`[TOURNAMENTS] Clicked tournament target, ID: ${tournamentId}. Navigating...`);
        // Use showSection for consistent navigation and history handling
        showSection('tournament-detail-section', true, { tournamentId: tournamentId });
    } else if (event.target.closest('.tournament-entry')) {
         console.warn("[TOURNAMENTS] Clicked within tournament entry, but couldn't determine ID or target.");
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
    const gamesListEl = document.getElementById('tournament-games-list');
    const gamesContentEl = document.getElementById('tournament-games-content');
    const editBtn = document.getElementById('edit-tournament-btn');

    // Ensure elements exist - log individual element status
    if (!nameEl || !contentEl || (!gamesListEl && !gamesContentEl) || !editBtn) {
        console.error("[TOURNAMENT DETAIL] Required elements not found in the DOM.", {
            nameElement: !!nameEl,
            contentElement: !!contentEl,
            gamesListElement: !!gamesListEl,
            gamesContentElement: !!gamesContentEl,
            editButton: !!editBtn
        });
        const detailSection = document.getElementById('tournament-detail-section');
        if(detailSection) detailSection.innerHTML = '<p class="error-text text-center py-10">Error: Page structure is missing.</p>';
        return;
    }

    // Set loading state
    nameEl.textContent = 'Loading Tournament...';
    contentEl.innerHTML = '<p class="loading-text text-center py-5">Loading details...</p>';
    
    // Use gamesListEl if available, otherwise find a container inside gamesContentEl
    const gamesContainer = gamesListEl || (gamesContentEl.querySelector('.card > div') || gamesContentEl);
    gamesContainer.innerHTML = '<p class="loading-text text-center py-3">Loading games...</p>';
    
    editBtn.setAttribute('data-tournament-id', tournamentId);
    editBtn.style.display = 'none'; // Hide edit button initially, show only if admin and tournament found

    try {
        // Ensure configs and players are loaded before fetching tournament data
        const cachePromises = [];
        if (!window.globalGameConfigs) cachePromises.push(fetchAndCacheGameConfigs());
        if (!playersCachePopulated) cachePromises.push(fetchAllPlayersForCache());
        await Promise.all(cachePromises);

        console.log(`[TOURNAMENT DETAIL] Fetching document: tournaments/${tournamentId}`);
        const docRef = db.collection('tournaments').doc(tournamentId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            console.warn(`[TOURNAMENT DETAIL] Tournament not found with ID: ${tournamentId}`);
            nameEl.textContent = 'Tournament Not Found';
            contentEl.innerHTML = '<p class="text-center py-5 text-gray-500 dark:text-gray-400">The requested tournament could not be found.</p>';
            gamesContainer.innerHTML = ''; // Clear games loading
            return; // Keep edit button hidden
        }

        const tournament = { id: docSnap.id, ...docSnap.data() };
        console.log("[TOURNAMENT DETAIL] Fetched tournament data:", tournament);

        // Show edit button only if user is admin
        if (isCurrentUserAdmin()) {
             editBtn.style.display = 'inline-block'; // Or 'block' depending on layout
        }

        // --- Populate Basic Details ---
        nameEl.textContent = tournament.name || 'Unnamed Tournament';
        const gameTypeDisplay = window.globalGameConfigs[tournament.game_type]?.name || tournament.game_type || 'N/A';
        const startDateStr = tournament.start_date?.toDate ? tournament.start_date.toDate().toLocaleDateString() : 'N/A';
        const statusDisplay = tournament.status ? tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1) : 'Unknown';

        let detailsHtml = `
            <p class="mb-2"><strong>Game:</strong> ${gameTypeDisplay}</p>
            <p class="mb-2"><strong>Status:</strong> <span class="font-medium ${tournament.status === 'completed' ? 'text-green-600 dark:text-green-400' : (tournament.status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400')}">${statusDisplay}</span></p>
            <p class="mb-2"><strong>Date:</strong> ${startDateStr}</p>
            ${tournament.description ? `<p class="mt-4 pt-4 border-t dark:border-gray-600 text-gray-600 dark:text-gray-300">${tournament.description}</p>` : ''}
        `;
        contentEl.innerHTML = detailsHtml;

        // --- Populate Participants ---
        if (tournament.participant_ids && Array.isArray(tournament.participant_ids)) {
            let participantsHtml = '<h3 class="text-lg font-semibold mt-6 mb-3">Participants</h3><ul class="list-disc list-inside space-y-1">';
            tournament.participant_ids.forEach(playerId => {
                const playerName = globalPlayerCache[playerId]?.name || 'Unknown Player';
                 // Link participant names to their profiles
                 participantsHtml += `<li class="text-gray-700 dark:text-gray-300"><a href="#player-profile-section?playerId=${playerId}" class="nav-link hover:underline text-indigo-600 dark:text-indigo-400" data-target="player-profile-section">${playerName}</a></li>`;
            });
            participantsHtml += '</ul>';
            contentEl.innerHTML += participantsHtml; // Append participants list
        } else {
             contentEl.innerHTML += '<p class="mt-4 text-gray-500 dark:text-gray-400 italic">No participant information available.</p>';
        }

        // --- Populate Games/Results/Bracket ---
        // Placeholder:
        gamesContainer.innerHTML = '<p class="text-center py-3 text-gray-500 dark:text-gray-400 italic">Tournament game display not yet implemented.</p>';
        // Example call: await populateTournamentBracket(tournamentId, gamesContainer);

    } catch (error) {
        console.error(`[TOURNAMENT DETAIL] Error fetching tournament details for ${tournamentId}:`, error);
        nameEl.textContent = 'Error Loading';
        contentEl.innerHTML = `<p class="error-text">Error loading tournament details: ${error.message}</p>`;
        gamesContainer.innerHTML = ''; // Clear games loading on error
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

console.log("[TOURNAMENTS] Module loaded."); // Keep a simple load confirmation