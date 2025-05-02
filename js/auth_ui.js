// --- auth_ui.js ---
console.log("[Auth UI] auth_ui.js loading...");

/**
 * Sets up the login form and attaches event listeners.
 * @param {HTMLElement} sectionElement - The login section element.
 */
function setupLoginForm(sectionElement) {
    console.log("[Auth UI] Setting up login form...");
    
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const googleLoginBtn = document.getElementById('google-login-btn');
    
    if (!loginForm || !loginError) {
        console.error("[Auth UI] Login form elements not found.");
        return;
    }
    
    // Remove any existing listeners to prevent duplicates
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm, loginForm);
    
    // Set up form submission handler
    newLoginForm.addEventListener('submit', handleLoginFormSubmit);
    console.log("[Auth UI] Login form submit listener attached.");
    
    // Set up Google login if the button exists
    if (googleLoginBtn) {
        const newGoogleBtn = googleLoginBtn.cloneNode(true);
        googleLoginBtn.parentNode.replaceChild(newGoogleBtn, googleLoginBtn);
        newGoogleBtn.addEventListener('click', handleGoogleLogin);
        console.log("[Auth UI] Google login button listener attached.");
    }
}

/**
 * Updates UI elements (like profile name and photo) to reflect the current authentication state.
 * Showing/hiding login vs profile button is now handled by CSS via the 'auth-authenticated' class on the body.
 * This function is primarily called by handleAuthChange in auth.js.
 * @param {firebase.User|null} user - Firebase user object, or null if logged out.
 * @param {Object|null} currentPlayer - The fetched player data object, or null.
 */
function updateUIForAuthState(user, currentPlayer) {
    console.log("[Auth UI] Updating UI for auth state. User:", user ? user.uid : 'null', "Player:", currentPlayer);
    const profileButton = document.getElementById('profile-photo-button');
    const profilePhoto = profileButton?.querySelector('img');
    const profileName = document.getElementById('profile-photo-name'); // Corrected ID
    const profileDropdownMyProfile = document.getElementById('profile-dropdown-my-profile');
    const bodyElement = document.body;

    // Clear existing auth-related classes first
    bodyElement.classList.remove('auth-authenticated', 'auth-anonymous');

    if (user) {
        bodyElement.classList.add('auth-authenticated');
        if (currentPlayer) {
            // User is logged in AND player data is available
            console.log("[Auth UI] Updating UI for logged in user with player data:", currentPlayer.name);
            if (profilePhoto) {
                const playerIcon = currentPlayer.iconUrl; // Use iconUrl from passed currentPlayer
                const firebasePhoto = user.photoURL;
                const nameForAvatar = currentPlayer.name || user.displayName || user.email || '?'; // Prioritize player name

                profilePhoto.src = playerIcon || firebasePhoto ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random&color=fff&size=40`;
                profilePhoto.alt = `${nameForAvatar}'s Profile`;
                console.log("[Auth UI] Updated profile photo using player data. Src:", profilePhoto.src);
            }
            if (profileName) {
                profileName.textContent = currentPlayer.name || user.displayName || 'User';
                console.log("[Auth UI] Updated profile name using player data:", profileName.textContent);
            } else {
                console.warn("[Auth UI] Profile name span element not found.");
            }

            if (profileDropdownMyProfile && currentPlayer.id) {
                profileDropdownMyProfile.href = `#player-profile-section?playerId=${currentPlayer.id}`;
                profileDropdownMyProfile.setAttribute('data-player-id', currentPlayer.id); // Store for potential future use
                console.log("[Auth UI] Updated 'My Profile' link href:", profileDropdownMyProfile.href);
            } else if (!currentPlayer.id) {
                 console.warn("[Auth UI] Cannot update 'My Profile' link: currentPlayer has no ID.");
            }

        } else {
            // User is logged in BUT player data is NOT available (edge case, maybe during initial load/error)
            console.warn("[Auth UI] Updating UI for logged in user WITHOUT player data. Using Firebase data as fallback.");
             if (profilePhoto) {
                const firebasePhoto = user.photoURL;
                const nameForAvatar = user.displayName || user.email || '?';

                profilePhoto.src = firebasePhoto ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random&color=fff&size=40`;
                profilePhoto.alt = `${nameForAvatar}'s Profile (Fallback)`;
                console.log("[Auth UI] Updated profile photo using Firebase fallback. Src:", profilePhoto.src);
            }
             if (profileName) {
                 profileName.textContent = user.displayName || 'User (Fallback)';
                 console.log("[Auth UI] Updated profile name using Firebase fallback:", profileName.textContent);
             } else {
                 console.warn("[Auth UI] Profile name span element not found for fallback.");
             }
             // Reset "My Profile" link if player data is missing
             if (profileDropdownMyProfile) {
                 profileDropdownMyProfile.href = '#'; // Reset or disable link
                 console.warn("[Auth UI] Reset 'My Profile' link as player ID is unknown.");
             }
        }
    } else {
        // User is logged out
        bodyElement.classList.add('auth-anonymous');
        console.log("[Auth UI] Updating UI for logged out user.");
        if (profilePhoto) {
             // Reset to a default placeholder or generic icon
             profilePhoto.src = `https://ui-avatars.com/api/?name=?&background=E0E7FF&color=4F46E5&size=40`;
             profilePhoto.alt = 'Profile';
        }
         if (profileName) {
             profileName.textContent = ''; // Clear name when logged out
         }
         // Reset "My Profile" link
         if (profileDropdownMyProfile) {
             profileDropdownMyProfile.href = '#';
             profileDropdownMyProfile.removeAttribute('data-player-id');
         }
        console.log("[Auth UI] Finished updating UI content for logged out user.");
    }

    // Ensure profile button visibility is handled (redundant if CSS handles it, but safe)
    const loginButton = document.getElementById('nav-login-button');
    const profileContainer = profileButton?.closest('.player-only'); // Find the parent container controlled by CSS

    if (loginButton) {
        loginButton.style.display = user ? 'none' : 'flex';
    }
    if (profileContainer) {
        profileContainer.style.display = user ? 'block' : 'none'; // Use block or flex depending on original style
    }

    console.log(`[Auth UI] Body classes set: ${bodyElement.className}`);
}

