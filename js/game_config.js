// --- game_config.js ---

// Default Elo rating for new players or unrated games
const DEFAULT_ELO = 1000;

// K-Factor for Elo calculation (adjust based on desired volatility)
const K_FACTOR = 32;

// Global cache for game configurations fetched from Firestore
let globalGameConfigs = null;
let isFetchingConfigs = false;
let configFetchPromise = null;

// Keys used for Elo ratings - will be populated after fetching configs
let ELO_GAME_KEYS = [];

/**
 * Fetches game configurations from Firestore and caches them globally.
 * Returns a promise that resolves when configs are ready.
 */
async function fetchAndCacheGameConfigs() {
    if (globalGameConfigs) {
        console.log("[Config] Using cached game configs.");
        return globalGameConfigs;
    }
    if (isFetchingConfigs && configFetchPromise) {
        console.log("[Config] Waiting for existing fetch to complete...");
        return configFetchPromise;
    }

    console.log("[Config] Fetching game configurations from Firestore...");
    isFetchingConfigs = true;

    configFetchPromise = new Promise(async (resolve, reject) => {
        if (!db) {
            console.error("[Config] Firestore DB instance not available.");
            isFetchingConfigs = false;
            return reject(new Error("Firestore DB not available for fetching game configs."));
        }
        try {
            const snapshot = await db.collection('game_types').get();
            const configs = {};
            snapshot.forEach(doc => {
                // Use the explicit 'key' field if it exists, otherwise use doc.id
                const key = doc.data().key || doc.id;
                configs[key] = { id: doc.id, ...doc.data(), key: key }; // Ensure key is part of the object
            });

            if (Object.keys(configs).length === 0) {
                console.warn("[Config] No game types found in Firestore 'game_types' collection.");
            } else {
                console.log(`[Config] Fetched ${Object.keys(configs).length} game configurations.`);
            }

            globalGameConfigs = configs; // Cache the fetched data

            // Re-calculate ELO_GAME_KEYS based on fetched data and potentially updated structure
            ELO_GAME_KEYS = Object.entries(globalGameConfigs)
                .filter(([key, config]) => config.rankingSystem === 'elo' && config.supports?.['1v1']) // Check nested supports object
                .map(([key]) => key);

            console.log("[Config] ELO_GAME_KEYS derived from fetched config:", ELO_GAME_KEYS);

            // --- Make Configs Globally Accessible (Optional but can be helpful) ---
            window.globalGameConfigs = globalGameConfigs;
            window.ELO_GAME_KEYS = ELO_GAME_KEYS; // Make derived keys global too

            isFetchingConfigs = false;
            resolve(globalGameConfigs);
        } catch (error) {
            console.error("[Config] Error fetching game configurations:", error);
            globalGameConfigs = {}; // Set to empty object on error to prevent retries?
            ELO_GAME_KEYS = [];
            isFetchingConfigs = false;
            reject(error);
        }
    });

    return configFetchPromise;
}


console.log("[Config] game_config.js loaded. fetchAndCacheGameConfigs defined.");

// Expose necessary constants/functions if needed (or rely on window attachment)
// export { DEFAULT_ELO, K_FACTOR, fetchAndCacheGameConfigs, ELO_GAME_KEYS }; // If using modules