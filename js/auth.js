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
        authInstance.onAuthStateChanged(async (user) => { // Make the callback async
            if (user) {
                try {
                    // Explicitly wait for the profile to be fetched/created AND currentPlayer to be set
                    await ensurePlayerProfile(user);
                    console.log("[Auth Listener] ensurePlayerProfile completed. CurrentPlayer:", currentPlayer); // Log after await
                    if (typeof onLogin === 'function') {
                        // Pass the now-populated currentPlayer
                        onLogin(user, currentPlayer);
                    } else {
                         console.warn("[Auth Listener] onLogin callback is not a function.");
                    }
                } catch (error) {
                    console.error("[Auth Listener] Error ensuring player profile:", error);
                    currentPlayer = null; // Ensure currentPlayer is null on error
                    if (typeof onLogout === 'function') onLogout();
                }
            } else {
                console.log("[Auth Listener] User signed out.");
                currentPlayer = null;
                if (typeof onLogout === 'function') onLogout();
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
    const profileButton = document.getElementById('profile-photo-button');
    // Find the img tag *inside* the button
    const profileImage = profileButton?.querySelector('img'); // Changed selector
    const defaultAvatar = `https://ui-avatars.com/api/?name=?&background=E0E7FF&color=4F46E5&size=40`; // Default placeholder

    if (!profileButton) {
        console.warn("[Auth UI] Profile button (#profile-photo-button) not found.");
        return;
    }
    if (!profileImage) {
        console.warn("[Auth UI] Profile image element (img inside #profile-photo-button) not found. Was setupCommonUI run?");
        // Optionally try to create it here as a fallback, though setupCommonUI should handle it
        return;
    }


    if (playerProfile) {
        // Prioritize iconUrl, then generate avatar based on name
        const imgUrl = playerProfile.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(playerProfile.name || '?')}&background=random&color=fff&size=40`;
        profileImage.src = imgUrl;
        profileImage.alt = `${playerProfile.name || 'Player'}'s Profile`;
        profileButton.classList.remove('hidden'); // Ensure button is visible (though .player-only should handle)
    } else {
        // Logged out state
        profileImage.src = defaultAvatar;
        profileImage.alt = 'My Profile';
        // Hiding the button is handled by handleAuthChange using .player-only class
    }
    console.log("[Auth UI] Profile UI updated for logged-in state:", !!playerProfile);
}

// --- Login/Signup/Logout Functions ---

/**
 * Logs in a user with email and password using Firebase Auth.
 * If successful, fetches or creates the player profile in Firestore.
 */
async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log("[Auth] Login successful for:", user.uid, user.email);

        // Fetch or create player profile
        await ensurePlayerProfile(user);

    } catch (error) {
        console.error("[Auth] Login error:", error);
        alert(error.message || "Login failed.");
    }
}

/**
 * Signs up a new user and creates a player profile in Firestore.
 */
async function signupUser(email, password, playerName) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log("[Auth] Signup successful for:", user.uid, user.email);

        // Create player profile
        await createPlayerProfile(user, playerName);

    } catch (error) {
        console.error("[Auth] Signup error:", error);
        alert(error.message || "Signup failed.");
    }
}

/**
 * Logs out the current user.
 */
async function logoutUser() {
    try {
        await auth.signOut();
        console.log("[Auth] Logout successful");
    } catch (error) {
        console.error("[Auth] Logout error:", error);
        alert(error.message || "Logout failed.");
    }
}

/**
 * Ensures a player profile exists for the given Firebase user.
 * If not, creates one with the user's email as the name.
 */
