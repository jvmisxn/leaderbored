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
        containerElement.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2 italic">No players found.</p>'; // Added dark mode class
        return;
    }
    playersArray.forEach(player => {
        const div = document.createElement('div'); //
        div.className = 'flex items-center'; //
        const isChecked = selectedParticipants.includes(player.id); // Check if player is already selected
        // Added dark mode classes
        div.innerHTML = `
            <input type="checkbox" id="participant-${player.id}" name="participants" value="${player.id}" class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-500" ${isChecked ? 'checked' : ''}>
            <label for="participant-${player.id}" class="ml-2 text-sm text-gray-700 dark:text-gray-300">${player.name || 'Unnamed'}</label>
        `;
        containerElement.appendChild(div); //
    });
    console.log(`[UI] Populated participant checklist in ${containerElement.id || '(no id)'} with ${playersArray.length} players.`); //
}


// --- Create Tournament Modal Functions ---

async function openCreateTournamentModal() {
     // Ensure necessary elements/variables are accessible: createTournamentModal, db, getAllPlayers, populateParticipantChecklist, populateSelectWithOptions, gameTypesConfig, openModal, handleCreateTournamentSubmit, closeCreateTournamentModal
     const modalElement = document.getElementById('create-tournament-modal'); //
     if (!modalElement) { console.error("Create Tournament modal container (#create-tournament-modal) not found."); alert("Error: Cannot open Create Tournament form."); return; } //
     if (!db) { console.error("Create Tournament modal: DB not ready."); alert("Error: Cannot open Create Tournament form. Database might not be connected."); return; } //

     // Fetch Players
     console.log("[MODAL Create Tournament] Fetching players for checklist..."); //
     const allPlayers = await getAllPlayers(); // Fetch the player list (ensure getAllPlayers is accessible)
     if (!allPlayers || allPlayers.length === 0) {
          console.warn("[MODAL Create Tournament] No players fetched, checklist will be empty."); //
          alert("Warning: No players found in the database. Cannot create tournament without players."); //
          // Optionally don't open the modal or show an error state
     }
     console.log(`[MODAL Create Tournament] Got ${allPlayers.length} players.`); //

     // Define and Inject HTML
     const modalContentHTML = `
        <div class="modal-content">
            <button id="close-create-tournament-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Create New Tournament</h2>
            <form id="create-tournament-form">
                 <div class="mb-5">
                     <label for="tournament-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Tournament Name:</label>
                     <input type="text" id="tournament-name" name="tournament-name" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500" required>
                 </div>
                 <div class="mb-5">
                     <label for="tournament-game-type-select" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Game Type:</label>
                     <select id="tournament-game-type-select" name="tournament-game-type" class="shadow border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500" required>
                         <option value="">Select Type</option>
                         </select>
                 </div>
                 <div class="mb-5">
                     <label for="tournament-format" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Format:</label>
                     <select id="tournament-format" name="tournament-format" class="shadow border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500" required>
                         <option value="">Select Format</option>
                         <option value="single-elim">Single Elimination</option>
                         <option value="double-elim">Double Elimination</option>
                         <option value="round-robin">Round Robin</option>
                     </select>
                 </div>
                 <div class="mb-5">
                     <label for="tournament-start-date" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Start Date (Optional):</label>
                     <input type="date" id="tournament-start-date" name="tournament-start-date" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500">
                 </div>
                 <div class="mb-5">
                     <label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Participants:</label>
                     <div id="tournament-participants-list" class="h-40 border rounded-lg p-3 overflow-y-auto bg-gray-50 dark:bg-gray-700 dark:border-gray-600 space-y-2">
                         <p class="text-gray-500 dark:text-gray-400 p-2">Loading participants...</p>
                     </div>
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Select participants. Seeding may be based on current rankings.</p>
                 </div>
                 <div class="mt-6 flex justify-end space-x-3">
                     <button type="button" id="cancel-create-tournament-modal-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-5 rounded-lg">Cancel</button>
                     <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg shadow hover:shadow-md">Create Tournament</button>
                 </div>
             </form>
        </div>`; // Added dark mode classes
    modalElement.innerHTML = modalContentHTML; // Inject HTML

    // Get references & Attach Listeners
    const closeButton = modalElement.querySelector('#close-create-tournament-modal-btn'); //
    const cancelButton = modalElement.querySelector('#cancel-create-tournament-modal-btn'); //
    const modalForm = modalElement.querySelector('#create-tournament-form'); //
    const gameTypeSelect = modalForm.querySelector('#tournament-game-type-select'); //
    const participantsContainer = modalForm.querySelector('#tournament-participants-list'); //

    if (closeButton) closeButton.addEventListener('click', closeCreateTournamentModal); //
    if (cancelButton) cancelButton.addEventListener('click', closeCreateTournamentModal); //
    if (modalForm) {
        modalForm.addEventListener('submit', handleCreateTournamentSubmit); //
        // Populate game type dropdown
        if (gameTypeSelect) {
            populateSelectWithOptions(gameTypeSelect, gameTypesConfig, 'Select Type'); //
        }
        // Populate participant checklist
        if (participantsContainer) {
            populateParticipantChecklist(participantsContainer, allPlayers); // Use fetched players
        } else {
             console.error("Participant container not found in Create Tournament modal."); //
        }
    }

    openModal(modalElement); // Show the modal
} // End openCreateTournamentModal

