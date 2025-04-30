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
     const modalElement = document.getElementById('create-tournament-modal'); //
     if (!modalElement) { console.error("Create Tournament modal container (#create-tournament-modal) not found."); alert("Error: Cannot open Create Tournament form."); return; } //
     if (!db) { console.error("Create Tournament modal: DB not ready."); alert("Error: Cannot open Create Tournament form. Database might not be connected."); return; } //

     console.log("[MODAL Create Tournament] Fetching players for checklist..."); //
     const allPlayers = await getAllPlayers(); // Fetch the player list (ensure getAllPlayers is accessible)
     if (!allPlayers || allPlayers.length === 0) {
          console.warn("[MODAL Create Tournament] No players fetched, checklist will be empty."); //
          alert("Warning: No players found in the database. Cannot create tournament without players."); //
     }
     console.log(`[MODAL Create Tournament] Got ${allPlayers.length} players.`); //

     const modalContentHTML = `
        <div class="modal-content">
            <button id="close-create-tournament-modal-btn" class="modal-close-button">&times;</button>
            <h2 class="text-2xl font-semibold mb-5">Create New Tournament</h2>
            <form id="create-tournament-form">
                 <div class="mb-5">
                     <label for="tournament-name" class="block text-sm font-bold mb-2">Tournament Name:</label>
                     <input type="text" id="tournament-name" name="tournament-name" class="shadow appearance-none border rounded-lg w-full py-3 px-4" required>
                 </div>
                 <div class="mb-5">
                     <label for="tournament-game-type-select" class="block text-sm font-bold mb-2">Game Type:</label>
                     <select id="tournament-game-type-select" name="tournament-game-type" class="shadow border rounded-lg w-full py-3 px-4" required>
                         <option value="">Select Type</option>
                     </select>
                 </div>
                 <div class="mb-5">
                     <label for="tournament-format" class="block text-sm font-bold mb-2">Format:</label>
                     <select id="tournament-format" name="tournament-format" class="shadow border rounded-lg w-full py-3 px-4" required>
                         <option value="">Select Format</option>
                         <option value="single-elim">Single Elimination</option>
                         <option value="double-elim">Double Elimination</option>
                         <option value="round-robin">Round Robin</option>
                     </select>
                 </div>
                 <div class="mb-5">
                     <label for="tournament-start-date" class="block text-sm font-bold mb-2">Start Date (Optional):</label>
                     <input type="date" id="tournament-start-date" name="tournament-start-date" class="shadow appearance-none border rounded-lg w-full py-3 px-4">
                 </div>
                 <div class="mb-5">
                     <label class="block text-sm font-bold mb-2">Participants:</label>
                     <div id="tournament-participants-list" class="h-40 border rounded-lg p-3 overflow-y-auto space-y-2">
                         <p class="muted-text p-2">Loading participants...</p>
                     </div>
                     <p class="text-xs muted-text mt-1">Select participants. Seeding may be based on current rankings.</p>
                 </div>
                 <div class="mt-6 flex justify-end space-x-3">
                     <button type="button" id="cancel-create-tournament-modal-btn" class="button button-secondary font-bold py-2 px-5 rounded-lg">Cancel</button>
                     <button type="submit" class="button button-primary font-bold py-3 px-5 rounded-lg shadow hover:shadow-md">Create Tournament</button>
                 </div>
             </form>
        </div>`;
    modalElement.innerHTML = modalContentHTML; // Inject HTML

    const closeButton = modalElement.querySelector('#close-create-tournament-modal-btn'); //
    const cancelButton = modalElement.querySelector('#cancel-create-tournament-modal-btn'); //
    const modalForm = modalElement.querySelector('#create-tournament-form'); //
    const gameTypeSelect = modalForm.querySelector('#tournament-game-type-select'); //
    const participantsContainer = modalForm.querySelector('#tournament-participants-list'); //

    if (closeButton) closeButton.addEventListener('click', closeCreateTournamentModal); //
    if (cancelButton) cancelButton.addEventListener('click', closeCreateTournamentModal); //
    if (modalForm) {
        modalForm.addEventListener('submit', handleCreateTournamentSubmit); //
        if (gameTypeSelect) {
            populateSelectWithOptions(gameTypeSelect, gameTypesConfig, 'Select Type'); //
        }
        if (participantsContainer) {
            populateParticipantChecklist(participantsContainer, allPlayers); // Use fetched players
        } else {
             console.error("Participant container not found in Create Tournament modal."); //
        }
    }

    openModal(modalElement); // Show the modal
} // End openCreateTournamentModal