/**
 * Handles the login form submission.
 * @param {Event} event - The form submit event.
 */
async function handleLoginFormSubmit(event) {
    event.preventDefault();
    console.log("[Auth UI] Login form submitted.");
    
    const form = event.target;
    const emailInput = form.querySelector('#login-email');
    const passwordInput = form.querySelector('#login-password');
    const errorElement = document.getElementById('login-error');
    
    if (!emailInput || !passwordInput || !errorElement) {
        console.error("[Auth UI] Login form elements not found during submission.");
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        errorElement.textContent = "Please enter both email and password.";
        return;
    }
    
    errorElement.textContent = ""; // Clear previous errors
    
    try {
        // Check if Firebase Auth is available
        if (!auth) {
            throw new Error("Authentication service not available.");
        }
        
        // Attempt to sign in
        await auth.signInWithEmailAndPassword(email, password);
        console.log("[Auth UI] User signed in successfully via form.");
        
        // Redirect to home section after successful login
        if (typeof showSection === 'function') {
            showSection('home-section');
        } else {
            window.location.hash = '#home-section';
        }
        
    } catch (error) {
        console.error("[Auth UI] Login error:", error);
        
        // User-friendly error messages
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorElement.textContent = "Invalid email or password.";
                break;
            case 'auth/invalid-email':
                errorElement.textContent = "Please enter a valid email address.";
                break;
            case 'auth/too-many-requests':
                errorElement.textContent = "Too many failed login attempts. Please try again later.";
                break;
            default:
                errorElement.textContent = `Login error: ${error.message}`;
        }
    }
}

/**
 * Handles Google login button click.
 */
async function handleGoogleLogin() {
    console.log("[Auth UI] Google login button clicked.");
    const errorElement = document.getElementById('login-error');
    
    if (!errorElement) {
        console.error("[Auth UI] Error element not found during Google login.");
        return;
    }
    
    errorElement.textContent = ""; // Clear previous errors
    
    try {
        // Check if Firebase Auth is available
        if (!auth || !firebase) {
            throw new Error("Authentication service not available.");
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        console.log("[Auth UI] User signed in with Google successfully.");
        
        // Redirect to home section after successful login
        if (typeof showSection === 'function') {
            showSection('home-section');
        } else {
            window.location.hash = '#home-section';
        }
        
    } catch (error) {
        console.error("[Auth UI] Google login error:", error);
        errorElement.textContent = `Google login error: ${error.message}`;
    }
}

console.log("[Auth UI] auth_ui.js loaded.");