function closeCreateTournamentModal() {
    // Ensure createTournamentModal and closeModal are accessible
    const modalElement = document.getElementById('create-tournament-modal'); //
    if (!modalElement) return; //
    closeModal(modalElement); // Generic close handles hiding/cleanup
} // End closeCreateTournamentModal

async function handleCreateTournamentSubmit(event) {
    event.preventDefault(); //
    const form = event.target; //
    // Ensure db, firebase, populateTournamentsList, closeCreateTournamentModal are accessible
    if (!db) { alert("Database connection error."); return; } //

    // Basic validation
    let isValid = true; //
    form.querySelectorAll('input[required], select[required]').forEach(field => {
        field.classList.remove('border-red-500'); //
        if (!field.value) { isValid = false; field.classList.add('border-red-500'); } //
    });
    if (!isValid) { alert("Please fill out all required fields."); return; } //

    const formData = new FormData(form); //
    const selectedParticipants = []; //
    form.querySelectorAll('input[name="participants"]:checked').forEach(checkbox => {
        selectedParticipants.push(checkbox.value); //
    });

    const format = formData.get('tournament-format'); //
    // Validate participant count
    if (format !== 'ffa' && selectedParticipants.length < 2) { // Example validation
         alert("Please select at least two participants for this format."); //
         return; //
    }
    // Add more specific validation (e.g., power of 2 for elim formats) if needed

    // Data for Firestore
    const tournamentData = {
         name: formData.get('tournament-name')?.trim(), //
         game_type: formData.get('tournament-game-type'), //
         format: format, //
         start_date: null, // Initialize as null
         participants: selectedParticipants, //
         status: 'Upcoming', //
         date_created: firebase.firestore.FieldValue.serverTimestamp(), //
         last_updated: firebase.firestore.FieldValue.serverTimestamp(), // Add last updated
         // matches: {}, // Could initialize empty matches structure if needed
         // structure_generated: false // Flag for bracket generation
    };

    // Convert date string to Timestamp if provided
    const startDateValue = formData.get('tournament-start-date');
    if (startDateValue) {
         try {
             const dateObj = new Date(startDateValue + 'T12:00:00Z'); // Use UTC midday
             if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
             tournamentData.start_date = firebase.firestore.Timestamp.fromDate(dateObj); //
         } catch(e) {
             alert("Invalid Start Date entered."); return;
         }
    }

    if (!tournamentData.name || !tournamentData.game_type || !tournamentData.format) return; // Caught by validation

     try {
         // Add the new tournament document
         const docRef = await db.collection('tournaments').add(tournamentData); //
         console.log(`[TOURNAMENT] Created tournament "${tournamentData.name}" with ID: ${docRef.id}`); //
         alert(`Tournament "${tournamentData.name}" created successfully!`); //
         closeCreateTournamentModal(); //

         // Refresh tournament lists
         await populateTournamentsList('dashboard-tournaments-list', 3); //
         await populateTournamentsList('tournaments-list-full'); //

     } catch (error) {
         console.error("Error creating tournament:", error); //
         alert(`Failed to create tournament: ${error.message}`); //
     }
} // End handleCreateTournamentSubmit


// --- Tournament List Population ---

