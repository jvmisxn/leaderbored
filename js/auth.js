// --- auth.js ---

// --- Player Authentication Functions ---
let currentPlayer = null; // Variable to store logged-in player data

async function handlePlayerRegister(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    const playerName = form['player-name'].value.trim(); // Get player name
    const errorDiv = document.getElementById('register-error');
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');

    if (!playerName) {
        errorDiv.textContent = "Player Name is required.";
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        console.log("Attempting registration for:", email);
        // Ensure auth is initialized
        if (!auth) throw new Error("Firebase Auth is not initialized.");
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log("Registration successful, User:", user);

        // --- Link Auth user to a new Firestore Player profile ---
        await createPlayerProfile(user.uid, email, playerName);

        alert(`Registration successful for ${playerName}! You are now logged in.`);
        // onAuthStateChanged will handle UI updates and navigation
        form.reset(); // Clear the form

    } catch (error) {
        console.error("Registration Error:", error);
        errorDiv.textContent = `Registration failed: ${error.message}`;
        errorDiv.classList.remove('hidden');
    }
} //

async function handlePlayerLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    const errorDiv = document.getElementById('player-login-error');
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');

    try {
        console.log("Attempting login for:", email);
        // Ensure auth is initialized
        if (!auth) throw new Error("Firebase Auth is not initialized.");
        await auth.signInWithEmailAndPassword(email, password);
        console.log("Player login successful");
         alert("Login successful!");
         // onAuthStateChanged will handle UI updates and navigation
         form.reset();
    } catch (error) {
        console.error("Player Login Error:", error);
        errorDiv.textContent = `Login failed: ${error.message}`;
        errorDiv.classList.remove('hidden');
    }
} //

async function handleGoogleSignIn() {
    // Ensure auth and provider are initialized
    if (!auth || typeof firebase === 'undefined' || !firebase.auth) {
         alert("Authentication service is not ready. Please try again later.");
         console.error("Google Sign-In Error: Firebase Auth or GoogleAuthProvider not available.");
         return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        console.log("Attempting Google Sign-In...");
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        console.log("Google Sign-In successful, User:", user);

        // Check if a player profile already exists for this Auth UID
        const playerProfile = await getPlayerProfileByAuthId(user.uid);

        if (!playerProfile) {
            // If no profile exists, create one using Google profile info
            console.log("No existing profile found, creating one...");
            await createPlayerProfile(user.uid, user.email, user.displayName, user.photoURL);
             alert(`Welcome ${user.displayName}! Profile created and logged in.`);
        } else {
            console.log("Existing profile found:", playerProfile);
            alert(`Welcome back ${playerProfile.name}!`);
        }
         // onAuthStateChanged handles UI updates
    } catch (error) {
         console.error("Google Sign-In Error:", error);
         // Provide more user-friendly messages for common errors
         if (error.code === 'auth/popup-closed-by-user') {
             alert("Google Sign-In cancelled.");
         } else if (error.code === 'auth/network-request-failed') {
              alert("Google Sign-In failed: Network error. Please check your connection.");
         } else {
            alert(`Google Sign-In failed: ${error.message}`);
         }
    }
} //


function handlePlayerLogout() {
    // Ensure auth is initialized
    if (!auth) {
         console.error("Logout Error: Firebase Auth not initialized.");
         alert("Logout failed: Authentication service unavailable.");
         return;
    }
    auth.signOut().then(() => {
        console.log("Player logged out successfully.");
        alert("You have been logged out.");
        // onAuthStateChanged handles UI updates and navigation
    }).catch((error) => {
        console.error("Logout Error:", error);
         alert(`Logout failed: ${error.message}`);
    });
} //

