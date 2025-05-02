// Global declarations - must be at the very top and use 'var'
var db;
var auth;

console.log("[Config] firebase_config.js starting execution."); // <-- ADD THIS LINE

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
    apiKey: "AIzaSyCF3az8WEAMVpAx5cbp917EUhNM5cRzvwA",
    authDomain: "leaderbored2.firebaseapp.com",
    projectId: "leaderbored2",
    storageBucket: "leaderbored2.firebasestorage.app",
    messagingSenderId: "449176616925",
    appId: "1:449176616925:web:8149e2e8b43a9a72104034",
    measurementId: "G-8LRFJGV2XY"
};

// Function to initialize Firebase
function initializeFirebase() {
    console.log("[Config] initializeFirebase() called."); // <-- ADD THIS LINE
    try {
        if (!firebaseConfig || !firebaseConfig.apiKey) {
            console.error("[Firebase Init] Firebase configuration is missing or incomplete. Cannot initialize.");
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = '<p class="error-text text-center py-10">Critical Error: Firebase configuration is missing or incomplete. Please check configuration and console.</p>';
            }
            return false;
        }

        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            console.log("[Config] Initializing Firebase App..."); // <-- ADD THIS LINE
            firebase.initializeApp(firebaseConfig);
            console.log("[Config] Firebase App initialized."); // <-- ADD THIS LINE
        } else {
            console.log("[Config] Firebase App already initialized."); // <-- ADD THIS LINE
            firebase.app();
        }

        // Set the global variables
        console.log("[Config] Getting Firestore instance..."); // <-- ADD THIS LINE
        db = firebase.firestore();
        console.log("[Config] Firestore instance obtained:", db ? 'OK' : 'Failed'); // <-- ADD THIS LINE

        console.log("[Config] Getting Auth instance..."); // <-- ADD THIS LINE
        auth = firebase.auth();
        console.log("[Config] Auth instance obtained:", auth ? 'OK' : 'Failed'); // <-- ADD THIS LINE

        // Test connection (Use a non-reserved name)
        db.collection('app_status').doc('connection_test').get() // Changed collection name
            .then(() => console.log("[Firebase Config] Firestore connection test successful."))
            .catch(error => console.error("[Firebase Config] Firestore connection test failed:", error));

        console.log("[Config] Firebase initialized successfully."); // <-- ADD THIS LINE
        console.log("[Firebase Config] Firebase initialization complete. 'db' and 'auth' objects available.");
        return true;

    } catch (error) {
        console.error("[Config] CRITICAL: Error initializing Firebase:", error); // <-- ADD THIS LINE
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '<p class="error-text text-center py-10">Critical Error: Could not initialize Firebase connection. Please check configuration and console.</p>';
        }
        return false;
    }
}

// Log that the script loaded
console.log("[Config] initializeFirebase function defined."); // <-- ADD THIS LINE
console.log("[Firebase Config] firebase_config.js loaded and globals declared.");

// IMPORTANT: Do NOT call initializeFirebase() here directly if using defer.
// It should be called by main.js after DOMContentLoaded.