async function populateTournamentsList(listElementId, limit = 10) {
     // Ensure db, gameTypesConfig are accessible
     const listElement = document.getElementById(listElementId); //
     if (!listElement || !db) { console.warn(`Tournament list #${listElementId} or DB not ready.`); return; } //
     listElement.innerHTML = `<li class="text-gray-500 dark:text-gray-400">Loading tournaments...</li>`; // Added dark mode class
     try {
         // Requires index: tournaments: date_created (desc)
         const q = db.collection('tournaments').orderBy('date_created', 'desc').limit(limit); //
         const snapshot = await q.get(); //
         if (snapshot.empty) {
             listElement.innerHTML = `<li class="text-gray-500 dark:text-gray-400">No tournaments created yet.</li>`; // Added dark mode class
             return;
         }
         listElement.innerHTML = ''; // Clear loading
         snapshot.forEach(doc => {
             const tournament = { id: doc.id, ...doc.data() }; //
             const li = document.createElement('li'); //
             // Base classes + specific styling
             li.className = `border dark:border-gray-700 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-200 ${
                 listElementId === 'dashboard-tournaments-list' ? 'mb-2' : 'mb-4' // Spacing adjustment
             }`;

             const status = tournament.status || 'Upcoming'; //
             const statusColor = status === 'Ongoing' ? 'text-green-600 dark:text-green-400' : (status === 'Completed' ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'); // Dark mode colors
             const statusBg = status === 'Ongoing' ? 'bg-green-100 dark:bg-green-900' : (status === 'Completed' ? 'bg-gray-100 dark:bg-gray-600' : 'bg-blue-100 dark:bg-blue-900'); // Dark mode backgrounds
             const gameType = gameTypesConfig[tournament.game_type] || tournament.game_type || 'N/A'; // Use config
             const format = tournament.format ? tournament.format.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'; // Format display

             // Updated HTML with dark mode classes
             li.innerHTML = `
                 <div class="flex justify-between items-center mb-1">
                    <span class="font-semibold text-lg text-gray-800 dark:text-gray-100">${tournament.name || 'Unnamed Tournament'}</span>
                    <span class="${statusColor} font-medium text-xs py-0.5 px-2 rounded-full ${statusBg}">${status}</span>
                 </div>
                 <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                     <span>Game: ${gameType}</span> | <span>Format: ${format}</span> ${tournament.start_date ? `| Starts: ${tournament.start_date.toDate().toLocaleDateString()}` : ''}
                 </div>
                 <a href="#tournament-detail-section" data-tournament-id="${tournament.id}" class="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium view-tournament-details-link">View Details</a>
             `;
             listElement.appendChild(li); //
         });
     } catch (error) {
          console.error(`Error fetching tournaments for ${listElementId}:`, error); //
          if (error.code === 'failed-precondition') {
             listElement.innerHTML = `<li class="text-red-500">Error: Firestore index missing for tournament date sorting. Check console.</li>`; //
             console.error("Firestore index needed: tournaments collection, date_created (descending)."); //
         } else {
            listElement.innerHTML = `<li class="text-red-500">Error loading tournaments: ${error.message}</li>`; //
         }
     }
} // End populateTournamentsList

// Placeholder function (not fully implemented in original code)
async function populateManageTournamentsList() {
    // This could populate a more detailed list on an admin page, possibly with edit/delete buttons directly visible
    console.warn("populateManageTournamentsList function called but not fully implemented."); //
    const container = document.getElementById('manage-tournaments-list-container'); // Example ID
    if (container) {
        container.innerHTML = '<p class="text-gray-500 italic">Tournament management list feature pending.</p>'; //
        // Future: Fetch tournaments and display with admin controls
        // await populateTournamentsList('manage-tournaments-list-container', 50); // Reuse list population
        // Add event listeners for edit/delete buttons within this specific list
    }
} // End populateManageTournamentsList


// --- Tournament Detail View ---

// Navigates to and initiates population of the detail view
function openTournamentDetails(tournamentId) {
    console.log(`[TOURNAMENT DETAIL] Opening details for ID: ${tournamentId}`); //
    if (!tournamentId) {
        console.error("[TOURNAMENT DETAIL] No tournament ID provided."); //
        return;
    }
    // Ensure showSection and populateTournamentDetails are accessible
    showSection('tournament-detail-section'); // Navigate
    populateTournamentDetails(tournamentId); // Populate
} // End openTournamentDetails

// Fetches and displays details for a specific tournament
async function populateTournamentDetails(tournamentId) {
    // Ensure necessary elements and functions are accessible: tournamentDetailSection, db, globalPlayerCache, playersCachePopulated, fetchAllPlayersForCache, gameTypesConfig, DEFAULT_ELO, openPlayerModal, handleEditTournamentDetail, handleDeleteTournamentDetail, openAddParticipantsModal
    const container = document.getElementById('tournament-detail-content'); //
    const loadingEl = document.getElementById('tournament-detail-loading'); //
    const errorEl = document.getElementById('tournament-detail-error'); //
    const errorMsgEl = document.getElementById('tournament-detail-error-message'); //

     if (!container || !loadingEl || !errorEl || !errorMsgEl || !tournamentDetailSection) {
         console.error("Tournament detail section elements not found."); return;
     } //
    tournamentDetailSection.classList.add('loading'); // Show loading state
    tournamentDetailSection.classList.remove('error'); // Hide error state
    container.style.display = 'none'; // Hide content while loading

    // Get Element References within Content
    const nameEl = container.querySelector('#tournament-detail-name'); //
    const gameEl = container.querySelector('#tournament-detail-game'); //
    const formatEl = container.querySelector('#tournament-detail-format'); //
    const statusEl = container.querySelector('#tournament-detail-status'); //
    const dateEl = container.querySelector('#tournament-detail-date'); // Added element for date
    const participantsEl = container.querySelector('#tournament-detail-participants'); //
    const visualizationEl = container.querySelector('#tournament-detail-visualization'); //
    const editButton = container.querySelector('#edit-tournament-detail-btn'); //
    const deleteButton = container.querySelector('#delete-tournament-detail-btn'); //
    const addParticipantsButton = container.querySelector('#add-participant-plus-btn'); //

    // --- Reset Content ---
    if(nameEl) nameEl.textContent = '[Tournament Name]'; //
    if(gameEl) gameEl.textContent = '[Game]'; //
    if(formatEl) formatEl.textContent = '[Format]'; //
    if(statusEl) statusEl.textContent = '[Status]'; //
    if(dateEl) dateEl.textContent = ''; // Clear date
    if(participantsEl) participantsEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">Loading participants...</p>'; // Added dark mode class
    if(visualizationEl) visualizationEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic text-center py-4">Visualization Placeholder</p>'; // Added dark mode class

    // Remove previous listeners to prevent duplicates
    const removeListener = (btn) => { if (btn && btn._listener) { btn.removeEventListener('click', btn._listener); btn._listener = null; } }; // Helper
    removeListener(editButton); //
    removeListener(deleteButton); //
    removeListener(addParticipantsButton); //

    try {
        if (!db) throw new Error("Database not connected"); //
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get(); //
        if (!tournamentDoc.exists) { throw new Error("Tournament not found."); } //

        const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() }; //
        const gameTypeKey = tournamentData.game_type; //
        const gameTypeName = gameTypesConfig[gameTypeKey] || gameTypeKey || 'N/A'; //

        // Populate Details
        if(nameEl) nameEl.textContent = tournamentData.name || 'Unnamed Tournament'; //
        if(gameEl) gameEl.textContent = gameTypeName; //
        if(formatEl) formatEl.textContent = tournamentData.format ? tournamentData.format.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'; //
        if(statusEl) statusEl.textContent = tournamentData.status || 'Upcoming'; //
        if(dateEl && tournamentData.start_date) { // Display date if it exists
            dateEl.textContent = `Starts: ${tournamentData.start_date.toDate().toLocaleDateString()}`; //
        } else if (dateEl) {
             dateEl.textContent = 'Start Date: TBD'; //
        }

        // Populate Participants
        if (participantsEl && tournamentData.participants && tournamentData.participants.length > 0) {
             participantsEl.innerHTML = ''; // Clear loading
             // Ensure player cache is ready for names/elos
             if (!playersCachePopulated) await fetchAllPlayersForCache(); //
             // Create list items for each participant
             tournamentData.participants.forEach(pId => {
                 const player = globalPlayerCache[pId]; // Get player from cache
                 if (player) {
                    const pElo = player.elos?.[gameTypeKey] ?? player.elo_overall ?? DEFAULT_ELO; // Get relevant Elo
                    const div = document.createElement('div'); //
                    // Added dark mode classes
                    div.className = 'flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-700 py-1'; //
                    div.innerHTML = `<span class="player-link font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer" data-player-id="${player.id}">${player.name || 'Unnamed'}</span> <span class="text-gray-600 dark:text-gray-400">${Math.round(pElo)} Elo</span>`; //
                    participantsEl.appendChild(div); //
                 } else {
                    // Handle case where participant ID doesn't match a cached player
                    const div = document.createElement('div'); //
                    div.className = 'flex justify-between items-center text-sm border-b border-gray-200 dark:border-gray-700 py-1 text-gray-500 dark:text-gray-400 italic'; //
                    div.innerHTML = `<span>Unknown Player (${pId})</span> <span>N/A</span>`; //
                    participantsEl.appendChild(div); //
                 }
             });
        } else if (participantsEl) {
             participantsEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 italic">No participants added yet.</p>'; // Added dark mode class
        }

        // Visualization Placeholder
        if(visualizationEl) visualizationEl.innerHTML = `<p class="text-center text-gray-600 dark:text-gray-400 py-5 italic">Visualization for ${formatEl.textContent} format coming soon...</p>`; // Added dark mode class

        // Add Event Listeners (ensure handler functions are accessible)
        if (editButton) { const listener = () => handleEditTournamentDetail(tournamentId); editButton.addEventListener('click', listener); editButton._listener = listener; } //
        if (deleteButton) { const listener = () => handleDeleteTournamentDetail(tournamentId); deleteButton.addEventListener('click', listener); deleteButton._listener = listener; } //
        if (addParticipantsButton) { const listener = () => openAddParticipantsModal(tournamentId); addParticipantsButton.addEventListener('click', listener); addParticipantsButton._listener = listener; } //

        // Show Content
        container.style.display = ''; // Show content div
        tournamentDetailSection.classList.remove('loading'); // Hide loading indicator

    } catch (error) {
         console.error("Error populating tournament details:", error); //
         if(errorMsgEl) errorMsgEl.textContent = error.message; //
         tournamentDetailSection.classList.remove('loading'); //
         tournamentDetailSection.classList.add('error'); // Show error indicator
         container.style.display = 'none'; // Hide content div on error
    }
} // End populateTournamentDetails


