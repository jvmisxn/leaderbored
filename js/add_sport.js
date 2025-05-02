// --- add_sport.js ---

/**
 * Toggles the visibility of round configuration options based on checkbox and format selection.
 */
function toggleRoundConfigVisibility() {
    const roundCounterCheckbox = document.getElementById('live-tool-round-counter');
    const roundConfigContainer = document.getElementById('round-config-container');
    const roundFormatSelect = document.getElementById('live-tool-round-format');
    const fixedContainer = document.getElementById('round-config-fixed-container');
    const bestOfContainer = document.getElementById('round-config-bestof-container');

    if (!roundCounterCheckbox || !roundConfigContainer || !roundFormatSelect || !fixedContainer || !bestOfContainer) {
        console.warn("[Add Sport] Round config elements not found for visibility toggle.");
        return;
    }

    const showConfig = roundCounterCheckbox.checked;
    roundConfigContainer.classList.toggle('hidden', !showConfig);

    if (showConfig) {
        const selectedFormat = roundFormatSelect.value;
        fixedContainer.classList.toggle('hidden', selectedFormat !== 'fixed');
        bestOfContainer.classList.toggle('hidden', selectedFormat !== 'best_of');
    } else {
        // Hide specific format inputs if the main container is hidden
        fixedContainer.classList.add('hidden');
        bestOfContainer.classList.add('hidden');
    }
}

/**
 * Sets up the Add/Edit Sport section, populating fields if editing.
 * @param {object|null} params - Parameters passed during navigation, e.g., { sport: 'sportKey' } for editing.
 */
async function setupAddSportSection(params = null) {
    console.log("[Add Sport Setup] Setting up section. Params:", params);
    const form = document.getElementById('add-sport-form');
    const heading = document.getElementById('add-sport-heading');
    const submitButton = document.getElementById('add-sport-submit-btn');
    const deleteButton = document.getElementById('delete-sport-btn');
    const errorElement = document.getElementById('add-sport-error');
    const successElement = document.getElementById('add-sport-success');
    // Round config elements
    const roundCounterCheckbox = document.getElementById('live-tool-round-counter');
    const roundFormatSelect = document.getElementById('live-tool-round-format');

    if (!form || !heading || !submitButton || !errorElement || !successElement || !deleteButton || !roundCounterCheckbox || !roundFormatSelect) {
        console.error("[Add Sport Setup] Essential form elements missing.");
        return;
    }

    // Reset form and messages
    form.reset();
    errorElement.textContent = '';
    successElement.textContent = '';
    form.removeAttribute('data-editing-sport-key');
    deleteButton.classList.add('hidden');
    deleteButton.removeEventListener('click', handleDeleteSport);

    // --- Add Listeners for Round Config Visibility ---
    roundCounterCheckbox.removeEventListener('change', toggleRoundConfigVisibility);
    roundFormatSelect.removeEventListener('change', toggleRoundConfigVisibility);
    roundCounterCheckbox.addEventListener('change', toggleRoundConfigVisibility);
    roundFormatSelect.addEventListener('change', toggleRoundConfigVisibility);
    // --- End Listeners ---

    const isEditing = params && params.sport;
    let sportData = null;

    if (isEditing) {
        const sportKey = params.sport;
        console.log(`[Add Sport Setup] Editing mode for sport key: ${sportKey}`);
        heading.textContent = 'Edit Sport/Activity';
        submitButton.textContent = 'Save Changes';
        form.dataset.editingSportKey = sportKey;

        deleteButton.classList.remove('hidden');
        deleteButton.addEventListener('click', handleDeleteSport);

        try {
            if (!window.globalGameConfigs) {
                console.warn("[Add Sport Setup] Game configs not ready, fetching...");
                await fetchAndCacheGameConfigs();
            }
            sportData = window.globalGameConfigs?.[sportKey];
            if (!sportData) {
                throw new Error(`Sport with key "${sportKey}" not found in config.`);
            }
            console.log("[Add Sport Setup] Prefilling form with data:", sportData);

            // Prefill standard fields
            form.name.value = sportData.name || '';
            form.description.value = sportData.description || '';
            form['sport-icon-url'].value = sportData.icon_url || '';
            form['sport-allow-single-player'].checked = sportData.allow_single_player || false;
            form['sport-ranking-system'].value = sportData.ranking_system || 'elo';

            // Prefill Live Tools checkboxes
            const liveTools = sportData.live_tools || {};
            form['live-tool-timer'].checked = liveTools.timer || false;
            form['live-tool-round-counter'].checked = liveTools.roundCounter || false;
            form['live-tool-score-input'].checked = liveTools.scoreInput || false;
            form['live-tool-golf-putts'].checked = liveTools.golfPutts || false;
            form['live-tool-golf-drive'].checked = liveTools.golfDrive || false;

            // Prefill Round Configuration
            form['live-tool-round-name'].value = liveTools.roundName || 'Round';
            form['live-tool-round-format'].value = liveTools.roundFormat || 'counter';
            form['live-tool-fixed-rounds'].value = liveTools.fixedRounds || '';
            form['live-tool-bestof-target'].value = liveTools.bestOfTarget || '';

        } catch (error) {
            console.error("[Add Sport Setup] Error fetching or prefilling sport data:", error);
            errorElement.textContent = `Error loading sport details: ${error.message}`;
        }

    } else {
        console.log("[Add Sport Setup] Add mode.");
        heading.textContent = 'Add New Sport/Activity';
        submitButton.textContent = 'Add Sport';
        // Ensure defaults are set for add mode (though reset should handle most)
        form['live-tool-round-name'].value = 'Round';
        form['live-tool-round-format'].value = 'counter';
    }

    // Initial visibility check after potential prefill
    toggleRoundConfigVisibility();

    form.removeEventListener('submit', handleAddSportSubmit);
    form.addEventListener('submit', handleAddSportSubmit);

    console.log("[Add Sport Setup] Setup complete.");
}