async function ensurePlayerProfile(user) {
    if (!user) return;
    const playerDocRef = db.collection('players').doc(user.uid);
    const playerDoc = await playerDocRef.get();
    if (playerDoc.exists) {
        const fetchedData = playerDoc.data(); // Get data first
        console.log("[Auth] Player profile fetched:", { id: playerDoc.id, ...fetchedData }); // Log fetched data
        console.log(`[Auth] isAdmin field type: ${typeof fetchedData.isAdmin}, value: ${fetchedData.isAdmin}`); // Log isAdmin specifically
        currentPlayer = { id: playerDoc.id, ...fetchedData }; // Assign to global
        console.log("[Auth] currentPlayer object set:", currentPlayer); // Log the final object
    } else {
        // Create a new player profile
        console.log(`[Auth] Player profile not found for ${user.uid}. Creating new profile.`);
        await createPlayerProfile(user, user.email); // createPlayerProfile also sets currentPlayer
    }
}

/**
 * Creates a player profile in Firestore for the given user.
 */
async function createPlayerProfile(user, playerName) {
    if (!user) return;
    const playerData = {
        name: playerName || user.email,
        email: user.email, // Store email
        iconUrl: null, // Initialize iconUrl
        isAdmin: false,
        date_created: firebase.firestore.FieldValue.serverTimestamp(),
        elos: { overall: 1000 },
        elo_overall: 1000,
        wins: 0, losses: 0, draws: 0, games_played: 0,
        golf_handicap: null
    };
    // Use set with merge:true to avoid overwriting if somehow called twice
    await db.collection('players').doc(user.uid).set(playerData, { merge: true });
    // Assign to currentPlayer *after* setting in DB
    currentPlayer = { id: user.uid, ...playerData, date_created: new Date() }; // Use local date temporarily, Firestore value might differ slightly
    console.log("[Auth] Player profile created and assigned to currentPlayer:", currentPlayer);
}

// --- Helpers ---
function getCurrentUserId() { return currentPlayer ? currentPlayer.id : null; }
function isCurrentUserAdmin() {
    console.log("[Auth Check] isCurrentUserAdmin called.");
    console.log("[Auth Check] Current player object:", currentPlayer);
    const isAdmin = currentPlayer ? currentPlayer.isAdmin === true : false; // Strict check for boolean true
    console.log(`[Auth Check] isAdmin result: ${isAdmin}`);
    return isAdmin;
}

// New helper to get Firestore rules setup instructions
function getFirestoreRulesInstructions() {
    return `
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow users to read their own profile
        match /players/{userId} {
          allow read: if request.auth != null && (request.auth.uid == userId || get(/databases/$(database)/documents/players/$(request.auth.uid)).data.isAdmin == true);
          allow write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }`;
}

// --- Form Setup/Handlers ---

/**
 * Sets up the event listener for the login form within a given section element.
 * @param {HTMLElement} sectionElement - The parent element containing the login form.
 */
function setupLoginForm(sectionElement) {
    const form = sectionElement.querySelector('#login-form');
    if (form) {
        form.removeEventListener('submit', handleLoginSubmit); // Remove previous listener if any
        form.addEventListener('submit', handleLoginSubmit);
        console.log("[Auth] Login form listener attached.");
    } else {
        console.error("[Auth] Login form (#login-form) not found in the provided section element.");
    }
}

/**
 * Handles the submission of the login form.
 * @param {Event} event - The form submission event.
 */
async function handleLoginSubmit(event) {
    event.preventDefault(); // Prevent default page reload
    const form = event.target;
    const emailInput = form.querySelector('#login-email');
    const passwordInput = form.querySelector('#login-password');
    const errorElement = form.querySelector('#login-error');
    const submitButton = form.querySelector('button[type="submit"]');

    const email = emailInput.value;
    const password = passwordInput.value;

    if (errorElement) errorElement.textContent = ''; // Clear previous errors
    if (submitButton) submitButton.disabled = true; // Disable button during login attempt

    // Call loginUser - it handles its own errors/alerts.
    // The onAuthStateChanged listener will handle UI updates and navigation.
    await loginUser(email, password).catch(error => {
        // Catch potential errors from loginUser if needed for form-specific feedback
        console.error("[Auth] Login submit handler caught error from loginUser:", error);
        if (errorElement) errorElement.textContent = error.message || "Login failed. Please check your credentials.";
    });

    // Re-enable button regardless of success/failure, as auth listener handles UI changes.
    if (submitButton) submitButton.disabled = false;
}