// Listen for authentication state changes
// Note: Ensure 'auth', 'db', 'getPlayerProfileByAuthId', 'showSection',
//       'DEFAULT_ELO', 'ELO_GAME_KEYS' are accessible in the scope where this runs.
//       This listener should likely be setup in your main initialization file (e.g., main.js or app.js)
//       after Firebase is initialized.
/*
auth.onAuthStateChanged(async (user) => {
    const loginButton = document.getElementById('player-login-link'); // Assuming this ID exists
    const profileSection = document.getElementById('profile-section'); // Assuming this ID exists
    const profileImg = document.getElementById('profile-photo-img'); // Assuming this ID exists

    // Reset UI states
    document.body.classList.remove('player-logged-in', 'admin-logged-in');
    if (loginButton) loginButton.style.display = 'block';
    if (profileSection) profileSection.style.display = 'none';
    currentPlayer = null;

    if (user) {
        // Player is signed in.
        console.log("Auth State Changed: User is logged in", user.uid);
        document.body.classList.add('player-logged-in');
        if (loginButton) loginButton.style.display = 'none';
        if (profileSection) profileSection.style.display = 'flex'; // Or 'block' depending on layout

        // Fetch associated player profile data
        currentPlayer = await getPlayerProfileByAuthId(user.uid);
        if (!currentPlayer) {
            console.warn("Logged in user has no associated player profile!", user.uid);
            // Handle this case - maybe force profile creation or show an error
            // For now, keep minimal user info and default icon
            if (profileImg) profileImg.src = 'https://ui-avatars.com/api/?name=?&background=E0E7FF&color=4F46E5&size=40';
            currentPlayer = { authUid: user.uid, email: user.email, name: "Profile Needed", isAdmin: false }; // Assume not admin if profile missing
        } else {
             console.log("Current player data:", currentPlayer);

             // Check for Admin status
             if (currentPlayer.isAdmin === true) {
                 console.log("User is an Admin.");
                 document.body.classList.add('admin-logged-in');
             } else {
                 console.log("User is NOT an Admin.");
             }

             // Update profile photo
             const photoURL = currentPlayer.iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentPlayer.name || '?')}&background=E0E7FF&color=4F46E5&size=40`;
             if (profileImg) profileImg.src = photoURL;
        }

        // Optionally navigate to a default logged-in section like home or profile
        // Avoid navigation loops, only navigate if on a login/register page
        const currentHash = window.location.hash.split('?')[0]; // Get hash without query params
        if (currentHash === '#player-login-section' || currentHash === '#register-section' || currentHash === '') {
            await showSection('home-section'); // Ensure showSection is defined and accessible
        }

    } else {
        // Player is signed out.
        console.log("Auth State Changed: User is logged out");
        document.getElementById('profile-dropdown')?.classList.add('hidden'); // Ensure dropdown is hidden

        // Navigate to home or login page on logout if not already there
        const currentHash = window.location.hash.split('?')[0];
        // Avoid navigating if already on a public page like home
        const protectedSections = ['profile-section', 'live-game-section', 'submit-past-game-section']; // Example protected areas
        if (protectedSections.includes(currentHash.substring(1))) {
             await showSection('home-section'); // Navigate away from protected areas
        }
    }
}); //
*/
// Function to create a player profile document in Firestore
async function createPlayerProfile(authUid, email, playerName, iconUrl = null) {
    // Ensure db and necessary constants/configs are available
    if (!db || typeof DEFAULT_ELO === 'undefined' || !Array.isArray(ELO_GAME_KEYS)) {
        console.error("Cannot create profile: DB or required configurations (DEFAULT_ELO, ELO_GAME_KEYS) missing.");
        alert("Error setting up player profile. Configuration missing.");
        return null;
    }
    console.log(`Creating player profile for authUid: ${authUid}, name: ${playerName}`);
    try {
         // Check if a profile already exists for this authUid (important for Google Sign-In)
         const existing = await getPlayerProfileByAuthId(authUid);
         if(existing) {
             console.warn("Profile already exists for this auth user:", existing);
             return existing.id; // Return existing ID
         }

         // Initialize Elos (excluding golf)
         const initialElos = { overall: DEFAULT_ELO };
         ELO_GAME_KEYS.forEach(gameKey => {
             if (gameKey !== 'golf') { // Exclude golf from initial Elo map
                 initialElos[gameKey] = DEFAULT_ELO;
             }
         });

         const playerData = {
             authUid: authUid, // Link to Firebase Auth User ID
             email: email,     // Store email for reference
             name: playerName,
             iconUrl: iconUrl, // Use provided iconUrl or null
             elo_overall: DEFAULT_ELO,
             elos: initialElos, // Initial Elos map (excluding golf)
             wins: 0, losses: 0, draws: 0, games_played: 0,
             golf_handicap: null, // Initialize golf handicap to null
             date_created: firebase.firestore.FieldValue.serverTimestamp(),
             isAdmin: false // Default new users to not be admin
         };

        const docRef = await db.collection('players').add(playerData);
        console.log("Player profile created successfully with ID:", docRef.id);
        // Refresh player list if the UI element exists (check might be needed depending on structure)
        const playersGridElement = document.querySelector('#players-section #players-grid');
        if (playersGridElement && typeof populatePlayersList === 'function') {
            await populatePlayersList();
        }
        // Invalidate player cache so it refreshes on next load
        playersCachePopulated = false;
        return docRef.id; // Return the new Firestore document ID

    } catch (error) {
        console.error("Error creating player profile:", error);
        alert(`Failed to create player profile: ${error.message}`);
        return null;
    }
} //

// Function to get a player profile document by Auth UID
async function getPlayerProfileByAuthId(authUid) {
    if (!db || !authUid) {
        console.warn("getPlayerProfileByAuthId: DB not ready or authUid missing.");
        return null;
    }
    try {
        // Firestore index needed: players collection, authUid field (ascending)
        const querySnapshot = await db.collection('players').where('authUid', '==', authUid).limit(1).get();
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            console.log(`[getPlayerProfileByAuthId] Found profile for ${authUid}, ID: ${doc.id}`);
            return { id: doc.id, ...doc.data() }; // Return profile data including Firestore ID
        } else {
            console.log(`[getPlayerProfileByAuthId] No profile found for authUid: ${authUid}`);
            return null; // No profile found for this authUid
        }
    } catch (error) {
         if (error.code === 'failed-precondition') {
             console.error("Firestore index missing: players collection, field 'authUid' (ascending). Please create this index.");
             alert("Database error: Cannot retrieve player profile. Missing index (check console).");
         } else {
            console.error(`Error fetching player profile by authUid ${authUid}:`, error);
         }
         return null;
    }
} //

// Note: This file assumes that 'firebase', 'db', 'auth', 'DEFAULT_ELO', 'ELO_GAME_KEYS',
// 'showSection', 'populatePlayersList', and 'playersCachePopulated' are initialized
// and accessible from the global scope or imported/passed appropriately depending on your final module structure.
// The `auth.onAuthStateChanged` listener, in particular, might be better placed in your main initialization logic
// after Firebase is fully initialized to ensure 'auth' is defined.