// --- Tournament Edit/Delete Functions ---

// Opens the edit modal by fetching current data first
async function handleEditTournamentDetail(tournamentId) {
    console.log(`[EDIT TOURNAMENT DETAIL] Requesting edit for ID: ${tournamentId}`); //
    // Ensure db and openEditTournamentModal are accessible
    if (!db || !tournamentId) { alert("Error: DB or Tournament ID missing."); return; } //

    try {
        // Fetch current data
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get(); //
        if (!tournamentDoc.exists) { throw new Error("Tournament data not found for editing."); } //
        const tournamentData = { id: tournamentDoc.id, ...tournamentDoc.data() }; //
        // Open the edit modal with the fetched data
        openEditTournamentModal(tournamentData); //
    } catch(error) {
         console.error("Error fetching tournament data for edit:", error); //
         alert(`Error loading tournament details for editing: ${error.message}`); //
    }
} // End handleEditTournamentDetail

// Deletes the tournament from the detail page view
async function handleDeleteTournamentDetail(tournamentId) {
    console.log(`[DELETE TOURNAMENT DETAIL] Requesting delete for ID: ${tournamentId}`); //
    // Ensure db, populateTournamentsList, showSection are accessible
    if (!db || !tournamentId) { alert("Error: DB or Tournament ID missing."); return; } //

    if (confirm(`Are you sure you want to delete this tournament (${tournamentId})? This cannot be undone.`)) { //
         try {
             await db.collection('tournaments').doc(tournamentId).delete(); //
             console.log(`[FIRESTORE] Firestore document deleted: tournaments/${tournamentId}`); //
             alert(`Tournament deleted.`); //

             // Refresh main tournament lists
             await populateTournamentsList('dashboard-tournaments-list', 3); //
             await populateTournamentsList('tournaments-list-full'); //

             // Navigate back to the main tournaments list
             showSection('tournaments-section'); //

         } catch (error) {
             console.error("Error deleting tournament:", error); //
             alert(`Failed to delete tournament ${tournamentId}: ${error.message}`); //
         }
     }
} // End handleDeleteTournamentDetail

