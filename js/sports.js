// --- sports.js ---

// NOTE: populateAllSportsList moved to sports_list.js

/**
 * Sets up the event listener for the Add Sport form.
 */
function setupAddSportForm() {
    const form = document.getElementById('add-sport-form');
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', handleAddSportSubmit);
        form.dataset.listenerAttached = 'true';
        console.log("[Sports] Add Sport form listener attached.");
    } else if (form) {
        console.log("[Sports] Add Sport form listener already attached.");
    } else {
        console.error("[Sports] Add Sport form (#add-sport-form) not found.");
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
    const typeErrorElement = form.querySelector('#type-error');

    if (!db || !firebase || !firebase.firestore) {
        console.error("[Add Sport] DB not ready.");
        if (errorElement) errorElement.textContent = "Database connection error.";
        return;
    }

    // Clear previous errors
    if (errorElement) errorElement.textContent = '';
    if (formatErrorElement) formatErrorElement.textContent = '';
    if (typeErrorElement) typeErrorElement.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    try {
        const formData = new FormData(form);
        const sportName = formData.get('sport-name')?.trim();
        const activityType = formData.get('activity-type'); // radio button value
        const rankingSystem = formData.get('sport-ranking-system');
        const scoreUnit = formData.get('sport-score-unit')?.trim() || null;

        // Characteristics (Booleans)
        const isPhysical = formData.get('sport-is-physical') === 'on';
        const isOutdoor = formData.get('sport-is-outdoor') === 'on';
        const requiresVenue = formData.get('sport-is-venue') === 'on';
        const isTurnBased = formData.get('sport-is-turnbased') === 'on';

        // Supported Formats (Booleans)
        const supports1v1 = formData.get('sport-supports-1v1') === 'on';
        const supportsTeams = formData.get('sport-supports-teams') === 'on';
        const supportsSolo = formData.get('sport-supports-solo') === 'on';

        // --- Validation ---
        let isValid = true;
        if (!sportName) {
            isValid = false;
            if (errorElement) errorElement.textContent = "Sport/Activity Name is required.";
            form.querySelector('#sport-name')?.classList.add('border-red-500');
        } else {
            form.querySelector('#sport-name')?.classList.remove('border-red-500');
        }

        if (!activityType) {
            isValid = false;
            if (typeErrorElement) typeErrorElement.textContent = "Please select an activity type.";
        }

        if (!supports1v1 && !supportsTeams && !supportsSolo) {
            isValid = false;
            if (formatErrorElement) formatErrorElement.textContent = "Select at least one supported format.";
        }

        if (!isValid) {
            submitButton.disabled = false;
            submitButton.textContent = 'Add Sport';
            return;
        }
        // --- End Validation ---

        // Generate a Firestore-friendly key (lowercase, underscores)
        const sportKey = sportName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        // Check if key already exists (optional but recommended)
        const existingDoc = await db.collection('game_types').doc(sportKey).get();
        if (existingDoc.exists) {
            throw new Error(`A sport with the key "${sportKey}" (derived from "${sportName}") already exists.`);
        }

        const sportData = {
            name: sportName,
            key: sportKey, // Store the generated key
            activityType: activityType,
            rankingSystem: rankingSystem,
            scoreUnit: scoreUnit,
            characteristics: {
                isPhysical: isPhysical,
                isOutdoor: isOutdoor,
                requiresVenue: requiresVenue,
                isTurnBased: isTurnBased,
            },
            supports: {
                '1v1': supports1v1,
                teams: supportsTeams,
                solo: supportsSolo,
            },
            // Add default icon or other fields if needed
            date_added: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log(`[Add Sport] Attempting to add sport with key "${sportKey}":`, sportData);

        // Add the new sport document using the generated key as the ID
        await db.collection('game_types').doc(sportKey).set(sportData);

        console.log(`[Add Sport] Sport "${sportName}" added successfully with key "${sportKey}".`);
        alert(`Sport "${sportName}" added successfully!`);

        // Invalidate config cache and refresh
        globalGameConfigs = null; // Invalidate cache
        await fetchAndCacheGameConfigs(); // Re-fetch configs

        // Navigate back to the sports list
        showSection('sports-section', true); // Force reload to show the new sport

    } catch (error) {
        console.error("[Add Sport] Error adding sport:", error);
        if (errorElement) errorElement.textContent = `Error: ${error.message}`;
        alert(`Failed to add sport: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Add Sport';
    }
}

// Note: This file assumes 'globalGameConfigs', 'showSection', 'fetchAndCacheGameConfigs', 'handleAuthChange', 'auth', 'db', 'firebase' are globally available.
// populateAllSportsList is now in sports_list.js
// populateSportDetails is now in sport_details.js
console.log("[Sports] sports.js loaded (contains Add Sport form logic).");