/**
 * Sets up the Edit Profile form: populates fields and attaches submit listener.
 */
function setupEditProfileForm() {
    console.log("[Auth] Setting up Edit Profile form...");
    const form = document.getElementById('edit-profile-form');
    const nameInput = form?.querySelector('#edit-profile-name');
    const iconUrlInput = form?.querySelector('#edit-profile-icon-url');
    const errorElement = form?.querySelector('#edit-profile-error');

    if (!form || !nameInput || !iconUrlInput || !errorElement) {
        console.error("[Auth] Edit Profile form or its elements not found.");
        const container = document.getElementById('edit-profile-section');
        if (container) container.innerHTML = '<p class="error-text text-center py-10">Error loading profile edit form structure.</p>';
        return;
    }

    // Clear previous errors
    errorElement.textContent = '';

    // Check if user is logged in
    if (!currentPlayer) {
        console.warn("[Auth] Cannot setup edit profile form: No user logged in.");
        errorElement.textContent = 'You must be logged in to edit your profile.';
        // Optionally disable form fields
        nameInput.disabled = true;
        iconUrlInput.disabled = true;
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        return;
    }

    // Populate form with current player data
    nameInput.value = currentPlayer.name || '';
    iconUrlInput.value = currentPlayer.iconUrl || '';
    console.log("[Auth] Populated edit profile form with data:", { name: currentPlayer.name, iconUrl: currentPlayer.iconUrl });

    // Attach submit listener (remove previous one first)
    form.removeEventListener('submit', handleEditProfileSubmit);
    form.addEventListener('submit', handleEditProfileSubmit);
    console.log("[Auth] Edit Profile form submit listener attached.");
}

/**
 * Handles the submission of the Edit Profile form.
 * @param {Event} event - The form submission event.
 */
async function handleEditProfileSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const nameInput = form.querySelector('#edit-profile-name');
    const iconUrlInput = form.querySelector('#edit-profile-icon-url');
    const errorElement = form.querySelector('#edit-profile-error');
    const submitButton = form.querySelector('button[type="submit"]');

    const newName = nameInput.value.trim();
    const newIconUrl = iconUrlInput.value.trim() || null; // Store null if empty

    if (!newName) {
        if (errorElement) errorElement.textContent = 'Name cannot be empty.';
        return;
    }

    if (errorElement) errorElement.textContent = '';
    if (submitButton) submitButton.disabled = true;

    const userId = getCurrentUserId();
    if (!userId) {
        if (errorElement) errorElement.textContent = 'Error: Not logged in.';
        if (submitButton) submitButton.disabled = false;
        return;
    }

    try {
        const playerDocRef = db.collection('players').doc(userId);
        await playerDocRef.update({
            name: newName,
            iconUrl: newIconUrl
        });

        // Update local currentPlayer object
        if (currentPlayer) {
            currentPlayer.name = newName;
            currentPlayer.iconUrl = newIconUrl;
        }

        // Refresh UI immediately
        updateProfileUI(currentPlayer);
        // Optional: Refresh other parts of the UI if the name is displayed elsewhere dynamically
        // e.g., if (typeof populateDashboard === 'function') populateDashboard();

        alert("Profile updated successfully!");
        // Navigate back or close modal - let's navigate home for now
        showSection('home-section');

    } catch (error) {
        console.error("[Auth] Error updating profile:", error);
        if (errorElement) errorElement.textContent = `Error saving profile: ${error.message}`;
        alert(`Failed to update profile: ${error.message}`);
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

function handleSignupSubmit(event) { /* ... */ } // Assuming signup is handled separately

console.log("[Auth] auth.js loaded. Functions (setupAuthStateListener, updateProfileUI, loginUser, logoutUser, etc.) defined globally.");