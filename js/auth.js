// --- auth.js ---
// Ensure functions are defined in the global scope

// Global variable to hold current player profile data
let currentPlayer = null;
let isFetchingProfile = false; // Flag to prevent concurrent fetches

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
            if (user) {
                // Prevent fetching profile if already in progress
                if (isFetchingProfile) {
                    console.log("[Auth] Profile fetch already in progress for user:", user.uid);
                    return;
                }
                isFetchingProfile = true;
                console.log("[Auth] User signed in:", user.uid);
                try {
                    // Fetch player profile from Firestore using UID
                    const playerDocRef = db.collection('players').doc(user.uid);
                    const playerDoc = await playerDocRef.get();

                    if (playerDoc.exists) {
                        currentPlayer = { id: playerDoc.id, ...playerDoc.data() };
                        console.log("[Auth] Player profile fetched:", currentPlayer);
                    } else {
                        console.warn("[Auth] No player profile found in Firestore for UID:", user.uid);
                        // Warn if fallback profile is being used
                        alert("No player profile found for this account. You are logged in, but your profile is incomplete.");
                        currentPlayer = { id: user.uid, name: user.email, email: user.email, isAdmin: false }; // Basic fallback
                        // Optionally: Trigger profile creation flow or logout user if profile is mandatory
                    }
                    // Call the onLogin callback AFTER profile fetch attempt
                    if (typeof onLogin === 'function') {
                        onLogin(user, currentPlayer);
                    } else {
                         console.error("[Auth] onLogin callback is not a function!");
                    }
                } catch (error) {
                    console.error("[Auth] Error fetching player profile:", error);
                    currentPlayer = null; // Ensure currentPlayer is null on error
                    // Call onLogin with null profile? Or call onLogout? Depends on desired behavior.
                    // Let's call onLogout to signify a failed login state.
                    if (typeof onLogout === 'function') {
                        onLogout();
                    }
                    // Optionally logout the user from Firebase Auth as well if profile is critical
                    // await authInstance.signOut();
                } finally {
                    isFetchingProfile = false; // Reset flag
                }
            } else {
                console.log("[Auth] User signed out.");
                currentPlayer = null; // Clear player profile on logout
                // Call the onLogout callback
                if (typeof onLogout === 'function') {
                    onLogout();
                } else {
                     console.error("[Auth] onLogout callback is not a function!");
                }
            }
        });
        console.log("[Auth] Auth state listener attached successfully.");
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

// Login function
async function loginWithEmailPassword(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        console.log("[Auth] Login successful");
    } catch (error) {
        console.error("[Auth] Login error:", error);
        alert(error.message);
    }
}

// Logout function
async function logout() {
    try {
        await auth.signOut();
        console.log("[Auth] Logout successful");
    } catch (error) {
        console.error("[Auth] Logout error:", error);
        alert(error.message);
    }
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