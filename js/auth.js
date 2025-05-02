console.log("[Auth] auth.js starting execution."); // <-- KEEP THIS LINE

// --- auth.js ---
// Global variable to hold current player profile data
let currentPlayer = null; // Holds the fetched player profile for the logged-in user
let unsubscribePlayerListener = null; // To detach listener on logout

/**
 * Fetches the player profile based on Firebase UID.
 * @param {string} uid - Firebase User ID.
 * @returns {Promise<Object|null>} Player profile object or null if not found/error.
 */
async function findPlayerProfileByUid(uid) {
    // ...existing code...
}

/**
 * Handles authentication state changes (login/logout).
 * Uses player data fetched by the listener and updates UI.
 * This is the primary function called by the onAuthStateChanged listener.
 * @param {firebase.User|null} user - The Firebase user object or null.
 * @param {object|null} playerProfile - The player profile object fetched by the listener, or null.
 */
async function handleAuthChange(user, playerProfile) {
    console.log(`[Auth] handleAuthChange called. User: ${user?.uid || 'null'}, Player: ${playerProfile?.id || 'null'}`);
    const bodyElement = document.body;

    // Clear previous state classes
    bodyElement.classList.remove('auth-authenticated', 'auth-anonymous', 'player-logged-in', 'admin-logged-in');

    if (user) {
        // User is logged IN
        bodyElement.classList.add('auth-authenticated'); // General authenticated class

        if (playerProfile) {
            console.log(`[Auth] Using player data:`, playerProfile);
            currentPlayer = playerProfile; // Update global currentPlayer
            bodyElement.classList.add('player-logged-in'); // Specific player class
            if (playerProfile.isAdmin) {
                bodyElement.classList.add('admin-logged-in');
                console.log("[Auth] Admin privileges detected.");
            }
            console.log(`[Auth] User is logged IN. Name: ${currentPlayer.name}, isAdmin: ${!!currentPlayer.isAdmin}`);
        } else {
            console.warn("[Auth] User is logged in, but player profile data is not (yet) available.");
            currentPlayer = null; // Ensure currentPlayer is null if profile is missing
        }

        // Update UI with user and potentially player data
        if (typeof updateUIForAuthState === 'function') {
            updateUIForAuthState(user, currentPlayer);
        } else {
            console.error("[Auth] updateUIForAuthState function not found!");
        }

        // Detach any existing player listener before attaching a new one
        if (unsubscribePlayerListener) {
            console.log("[Auth] Detaching previous player listener.");
            unsubscribePlayerListener();
            unsubscribePlayerListener = null;
        }

        // Listen for real-time updates to the logged-in player's profile
        if (db && playerProfile?.id) { // Only listen if we have a valid player ID
            console.log(`[Auth] Attaching real-time listener for player ID: ${playerProfile.id}`);
            const playerDocRef = db.collection('players').doc(playerProfile.id);
            unsubscribePlayerListener = playerDocRef.onSnapshot((docSnapshot) => {
                if (docSnapshot.exists) {
                    const updatedPlayerProfile = { id: docSnapshot.id, ...docSnapshot.data() };
                    console.log("[Auth] Player listener received update:", updatedPlayerProfile);
                    if (auth.currentUser) { // Ensure user is still logged in
                        currentPlayer = updatedPlayerProfile; // Update global state
                        // Re-update UI elements that depend on player data
                        if (typeof updateUIForAuthState === 'function') {
                            updateUIForAuthState(auth.currentUser, currentPlayer);
                        }
                    }
                } else {
                    console.warn(`[Auth] Player listener: Player document ${playerProfile.id} does not exist.`);
                    // Maybe force logout or show error?
                    currentPlayer = null;
                    if (auth.currentUser && typeof updateUIForAuthState === 'function') {
                        updateUIForAuthState(auth.currentUser, null);
                    }
                }
            }, (error) => {
                console.error("[Auth] Error in player listener:", error);
            });
        }

    } else {
        // User is logged OUT
        bodyElement.classList.add('auth-anonymous');
        console.log("[Auth] User is logged OUT.");
        currentPlayer = null; // Clear global currentPlayer

        // Detach player listener on logout
        if (unsubscribePlayerListener) {
            console.log("[Auth] Detaching player listener on logout.");
            unsubscribePlayerListener();
            unsubscribePlayerListener = null;
        }

        // Update UI for logged out state
        if (typeof updateUIForAuthState === 'function') {
            updateUIForAuthState(null, null);
        } else {
            console.error("[Auth] updateUIForAuthState function not found!");
        }
    }

    console.log(`[Auth] handleAuthChange finished. Body classes: ${bodyElement.className}`);
}