/**
 * Handles the submission of the Add/Edit Sport form.
 */
async function handleAddSportSubmit(event) {
    event.preventDefault();
    console.log("[Add Sport] handleAddSportSubmit triggered.");
    const form = event.target;
    const submitButton = form.querySelector('#add-sport-submit-btn');
    const errorElement = form.querySelector('#add-sport-error');
    const successElement = form.querySelector('#add-sport-success');

    const editingSportKey = form.getAttribute('data-editing-sport-key');
    const isEditing = !!editingSportKey;
    const actionVerb = isEditing ? 'Saving' : 'Adding';
    const actionPast = isEditing ? 'saved' : 'added';

    if (!db) {
        console.error(`[Add Sport/${actionVerb}] Firestore DB instance not available.`);
        if (errorElement) errorElement.textContent = "Database connection error.";
        return;
    }

    if (errorElement) errorElement.textContent = '';
    if (successElement) successElement.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = `${actionVerb}...`;

    try {
        const sportName = form['sport-name'].value.trim();
        const rankingSystem = form['sport-ranking-system'].value;
        const iconUrl = form['sport-icon-url'].value.trim();
        const description = form['sport-description'].value.trim();
        const allowSinglePlayer = form['sport-allow-single-player'].checked;

        // Live Tools Configuration
        const liveTools = {
            timer: form['live-tool-timer']?.checked || false,
            scoreInput: form['live-tool-score-input']?.checked || false,
            roundCounter: form['live-tool-round-counter']?.checked || false,
            golfPutts: form['live-tool-golf-putts']?.checked || false,
            golfDrive: form['live-tool-golf-drive']?.checked || false,
            // Round Config - only include if roundCounter is checked
            roundName: null,
            roundFormat: null,
            fixedRounds: null,
            bestOfTarget: null,
        };

        if (liveTools.roundCounter) {
            liveTools.roundName = form['live-tool-round-name']?.value.trim() || 'Round';
            liveTools.roundFormat = form['live-tool-round-format']?.value || 'counter';
            const fixedRoundsVal = form['live-tool-fixed-rounds']?.value;
            const bestOfTargetVal = form['live-tool-bestof-target']?.value;

            if (liveTools.roundFormat === 'fixed' && fixedRoundsVal) {
                liveTools.fixedRounds = parseInt(fixedRoundsVal, 10);
                if (isNaN(liveTools.fixedRounds) || liveTools.fixedRounds < 1) {
                    throw new Error("Fixed number of rounds must be a positive number.");
                }
            } else {
                liveTools.fixedRounds = null; // Ensure it's null if not applicable
            }

            if (liveTools.roundFormat === 'best_of' && bestOfTargetVal) {
                liveTools.bestOfTarget = parseInt(bestOfTargetVal, 10);
                if (isNaN(liveTools.bestOfTarget) || liveTools.bestOfTarget < 1) {
                    throw new Error("Best Of target wins must be a positive number.");
                }
            } else {
                liveTools.bestOfTarget = null; // Ensure it's null if not applicable
            }
            // If format is counter, ensure others are null
            if (liveTools.roundFormat === 'counter') {
                liveTools.fixedRounds = null;
                liveTools.bestOfTarget = null;
            }

        } else {
            // Ensure all round config is null if roundCounter is false
            liveTools.roundName = null;
            liveTools.roundFormat = null;
            liveTools.fixedRounds = null;
            liveTools.bestOfTarget = null;
        }

        if (!sportName) {
            throw new Error("Sport name is required.");
        }

        const sportKey = isEditing ? editingSportKey : sportName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!sportKey) {
            throw new Error("Could not determine a valid key for the sport.");
        }

        // Prepare data object
        const sportData = {
            name: sportName,
            description: description || null,
            rankingSystem: rankingSystem,
            iconUrl: iconUrl || null,
            allow_single_player: allowSinglePlayer,
            live_tools: liveTools, // Updated live_tools object
            supports: {
                '1v1': rankingSystem === 'elo',
                'solo': allowSinglePlayer,
                'teams': false
            },
            last_updated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Use the correct collection: 'game_types'
        const collectionRef = db.collection('game_types');
        const docRef = collectionRef.doc(sportKey);

        if (isEditing) {
            // --- Update Existing Sport ---
            console.log(`[Add Sport/Saving] Updating sport with key: ${sportKey}`, sportData);
            await docRef.update(sportData);
            console.log(`[Add Sport/Saving] Sport "${sportName}" updated successfully.`);
            if (successElement) successElement.textContent = `Sport "${sportName}" updated successfully!`;

        } else {
            // --- Add New Sport ---
            console.log(`[Add Sport/Adding] Adding sport with key: ${sportKey}`, sportData);
            sportData.date_created = firebase.firestore.FieldValue.serverTimestamp();
            const existingSport = await docRef.get();
            if (existingSport.exists) {
                throw new Error(`A sport with the key "${sportKey}" (derived from "${sportName}") already exists.`);
            }
            await docRef.set(sportData);
            console.log(`[Add Sport/Adding] Sport "${sportName}" added successfully.`);
            if (successElement) successElement.textContent = `Sport "${sportName}" added successfully!`;
        }

        // Invalidate and refresh config cache
        globalGameConfigs = null;
        await fetchAndCacheGameConfigs();

        // Refresh UI elements
        console.log(`[Add Sport/${actionVerb}] Refreshing game type dropdowns and filters...`);
        await refreshGameTypeDropdowns();

        // Navigate after success
        if (typeof showSection === 'function') {
            if (isEditing) {
                console.log(`[Add Sport/${actionVerb}] Navigating back to sport-details-section for ${sportKey}.`);
                showSection('sport-details-section', true, { sport: sportKey });
            } else {
                console.log(`[Add Sport/${actionVerb}] Navigating back to sports-section.`);
                showSection('sports-section');
            }
        } else {
            console.warn(`[Add Sport/${actionVerb}] showSection function not found, cannot navigate back automatically.`);
            form.reset(); // Reset form if staying on page
        }

    } catch (error) {
        console.error(`[Add Sport/${actionVerb}] Error ${actionVerb.toLowerCase()} sport:`, error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
        submitButton.disabled = false;
        submitButton.textContent = isEditing ? 'Save Changes' : 'Add Sport';
    }
}

/**
 * Handles the click event for the Delete Sport button.
 */
async function handleDeleteSport(event) {
    event.preventDefault(); // Prevent any default button behavior
    console.log("[Delete Sport] Delete button clicked.");

    const form = document.getElementById('add-sport-form');
    const sportKey = form.dataset.editingSportKey;
    const deleteButton = document.getElementById('delete-sport-btn');
    const submitButton = document.getElementById('add-sport-submit-btn');
    const errorElement = document.getElementById('add-sport-error');
    const successElement = document.getElementById('add-sport-success');

    if (!sportKey) {
        console.error("[Delete Sport] Sport key not found in form data.");
        if (errorElement) errorElement.textContent = "Error: Cannot identify sport to delete.";
        return;
    }

    const sportName = form.name.value || sportKey; // Get name for confirmation message

    if (!confirm(`Are you sure you want to permanently delete the sport "${sportName}"? This action cannot be undone.`)) {
        console.log("[Delete Sport] Deletion cancelled by user.");
        return;
    }

    console.log(`[Delete Sport] Attempting to delete sport: ${sportKey}`);
    deleteButton.disabled = true;
    submitButton.disabled = true;
    deleteButton.textContent = 'Deleting...';
    errorElement.textContent = '';
    successElement.textContent = '';

    try {
        const docRef = db.collection('game_types').doc(sportKey);

        // Check if sport exists before deleting (optional but good practice)
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            throw new Error(`Sport "${sportName}" (${sportKey}) not found in database.`);
        }

        await docRef.delete();
        console.log(`[FIRESTORE] Sport "${sportName}" (${sportKey}) deleted successfully.`);
        successElement.textContent = `Sport "${sportName}" deleted successfully!`;

        // Invalidate cache and refresh config
        window.globalGameConfigs = null; // Clear cache
        await fetchAndCacheGameConfigs(); // Reload config

        // Refresh UI elements that use game types
        console.log("[Delete Sport] Refreshing game type dropdowns and filters...");
        await refreshGameTypeDropdowns(); // Make sure this function exists and updates all relevant dropdowns

        // Navigate back to the sports list after a short delay
        setTimeout(() => {
            console.log("[Delete Sport] Navigating back to sports-section.");
            showSection('sports-section');
        }, 1500); // Delay to allow user to see success message

    } catch (error) {
        console.error(`[Delete Sport] Error deleting sport ${sportKey}:`, error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
        // Re-enable buttons on error
        deleteButton.disabled = false;
        submitButton.disabled = false;
        deleteButton.textContent = 'Delete Sport';
    }
    // No finally block needed as navigation happens on success
}

/**
 * Helper function to refresh known game type dropdowns across the application.
 */
async function refreshGameTypeDropdowns() {
    console.log("[Add Sport/Refresh] Refreshing known game type dropdowns...");
    try {
        // Submit Score Section
        const submitGameSelect = document.getElementById('submit-game-type-select');
        if (submitGameSelect && typeof populateGameTypeSelect === 'function') {
            console.log("[Add Sport/Refresh] Refreshing submit score game type select.");
            await populateGameTypeSelect(submitGameSelect, 'Select Game Type...');
        }

        // Live Game Section
        const liveGameSelect = document.getElementById('live-game-type-select');
        if (liveGameSelect && typeof populateGameTypeSelect === 'function') {
            console.log("[Add Sport/Refresh] Refreshing live game type select.");
            await populateGameTypeSelect(liveGameSelect, 'Select Game Type...');
        }

        // Results Filter
        const resultsFilterSelect = document.getElementById('results-game-filter');
        if (resultsFilterSelect && typeof populateResultsFilter === 'function') {
            console.log("[Add Sport/Refresh] Refreshing results filter select.");
            await populateResultsFilter();
        }

        // Rankings Filter
        const rankingsFilterSelect = document.getElementById('rankings-game-filter');
        if (rankingsFilterSelect && typeof populateRankingsFilter === 'function') {
            console.log("[Add Sport/Refresh] Refreshing rankings filter select.");
            await populateRankingsFilter(rankingsFilterSelect);
        }

        // Create Tournament Modal (if applicable and uses a standard function)
        const tournamentGameSelect = document.getElementById('create-tournament-game-type');
        if (tournamentGameSelect && typeof populateGameTypeSelect === 'function') {
            console.log("[Add Sport/Refresh] Refreshing tournament create game type select.");
            await populateGameTypeSelect(tournamentGameSelect, 'Select Game...');
        }

        console.log("[Add Sport/Refresh] Finished refreshing dropdowns.");
    } catch (error) {
        console.error("[Add Sport/Refresh] Error refreshing game type dropdowns:", error);
    }
}

console.log("[Add Sport] add_sport.js loaded.");