// (Also used by admin management list if implemented)
async function handleDeleteTournament(tournamentId, listItemElement) { // listItemElement optional
    console.log(`[DELETE TOURNAMENT] Requesting delete for tournament ID: ${tournamentId}`); //
    // Ensure db, populateTournamentsList are accessible
    if (!db) { console.error("Firestore not initialized."); return; } //
    if (!tournamentId) { console.error("handleDeleteTournament called without ID."); return;} //

    if (confirm(`Are you sure you want to delete tournament '${tournamentId}'? This cannot be undone.`)) { //
         try {
             await db.collection('tournaments').doc(tournamentId).delete(); //
             console.log(`[FIRESTORE] Firestore document deleted: tournaments/${tournamentId}`); //
             if (listItemElement) listItemElement.remove(); // Remove from UI if element passed
             alert(`Tournament deleted.`); //

             // Refresh public tournament lists
             await populateTournamentsList('dashboard-tournaments-list', 3); //
             await populateTournamentsList('tournaments-list-full'); //

             // If currently viewing the details of the deleted tournament, navigate away
             const detailSection = document.getElementById('tournament-detail-section'); //
             const detailContent = document.getElementById('tournament-detail-content'); //
             if (detailSection && !detailSection.classList.contains('hidden') && detailContent?.querySelector(`h2[data-tournament-id="${tournamentId}"]`)) { // Check if viewing deleted one
                showSection('tournaments-section'); // Navigate back
             }

         } catch (error) {
             console.error("Error deleting tournament:", error); //
             alert(`Failed to delete tournament ${tournamentId}. See console for details.`); //
         }
     }
} // End handleDeleteTournament


// --- Tournament Edit Modal ---

let currentTournamentData = null; // Store data for edit modal state

