/**
 * FiberHub ISP - Main App Logic (Login Page)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Auto redirect if already logged in
  if (isLoggedIn() && window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("/")) {
    window.location.href = "dashboard.html";
    return;
  }

  initTheme();
  initLoginForm();
  initPasswordToggle();
  loadVersion();
  registerServiceWorker();
});

/* ========== Theme ========== */
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
  
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#0a1628" : "#e8f4fd";
}

/* ========== Login Form ========== */
function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const remember = document.getElementById("rememberMe").checked;
    const btn = document.getElementById("loginBtn");

    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> <span>Logging in...</span>`;

    const result = await login(email, password, remember);

    if (result.success) {
      showToast(`Welcome, ${result.user.name}!`, "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 600);
    } else {
      showToast(result.error || "Login failed", "error");
      btn.disabled = false;
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Login</span>`;
    }
  });

  // OTP button
  const otpBtn = document.getElementById("otpLoginBtn");
  if (otpBtn) {
    otpBtn.addEventListener("click", () => {
      showToast("OTP Login: Enter mobile number feature coming soon.", "info");
    });
  }

  // Forgot password
  const forgot = document.getElementById("forgotPassword");
  if (forgot) {
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Password reset will be sent to your email (configure Firebase).", "info");
    });
  }
}

/* ========== Password Toggle ========== */
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

/* ========== Version ========== */
async function loadVersion() {
  try {
    const res = await fetch("version.json?t=" + Date.now());
    if (res.ok) {
      const data = await res.json();
      const el = document.getElementById("appVersion");
      if (el) el.textContent = "v" + data.version;
    }
  } catch (e) {}
}

/* ========== PWA Service Worker ========== */
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then((reg) => {
        console.log("SW registered:", reg.scope);
        // Check for updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showToast("New version available! Refresh to update.", "info");
            }
          });
        });
      })
      .catch((err) => console.log("SW registration failed:", err));
  }
}
