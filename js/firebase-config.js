/**
 * FiberHub ISP - Firebase Configuration
 * 
 * IMPORTANT: Replace the config below with your own Firebase project credentials.
 * 
 * How to get:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use existing)
 * 3. Enable Authentication (Email/Password + optionally Phone)
 * 4. Create Firestore Database
 * 5. Enable Storage
 * 6. Project Settings → General → Your apps → Web app → Copy config
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (only if config is filled)
let app, auth, db, storage;

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage ? firebase.storage() : null;
    console.log("✅ Firebase initialized successfully");
  } else {
    console.warn("⚠️ Firebase config not set. Running in DEMO mode.");
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

/**
 * Firestore Collections Structure (to keep documents small < 1MB)
 * 
 * /users/{uid}                    - user profile + role
 * /customers/{id}                 - customer basic info
 * /customers/{id}/bills/{billId}  - bill history (subcollection)
 * /customers/{id}/documents/{docId}
 * /complaints/{id}                - complaints
 * /packages/{id}                  - packages
 * /areas/{id}                     - areas
 * /network/olts/{id}              - OLT devices
 * /network/stock/{id}             - ONU/Router stock
 * /payments/{id}                  - payment entries
 * /settings/company               - company details
 * /activity_logs/{id}             - activity logs
 * /branches/{id}                  - branch support
 */

// Demo mode flag
const isDemoMode = () => !auth || firebaseConfig.apiKey === "YOUR_API_KEY";
