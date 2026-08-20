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
      }, 500);
    } else {
      showToast(result.error || "Login failed", "error");
      btn.disabled = false;
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Login</span>`;
    }
  });

  const forgot = document.getElementById("forgotPassword");
  if (forgot) {
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Contact Admin to reset password.", "info");
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

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showToast("New version available! Refresh to update.", "info");
            }
          });
        });
      })
      .catch(() => {});
  }
}