function openEditTournamentModal(tournamentData) {
    // Ensure necessary elements/variables accessible: editTournamentModal, populateSelectWithOptions, gameTypesConfig, openModal, closeModal, handleEditTournamentSubmit, openAddParticipantsModal
    const modalElement = document.getElementById('edit-tournament-modal'); //
    if (!modalElement) { console.error("Edit Tournament modal container (#edit-tournament-modal) not found."); alert("Error: Cannot open Edit Tournament form."); return; } //

    currentTournamentData = tournamentData; // Store current data

    // Format date
    let startDateStr = ''; //
    if (tournamentData.start_date && typeof tournamentData.start_date.toDate === 'function') { //
        try {
            const dateObj = tournamentData.start_date.toDate(); //
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); //
            const day = dateObj.getDate().toString().padStart(2, '0'); //
            startDateStr = `${dateObj.getFullYear()}-${month}-${day}`; //
        } catch (e) { console.warn("Error formatting start date for input:", e); } //
    } else if (tournamentData.start_date && typeof tournamentData.start_date === 'string') {
        startDateStr = tournamentData.start_date.split('T')[0]; // Basic handling for ISO string
    }

    // Define and Inject HTML (with dark mode classes)
    const modalContentHTML = `
        <div class="modal-content">
            <button id="close-edit-tournament-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Edit Tournament (ID: ${tournamentData.id})</h2>
            <form id="edit-tournament-form" data-tournament-id="${tournamentData.id}">
                 <div class="mb-4">
                     <label for="edit-tournament-name" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Tournament Name:</label>
                     <input type="text" id="edit-tournament-name" name="tournament-name" value="${tournamentData.name || ''}" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500" required>
                 </div>
                 <div class="mb-4">
                     <label for="edit-tournament-game-type" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Game Type:</label>
                     <select id="edit-tournament-game-type" name="tournament-game-type" class="shadow border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 cursor-not-allowed" disabled>
                         </select>
                     <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Game type cannot be changed after creation.</p>
                 </div>
                 <div class="mb-4">
                     <label for="edit-tournament-format" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Format:</label>
                     <select id="edit-tournament-format" name="tournament-format" class="shadow border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500" required>
                         <option value="">Select Format</option>
                         <option value="single-elim">Single Elimination</option>
                         <option value="double-elim">Double Elimination</option>
                         <option value="round-robin">Round Robin</option>
                     </select>
                 </div>
                 <div class="mb-4">
                     <label for="edit-tournament-start-date" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Start Date (Optional):</label>
                     <input type="date" id="edit-tournament-start-date" name="tournament-start-date" value="${startDateStr}" class="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500">
                 </div>
                 <div class="mb-4">
                     <label for="edit-tournament-status" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Status:</label>
                     <select id="edit-tournament-status" name="tournament-status" class="shadow border rounded-lg w-full py-3 px-4 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 dark:border-gray-500" required>
                         <option value="Upcoming">Upcoming</option>
                         <option value="Ongoing">Ongoing</option>
                         <option value="Completed">Completed</option>
                     </select>
                 </div>
                 <div class="mt-6 flex justify-between items-center">
                     <button type="button" id="modal-add-participants-btn" title="Add/Remove Participants" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow hover:shadow-md text-sm leading-tight flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
                         Participants
                     </button>
                     <div class="space-x-3">
                        <button type="button" id="cancel-edit-tournament-modal-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-5 rounded-lg">Cancel</button>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg shadow hover:shadow-md">Save Changes</button>
                    </div>
                 </div>
             </form>
        </div>`; //
    modalElement.innerHTML = modalContentHTML; //

    // Get references and Populate fields
    const gameTypeSelect = modalElement.querySelector('#edit-tournament-game-type'); //
    const formatSelect = modalElement.querySelector('#edit-tournament-format'); //
    const statusSelect = modalElement.querySelector('#edit-tournament-status'); //

    if(gameTypeSelect) { populateSelectWithOptions(gameTypeSelect, gameTypesConfig, 'Select Type'); gameTypeSelect.value = tournamentData.game_type || ''; } //
    if(formatSelect) formatSelect.value = tournamentData.format || ''; //
    if(statusSelect) statusSelect.value = tournamentData.status || 'Upcoming'; //

    // Attach listeners
    const closeButton = modalElement.querySelector('#close-edit-tournament-modal-btn'); //
    const cancelButton = modalElement.querySelector('#cancel-edit-tournament-modal-btn'); //
    const modalForm = modalElement.querySelector('#edit-tournament-form'); //
    const addParticipantsBtn = modalElement.querySelector('#modal-add-participants-btn'); //

    if(closeButton) closeButton.addEventListener('click', closeEditTournamentModal); //
    if(cancelButton) cancelButton.addEventListener('click', closeEditTournamentModal); //
    if(modalForm) modalForm.addEventListener('submit', handleEditTournamentSubmit); //
    if (addParticipantsBtn) { //
        addParticipantsBtn.addEventListener('click', () => {
            openAddParticipantsModal(tournamentData.id); //
            // Optionally close this modal: closeEditTournamentModal();
        });
    }

    openModal(modalElement); // Show modal
} // End openEditTournamentModal

function closeEditTournamentModal() {
   // Ensure editTournamentModal and closeModal are accessible
   const modalElement = document.getElementById('edit-tournament-modal'); //
   if (!modalElement) return; //
   closeModal(modalElement); // Use generic close
   currentTournamentData = null; // Clear stored data
} // End closeEditTournamentModal

