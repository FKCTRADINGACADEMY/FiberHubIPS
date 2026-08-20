/**
 * FiberHub ISP - Authentication Module
 * Supports: Admin, Billing Staff, Technician, Customer (User)
 */

const ROLES = {
  ADMIN: "admin",
  BILLING: "billing",
  TECHNICIAN: "technician",
  CUSTOMER: "customer"
};

// Demo users (for testing without Firebase)
const DEMO_USERS = {
  "admin@fiberhub.com": { password: "admin123", role: ROLES.ADMIN, name: "Admin User", uid: "demo-admin" },
  "billing@fiberhub.com": { password: "billing123", role: ROLES.BILLING, name: "Billing Staff", uid: "demo-billing" },
  "tech@fiberhub.com": { password: "tech123", role: ROLES.TECHNICIAN, name: "Technician", uid: "demo-tech" },
  "user@fiberhub.com": { password: "user123", role: ROLES.CUSTOMER, name: "Customer User", uid: "demo-customer" }
};

/**
 * Login with email/password
 */
async function login(email, password, remember = false) {
  email = email.trim().toLowerCase();

  // Demo mode
  if (isDemoMode()) {
    const user = DEMO_USERS[email];
    if (user && user.password === password) {
      const session = {
        uid: user.uid,
        email: email,
        name: user.name,
        role: user.role,
        loginAt: Date.now()
      };
      saveSession(session, remember);
      return { success: true, user: session };
    }
    return { success: false, error: "Invalid email or password (Demo mode)" };
  }

  // Real Firebase Auth
  try {
    const persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    await auth.setPersistence(persistence);
    const result = await auth.signInWithEmailAndPassword(email, password);
    
    // Get user role from Firestore
    const userDoc = await db.collection("users").doc(result.user.uid).get();
    let role = ROLES.CUSTOMER;
    let name = result.user.displayName || email.split("@")[0];

    if (userDoc.exists) {
      const data = userDoc.data();
      role = data.role || ROLES.CUSTOMER;
      name = data.name || name;
    }

    const session = {
      uid: result.user.uid,
      email: result.user.email,
      name: name,
      role: role,
      loginAt: Date.now()
    };
    saveSession(session, remember);
    return { success: true, user: session };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: getFriendlyError(error.code) };
  }
}

/**
 * Login with OTP (placeholder - implement with Firebase Phone Auth)
 */
async function loginWithOTP(phone) {
  // TODO: Implement Firebase Phone Authentication
  showToast("OTP Login coming soon. Use email login for now.", "info");
  return { success: false, error: "OTP not configured yet" };
}

/**
 * Logout
 */
async function logout() {
  clearSession();
  if (!isDemoMode() && auth) {
    try {
      await auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  }
  window.location.href = "index.html";
}

/**
 * Get current user session
 */
function getCurrentUser() {
  try {
    const data = localStorage.getItem("fh_session") || sessionStorage.getItem("fh_session");
    if (data) return JSON.parse(data);
  } catch (e) {}
  return null;
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  return !!getCurrentUser();
}

/**
 * Check role access
 */
function hasRole(...roles) {
  const user = getCurrentUser();
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Protect page - redirect if not logged in or wrong role
 */
function protectPage(allowedRoles = []) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return false;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    showToast("Access denied for your role", "error");
    window.location.href = "dashboard.html";
    return false;
  }
  return true;
}

// Helpers
function saveSession(session, remember) {
  const str = JSON.stringify(session);
  if (remember) {
    localStorage.setItem("fh_session", str);
    sessionStorage.removeItem("fh_session");
  } else {
    sessionStorage.setItem("fh_session", str);
    localStorage.removeItem("fh_session");
  }
}

function clearSession() {
  localStorage.removeItem("fh_session");
  sessionStorage.removeItem("fh_session");
}

function getFriendlyError(code) {
  const map = {
    "auth/user-not-found": "No account found with this email",
    "auth/wrong-password": "Incorrect password",
    "auth/invalid-email": "Invalid email address",
    "auth/too-many-requests": "Too many attempts. Try again later",
    "auth/network-request-failed": "Network error. Check your connection",
    "auth/invalid-credential": "Invalid email or password"
  };
  return map[code] || "Login failed. Please try again.";
}

// Toast helper (shared)
function showToast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