function closeCreateTournamentModal() {
    const modalElement = document.getElementById('create-tournament-modal'); //
    if (!modalElement) return; //
    closeModal(modalElement); // Generic close handles hiding/cleanup
} // End closeCreateTournamentModal

async function handleCreateTournamentSubmit(event) {
    event.preventDefault(); //
    const form = event.target; //
    if (!db) { alert("Database connection error."); return; } //

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
    if (format !== 'ffa' && selectedParticipants.length < 2) { 
         alert("Please select at least two participants for this format."); //
         return; //
    }

    const tournamentData = {
         name: formData.get('tournament-name')?.trim(), //
         game_type: formData.get('tournament-game-type'), //
         format: format, //
         start_date: null, // Initialize as null
         participants: selectedParticipants, //
         status: 'Upcoming', //
         date_created: firebase.firestore.FieldValue.serverTimestamp(), //
         last_updated: firebase.firestore.FieldValue.serverTimestamp(), //
    };

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

    if (!tournamentData.name || !tournamentData.game_type || !tournamentData.format) return; 

     try {
         const docRef = await db.collection('tournaments').add(tournamentData); //
         console.log(`[TOURNAMENT] Created tournament "${tournamentData.name}" with ID: ${docRef.id}`); //
         alert(`Tournament "${tournamentData.name}" created successfully!`); //
         closeCreateTournamentModal(); //

         await populateTournamentsList('dashboard-tournaments-list', 3); //
         await populateTournamentsList('tournaments-list-full'); //

     } catch (error) {
         console.error("Error creating tournament:", error); //
         alert(`Failed to create tournament: ${error.message}`); //
     }
} // End handleCreateTournamentSubmit


// --- Tournament List Population ---

async function populateTournamentsList(listElementId, limit = 10) {
    const listElement = document.getElementById(listElementId);
    if (!listElement || !db) { console.warn(`Tournament list #${listElementId} or DB not ready.`); return; }
    
    listElement.innerHTML = `<li class="loading-text text-base">Loading tournaments...</li>`;
    
    try {
        const q = db.collection('tournaments').orderBy('date_created', 'desc').limit(limit);
        const snapshot = await q.get();
        if (snapshot.empty) {
            listElement.innerHTML = `<li class="muted-text text-base">No tournaments created yet.</li>`;
            return;
        }
        listElement.innerHTML = '';
        snapshot.forEach(doc => {
            const tournament = { id: doc.id, ...doc.data() };
            const li = document.createElement('li');
            li.className = `border p-4 rounded-lg transition duration-200 ${
                listElementId === 'dashboard-tournaments-list' ? 'mb-2' : 'mb-4'
            }`;

            const status = tournament.status || 'Upcoming';
            const gameType = gameTypesConfig[tournament.game_type] || tournament.game_type || 'N/A';
            const participantCount = tournament.participants?.length || 0;
            const startDate = tournament.start_date?.toDate ? tournament.start_date.toDate().toLocaleDateString() : 'TBD';

            li.innerHTML = `
                <div class="flex justify-between items-start mb-2 flex-wrap gap-2">
                    <h3 class="text-lg font-semibold">${tournament.name || 'Unnamed Tournament'}</h3>
                    <span class="text-sm font-medium status-${status.toLowerCase()} px-2 py-0.5 rounded">${status}</span>
                </div>
                <p class="text-sm muted-text mb-1">Game: ${gameType}</p>
                <p class="text-sm muted-text mb-1">Format: ${tournament.format || 'N/A'}</p>
                <p class="text-sm muted-text mb-3">Participants: ${participantCount}</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs muted-text">Starts: ${startDate}</span>
                    <a href="#tournament-detail-section" data-tournament-id="${tournament.id}" class="view-tournament-details-link link-button text-sm font-medium">View Details &rarr;</a>
                </div>
            `;
            listElement.appendChild(li);
        });
    } catch (error) {
        console.error(`Error fetching tournaments for ${listElementId}:`, error);
        listElement.innerHTML = `<li class="error-text text-base">Error loading tournaments.</li>`;
    }
} // End populateTournamentsList

// Note: This file assumes that 'db', 'firebase', 'showSection', 'openModal', 'closeModal',
// 'populateSelectWithOptions', 'getAllPlayers', 'playersCachePopulated', 'fetchAllPlayersForCache',
// 'globalPlayerCache', 'gameTypesConfig', 'DEFAULT_ELO' are initialized and accessible
// from the global scope or imported/passed appropriately. It also calls other functions like
// populateTournamentsList which need to be accessible.