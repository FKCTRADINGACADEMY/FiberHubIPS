/**
 * FiberHub ISP - Authentication Module
 * Public registration DISABLED
 * Only Admin can create users
 */

const ROLES = {
  ADMIN: "admin",
  BILLING: "billing",
  TECHNICIAN: "technician",
  CUSTOMER: "customer"
};

/**
 * Login
 */
async function login(email, password, remember = false) {
  email = email.trim().toLowerCase();

  if (!auth) {
    return { success: false, error: "Firebase not connected" };
  }

  try {
    const persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    await auth.setPersistence(persistence);
    const result = await auth.signInWithEmailAndPassword(email, password);
    
    const userDoc = await db.collection("users").doc(result.user.uid).get();

    // No profile / deleted account → block login (customer delete removes users doc)
    if (!userDoc.exists) {
      await auth.signOut();
      return { success: false, error: "Account not found or deleted. Contact office." };
    }

    const data = userDoc.data();
    if (data.disabled === true || data.deleted === true) {
      await auth.signOut();
      return { success: false, error: "Account disabled or deleted. Contact office." };
    }

    const role = data.role || ROLES.CUSTOMER;
    const name = data.name || result.user.displayName || email.split("@")[0];
    const phone = data.phone || "";

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

/**
 * Admin creates a new user (without logging out admin)
 * Uses secondary Firebase app
 */
async function adminCreateUser(name, email, phone, password, role) {
  name = name.trim();
  email = email.trim().toLowerCase();
  phone = (phone || "").trim();
  role = role || "customer";

  if (!name || !email || !password) {
    return { success: false, error: "Name, Email and Password required" };
  }
  if (password.length < 6) {
    return { success: false, error: "Password min 6 characters" };
  }

  try {
    // Secondary app so admin session is not replaced
    let secondaryApp;
    try { secondaryApp = firebase.app("Secondary"); } catch (e) {
      secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
    }
    const secondaryAuth = secondaryApp.auth();

    const result = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = result.user.uid;

    await db.collection("users").doc(uid).set({
      name: name,
      email: email,
      phone: phone,
      role: role,
      uid: uid,
      createdBy: getCurrentUser()?.uid || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Clean up secondary app
    await secondaryAuth.signOut();
    await secondaryApp.delete();

    return { success: true, uid: uid, message: "User created successfully" };
  } catch (error) {
    console.error("Create user error:", error);
    try {
      const apps = firebase.apps;
      const sec = apps.find(a => a.name === "Secondary");
      if (sec) await sec.delete();
    } catch (e) {}
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
