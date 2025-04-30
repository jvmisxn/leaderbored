// Global declarations - must be at the very top and use 'var'
var db;
var auth;

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
    console.log("[Firebase Config] Attempting to initialize Firebase...");
    try {
        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("[Firebase Config] Firebase app initialized successfully.");
        } else {
            firebase.app();
            console.log("[Firebase Config] Firebase app already initialized.");
        }

        // Set the global variables
        db = firebase.firestore();
        auth = firebase.auth();

        // Test connection (Use a non-reserved name)
        db.collection('app_status').doc('connection_test').get() // Changed collection name
            .then(() => console.log("[Firebase Config] Firestore connection test successful."))
            .catch(error => console.error("[Firebase Config] Firestore connection test failed:", error));

        console.log("[Firebase Config] Firebase initialization complete. 'db' and 'auth' objects available.");
        return true;

    } catch (error) {
        console.error("[Firebase Config] Error initializing Firebase:", error);
        // Display a user-friendly error?
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '<p class="error-text text-center py-10">Critical Error: Could not initialize Firebase connection. Please check configuration and console.</p>';
        }
        return false;
    }
}

// Log that the script loaded
console.log("[Firebase Config] firebase_config.js loaded and globals declared.");

// IMPORTANT: Do NOT call initializeFirebase() here directly if using defer.
// It should be called by main.js after DOMContentLoaded.
