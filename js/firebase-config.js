/**
 * FiberHub ISP - Firebase Configuration
 * Project: fiber-hub-ips
 */

const firebaseConfig = {
  apiKey: "AIzaSyD21ZZm1Wz62_GUo8XLkdvgkwQavxkAX-M",
  authDomain: "fiber-hub-ips.firebaseapp.com",
  projectId: "fiber-hub-ips",
  storageBucket: "fiber-hub-ips.firebasestorage.app",
  messagingSenderId: "159401133832",
  appId: "1:159401133832:web:61be7296474f2b0a250ebd"
};

// Initialize Firebase
let app, auth, db, storage;

try {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  
  // Storage (optional - enable when needed)
  try {
    storage = firebase.storage();
  } catch (e) {
    storage = null;
  }
  
  console.log("✅ Firebase initialized successfully - Project: fiber-hub-ips");
} catch (e) {
  console.error("Firebase init error:", e);
}

/**
 * Firestore Collections Structure (keeps documents small < 1MB)
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

// Real Firebase is connected (demo mode OFF)
const isDemoMode = () => false;
