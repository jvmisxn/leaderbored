// --- game_config.js ---

// Default Elo rating for new players or unrated games
const DEFAULT_ELO = 1000;

// K-Factor for Elo calculation (adjust based on desired volatility)
const K_FACTOR = 32;

// Global cache for game configurations fetched from Firestore
// Note: Using global variables and window attachment for cross-script access in a non-module setup.
let globalGameConfigs = null;
let isFetchingConfigs = false;
let configFetchPromise = null;

// Keys used for Elo ratings - will be populated after fetching configs
let ELO_GAME_KEYS = [];

/**
 * Fetches game configurations from Firestore and caches them globally.
 * Returns a promise that resolves with the configs or rejects on error.
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
            // Ensure the promise is rejected
            return reject(new Error("Firestore DB not available for fetching game configs."));
        }
        try {
            const snapshot = await db.collection('game_types').get();
            const configs = {};
            snapshot.forEach(doc => {
                // Use the explicit 'key' field if it exists, otherwise use doc.id
                const key = doc.data().key || doc.id;
                // Ensure key is part of the object, useful for iteration/lookup
                configs[key] = { id: doc.id, ...doc.data(), key: key };
            });

            if (Object.keys(configs).length === 0) {
                console.warn("[Config] No game types found in Firestore 'game_types' collection.");
            } else {
                console.log(`[Config] Fetched ${Object.keys(configs).length} game configurations.`);
            }

            globalGameConfigs = configs; // Cache the fetched data

            // Re-calculate ELO_GAME_KEYS based on fetched data
            // Filters for games using 'elo' and supporting '1v1' format
            ELO_GAME_KEYS = Object.entries(globalGameConfigs)
                .filter(([key, config]) => config.rankingSystem === 'elo' && config.supports?.['1v1']) // Safe access with optional chaining
                .map(([key]) => key);

            console.log("[Config] ELO_GAME_KEYS derived from fetched config:", ELO_GAME_KEYS);

            // --- Make Configs Globally Accessible ---
            // This allows other scripts loaded via <script> tags to access the data.
            window.globalGameConfigs = globalGameConfigs;
            window.ELO_GAME_KEYS = ELO_GAME_KEYS; // Make derived keys global too

            isFetchingConfigs = false;
            resolve(globalGameConfigs); // Resolve the promise with the configs
        } catch (error) {
            console.error("[Config] Error fetching game configurations:", error);
            // Reset state on error
            globalGameConfigs = null; // Clear potentially partial cache
            ELO_GAME_KEYS = [];
            window.globalGameConfigs = null; // Clear global reference
            window.ELO_GAME_KEYS = [];
            isFetchingConfigs = false;
            reject(error); // Reject the promise with the error
        }
    });

    return configFetchPromise; // Return the promise itself
}

/* Example Game Config Structure in Firestore (game_types collection):
{
    "pool_8ball": {
        "name": "8-Ball Pool",
        "description": "Standard 8-ball pool game.",
        "iconUrl": "img/icons/pool.png",
        "rankingSystem": "elo", // 'elo', 'trueskill', 'manual', etc.
        "allow_single_player": false,
        "supports": { // Indicates supported player/team structures
            "1v1": true,
            "solo": false,
            "teams": false // e.g., 2v2
        },
        "live_tools": { // Configuration for live game features
            "timer": true,         // Show a match timer?
            "scoreInput": true,    // Allow entering scores during live game?
            "roundCounter": true,  // Enable round/frame/hole tracking?
            "roundName": "Rack",   // Custom name for 'round' (default: "Round")
            "roundFormat": "best_of", // 'counter', 'fixed', 'best_of' (default: 'counter')
            "fixedRounds": null,   // e.g., 9 or 18 for golf (if format is 'fixed')
            "bestOfTarget": 3,     // Wins needed, e.g., 3 for Best of 5 (if format is 'best_of')
            // Game-specific tools
            "golfPutts": false,    // Track putts in golf?
            "golfDrive": false     // Track drive distance in golf?
        },
        "date_created": Timestamp,
        "last_updated": Timestamp
    },
    "golf": {
        "name": "Golf",
        "description": "Stroke play golf.",
        "iconUrl": "img/icons/golf.png",
        "rankingSystem": "handicap", // Or 'elo' if preferred
        "allow_single_player": true,
        "supports": {
            "1v1": true,
            "solo": true,
            "teams": false // Could add scramble later
        },
        "live_tools": {
            "timer": true,
            "scoreInput": true, // For hole scores
            "roundCounter": true, // Represents holes
            "roundName": "Hole",
            "roundFormat": "fixed", // Golf is typically fixed holes
            "fixedRounds": 18, // Default to 18, can be overridden by user selection?
            "bestOfTarget": null,
            "golfPutts": true,
            "golfDrive": true
        },
        // ...
    }
    // ... other game types
}
*/

console.log("[Config] game_config.js loaded. fetchAndCacheGameConfigs defined.");

// No explicit exports needed if relying on window attachment.