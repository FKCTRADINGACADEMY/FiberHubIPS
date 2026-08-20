/**
 * FiberHub ISP - Login Page Logic
 * Public registration disabled - Only Admin creates users
 */

document.addEventListener("DOMContentLoaded", () => {
  if (isLoggedIn()) {
    const path = window.location.pathname;
    if (path.endsWith("index.html") || path.endsWith("/") || path === "") {
      window.location.href = "dashboard.html";
      return;
    }
  }

  initTheme();
  initLoginForm();
  initPasswordToggle();
  loadVersion();
  registerServiceWorker();
});

function initTheme() {
  const saved = localStorage.getItem("fh_theme") || "dark";
  setTheme(saved);

  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const current = document.body.classList.contains("light-theme") ? "light" : "dark";
      setTheme(current === "dark" ? "light" : "dark");
    });
  }
}

function setTheme(theme) {
  document.body.classList.remove("dark-theme", "light-theme");
  document.body.classList.add(theme + "-theme");
  localStorage.setItem("fh_theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#0a1628" : "#e8f4fd";
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // Customer / Staff toggle
  const typeCustomer = document.getElementById("typeCustomer");
  const typeStaff = document.getElementById("typeStaff");
  const loginType = document.getElementById("loginType");
  const loginBtnText = document.getElementById("loginBtnText");
  const loginHint = document.getElementById("loginHint");
  const loginSubtitle = document.getElementById("loginSubtitle");

  function setLoginType(type) {
    if (loginType) loginType.value = type;
    if (type === "customer") {
      if (typeCustomer) typeCustomer.style.background = "rgba(30,136,229,0.2)";
      if (typeCustomer) typeCustomer.style.borderColor = "var(--primary)";
      if (typeStaff) typeStaff.style.background = "transparent";
      if (typeStaff) typeStaff.style.borderColor = "";
      if (loginBtnText) loginBtnText.textContent = "Customer Login";
      if (loginSubtitle) loginSubtitle.textContent = "Customer account se sign in karein";
      if (loginHint) loginHint.textContent = "Complaint + Bill renewal ke liye";
    } else {
      if (typeStaff) typeStaff.style.background = "rgba(30,136,229,0.2)";
      if (typeStaff) typeStaff.style.borderColor = "var(--primary)";
      if (typeCustomer) typeCustomer.style.background = "transparent";
      if (typeCustomer) typeCustomer.style.borderColor = "";
      if (loginBtnText) loginBtnText.textContent = "Staff Login";
      if (loginSubtitle) loginSubtitle.textContent = "Admin / Billing / Technician";
      if (loginHint) loginHint.textContent = "Staff portal — Admin included";
    }
  }

  if (typeCustomer) typeCustomer.addEventListener("click", () => setLoginType("customer"));
  if (typeStaff) typeStaff.addEventListener("click", () => setLoginType("staff"));
  setLoginType("customer");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const remember = document.getElementById("rememberMe").checked;
    const type = (document.getElementById("loginType")?.value) || "customer";
    const btn = document.getElementById("loginBtn");

    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> <span>Logging in...</span>`;

    const result = await login(email, password, remember);

    if (result.success) {
      const role = result.user.role;
      const isStaff = role === "admin" || role === "billing" || role === "technician";
      const isCustomer = role === "customer";

      // Role vs login type check
      if (type === "customer" && !isCustomer) {
        clearSession();
        if (auth) try { await auth.signOut(); } catch (e) {}
        showToast("Yeh Staff account hai. Staff Login select karein.", "error");
        btn.disabled = false;
        btn.innerHTML = `<span id="loginBtnText">Customer Login</span>`;
        return;
      }
      if (type === "staff" && !isStaff) {
        clearSession();
        if (auth) try { await auth.signOut(); } catch (e) {}
        showToast("Yeh Customer account hai. Customer Login select karein.", "error");
        btn.disabled = false;
        btn.innerHTML = `<span id="loginBtnText">Staff Login</span>`;
        return;
      }

      showToast(`Welcome, ${result.user.name}!`, "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } else {
      showToast(result.error || "Login failed", "error");
      btn.disabled = false;
      const t = (document.getElementById("loginType")?.value) || "customer";
      btn.innerHTML = `<span>${t === "staff" ? "Staff Login" : "Customer Login"}</span>`;
    }
  });

  const forgot = document.getElementById("forgotPassword");
  if (forgot) {
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      const email = document.getElementById("email")?.value;
      if (email && auth) {
        auth.sendPasswordResetEmail(email.trim().toLowerCase())
          .then(() => showToast("Password reset email sent!", "success"))
          .catch(() => showToast("Contact Admin to reset password.", "info"));
      } else {
        showToast("Email likho phir Forgot Password dabao, ya Admin se contact karo.", "info");
      }
    });
  }
}

function initPasswordToggle() {
  const btn = document.getElementById("togglePassword");
  const input = document.getElementById("password");
  if (!btn || !input) return;

  btn.addEventListener("click", () => {
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    btn.querySelector(".eye-open").style.display = isPass ? "none" : "block";
    btn.querySelector(".eye-closed").style.display = isPass ? "block" : "none";
  });
}

let _appKnownVersion = null;

async function loadVersion() {
  try {
    const res = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const el = document.getElementById("appVersion");
      if (el) el.textContent = "v" + data.version;
      if (_appKnownVersion && _appKnownVersion !== data.version) {
        // Version changed on server → force reload for installed PWAs
        window.location.reload(true);
        return;
      }
      _appKnownVersion = data.version;
    }
  } catch (e) {}
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("sw.js").then((reg) => {
    // Check for SW updates every 3 seconds
    setInterval(() => { try { reg.update(); } catch (e) {} }, 3000);

    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: "SKIP_WAITING" });
          if (typeof showToast === "function") showToast("Updating app...", "info");
        }
      });
    });
  }).catch(() => {});

  // New SW took control → reload
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // Also poll version.json every 3s so any deploy auto-refreshes installed PWAs
  setInterval(loadVersion, 3000);
}
