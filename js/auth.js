// --- auth.js ---
// Ensure functions are defined in the global scope

// Global variable to hold current player profile data
let currentPlayer = null;

/**
 * Sets up the listener for Firebase authentication state changes.
 * @param {firebase.auth.Auth} authInstance - The Firebase Auth instance.
 * @param {function} onLogin - Callback function when user logs in. Receives (user, playerProfile).
 * @param {function} onLogout - Callback function when user logs out.
 */
function setupAuthStateListener(authInstance, onLogin, onLogout) {
    console.log("[Auth] Setting up auth state listener...");
    if (!authInstance) {
        console.error("[Auth] Firebase Auth instance not provided to setupAuthStateListener.");
        return;
    }
    try {
        authInstance.onAuthStateChanged(async (user) => {
            // ... (rest of the function logic as provided previously) ...
            if (user) {
                console.log("[Auth] User signed in:", user.uid);
                // ... fetch profile ...
                if (typeof onLogin === 'function') onLogin(user, currentPlayer);
            } else {
                console.log("[Auth] User signed out.");
                // ... clear profile ...
                if (typeof onLogout === 'function') onLogout();
            }
        });
        console.log("[Auth] Auth state listener attached successfully."); // Success log
    } catch (error) {
        console.error("[Auth] Error attaching auth state listener:", error);
    }
}

/**
 * Updates the profile picture and dropdown based on the logged-in player.
 * @param {object | null} playerProfile - The player profile object or null if logged out.
 */
function updateProfileUI(playerProfile) {
    // ... (rest of the function logic as provided previously) ...
    console.log("[Auth UI] Profile UI updated for logged-in state:", !!playerProfile);
}


// --- Login/Logout Functions ---
async function loginUser(email, password) { /* ... */ }
async function logoutUser() { /* ... */ }
async function signupUser(email, password, playerName) { /* ... */ }

// --- Helpers ---
function getCurrentUserId() { return currentPlayer ? currentPlayer.id : null; }
function isCurrentUserAdmin() { return currentPlayer ? currentPlayer.isAdmin === true : false; }

// --- Form Setup/Handlers ---
function setupLoginForm() { /* ... */ }
function handleLoginSubmit(event) { /* ... */ }
function handleSignupSubmit(event) { /* ... */ }


console.log("[Auth] auth.js loaded. Functions (setupAuthStateListener, updateProfileUI, loginUser, logoutUser, etc.) defined globally.");