/**
 * Sets up the Firebase Auth state listener.
 * Fetches the corresponding player profile and calls the onChange callback.
 * @param {object} authInstance - The Firebase Auth instance.
 * @param {function} onChange - Callback function (like handleAuthChange) that accepts (user, playerProfile).
 */
function setupAuthStateListener(authInstance, onChange) {
    if (!authInstance || typeof authInstance.onAuthStateChanged !== 'function') {
        console.error('[Auth] Invalid auth instance passed to setupAuthStateListener.');
        return;
    }
    
    authInstance.onAuthStateChanged(async (user) => {
        console.log("[Auth] onAuthStateChanged triggered. User:", user ? user.email : "null");
        let playerProfile = null;
        
        if (user && user.email) {
            // User is signed in, try to find their profile in the cache.
            // Ensure player cache is populated first.
            if (typeof fetchAllPlayersForCache === 'function' && (typeof playersCachePopulated === 'undefined' || !playersCachePopulated)) {
                console.log("[Auth] Player cache not populated, fetching before finding profile...");
                await fetchAllPlayersForCache();
            }
            
            if (typeof globalPlayerCache !== 'undefined' && Object.keys(globalPlayerCache).length > 0) {
                // Find player with matching email (case-insensitive)
                playerProfile = Object.values(globalPlayerCache).find(
                    player => player.email && player.email.toLowerCase() === user.email.toLowerCase()
                );
                if (playerProfile) {
                    console.log(`[Auth] Found player profile for ${user.email}: ${playerProfile.name}`);
                } else {
                    console.warn(`[Auth] No player profile found in cache for email: ${user.email}`);
                    // Optionally handle cases where a Firebase user exists but no player profile
                    // Could attempt a direct Firestore lookup here as a fallback if needed.
                }
            } else {
                console.warn("[Auth] Global player cache is not available or empty. Cannot link user to profile.");
            }
        } else {
            // User is signed out.
            console.log("[Auth] User is signed out.");
        }
        
        // Call the provided callback function with the user and the found profile (or nulls)
        if (typeof onChange === 'function') {
            // *** Pass BOTH user and playerProfile to the callback ***
            onChange(user, playerProfile);
        } else {
            console.error("[Auth] No valid onChange callback provided to setupAuthStateListener.");
        }
    });
    console.log("[Auth] Firebase onAuthStateChanged listener attached.");
}

/**
 * Gets the current logged-in user's ID (Firebase UID).
 * @returns {string|null} The user's ID or null if not logged in.
 */
function getCurrentUserId() {
    return auth?.currentUser?.uid || null;
}

/**
 * Gets the current logged-in player's profile object.
 * @returns {object|null} The player profile object or null.
 */
function getCurrentPlayerProfile() {
    return currentPlayer;
}

/**
 * Signs the current user out.
 */
async function signOutUser() {
    try {
        if (!auth) {
            console.error("[Auth] Auth service not available for sign out.");
            return;
        }
        await auth.signOut();
        console.log("[Auth] User signed out successfully.");
        // UI updates and navigation should be handled by the onAuthStateChanged listener triggering handleAuthChange
        // Redirect to login page after sign out
        if (typeof showSection === 'function') {
            showSection('player-login-section');
        } else {
            window.location.hash = '#player-login-section';
        }
    } catch (error) {
        console.error("[Auth] Error signing out:", error);
        alert(`Error signing out: ${error.message}`);
    }
}