/**
 * FiberHub ISP - Authentication Module
 * Real Firebase + Self Registration
 */

const ROLES = {
  ADMIN: "admin",
  BILLING: "billing",
  TECHNICIAN: "technician",
  CUSTOMER: "customer"
};

/**
 * Register new customer
 */
async function register(name, email, phone, password) {
  email = email.trim().toLowerCase();
  name = name.trim();
  phone = (phone || "").trim();

  if (!auth || !db) {
    return { success: false, error: "Firebase not connected" };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  try {
    // Create Auth account
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const uid = result.user.uid;

    // Create Firestore user document (auto tracking)
    await db.collection("users").doc(uid).set({
      name: name,
      email: email,
      phone: phone,
      role: ROLES.CUSTOMER,
      uid: uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Update display name
    try {
      await result.user.updateProfile({ displayName: name });
    } catch (e) {}

    // Auto login after register
    const session = {
      uid: uid,
      email: email,
      name: name,
      role: ROLES.CUSTOMER,
      phone: phone,
      loginAt: Date.now()
    };
    saveSession(session, true);

    return { success: true, user: session };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, error: getFriendlyError(error.code) };
  }
}

/**
 * Login with email/password
 */
async function login(email, password, remember = false) {
  email = email.trim().toLowerCase();

  if (!auth) {
    return { success: false, error: "Firebase not connected. Check firebase-config.js" };
  }

  try {
    const persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    await auth.setPersistence(persistence);
    const result = await auth.signInWithEmailAndPassword(email, password);
    
    // Get user details from Firestore
    const userDoc = await db.collection("users").doc(result.user.uid).get();
    let role = ROLES.CUSTOMER;
    let name = result.user.displayName || email.split("@")[0];
    let phone = "";

    if (userDoc.exists) {
      const data = userDoc.data();
      role = data.role || ROLES.CUSTOMER;
      name = data.name || name;
      phone = data.phone || "";
    } else {
      // Auto-create if missing
      await db.collection("users").doc(result.user.uid).set({
        name: name,
        email: email,
        role: ROLES.CUSTOMER,
        phone: "",
        uid: result.user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    const session = {
      uid: result.user.uid,
      email: result.user.email,
      name: name,
      role: role,
      phone: phone,
      loginAt: Date.now()
    };
    saveSession(session, remember);
    return { success: true, user: session };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: getFriendlyError(error.code) };
  }
}

async function logout() {
  clearSession();
  if (auth) {
    try { await auth.signOut(); } catch (e) {}
  }
  window.location.href = "index.html";
}

function getCurrentUser() {
  try {
    const data = localStorage.getItem("fh_session") || sessionStorage.getItem("fh_session");
    if (data) return JSON.parse(data);
  } catch (e) {}
  return null;
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function hasRole(...roles) {
  const user = getCurrentUser();
  if (!user) return false;
  return roles.includes(user.role);
}

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
    "auth/email-already-in-use": "This email is already registered",
    "auth/weak-password": "Password is too weak (min 6 characters)",
    "auth/too-many-requests": "Too many attempts. Try again later",
    "auth/network-request-failed": "Network error. Check your connection",
    "auth/invalid-credential": "Invalid email or password",
    "auth/user-disabled": "This account has been disabled"
  };
  return map[code] || "Something went wrong. Please try again.";
}

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
