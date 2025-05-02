// --- sports.js ---

// NOTE: populateAllSportsList moved to sports_list.js
// NOTE: Add Sport form logic moved to add_sport.js

/* --- COMMENTED OUT - Logic moved to add_sport.js ---
/**
 * Sets up the Add Sport form, attaching the submit listener.
 * /
function setupAddSportForm() {
    console.log("[Sports] setupAddSportForm called. (DEPRECATED - Should use add_sport.js)");
    const form = document.getElementById('add-sport-form');
    const errorElement = form?.querySelector('#add-sport-error');

    if (!form) {
        console.error("[Sports] Add Sport form (#add-sport-form) not found in the DOM during setup. (DEPRECATED)");
        return;
    } else {
        console.log("[Sports] Found Add Sport form element:", form, "(DEPRECATED)");
    }

    if (errorElement) errorElement.textContent = '';

    if (!form.dataset.listenerAttached) {
        console.log("[Sports] Attaching submit listener to Add Sport form... (DEPRECATED)");
        form.addEventListener('submit', handleAddSportSubmit);
        form.dataset.listenerAttached = 'true';
        console.log("[Sports] Submit listener attached successfully to Add Sport form. (DEPRECATED)");
    } else {
        console.log("[Sports] Submit listener ALREADY attached to Add Sport form. (DEPRECATED)");
    }
}

/**
 * Handles the submission of the Add Sport form.
 * /
async function handleAddSportSubmit(event) {
    event.preventDefault();
    console.error("[Sports] handleAddSportSubmit triggered. (DEPRECATED - Should use add_sport.js)");
    // ... (rest of the old function code) ...
    // This function should no longer be executed.
    const errorElement = event.target.querySelector('#add-sport-error');
    if(errorElement) errorElement.textContent = "Error: Obsolete function called. Please refresh.";
}
*/ // --- END COMMENTED OUT ---


// Note: This file assumes 'globalGameConfigs', 'showSection', 'fetchAndCacheGameConfigs', 'handleAuthChange', 'auth', 'db', 'firebase' are globally available.
// populateAllSportsList is now in sports_list.js
// populateSportDetails is now in sport_details.js
console.log("[Sports] sports.js loaded (DEPRECATED - Add Sport logic moved to add_sport.js).");