async function handleEditTournamentSubmit(event) {
    event.preventDefault(); //
    const form = event.target; //
    const tournamentId = form.getAttribute('data-tournament-id'); //
    // Ensure db, firebase, closeEditTournamentModal, populateTournamentDetails, populateTournamentsList are accessible
    if (!db || !tournamentId) { alert("Error: DB or Tournament ID missing."); return; } //

    const formData = new FormData(form); //
    const updatedData = {
        name: formData.get('tournament-name')?.trim(), //
        format: formData.get('tournament-format'), //
        status: formData.get('tournament-status'), //
        last_updated: firebase.firestore.FieldValue.serverTimestamp() //
    };

    // Handle optional date
    const startDateValue = formData.get('tournament-start-date'); //
    if (startDateValue) { //
         try {
             const dateObj = new Date(startDateValue + 'T12:00:00Z'); //
             if (isNaN(dateObj.getTime())) throw new Error("Invalid date"); //
             updatedData.start_date = firebase.firestore.Timestamp.fromDate(dateObj); //
         } catch(e) {
             alert("Invalid Start Date entered."); return; //
         }
    } else {
         updatedData.start_date = null; // Set to null if empty
    }

     // Basic Validation
     if (!updatedData.name || !updatedData.format || !updatedData.status) {
         alert("Please fill out Name, Format, and Status."); return; //
     }
    console.log(`[EDIT TOURNAMENT] Submitting update for ${tournamentId}:`, updatedData); //

    try {
        await db.collection('tournaments').doc(tournamentId).update(updatedData); //
        alert("Tournament updated successfully!"); //
        closeEditTournamentModal(); //

        // Refresh the details view and lists
        await populateTournamentDetails(tournamentId); //
        await populateTournamentsList('dashboard-tournaments-list', 3); //
        await populateTournamentsList('tournaments-list-full'); //

    } catch (error) {
         console.error("Error updating tournament:", error); //
         alert(`Failed to update tournament: ${error.message}`); //
    }
} // End handleEditTournamentSubmit


// --- Add/Edit Tournament Participants Modal Functions ---

async function openAddParticipantsModal(tournamentId) {
    // Ensure necessary elements/variables accessible: addParticipantsModal, db, playersCachePopulated, fetchAllPlayersForCache, globalPlayerCache, populateParticipantChecklist, openModal, closeModal, handleAddParticipantsSubmit
    const modalElement = document.getElementById('add-participants-modal'); //
    if (!modalElement) { console.error("Add Participants modal container (#add-participants-modal) not found."); alert("Error: Cannot open Add Participants form."); return; } //
    if (!db) { console.error("Add Participants modal: DB not ready."); alert("Error: Cannot open Add Participants form. Database might not be connected."); return; } //

    console.log(`[MODAL Add Participants] Opening for tournament ${tournamentId}`); //
    modalElement.innerHTML = '<div class="modal-content"><p>Loading...</p></div>'; // Basic loading state
    openModal(modalElement); // Open the modal overlay quickly

    let currentParticipants = []; //
    let tournamentName = 'Tournament'; //

    try {
        // Fetch current tournament data
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get(); //
        if (!tournamentDoc.exists) { throw new Error("Tournament data not found."); } //
        const tournamentData = tournamentDoc.data(); //
        currentParticipants = tournamentData.participants || []; //
        tournamentName = tournamentData.name || tournamentName; //

        // Fetch all players (use cache if possible)
        if (!playersCachePopulated) {
            console.warn("[MODAL Add Participants] Player cache not populated, fetching..."); //
            await fetchAllPlayersForCache(); //
        }
        const allPlayersArray = Object.values(globalPlayerCache || {}); //
        if (allPlayersArray.length === 0 && !playersCachePopulated) { // Check again if cache failed
            throw new Error("Failed to load player list."); //
        }

        // Define and Inject HTML (with dark mode classes)
        const modalContentHTML = `
            <div class="modal-content">
                <button id="close-add-participants-modal-btn" class="modal-close-button">&times;</button>
                <h2 class="text-2xl font-semibold mb-5 text-indigo-700 dark:text-indigo-400">Add/Remove Participants</h2>
                <h3 class="text-lg font-medium mb-4 text-gray-600 dark:text-gray-300">${tournamentName}</h3>
                <form id="add-participants-form" data-tournament-id="${tournamentId}">
                    <div class="mb-5">
                        <label class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Select Players:</label>
                        <div id="add-participants-checklist" class="h-60 border rounded-lg p-3 overflow-y-auto bg-gray-50 dark:bg-gray-700 dark:border-gray-600 space-y-2">
                            <p class="text-gray-500 dark:text-gray-400 p-2">Loading checklist...</p>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Check players to include them in the tournament.</p>
                    </div>
                    <div class="mt-6 flex justify-end space-x-3">
                        <button type="button" id="cancel-add-participants-modal-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-5 rounded-lg">Cancel</button>
                        <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-5 rounded-lg shadow hover:shadow-md">Update Participants</button>
                    </div>
                </form>
            </div>`; //
        modalElement.innerHTML = modalContentHTML; // Inject full HTML

        // Populate the checklist
        const participantsChecklistContainer = modalElement.querySelector('#add-participants-checklist'); //
        if (participantsChecklistContainer) {
            populateParticipantChecklist(participantsChecklistContainer, allPlayersArray, currentParticipants); //
        } else {
            console.error("Participant checklist container not found in Add Participants modal."); //
        }

        // Attach Event Listeners
        const closeButton = modalElement.querySelector('#close-add-participants-modal-btn'); //
        const cancelButton = modalElement.querySelector('#cancel-add-participants-modal-btn'); //
        const modalForm = modalElement.querySelector('#add-participants-form'); //

        if (closeButton) closeButton.addEventListener('click', closeAddParticipantsModal); //
        if (cancelButton) cancelButton.addEventListener('click', closeAddParticipantsModal); //
        if (modalForm) modalForm.addEventListener('submit', handleAddParticipantsSubmit); //

    } catch (error) {
        console.error("[MODAL Add Participants] Error:", error); //
        alert(`Error opening participants modal: ${error.message}`); //
        // Inject error message
        modalElement.innerHTML = `<div class="modal-content"><p class="text-red-500 p-4">Error loading participant data: ${error.message}</p><button id="close-add-participants-error-btn" class="modal-close-button">&times;</button></div>`; //
        modalElement.querySelector('#close-add-participants-error-btn')?.addEventListener('click', () => closeModal(modalElement)); //
    }
} // End openAddParticipantsModal

