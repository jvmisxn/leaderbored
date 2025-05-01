// --- sports_list.js ---

/**
 * Populates the list/grid of available sports in the sports section.
 */
async function populateAllSportsList() {
    console.log("[Sports List] Populating sports list...");
    // Target the correct ID within the sports section template
    const listElement = document.getElementById('all-sports-list');
    const addSportBtn = document.getElementById('add-sport-btn'); // Get button

    if (!listElement) {
        console.error("[Sports List] Sports list container element (#all-sports-list) not found.");
        return;
    }
    // Attach listener to Add Sport button to navigate to the new section
    if (addSportBtn && !addSportBtn.dataset.listenerAttached) {
        addSportBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default if it's somehow a link
            console.log("[Sports List] Add Sport button clicked, navigating to add-sport-section.");
            if (typeof showSection === 'function') {
                showSection('add-sport-section', true); // Force load the section
            } else {
                console.error("[Sports List] showSection function not found for navigation.");
                window.location.hash = '#add-sport-section'; // Fallback
            }
        });
        addSportBtn.dataset.listenerAttached = 'true';
        console.log("[Sports List] Attached navigation listener to Add Sport button.");
    } else if (addSportBtn) {
        console.log("[Sports List] Add Sport button listener already attached.");
    } else {
        console.warn("[Sports List] Add Sport button (#add-sport-btn) not found in DOM.");
    }


    listElement.innerHTML = '<p class="loading-text text-center py-5 text-gray-600 col-span-full">Loading sports list...</p>';

    // Ensure gameTypesConfig is available (assuming it's loaded globally or fetched elsewhere)
    if (typeof globalGameConfigs !== 'object' || globalGameConfigs === null) {
        console.warn("[Sports List] globalGameConfigs not yet available, attempting to fetch...");
        if (typeof fetchAndCacheGameConfigs === 'function') {
            try {
                await fetchAndCacheGameConfigs();
                if (typeof globalGameConfigs !== 'object' || globalGameConfigs === null) {
                     throw new Error("Configs still not available after fetch.");
                }
                console.log("[Sports List] globalGameConfigs fetched successfully.");
            } catch (error) {
                console.error("[Sports List] Error fetching game configs:", error);
                listElement.innerHTML = '<p class="error-text text-center py-5 col-span-full">Error loading sports configuration.</p>';
                // Still show add button for admins
                if (typeof handleAuthChange === 'function' && typeof auth !== 'undefined') handleAuthChange(auth.currentUser);
                return;
            }
        } else {
             console.error("[Sports List] fetchAndCacheGameConfigs function not found.");
             listElement.innerHTML = '<p class="error-text text-center py-5 col-span-full">Error loading sports configuration function.</p>';
             // Still show add button for admins
             if (typeof handleAuthChange === 'function' && typeof auth !== 'undefined') handleAuthChange(auth.currentUser);
             return;
        }
    }


    // Sort games alphabetically by name using globalGameConfigs
    const sortedGames = Object.entries(globalGameConfigs).sort(([, configA], [, configB]) => (configA.name || '').localeCompare(configB.name || ''));

    if (sortedGames.length === 0) {
         listElement.innerHTML = '<p class="muted-text text-center py-5 col-span-full">No sports or activities configured.</p>';
         // Still show add button for admins
         if (typeof handleAuthChange === 'function' && typeof auth !== 'undefined') handleAuthChange(auth.currentUser);
         return;
    }

    listElement.innerHTML = ''; // Clear loading message

    sortedGames.forEach(([key, config]) => {
        const sportDiv = document.createElement('div');
        // Link to the new sport details section
        sportDiv.className = 'card bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow hover:shadow-lg transition-shadow duration-300 flex flex-col justify-center items-center'; // Use card style
        sportDiv.innerHTML = `
            <a href="#sport-details-section?sport=${key}" class="nav-link font-semibold text-lg text-indigo-700 dark:text-indigo-400 hover:underline stretched-link" data-target="sport-details-section" data-sport-key="${key}">
                ${config.name || key}
            </a>
        `; // Added data-sport-key for easier listener attachment

        // Add listener to handle navigation via showSection
        const link = sportDiv.querySelector('a.nav-link');
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sportKey = e.currentTarget.getAttribute('data-sport-key');
                if (sportKey && typeof showSection === 'function') {
                    console.log(`[Sports List] Navigating to details for sport: ${sportKey}`);
                    showSection('sport-details-section', true, { sport: sportKey });
                } else {
                    console.error("[Sports List] showSection function not found or sport key missing for navigation.");
                    // Fallback to direct hash change if showSection is missing
                    if (sportKey) window.location.hash = `#sport-details-section?sport=${sportKey}`;
                }
            });
        }
        listElement.appendChild(sportDiv);
    });

    console.log(`[Sports List] Populated ${sortedGames.length} activities.`);

    // Ensure admin-only buttons are correctly shown/hidden based on current auth state
    // This needs to run regardless of config state
    if (typeof handleAuthChange === 'function' && typeof auth !== 'undefined') {
        handleAuthChange(auth.currentUser);
    }
}

console.log("[Sports List] sports_list.js loaded.");
