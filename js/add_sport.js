// --- add_sport.js ---

/**
 * Sets up the event listener for the Add Sport form.
 */
function setupAddSportForm() {
    const form = document.getElementById('add-sport-form');
    if (form) {
        form.removeEventListener('submit', handleAddSportSubmit); // Prevent duplicates
        form.addEventListener('submit', handleAddSportSubmit);
        console.log("[Add Sport] Form listener attached.");
    } else {
        console.error("[Add Sport] Form (#add-sport-form) not found.");
    }
}

/**
 * Handles the submission of the Add Sport form.
 */
async function handleAddSportSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorElement = form.querySelector('#add-sport-error');
    const formatErrorElement = form.querySelector('#format-error');

    if (!db || !firebase || !firebase.firestore) {
        console.error("[Add Sport] DB not ready.");
        if (errorElement) errorElement.textContent = "Database connection error.";
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';
    if (errorElement) errorElement.textContent = '';
    if (formatErrorElement) formatErrorElement.textContent = '';

    const formData = new FormData(form);
    const sportName = formData.get('sport-name')?.trim();
    const supports1v1 = formData.get('sport-supports-1v1') === 'on';
    const supportsTeams = formData.get('sport-supports-teams') === 'on';
    const supportsSolo = formData.get('sport-supports-solo') === 'on';
    const rankingSystem = formData.get('sport-ranking-system');
    const scoreUnit = formData.get('sport-score-unit')?.trim() || null;

    // Basic Validation
    if (!sportName) {
        if (errorElement) errorElement.textContent = "Sport/Activity name is required.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Sport';
        return;
    }
    if (!supports1v1 && !supportsTeams && !supportsSolo) {
        if (formatErrorElement) formatErrorElement.textContent = "Select at least one supported format.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Sport';
        return;
    }
    if (rankingSystem === 'elo' && !supports1v1) {
        if (errorElement) errorElement.textContent = "Elo ranking requires '1 vs 1' format support.";
        submitButton.disabled = false;
        submitButton.textContent = 'Add Sport';
        return;
    }

    // Generate a Firestore-friendly key (lowercase, replace spaces with underscores)
    const sportKey = sportName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const sportData = {
        name: sportName,
        supports_1v1: supports1v1,
        supports_teams: supportsTeams,
        supports_solo: supportsSolo,
        rankingSystem: rankingSystem,
        scoreUnit: scoreUnit,
        date_added: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log(`[Add Sport] Attempting to add sport with key "${sportKey}" and data:`, sportData);

    try {
        // Check if key already exists
        const docRef = db.collection('game_types').doc(sportKey);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            throw new Error(`A sport with the key "${sportKey}" (derived from "${sportName}") already exists.`);
        }

        // Add the new sport document
        await docRef.set(sportData);
        console.log(`[Add Sport] Sport "${sportName}" added successfully with key: ${sportKey}`);
        alert(`Sport "${sportName}" added successfully!`);

        // Invalidate and refresh config cache
        globalGameConfigs = null; // Invalidate cache
        await fetchAndCacheGameConfigs(); // Repopulate cache

        // Refresh UI elements that use game types
        console.log("[Add Sport] Refreshing game type dropdowns and filters...");
        if (typeof populateGameTypeDropdown === 'function') {
            const submitGameSelect = document.getElementById('game-type-select');
            if (submitGameSelect) await populateGameTypeDropdown(submitGameSelect, 'Select Game Type...');
            const liveGameSelect = document.getElementById('live-game-type-select');
            if (liveGameSelect) await populateGameTypeDropdown(liveGameSelect, 'Select Game Type...');
        }
        const rankingsFilterSelect = document.getElementById('rankings-game-filter');
        if (rankingsFilterSelect && typeof populateRankingsFilter === 'function') {
             await populateRankingsFilter();
        }
        const resultsFilterSelect = document.getElementById('results-game-filter');
        if (resultsFilterSelect && typeof populateResultsFilter === 'function') {
             await populateResultsFilter();
        }
        // Refresh player sort dropdown
        const playerSortFilter = document.getElementById('players-sort-filter');
        if (playerSortFilter && typeof populatePlayerSortFilter === 'function') {
            await populatePlayerSortFilter();
        }


        // Navigate back to the sports list
        if (typeof showSection === 'function') {
            showSection('sports-section', true); // Force reload to show the new sport
        } else {
            window.location.hash = '#sports-section';
        }

    } catch (error) {
        console.error("Error adding sport:", error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
    } finally {
        // Ensure button is re-enabled
        submitButton.disabled = false;
        submitButton.textContent = 'Add Sport';
    }
}

console.log("[Add Sport] add_sport.js loaded.");