function closeAddParticipantsModal() {
    // Ensure addParticipantsModal and closeModal are accessible
    const modalElement = document.getElementById('add-participants-modal'); //
    if (modalElement) closeModal(modalElement); // Use generic close
} // End closeAddParticipantsModal

async function handleAddParticipantsSubmit(event) {
    event.preventDefault(); //
    const form = event.target; //
    const tournamentId = form.getAttribute('data-tournament-id'); //
    // Ensure db, firebase, closeAddParticipantsModal, populateTournamentDetails are accessible
    if (!db || !tournamentId) { alert("Error: DB or Tournament ID missing."); return; } //

    const selectedParticipants = []; // Get newly selected participant IDs
    form.querySelectorAll('input[name="participants"]:checked').forEach(checkbox => {
        selectedParticipants.push(checkbox.value); //
    });

    // Basic validation (e.g., >= 1 participant)
    if (selectedParticipants.length < 1) {
         alert("Please select at least one participant."); //
         return; //
    }
    // Add more validation based on tournament format/status if needed

    console.log(`[UPDATE PARTICIPANTS] Updating tournament ${tournamentId} with:`, selectedParticipants); //

    try {
        const tournamentRef = db.collection('tournaments').doc(tournamentId); //
        // Update participants array and timestamp
        await tournamentRef.update({
            participants: selectedParticipants, //
            last_updated: firebase.firestore.FieldValue.serverTimestamp() //
         });

        alert("Tournament participants updated successfully!"); //
        closeAddParticipantsModal(); // Close this modal

        // Refresh the tournament details view immediately
        await populateTournamentDetails(tournamentId); //

    } catch (error) {
         console.error("Error updating tournament participants:", error); //
         alert(`Failed to update participants: ${error.message}`); //
    }
} // End handleAddParticipantsSubmit


// --- Deprecated? ---
// Included for completeness from original code, but might be replaced by populateParticipantChecklist
async function populateTournamentParticipantsSelect() {
     // Ensure elements/variables accessible: db
     const participantsContainer = document.getElementById('tournament-participants-list'); //
     const gameTypeSelect = document.getElementById('tournament-game-type-select'); //

     if (!participantsContainer || !gameTypeSelect) {
         console.warn("Cannot populate tournament participants (old function): elements missing."); //
         if(participantsContainer) participantsContainer.innerHTML = '<p class="text-gray-500 p-2">Error initializing participant list.</p>'; //
         return; //
     }

     const selectedGameType = gameTypeSelect.value; //
     participantsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">Loading participants...</p>'; // Added dark mode class

     if (selectedGameType) { // Only load if a game type is selected
         try {
             if (!db) throw new Error("DB not connected"); //
             const snapshot = await db.collection('players').orderBy('name').get(); //
             if (snapshot.empty) {
                 participantsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">No players found.</p>'; // Added dark mode class
             } else {
                 participantsContainer.innerHTML = ''; // Clear loading message
                 snapshot.forEach(doc => {
                     const player = { id: doc.id, ...doc.data() }; //
                     const div = document.createElement('div'); //
                     div.className = 'flex items-center'; //
                     // Added dark mode classes
                     div.innerHTML = `
                         <input type="checkbox" id="participant-${player.id}" name="participants" value="${player.id}" class="form-checkbox h-4 w-4 text-indigo-600 dark:bg-gray-500">
                         <label for="participant-${player.id}" class="ml-2 text-sm text-gray-700 dark:text-gray-300">${player.name || 'Unnamed'}</label>
                     `;
                     participantsContainer.appendChild(div); //
                 });
             }
         } catch (error) {
             console.error("Error fetching players for tournament (old function):", error); //
             participantsContainer.innerHTML = '<p class="text-red-500 p-2">Error loading players.</p>'; //
         }
     } else {
          participantsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">Select a game type first.</p>'; // Added dark mode class
     }
 } // End populateTournamentParticipantsSelect (Deprecated?)

// Note: This file assumes that 'db', 'firebase', 'showSection', 'openModal', 'closeModal',
// 'populateSelectWithOptions', 'getAllPlayers', 'playersCachePopulated', 'fetchAllPlayersForCache',
// 'globalPlayerCache', 'gameTypesConfig', 'DEFAULT_ELO' are initialized and accessible
// from the global scope or imported/passed appropriately. It also calls other functions like
// populateTournamentsList which need to be accessible.