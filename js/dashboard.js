/**
 * FiberHub ISP - Dashboard Controller
 * Real Firebase + Complaint System
 */

const user = getCurrentUser();

document.addEventListener("DOMContentLoaded", () => {
  if (!protectPage()) return;

  initTheme();
  setupUserInfo();
  setupSidebar();
  setupEvents();
  const startPage = user.role === "customer" ? "my-complaints"
    : user.role === "technician" ? "technician"
    : "dashboard";
  loadModule(startPage);
  setTimeout(() => {
    document.querySelectorAll(".nav-item").forEach(i => {
      i.classList.toggle("active", i.dataset.module === startPage);
    });
  }, 50);
  loadVersion();
  initPWAUpdate();
});

let _dashKnownVersion = null;

function initPWAUpdate() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").then((reg) => {
    // Check SW every 3 seconds
    setInterval(() => { try { reg.update(); } catch (e) {} }, 3000);
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          nw.postMessage({ type: "SKIP_WAITING" });
          showToast("Updating app to latest version...", "info");
        }
      });
    });
  }).catch(() => {});

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // Poll version.json every 3s — auto reload when you deploy a new version
  setInterval(async () => {
    try {
      const res = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const el = document.getElementById("appVersion");
      if (el) el.textContent = "v" + data.version;
      if (_dashKnownVersion && _dashKnownVersion !== data.version) {
        showToast("New version " + data.version + " — updating...", "info");
        setTimeout(() => window.location.reload(true), 800);
        return;
      }
      _dashKnownVersion = data.version;
    } catch (e) {}
  }, 3000);
}

/* ========== Setup ========== */
function setupUserInfo() {
  const u = getCurrentUser();
  if (!u) return;
  document.getElementById("userName").textContent = u.name;
  document.getElementById("userRole").textContent = roleLabel(u.role);
  document.getElementById("userAvatar").textContent = u.name.charAt(0).toUpperCase();
}

function roleLabel(role) {
  const map = {
    admin: "Administrator",
    billing: "Billing Staff",
    technician: "Technician",
    customer: "Customer"
  };
  return map[role] || role;
}

function setupSidebar() {
  const nav = document.getElementById("sidebarNav");
  const role = user.role;
  let html = "";

  if (role === "admin" || role === "billing" || role === "technician") {
    html += navItem("dashboard", "Dashboard", iconDashboard());
  }

  if (role === "admin" || role === "billing") {
    html += `<div class="nav-section">Management</div>`;
    html += navItem("customers", "Customers", iconUsers());
    html += navItem("billing", "Billing", iconBilling());
    html += navItem("complaints", "Complaints", iconComplaint());
  }

  if (role === "admin") {
    html += navItem("users", "Users", iconUsers());
    html += navItem("network", "Network", iconNetwork());
    html += navItem("reports", "Reports", iconReports());
    html += navItem("settings", "Settings", iconSettings());
  }

  if (role === "technician") {
    html += `<div class="nav-section">Jobs</div>`;
    html += navItem("technician", "My Jobs", iconTools());
    html += navItem("complaints", "Complaints", iconComplaint());
  }

  if (role === "customer") {
    html += navItem("my-complaints", "My Complaints", iconComplaint());
    html += navItem("my-bills", "My Bills / Renewal", iconBilling());
    html += navItem("my-profile", "My Profile", iconUsers());
  }

  nav.innerHTML = html;

  nav.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      nav.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      loadModule(item.dataset.module);
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  const first = nav.querySelector(".nav-item");
  if (first) first.classList.add("active");
}

function navItem(module, label, icon) {
  return `<button class="nav-item" data-module="${module}">${icon}<span>${label}</span></button>`;
}

function setupEvents() {
  document.getElementById("logoutBtn").addEventListener("click", logout);
  
  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.getElementById("themeToggleDash").addEventListener("click", () => {
    const current = document.body.classList.contains("light-theme") ? "light" : "dark";
    setTheme(current === "dark" ? "light" : "dark");
  });
}

function setTheme(theme) {
  document.body.classList.remove("dark-theme", "light-theme");
  document.body.classList.add(theme + "-theme");
  localStorage.setItem("fh_theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#0a1628" : "#f0f4f8";
}

function initTheme() {
  const saved = localStorage.getItem("fh_theme") || "dark";
  setTheme(saved);
}

/* ========== Module Loader ========== */
function loadModule(name) {
  const area = document.getElementById("contentArea");
  const titles = {
    dashboard: "Dashboard",
    customers: "Customer Management",
    billing: "Billing & Payments",
    complaints: "Complaint System",
    users: "User Management",
    network: "Network Module",
    reports: "Reports & Analytics",
    settings: "Settings",
    technician: "Technician Panel",
    "my-complaints": "My Complaints",
    "my-bills": "My Bills & Renewal",
    "my-profile": "My Profile"
  };
  document.getElementById("pageTitle").textContent = titles[name] || name;

  switch (name) {
    case "dashboard": renderDashboard(area); break;
    case "customers": renderCustomers(area); break;
    case "billing": renderBilling(area); break;
    case "complaints": renderComplaints(area); break;
    case "users": renderUsers(area); break;
    case "network": renderNetwork(area); break;
    case "reports": renderReports(area); break;
    case "settings": renderSettings(area); break;
    case "technician": renderTechnician(area); break;
    case "my-complaints": renderMyComplaints(area); break;
    case "my-bills": renderMyBills(area); break;
    case "my-profile": renderMyProfile(area); break;
    default: area.innerHTML = `<div class="empty-state"><p>Module not found</p></div>`;
  }
}

/* ========== DASHBOARD ========== */
async function renderDashboard(area) {
  // Instant shell – no long full-page loading
  const now = new Date();
  const u = getCurrentUser() || user || {};
  const greet = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const dateStr = now.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  area.innerHTML = `
    <div class="dash-hero">
      <div class="dash-hero-text">
        <h2>${greet}, ${(u.name || "Admin").split(" ")[0]} 👋</h2>
        <p>${dateStr}</p>
      </div>
      <div class="dash-hero-actions">
        <button class="btn btn-primary btn-sm" onclick="loadModule('customers')">+ Customer</button>
        <button class="btn btn-outline btn-sm" onclick="loadModule('complaints')">Complaints</button>
        <button class="btn btn-outline btn-sm" onclick="loadModule('billing')">Billing</button>
      </div>
    </div>
    <div class="stats-grid dash-stats" id="dashStats">
      <div class="stat-card stat-modern accent-blue stat-click" onclick="loadModule('customers')"><div class="stat-icon blue">${iconUsers()}</div><div class="stat-info"><h3>…</h3><p>Total Customers</p></div></div>
      <div class="stat-card stat-modern accent-green stat-click" onclick="loadModule('customers')"><div class="stat-icon green">${iconCheck()}</div><div class="stat-info"><h3>…</h3><p>Active</p></div></div>
      <div class="stat-card stat-modern accent-red stat-click" onclick="loadModule('customers')"><div class="stat-icon red">${iconSuspend()}</div><div class="stat-info"><h3>…</h3><p>Suspended</p></div></div>
      <div class="stat-card stat-modern accent-teal stat-click" onclick="loadModule('billing')"><div class="stat-icon green">${iconBill()}</div><div class="stat-info"><h3>…</h3><p>Monthly Income</p></div></div>
      <div class="stat-card stat-modern accent-orange stat-click" onclick="loadModule('billing')"><div class="stat-icon orange">${iconBilling()}</div><div class="stat-info"><h3>…</h3><p>Pending Bills</p></div></div>
      <div class="stat-card stat-modern accent-purple stat-click" onclick="loadModule('complaints')"><div class="stat-icon purple">${iconComplaint()}</div><div class="stat-info"><h3>…</h3><p>Open Complaints</p></div></div>
    </div>
    <div class="dash-grid-2">
      <div class="card dash-card">
        <div class="card-header"><h3 class="card-title">📈 Revenue (6 months)</h3></div>
        <div class="revenue-chart" id="dashRevenueChart"><p style="color:var(--text-muted);font-size:0.85rem;">Loading…</p></div>
      </div>
      <div class="card dash-card">
        <div class="card-header"><h3 class="card-title">⚡ Quick Actions</h3></div>
        <div class="quick-actions">
          <button type="button" class="qa-btn" onclick="loadModule('customers')"><span>👥</span><span class="qa-label">Customers</span></button>
          <button type="button" class="qa-btn" onclick="loadModule('billing')"><span>💵</span><span class="qa-label">Billing</span></button>
          <button type="button" class="qa-btn" onclick="loadModule('complaints')"><span>🛠</span><span class="qa-label">Complaints</span></button>
          <button type="button" class="qa-btn" onclick="loadModule('reports')"><span>📊</span><span class="qa-label">Reports</span></button>
          <button type="button" class="qa-btn" onclick="loadModule('network')"><span>🌐</span><span class="qa-label">Network</span></button>
          <button type="button" class="qa-btn" onclick="loadModule('settings')"><span>⚙️</span><span class="qa-label">Settings</span></button>
          <button type="button" class="qa-btn qa-warn" onclick="sendDueReminders()"><span>📱</span><span class="qa-label">Due Reminders</span></button>
          <button type="button" class="qa-btn" onclick="loadModule('users')"><span>🔐</span><span class="qa-label">Users</span></button>
        </div>
      </div>
    </div>
    <div class="card dash-card">
      <div class="card-header">
        <h3 class="card-title">Recent Complaints</h3>
        <button class="btn btn-primary btn-sm" onclick="loadModule('complaints')">View All</button>
      </div>
      <div id="recentComplaintsList">Loading…</div>
    </div>
  `;

  // Parallel data load (fast)
  loadRecentComplaints();
  const currentMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const monthTotals = {};

  const [custRes, compRes, billRes] = await Promise.allSettled([
    db.collection("customers").get(),
    db.collection("complaints").get(),
    db.collection("bills").get()
  ]);

  let totalCustomers = 0, activeCustomers = 0, suspendedCustomers = 0;
  let openComplaints = 0, pendingComplaints = 0;
  let pendingBillsCount = 0, pendingBillsAmount = 0, monthlyIncome = 0;

  if (custRes.status === "fulfilled") {
    totalCustomers = custRes.value.size;
    custRes.value.forEach(doc => {
      const s = (doc.data().status || "active").toLowerCase();
      if (s === "active") activeCustomers++;
      else if (s === "suspended") suspendedCustomers++;
    });
  }
  if (compRes.status === "fulfilled") {
    compRes.value.forEach(doc => {
      const s = doc.data().status;
      if (s === "pending" || s === "in_progress") openComplaints++;
      if (s === "pending") pendingComplaints++;
    });
  }
  if (billRes.status === "fulfilled") {
    billRes.value.forEach(doc => {
      const b = doc.data();
      const amt = Number(b.amount) || 0;
      const late = Number(b.lateFee) || 0;
      if (b.status === "pending") {
        pendingBillsCount++;
        pendingBillsAmount += amt + late;
      }
      if (b.status === "paid" && b.month) {
        monthTotals[b.month] = (monthTotals[b.month] || 0) + amt + late;
        if (b.month === currentMonth) monthlyIncome += amt + late;
      }
    });
  }

  const statsEl = document.getElementById("dashStats");
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card stat-modern accent-blue stat-click" onclick="loadModule('customers')">
        <div class="stat-icon blue">${iconUsers()}</div>
        <div class="stat-info"><h3>${totalCustomers}</h3><p>Total Customers</p></div>
      </div>
      <div class="stat-card stat-modern accent-green stat-click" onclick="loadModule('customers')">
        <div class="stat-icon green">${iconCheck()}</div>
        <div class="stat-info"><h3>${activeCustomers}</h3><p>Active Connections</p></div>
      </div>
      <div class="stat-card stat-modern accent-red stat-click" onclick="loadModule('customers')">
        <div class="stat-icon red">${iconSuspend()}</div>
        <div class="stat-info"><h3>${suspendedCustomers}</h3><p>Suspended</p></div>
      </div>
      <div class="stat-card stat-modern accent-teal stat-click" onclick="loadModule('billing')">
        <div class="stat-icon green">${iconBill()}</div>
        <div class="stat-info"><h3>₨ ${monthlyIncome.toLocaleString()}</h3><p>Monthly Income</p></div>
      </div>
      <div class="stat-card stat-modern accent-orange stat-click" onclick="loadModule('billing')">
        <div class="stat-icon orange">${iconBilling()}</div>
        <div class="stat-info"><h3>${pendingBillsCount}</h3><p>Pending · ₨ ${pendingBillsAmount.toLocaleString()}</p></div>
      </div>
      <div class="stat-card stat-modern accent-purple stat-click" onclick="loadModule('complaints')">
        <div class="stat-icon purple">${iconComplaint()}</div>
        <div class="stat-info"><h3>${openComplaints}</h3><p>Open (${pendingComplaints} pending)</p></div>
      </div>`;
  }

  const chartMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    chartMonths.push({ key, label: d.toLocaleString("en", { month: "short" }), value: monthTotals[key] || 0 });
  }
  const maxChart = Math.max(...chartMonths.map(m => m.value), 1);
  const chartEl = document.getElementById("dashRevenueChart");
  if (chartEl) {
    chartEl.innerHTML = chartMonths.map(m => {
      const pct = m.value > 0 ? Math.max(8, (m.value / maxChart) * 100) : 0;
      return `<div class="rev-bar-col" title="${m.key}: ₨ ${m.value.toLocaleString()}">
        <div class="rev-bar-wrap"><div class="rev-bar" style="height:${pct}%"></div></div>
        <span class="rev-label">${m.label}</span>
        <span class="rev-val">${m.value ? (m.value >= 1000 ? "₨" + Math.round(m.value / 1000) + "k" : "₨" + m.value) : "0"}</span>
      </div>`;
    }).join("");
  }
}

/** Bulk WhatsApp due reminders for pending bills (opens first few) */
async function sendDueReminders() {
  try {
    const snap = await db.collection("bills").get();
    const pending = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (d.status === "pending" && d.customerPhone) pending.push({ id: doc.id, ...d });
    });
    if (pending.length === 0) {
      showToast("No pending bills with phone numbers", "info");
      return;
    }
    let tpl = "Assalam o Alaikum {name}, aapka bill {month} – ₨{amount} pending hai. FiberHub ISP.";
    try {
      const t = await db.collection("settings").doc("templates").get();
      if (t.exists && t.data().billReminder) tpl = t.data().billReminder;
    } catch (e) {}

    const list = pending.slice(0, 15).map(b => {
      const total = (Number(b.amount) || 0) + (Number(b.lateFee) || 0);
      const msg = applyTemplate(tpl, {
        name: b.customerName || "Customer",
        month: b.month || "",
        amount: total,
        phone: b.customerPhone || "",
        package: "", issue: "", status: "pending", email: "", password: ""
      });
      return { phone: b.customerPhone, name: b.customerName, msg, total, month: b.month };
    });

    showModal("Due Bill Reminders (" + pending.length + " pending)", `
      <p style="margin-bottom:12px;color:var(--text-muted);font-size:0.9rem;">Har customer ke liye WhatsApp khulega. Pehle 15 list mein hain.</p>
      <div style="max-height:320px;overflow-y:auto;">
        ${list.map((x, i) => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="font-size:0.9rem;">
              <strong>${x.name || "-"}</strong><br>
              <small>${x.month || ""} · ₨ ${x.total} · ${x.phone}</small>
            </div>
            <button class="btn btn-sm btn-outline" style="color:#25D366;flex-shrink:0;" onclick="openWhatsApp('${x.phone}', ${JSON.stringify(x.msg)})">WA</button>
          </div>
        `).join("")}
      </div>
    `, `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').classList.remove('active')">Close</button>`);
    logActivity("billing", "Opened due reminders list (" + pending.length + ")");
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function loadRecentComplaints() {
  const el = document.getElementById("recentComplaintsList");
  if (!el) return;

  try {
    let snap;
    try {
      snap = await db.collection("complaints").orderBy("createdAt", "desc").limit(6).get();
    } catch (e) {
      snap = await db.collection("complaints").limit(20).get();
    }

    let docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    docs = docs.slice(0, 6);

    if (docs.length === 0) {
      el.innerHTML = `<p style="color:var(--text-muted);padding:20px;text-align:center;">No complaints yet</p>`;
      return;
    }

    el.innerHTML = `<div class="complaint-cards">${docs.map(d => {
      const date = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : "-";
      return `<div class="complaint-card" style="cursor:pointer;" onclick="viewComplaint('${d.id}')">
        <div class="complaint-card-header">
          <div>
            <strong>${d.issue || "Complaint"}</strong>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${d.customerName || "-"} · ${date}</div>
          </div>
          <span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span>
        </div>
      </div>`;
    }).join("")}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:12px;">Error loading complaints.</p>`;
  }
}

/* ========== COMPLAINTS (Staff) ========== */
async function renderComplaints(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">All Complaints</h3>
        <div style="display:flex;gap:8px;">
          <select id="filterStatus" class="btn btn-outline" style="padding:8px 12px;">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button class="btn btn-primary" onclick="loadComplaintsList()">Refresh</button>
        </div>
      </div>
      <div id="complaintsList">Loading complaints...</div>
    </div>
  `;

  document.getElementById("filterStatus").addEventListener("change", loadComplaintsList);
  loadComplaintsList();
}

async function loadComplaintsList() {
  const el = document.getElementById("complaintsList");
  if (!el) return;
  el.innerHTML = `<p style="text-align:center;padding:30px;color:var(--text-muted);">Loading...</p>`;

  try {
    const filter = document.getElementById("filterStatus")?.value || "all";
    let query = db.collection("complaints").orderBy("createdAt", "desc");

    const snap = await query.get();
    let docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

    if (filter !== "all") {
      docs = docs.filter(d => d.status === filter);
    }

    if (docs.length === 0) {
      el.innerHTML = `<div class="empty-state"><p>No complaints found</p></div>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead>
        <tr>
          <th>ID</th><th>Customer</th><th>Phone</th><th>Issue</th>
          <th>Status</th><th>Technician</th><th>Date</th><th>Actions</th>
        </tr>
      </thead><tbody>`;

    docs.forEach(d => {
      const date = d.createdAt ? d.createdAt.toDate().toLocaleString() : "-";
      const phone = d.customerPhone || "";
      html += `<tr>
        <td title="${d.id}">${d.id.slice(0, 8)}</td>
        <td>${d.customerName || "-"}<br><small style="color:var(--text-muted)">${d.customerEmail || ""}</small></td>
        <td>${phone || "-"}</td>
        <td>${d.issue || "-"}</td>
        <td><span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span></td>
        <td>${d.technicianName || "Not Assigned"}</td>
        <td>${date}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-outline" onclick="viewComplaint('${d.id}')">View</button>
          <button class="btn btn-sm btn-primary" onclick="updateComplaintStatus('${d.id}')">Status</button>
          ${phone ? `<button class="btn btn-sm btn-outline" onclick="openWhatsApp('${phone}', 'Assalam o Alaikum ${d.customerName || ""}, aapki complaint (${d.issue || ""}) ke bare mein FiberHub ISP se rabta kar rahe hain.')" title="WhatsApp" style="color:#25D366;">WA</button>` : ""}
          <button class="btn btn-sm btn-outline" onclick="deleteComplaint('${d.id}')" style="color:var(--danger);">Del</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    console.error(e);
    el.innerHTML = `<p style="color:var(--danger);padding:20px;">Error: ${e.message}<br>Make sure Firestore Database is created in Firebase Console.</p>`;
  }
}

async function deleteComplaint(id) {
  if (!confirm("Delete this complaint permanently?")) return;
  try {
    await db.collection("complaints").doc(id).delete();
    showToast("Complaint deleted", "success");
    loadComplaintsList();
  } catch (e) {
    showToast("Delete failed: " + e.message, "error");
  }
}

async function viewComplaint(id) {
  try {
    const doc = await db.collection("complaints").doc(id).get();
    if (!doc.exists) {
      showToast("Complaint not found", "error");
      return;
    }
    const d = doc.data();
    const date = d.createdAt ? d.createdAt.toDate().toLocaleString() : "-";

    // Try to load full customer data
    let extraCustomer = "";
    if (d.customerUid || d.customerEmail) {
      try {
        let custSnap = null;
        if (d.customerUid) {
          const q = await db.collection("customers").where("uid", "==", d.customerUid).limit(1).get();
          if (!q.empty) custSnap = q.docs[0];
        }
        if (!custSnap && d.customerEmail) {
          const q = await db.collection("customers").where("email", "==", d.customerEmail).limit(1).get();
          if (!q.empty) custSnap = q.docs[0];
        }
        if (custSnap) {
          const c = custSnap.data();
          extraCustomer = `
            <div style="background:var(--bg-main);padding:12px;border-radius:8px;margin:8px 0;">
              <strong>Full Customer Info</strong>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;font-size:0.9em;">
                <div>Package: <b>${c.package || d.customerPackage || "-"}</b></div>
                <div>Rent: <b>₨ ${c.rent || d.customerRent || 0}</b></div>
                <div>ONU: <b>${c.onuSerial || d.customerOnu || "-"}</b></div>
                <div>Port: <b>${c.fiberPort || d.customerPort || "-"}</b></div>
                <div>Area: <b>${c.area || d.customerArea || "-"}</b></div>
                <div>Status: <b>${c.status || d.customerStatus || "-"}</b></div>
                <div style="grid-column:1/-1;">Address: <b>${c.address || d.customerAddress || "-"}</b></div>
                <div style="grid-column:1/-1;">CNIC: <b>${c.cnic || d.customerCnic || "-"}</b></div>
              </div>
            </div>`;
        } else if (d.customerPackage || d.customerOnu || d.customerArea) {
          extraCustomer = `
            <div style="background:var(--bg-main);padding:12px;border-radius:8px;margin:8px 0;">
              <strong>Customer Info (from complaint)</strong>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;font-size:0.9em;">
                <div>Package: <b>${d.customerPackage || "-"}</b></div>
                <div>Rent: <b>₨ ${d.customerRent || 0}</b></div>
                <div>ONU: <b>${d.customerOnu || "-"}</b></div>
                <div>Port: <b>${d.customerPort || "-"}</b></div>
                <div>Area: <b>${d.customerArea || "-"}</b></div>
                <div>Status: <b>${d.customerStatus || "-"}</b></div>
                <div style="grid-column:1/-1;">Address: <b>${d.customerAddress || "-"}</b></div>
                <div style="grid-column:1/-1;">CNIC: <b>${d.customerCnic || "-"}</b></div>
              </div>
            </div>`;
        }
      } catch (e) {}
    }

    const notes = (d.notes || []).map(n => 
      `<div style="padding:8px 0;border-bottom:1px solid var(--border);">
        <strong>${n.by || "System"}</strong> <small style="color:var(--text-muted)">${n.at ? new Date(n.at).toLocaleString() : ""}</small>
        <p style="margin-top:4px;">${n.text}</p>
      </div>`
    ).join("") || "<p style='color:var(--text-muted)'>No notes yet</p>";

    const phone = d.customerPhone || "";
    const waMsg = `Assalam o Alaikum ${d.customerName || ""}, aapki complaint (${d.issue || ""}) – Status: ${statusLabel(d.status)}. FiberHub ISP.`;

    const isStaff = user && user.role && user.role !== "customer";
    const footerBtns = `
      ${isStaff ? `<button class="btn btn-primary" onclick="document.querySelector('.modal-overlay').classList.remove('active'); updateComplaintStatus('${id}')">Update Status</button>` : ""}
      ${phone && isStaff ? `<button class="btn btn-outline" style="color:#25D366;" onclick="openWhatsApp('${phone}', '${waMsg.replace(/'/g, "\\'")}')">WhatsApp</button>` : ""}
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').classList.remove('active')">Close</button>
    `;

    showModal("Complaint Details", `
      <div style="display:grid;gap:10px;">
        <div><strong>ID:</strong> ${id.slice(0, 12)}...</div>
        <div><strong>Customer:</strong> ${d.customerName || "-"} (${d.customerEmail || "-"})</div>
        <div><strong>Phone:</strong> ${phone || "-"}
          ${phone && isStaff ? `<button class="btn btn-sm btn-outline" style="margin-left:8px;color:#25D366;" onclick="openWhatsApp('${phone}', '${waMsg.replace(/'/g, "\\'")}')">WhatsApp</button>` : ""}
        </div>
        ${extraCustomer}
        <div><strong>Issue:</strong> ${d.issue}</div>
        <div><strong>Description:</strong><br>${d.description || "-"}</div>
        <div><strong>Status:</strong> <span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span></div>
        <div><strong>Technician:</strong> ${d.technicianName || "Not Assigned"}</div>
        <div><strong>Created:</strong> ${date}</div>
        <div><strong>Notes / Updates:</strong>${notes}</div>
      </div>
    `, footerBtns);
  } catch (e) {
    console.error(e);
    showToast("Error loading complaint", "error");
  }
}

async function updateComplaintStatus(id) {
  // Quick status buttons + notes (Progress / Pending / Resolved)
  const body = `
    <div style="display:grid;gap:14px;">
      <div class="form-field">
        <label>Select Status *</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:6px;">
          <button type="button" class="btn btn-outline status-btn" data-status="pending" style="padding:12px 8px;font-size:0.85rem;">
            ⏳ Pending
          </button>
          <button type="button" class="btn btn-outline status-btn" data-status="in_progress" style="padding:12px 8px;font-size:0.85rem;">
            🔧 In Progress
          </button>
          <button type="button" class="btn btn-outline status-btn" data-status="resolved" style="padding:12px 8px;font-size:0.85rem;">
            ✅ Resolved
          </button>
        </div>
        <input type="hidden" id="updStatus" value="in_progress" />
      </div>
      <div class="form-field">
        <label>Assign Technician</label>
        <select id="updTech" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);">
          <option value="">-- Select Technician (optional) --</option>
        </select>
      </div>
      <div class="form-field">
        <label>Note / Response for Customer *</label>
        <textarea id="updNote" rows="3" placeholder="Customer ko kya message jaye... (e.g. Team visit kar rahi hai, 2 ghante mein theek ho jayega)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);"></textarea>
      </div>
      <div style="font-size:0.85em;color:var(--text-muted);">
        Status change + note ke baad customer ko in-app notification chali jayegi. Complaint customer ke "My Complaints" se nahi gayab hogi.
      </div>
    </div>
  `;
  showModal("Update Complaint Status", body, `
    <button class="btn btn-primary" id="btnSaveStatus">Save & Notify Customer</button>
    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').classList.remove('active')">Cancel</button>
  `);

  // Load real technicians into dropdown
  (async () => {
    const sel = document.getElementById("updTech");
    if (!sel) return;
    try {
      const snap = await db.collection("users").get();
      snap.forEach(doc => {
        const u = doc.data();
        if (u.role === "technician" || u.role === "admin") {
          const opt = document.createElement("option");
          opt.value = JSON.stringify({ id: doc.id, name: u.name || "Technician" });
          opt.textContent = (u.name || "Technician") + (u.phone ? " (" + u.phone + ")" : "");
          if (user && user.uid === doc.id) opt.selected = true;
          sel.appendChild(opt);
        }
      });
    } catch (e) {
      // fallback free-text not needed; select stays empty
    }
  })();

  // Quick status button selection
  const statusBtns = document.querySelectorAll(".status-btn");
  const statusInput = document.getElementById("updStatus");
  statusBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      statusBtns.forEach(b => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-outline");
        b.style.borderColor = "";
        b.style.background = "";
      });
      btn.classList.remove("btn-outline");
      btn.classList.add("btn-primary");
      statusInput.value = btn.dataset.status;
    });
  });
  // Default highlight In Progress
  const defaultBtn = document.querySelector('.status-btn[data-status="in_progress"]');
  if (defaultBtn) {
    defaultBtn.classList.remove("btn-outline");
    defaultBtn.classList.add("btn-primary");
  }

  document.getElementById("btnSaveStatus").onclick = async () => {
    const status = document.getElementById("updStatus").value;
    const techVal = document.getElementById("updTech").value;
    const note = document.getElementById("updNote").value.trim() || `Status changed to ${statusLabel(status)}`;

    if (!note) {
      showToast("Please write a note for the customer", "error");
      return;
    }

    try {
      const docRef = db.collection("complaints").doc(id);
      const doc = await docRef.get();
      if (!doc.exists) {
        showToast("Complaint not found", "error");
        return;
      }
      const d = doc.data();

      // IMPORTANT: only update status/notes/tech — NEVER touch customerUid
      const update = {
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (techVal) {
        try {
          const t = JSON.parse(techVal);
          update.technicianName = t.name;
          update.technicianId = t.id;
        } catch (e) {
          update.technicianName = techVal;
        }
      }

      const noteObj = {
        text: note,
        by: user.name || "Staff",
        at: Date.now()
      };

      await docRef.update({
        ...update,
        notes: firebase.firestore.FieldValue.arrayUnion(noteObj)
      });

      // In-app notification for customer
      if (d.customerUid) {
        await createNotification(
          d.customerUid,
          `Complaint ${statusLabel(status)}`,
          note,
          "complaint",
          id
        );
      }

      document.querySelector(".modal-overlay")?.classList.remove("active");
      showToast("Status updated + Customer notified", "success");
      logActivity("complaint", "Complaint " + id.slice(0, 8) + " → " + statusLabel(status));
      if (typeof loadComplaintsList === "function") loadComplaintsList();
      if (typeof loadRecentComplaints === "function") loadRecentComplaints();
      if (typeof loadTechJobs === "function") loadTechJobs();
    } catch (e) {
      console.error(e);
      showToast("Update failed: " + e.message, "error");
    }
  };
}

/* ========== CUSTOMER: My Complaints ========== */
async function renderMyComplaints(area) {
  area.innerHTML = `
    <div id="customerNotifications" class="card" style="display:none;border-left:4px solid var(--primary);">
      <div class="card-header">
        <h3 class="card-title">🔔 Notifications</h3>
        <button class="btn btn-outline btn-sm" onclick="markAllNotificationsRead()">Mark all read</button>
      </div>
      <div id="notificationsList"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">My Complaints</h3>
        <button class="btn btn-primary" onclick="showNewComplaintForm()">+ New Complaint</button>
      </div>
      <div id="myComplaintsList">Loading...</div>
    </div>

    <div id="newComplaintForm" style="display:none;" class="card">
      <div class="card-header">
        <h3 class="card-title">Submit New Complaint</h3>
        <button class="btn btn-outline btn-sm" onclick="hideNewComplaintForm()">Cancel</button>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Issue Type *</label>
          <select id="complaintIssue">
            <option value="">Select issue</option>
            <option value="No Internet">No Internet</option>
            <option value="Slow Speed">Slow Speed</option>
            <option value="Frequent Disconnection">Frequent Disconnection</option>
            <option value="Fiber Cut / Cable Issue">Fiber Cut / Cable Issue</option>
            <option value="ONU / Router Problem">ONU / Router Problem</option>
            <option value="Billing Issue">Billing Issue</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-field">
          <label>Your Phone</label>
          <input type="text" id="complaintPhone" placeholder="03XXXXXXXXX" value="${user.phone || ""}" />
        </div>
      </div>
      <div class="form-field" style="margin-bottom:16px;">
        <label>Description *</label>
        <textarea id="complaintDesc" rows="4" placeholder="Describe your problem in detail..."></textarea>
      </div>
      <button class="btn btn-primary" id="submitComplaintBtn" onclick="submitComplaint()">Submit Complaint</button>
    </div>
  `;

  loadMyComplaints();
  loadCustomerNotifications();
}

function showNewComplaintForm() {
  document.getElementById("newComplaintForm").style.display = "block";
}

function hideNewComplaintForm() {
  document.getElementById("newComplaintForm").style.display = "none";
}

async function loadCustomerNotifications() {
  const box = document.getElementById("customerNotifications");
  const list = document.getElementById("notificationsList");
  if (!box || !list) return;

  try {
    const snap = await db.collection("notifications")
      .where("customerUid", "==", user.uid)
      .where("read", "==", false)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    if (snap.empty) {
      // fallback without composite index
      const snap2 = await db.collection("notifications")
        .where("customerUid", "==", user.uid)
        .limit(20)
        .get();
      let items = [];
      snap2.forEach(doc => {
        const d = doc.data();
        if (!d.read) items.push({ id: doc.id, ...d });
      });
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      if (items.length === 0) {
        box.style.display = "none";
        return;
      }
      box.style.display = "block";
      list.innerHTML = items.slice(0, 8).map(n => `
        <div style="padding:10px 0;border-bottom:1px solid var(--border);">
          <strong>${n.title || "Update"}</strong>
          <p style="margin:4px 0;color:var(--text-secondary);">${n.message || ""}</p>
          <small style="color:var(--text-muted);">${n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleString() : ""}</small>
        </div>
      `).join("");
      return;
    }

    box.style.display = "block";
    let html = "";
    snap.forEach(doc => {
      const n = doc.data();
      html += `
        <div style="padding:10px 0;border-bottom:1px solid var(--border);">
          <strong>${n.title || "Update"}</strong>
          <p style="margin:4px 0;color:var(--text-secondary);">${n.message || ""}</p>
          <small style="color:var(--text-muted);">${n.createdAt ? n.createdAt.toDate().toLocaleString() : ""}</small>
        </div>`;
    });
    list.innerHTML = html;
  } catch (e) {
    console.warn("Notifications load:", e);
    box.style.display = "none";
  }
}

async function markAllNotificationsRead() {
  try {
    const snap = await db.collection("notifications")
      .where("customerUid", "==", user.uid)
      .where("read", "==", false)
      .get();
    const batch = db.batch();
    snap.forEach(doc => batch.update(doc.ref, { read: true }));
    // fallback if index missing
    if (snap.empty) {
      const snap2 = await db.collection("notifications").where("customerUid", "==", user.uid).get();
      snap2.forEach(doc => {
        if (!doc.data().read) batch.update(doc.ref, { read: true });
      });
    }
    await batch.commit();
    showToast("All notifications marked read", "success");
    loadCustomerNotifications();
  } catch (e) {
    showToast("Could not mark read", "error");
  }
}

async function loadMyComplaints() {
  const el = document.getElementById("myComplaintsList");
  if (!el) return;

  // Helper to render complaint cards (mobile-friendly, no cut-off)
  function renderComplaintCards(docs) {
    if (!docs.length) {
      el.innerHTML = `<div class="empty-state"><p>You have not submitted any complaints yet.<br>Click "+ New Complaint" to submit one.</p></div>`;
      return;
    }
    let html = `<div class="complaint-cards">`;
    docs.forEach(d => {
      const id = d.id || d.docId;
      const date = d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toLocaleString() : new Date(d.createdAt.seconds * 1000).toLocaleString()) : "-";
      const lastNote = (d.notes && d.notes.length) ? d.notes[d.notes.length - 1] : null;
      const lastNoteText = lastNote ? lastNote.text : "";
      const lastNoteBy = lastNote ? (lastNote.by || "Staff") : "";
      html += `
        <div class="complaint-card">
          <div class="complaint-card-header">
            <div>
              <strong style="font-size:0.95rem;">${d.issue || "Complaint"}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">ID: ${(id || "").slice(0, 10)} • ${date}</div>
            </div>
            <span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span>
          </div>
          ${d.description ? `<p class="complaint-desc">${d.description}</p>` : ""}
          ${d.technicianName ? `<div style="font-size:0.85rem;margin-top:6px;">Technician: <b>${d.technicianName}</b></div>` : ""}
          ${lastNoteText ? `
            <div class="complaint-last-note">
              <div style="font-size:0.75rem;color:var(--text-muted);">Latest update by ${lastNoteBy}:</div>
              <div style="font-size:0.9rem;margin-top:2px;">${lastNoteText}</div>
            </div>` : ""}
          <div style="margin-top:12px;">
            <button class="btn btn-sm btn-outline" onclick="viewComplaint('${id}')">View Full Details</button>
          </div>
        </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
  }

  try {
    const snap = await db.collection("complaints")
      .where("customerUid", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><p>You have not submitted any complaints yet.<br>Click "+ New Complaint" to submit one.</p></div>`;
      return;
    }

    const docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    renderComplaintCards(docs);
  } catch (e) {
    // Fallback if composite index missing (customerUid + createdAt)
    console.warn("MyComplaints orderBy failed (index?), using fallback:", e.message);
    try {
      const snap = await db.collection("complaints")
        .where("customerUid", "==", user.uid)
        .get();

      if (snap.empty) {
        el.innerHTML = `<div class="empty-state"><p>No complaints yet.</p></div>`;
        return;
      }

      let docs = [];
      snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderComplaintCards(docs);
    } catch (e2) {
      el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading complaints. Create Firestore database + composite index if needed.</p>`;
    }
  }
}

async function submitComplaint() {
  const issue = document.getElementById("complaintIssue").value;
  const phone = document.getElementById("complaintPhone").value.trim();
  const description = document.getElementById("complaintDesc").value.trim();
  const btn = document.getElementById("submitComplaintBtn");

  if (!issue) {
    showToast("Please select an issue type", "error");
    return;
  }
  if (!description) {
    showToast("Please write a description", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    // Attach FULL customer profile so staff sees everything in complaint
    let extra = {};
    let custName = user.name;
    let custPhone = phone || user.phone || "";
    try {
      const q = await db.collection("customers").where("uid", "==", user.uid).limit(1).get();
      if (!q.empty) {
        const c = q.docs[0].data();
        custName = c.name || user.name;
        custPhone = phone || c.phone || user.phone || "";
        extra = {
          customerId: q.docs[0].id,
          customerPackage: c.package || "",
          customerArea: c.area || "",
          customerAddress: c.address || "",
          customerOnu: c.onuSerial || "",
          customerPort: c.fiberPort || "",
          customerCnic: c.cnic || "",
          customerRent: c.rent || 0,
          customerStatus: c.status || "active",
          customerGps: c.gps || "",
          customerEmail: c.email || user.email || ""
        };
      }
    } catch (e) { console.warn("Customer lookup for complaint:", e); }

    const complaint = {
      customerUid: user.uid,
      customerName: custName,
      customerEmail: user.email,
      customerPhone: custPhone,
      issue: issue,
      description: description,
      status: "pending",
      technicianId: null,
      technicianName: null,
      notes: [{
        text: "Complaint submitted by customer",
        by: custName,
        at: Date.now()
      }],
      ...extra,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection("complaints").add(complaint);
    showToast("Complaint submitted successfully! ID: " + ref.id.slice(0, 8), "success");
    logActivity("complaint", "New complaint submitted: " + issue + " (" + ref.id.slice(0, 8) + ")");
    
    hideNewComplaintForm();
    document.getElementById("complaintIssue").value = "";
    document.getElementById("complaintDesc").value = "";
    loadMyComplaints();
  } catch (e) {
    console.error(e);
    showToast("Failed to submit: " + e.message, "error");
  }

  btn.disabled = false;
  btn.textContent = "Submit Complaint";
}

/* ========== CUSTOMERS MODULE ========== */
async function renderCustomers(area) {
  area.innerHTML = `
    <div class="card" id="customerFormCard" style="display:none;">
      <div class="card-header">
        <h3 class="card-title" id="customerFormTitle">New Customer</h3>
        <button class="btn btn-outline btn-sm" onclick="hideCustomerForm()">Cancel</button>
      </div>
      <input type="hidden" id="editCustomerId" value="" />
      <div class="form-row">
        <div class="form-field"><label>Full Name *</label><input id="cName" placeholder="Customer Name" /></div>
        <div class="form-field"><label>CNIC</label><input id="cCnic" placeholder="XXXXX-XXXXXXX-X" /></div>
        <div class="form-field"><label>Phone *</label><input id="cPhone" placeholder="03XXXXXXXXX" /></div>
        <div class="form-field"><label>Email * (Login ID)</label><input id="cEmail" placeholder="customer@email.com" /></div>
        <div class="form-field" id="cPasswordField"><label>Login Password *</label><input id="cPassword" type="text" placeholder="Min 6 characters" /></div>
        <div class="form-field"><label>Package</label>
          <select id="cPackage">
            <option value="10 Mbps">10 Mbps</option>
            <option value="20 Mbps">20 Mbps</option>
            <option value="30 Mbps">30 Mbps</option>
            <option value="50 Mbps">50 Mbps</option>
            <option value="100 Mbps">100 Mbps</option>
          </select>
        </div>
        <div class="form-field"><label>Monthly Rent</label><input id="cRent" type="number" placeholder="2500" value="2500" /></div>
        <div class="form-field"><label>ONU Serial</label><input id="cOnu" placeholder="ONU Serial Number" /></div>
        <div class="form-field"><label>Fiber Port</label><input id="cPort" placeholder="PON-1 / Port-5" /></div>
        <div class="form-field"><label>Area</label><input id="cArea" placeholder="Block / Area Name" /></div>
        <div class="form-field"><label>GPS Location</label><input id="cGps" placeholder="Lat, Long" /></div>
        <div class="form-field"><label>Status</label>
          <select id="cStatus">
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>
      <div class="form-field" style="margin-bottom:16px;"><label>Address</label><textarea id="cAddress" rows="2" placeholder="Full Address"></textarea></div>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;" id="cLoginHint">Email + Password se customer app mein login kar sake ga</p>
      <button class="btn btn-primary" id="saveCustomerBtn" onclick="saveCustomer()">Save Customer + Create Login</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Customers</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="document.getElementById('csvImportFile').click()">Import CSV</button>
          <input type="file" id="csvImportFile" accept=".csv,text/csv" style="display:none" onchange="importCustomersCSV(event)" />
          <button class="btn btn-outline btn-sm" onclick="exportCustomersCSV()">Export CSV</button>
          <button class="btn btn-primary" onclick="showCustomerForm()">+ New Customer</button>
        </div>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-field"><input type="text" id="customerSearch" placeholder="Search name, CNIC, phone, ONU..." oninput="loadCustomersList()" /></div>
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">CSV columns: name,phone,email,cnic,package,rent,area,address,onuSerial,fiberPort,status (login alag se banao)</p>
      <div id="customersList">Loading...</div>
    </div>
  `;
  loadCustomersList();
}

async function exportCustomersCSV() {
  try {
    const snap = await db.collection("customers").get();
    const headers = ["name","phone","email","cnic","package","rent","area","address","onuSerial","fiberPort","status"];
    const rows = [headers.join(",")];
    snap.forEach(doc => {
      const d = doc.data();
      rows.push(headers.map(h => {
        let v = d[h] != null ? String(d[h]) : "";
        if (v.includes(",") || v.includes('"')) v = '"' + v.replace(/"/g, '""') + '"';
        return v;
      }).join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fiberhub-customers-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Customers CSV exported", "success");
    logActivity("backup", "Customers CSV exported");
  } catch (e) {
    showToast("Export failed: " + e.message, "error");
  }
}

async function importCustomersCSV(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      showToast("CSV empty or invalid", "error");
      return;
    }
    const parseRow = (line) => {
      const out = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === "," && !inQ) { out.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      out.push(cur.trim());
      return out;
    };
    const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ""));
    const mapKey = (h) => {
      if (h.includes("name") && !h.includes("user")) return "name";
      if (h.includes("phone") || h === "mobile") return "phone";
      if (h.includes("email")) return "email";
      if (h.includes("cnic")) return "cnic";
      if (h.includes("package") || h.includes("pkg")) return "package";
      if (h.includes("rent") || h.includes("amount")) return "rent";
      if (h.includes("area")) return "area";
      if (h.includes("address")) return "address";
      if (h.includes("onu")) return "onuSerial";
      if (h.includes("port") || h.includes("fiber")) return "fiberPort";
      if (h.includes("status")) return "status";
      if (h.includes("gps")) return "gps";
      return null;
    };
    let added = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        const key = mapKey(h);
        if (key) row[key] = cols[idx] || "";
      });
      if (!row.name || !row.phone) continue;
      const data = {
        name: row.name,
        phone: row.phone,
        email: (row.email || "").toLowerCase(),
        cnic: row.cnic || "",
        package: row.package || "20 Mbps",
        rent: Number(row.rent) || 0,
        area: row.area || "",
        address: row.address || "",
        onuSerial: row.onuSerial || "",
        fiberPort: row.fiberPort || "",
        gps: row.gps || "",
        status: (row.status || "active").toLowerCase() === "suspended" ? "suspended" : "active",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid,
        imported: true
      };
      await db.collection("customers").add(data);
      added++;
    }
    showToast(added + " customers imported (login alag se create karein)", "success");
    logActivity("customer", "CSV import: " + added + " customers");
    loadCustomersList();
  } catch (e) {
    showToast("Import failed: " + e.message, "error");
  }
  event.target.value = "";
}

async function fillPackagesSelect(selectedName) {
  const sel = document.getElementById("cPackage");
  if (!sel) return;
  const current = selectedName || sel.value;
  try {
    const snap = await db.collection("packages").get();
    let opts = [];
    snap.forEach(doc => {
      const p = doc.data();
      opts.push({ name: p.name, rent: p.rent || 0 });
    });
    opts.sort((a, b) => a.rent - b.rent);
    if (opts.length === 0) {
      opts = [
        { name: "10 Mbps", rent: 1500 },
        { name: "20 Mbps", rent: 2500 },
        { name: "30 Mbps", rent: 3000 },
        { name: "50 Mbps", rent: 4000 },
        { name: "100 Mbps", rent: 6000 }
      ];
    }
    sel.innerHTML = opts.map(o =>
      `<option value="${o.name}" data-rent="${o.rent}">${o.name} — ₨ ${o.rent}</option>`
    ).join("");
    if (current) sel.value = current;
    // Auto-fill rent when package changes
    sel.onchange = () => {
      const opt = sel.options[sel.selectedIndex];
      if (opt && opt.dataset.rent) {
        const rentEl = document.getElementById("cRent");
        if (rentEl) rentEl.value = opt.dataset.rent;
      }
    };
  } catch (e) {}
}

function showCustomerForm(id) {
  document.getElementById("customerFormCard").style.display = "block";
  document.getElementById("customerFormTitle").textContent = id ? "Edit Customer" : "New Customer";
  document.getElementById("editCustomerId").value = id || "";
  const passField = document.getElementById("cPasswordField");
  const hint = document.getElementById("cLoginHint");
  const saveBtn = document.getElementById("saveCustomerBtn");
  fillPackagesSelect(id ? undefined : "20 Mbps");
  if (!id) {
    ["cName","cCnic","cPhone","cEmail","cPassword","cOnu","cPort","cArea","cGps","cAddress"].forEach(i => {
      const el = document.getElementById(i); if (el) el.value = "";
    });
    document.getElementById("cRent").value = "2500";
    document.getElementById("cStatus").value = "active";
    if (passField) passField.style.display = "block";
    if (hint) hint.style.display = "block";
    if (saveBtn) saveBtn.textContent = "Save Customer + Create Login";
  } else {
    if (passField) passField.style.display = "none";
    if (hint) hint.style.display = "none";
    if (saveBtn) saveBtn.textContent = "Update Customer";
  }
}

function hideCustomerForm() {
  document.getElementById("customerFormCard").style.display = "none";
}

async function saveCustomer() {
  const id = document.getElementById("editCustomerId").value;
  const data = {
    name: document.getElementById("cName").value.trim(),
    cnic: document.getElementById("cCnic").value.trim(),
    phone: document.getElementById("cPhone").value.trim(),
    email: document.getElementById("cEmail").value.trim().toLowerCase(),
    package: document.getElementById("cPackage").value,
    rent: Number(document.getElementById("cRent").value) || 0,
    onuSerial: document.getElementById("cOnu").value.trim(),
    fiberPort: document.getElementById("cPort").value.trim(),
    area: document.getElementById("cArea").value.trim(),
    gps: document.getElementById("cGps").value.trim(),
    address: document.getElementById("cAddress").value.trim(),
    status: document.getElementById("cStatus").value,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const password = (document.getElementById("cPassword")?.value || "").trim();

  if (!data.name || !data.phone) {
    showToast("Name and Phone required", "error");
    return;
  }

  const btn = document.getElementById("saveCustomerBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    if (id) {
      await db.collection("customers").doc(id).update(data);
      showToast("Customer updated", "success");
      logActivity("customer", "Customer updated: " + data.name);
    } else {
      // New customer - create login if email + password given
      if (!data.email || !password) {
        showToast("Email and Password required for customer login", "error");
        btn.disabled = false;
        btn.textContent = "Save Customer + Create Login";
        return;
      }
      if (password.length < 6) {
        showToast("Password min 6 characters", "error");
        btn.disabled = false;
        btn.textContent = "Save Customer + Create Login";
        return;
      }

      // Create Auth account via secondary app
      const result = await adminCreateUser(data.name, data.email, data.phone, password, "customer");
      if (!result.success) {
        showToast(result.error || "Login create failed", "error");
        btn.disabled = false;
        btn.textContent = "Save Customer + Create Login";
        return;
      }

      data.uid = result.uid;
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.createdBy = user.uid;
      await db.collection("customers").add(data);

      showToast("Customer + Login created! Email: " + data.email + " | Password: " + password, "success");
      logActivity("customer", "New customer created: " + data.name);

      // Welcome message via WhatsApp + SMS (account / connection ready)
      const welcomeMsg = await buildWelcomeMessage(data.name, data.package, data.email, password);
      if (data.phone) {
        // Show action modal so staff can send both
        showModal("Account Created — Notify Customer", `
          <p style="margin-bottom:12px;">Customer: <strong>${data.name}</strong><br>
          Email: <strong>${data.email}</strong><br>
          Password: <strong>${password}</strong></p>
          <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px;">Neeche se WhatsApp aur SMS bhej sakte ho — customer ko pata chal jayega account/connection ban gaya.</p>
          <pre style="white-space:pre-wrap;background:var(--bg-main);padding:10px;border-radius:8px;font-size:0.85rem;">${welcomeMsg}</pre>
        `, `
          <button class="btn btn-primary" style="background:#25D366;border-color:#25D366;" onclick="openWhatsApp('${data.phone}', ${JSON.stringify(welcomeMsg)}); this.closest('.modal-overlay').classList.remove('active');">WhatsApp</button>
          <button class="btn btn-outline" onclick="openSMS('${data.phone}', ${JSON.stringify(welcomeMsg)}); this.closest('.modal-overlay').classList.remove('active');">SMS</button>
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').classList.remove('active')">Close</button>
        `);
      } else {
        alert("Customer Login Details:\n\nEmail: " + data.email + "\nPassword: " + password + "\n\nPhone nahi — SMS/WA nahi bhej sakte.");
      }
    }
    hideCustomerForm();
    loadCustomersList();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
  btn.disabled = false;
  btn.textContent = id ? "Update Customer" : "Save Customer + Create Login";
}

async function resetCustomerPassword(email) {
  if (!email) {
    email = prompt("Customer email for password reset:");
  }
  if (!email) return;
  try {
    await auth.sendPasswordResetEmail(email.trim().toLowerCase());
    showToast("Password reset email sent to " + email, "success");
  } catch (e) {
    showToast("Reset failed: " + (e.message || "check email"), "error");
  }
}

async function loadCustomersList() {
  const el = document.getElementById("customersList");
  if (!el) return;
  const search = (document.getElementById("customerSearch")?.value || "").toLowerCase();

  try {
    const snap = await db.collection("customers").get();
    let docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

    if (search) {
      docs = docs.filter(d =>
        (d.name || "").toLowerCase().includes(search) ||
        (d.cnic || "").toLowerCase().includes(search) ||
        (d.phone || "").includes(search) ||
        (d.onuSerial || "").toLowerCase().includes(search)
      );
    }

    if (docs.length === 0) {
      el.innerHTML = `<div class="empty-state"><p>No customers found</p></div>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Name</th><th>CNIC</th><th>Phone</th><th>Package</th><th>ONU</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
    docs.forEach(d => {
      const phone = d.phone || "";
      const waMsg = `Assalam o Alaikum ${d.name || ""}, FiberHub ISP se rabta kar rahe hain.`;
      html += `<tr>
        <td>${d.name || "-"}<br><small style="color:var(--text-muted)">${d.area || ""}</small></td>
        <td>${d.cnic || "-"}</td>
        <td>${phone || "-"}</td>
        <td>${d.package || "-"}</td>
        <td>${d.onuSerial || "-"}</td>
        <td><span class="status ${d.status === "active" ? "active" : "suspended"}">${d.status || "active"}</span></td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-outline" onclick="editCustomer('${d.id}')">Edit</button>
          <button class="btn btn-sm btn-outline" onclick="viewCustomerBills('${d.id}', '${(d.name || "").replace(/'/g, "")}')">Bills</button>
          ${phone ? `<button class="btn btn-sm btn-outline" style="color:#25D366;" onclick="openWhatsApp('${phone}', '${waMsg.replace(/'/g, "\\'")}')" title="WhatsApp">WA</button>` : ""}
          ${phone ? `<button class="btn btn-sm btn-outline" onclick="openSMS('${phone}', '${waMsg.replace(/'/g, "\\'")}')" title="SMS">SMS</button>` : ""}
          ${d.email ? `<button class="btn btn-sm btn-outline" onclick="resetCustomerPassword('${d.email}')">Reset Pass</button>` : ""}
          <button class="btn btn-sm btn-outline" onclick="deleteCustomer('${d.id}')" style="color:var(--danger);">Del</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error: ${e.message}</p>`;
  }
}

async function viewCustomerBills(customerId, customerName) {
  try {
    const snap = await db.collection("bills").where("customerId", "==", customerId).get();
    let docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    // fallback: also match by name if customerId missing on old bills
    if (docs.length === 0) {
      const all = await db.collection("bills").get();
      all.forEach(doc => {
        const d = doc.data();
        if (d.customerId === customerId || (customerName && d.customerName === customerName)) {
          docs.push({ id: doc.id, ...d });
        }
      });
    }
    docs.sort((a, b) => (b.month || "").localeCompare(a.month || ""));

    let body = `<p style="margin-bottom:12px;color:var(--text-muted);">Bill history for <strong>${customerName || customerId}</strong></p>`;
    if (docs.length === 0) {
      body += `<p style="color:var(--text-muted);">No bills found for this customer.</p>`;
    } else {
      body += `<div class="table-wrapper"><table>
        <thead><tr><th>Month</th><th>Amount</th><th>Late</th><th>Status</th><th>Method</th></tr></thead><tbody>`;
      docs.forEach(d => {
        const late = Number(d.lateFee) || 0;
        body += `<tr>
          <td>${d.month || "-"}</td>
          <td>₨ ${d.amount || 0}</td>
          <td>${late ? "₨ " + late : "-"}</td>
          <td><span class="status ${d.status === "paid" ? "active" : "pending"}">${d.status || "-"}</span></td>
          <td>${d.method || "-"}</td>
        </tr>`;
      });
      body += `</tbody></table></div>`;
    }
    showModal("Bill History", body, `
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').classList.remove('active')">Close</button>
    `);
  } catch (e) {
    showToast("Error loading bills: " + e.message, "error");
  }
}

async function editCustomer(id) {
  try {
    const doc = await db.collection("customers").doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();
    showCustomerForm(id);
    await fillPackagesSelect(d.package || "20 Mbps");
    document.getElementById("cName").value = d.name || "";
    document.getElementById("cCnic").value = d.cnic || "";
    document.getElementById("cPhone").value = d.phone || "";
    document.getElementById("cEmail").value = d.email || "";
    document.getElementById("cPackage").value = d.package || "20 Mbps";
    document.getElementById("cRent").value = d.rent || 2500;
    document.getElementById("cOnu").value = d.onuSerial || "";
    document.getElementById("cPort").value = d.fiberPort || "";
    document.getElementById("cArea").value = d.area || "";
    document.getElementById("cGps").value = d.gps || "";
    document.getElementById("cAddress").value = d.address || "";
    document.getElementById("cStatus").value = d.status || "active";
  } catch (e) {
    showToast("Error loading customer", "error");
  }
}

async function deleteCustomer(id) {
  if (!confirm("Delete this customer?\n\nCustomer record + login account dono delete / block ho jayenge.")) return;
  try {
    const doc = await db.collection("customers").doc(id).get();
    if (!doc.exists) {
      showToast("Customer not found", "error");
      return;
    }
    const data = doc.data();

    // 1) Disable + mark deleted on users profile (blocks login even if Auth still exists)
    const disableUser = async (uid) => {
      if (!uid) return;
      try {
        await db.collection("users").doc(uid).set({
          disabled: true,
          deleted: true,
          deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
          deletedBy: user.uid || null
        }, { merge: true });
        // Then remove profile so login finds no doc
        await db.collection("users").doc(uid).delete();
      } catch (e) {
        console.warn("users disable/delete:", e);
      }
    };

    if (data.uid) {
      await disableUser(data.uid);
    } else if (data.email) {
      try {
        const q = await db.collection("users").where("email", "==", data.email.toLowerCase()).limit(1).get();
        if (!q.empty) await disableUser(q.docs[0].id);
      } catch (e) {}
    }

    // 2) Delete customer document
    await db.collection("customers").doc(id).delete();

    // Note: Firebase Auth user can only be fully removed via Admin SDK / Cloud Function.
    // Without users/{uid} doc, login is rejected (see auth.js).
    showToast("Customer + login account removed (login blocked)", "success");
    logActivity("customer", "Customer deleted + login blocked: " + (data.name || id));
    loadCustomersList();
  } catch (e) {
    showToast("Delete failed: " + (e.message || ""), "error");
  }
}

/* ========== BILLING MODULE ========== */
async function renderBilling(area) {
  area.innerHTML = `
    <div class="stats-grid" id="billingStats">
      <div class="stat-card"><div class="stat-icon green">${iconMoney()}</div><div class="stat-info"><h3 id="statPaid">-</h3><p>Paid this Month</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">${iconBill()}</div><div class="stat-info"><h3 id="statPending">-</h3><p>Pending Bills</p></div></div>
      <div class="stat-card"><div class="stat-icon blue">${iconCheck()}</div><div class="stat-info"><h3 id="statTotal">-</h3><p>Total Bills</p></div></div>
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title">Generate / Record Bill</h3></div>
      <div class="form-row">
        <div class="form-field"><label>Customer *</label>
          <select id="billCustomer"><option value="">Select Customer</option></select>
        </div>
        <div class="form-field"><label>Month *</label>
          <input type="month" id="billMonth" />
        </div>
        <div class="form-field"><label>Amount *</label>
          <input type="number" id="billAmount" placeholder="2500" />
        </div>
        <div class="form-field"><label>Payment Method</label>
          <select id="billMethod">
            <option value="pending">Pending (Unpaid)</option>
            <option value="cash">Cash</option>
            <option value="easypaisa">EasyPaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="bank">Bank Transfer</option>
          </select>
        </div>
        <div class="form-field"><label>Txn / Receipt No</label>
          <input type="text" id="billTxn" placeholder="Optional" />
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="saveBill()">Save Bill</button>
        <button class="btn btn-outline" onclick="generateAllBills()">Auto Generate (All Active)</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Bills</h3>
        <select id="billFilter" onchange="loadBillsList()" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);">
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>
      <div id="billsList">Loading...</div>
    </div>
  `;

  // Set current month
  const now = new Date();
  document.getElementById("billMonth").value = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

  // Load customers for dropdown
  try {
    const snap = await db.collection("customers").get();
    const sel = document.getElementById("billCustomer");
    snap.forEach(doc => {
      const d = doc.data();
      if (d.status === "active" || !d.status) {
        sel.innerHTML += `<option value="${doc.id}" data-rent="${d.rent || 2500}">${d.name} (${d.phone || ""})</option>`;
      }
    });
    sel.addEventListener("change", () => {
      const opt = sel.options[sel.selectedIndex];
      if (opt.dataset.rent) document.getElementById("billAmount").value = opt.dataset.rent;
    });
  } catch (e) {}

  loadBillsList();
  loadBillingStats();
}

async function saveBill() {
  const customerId = document.getElementById("billCustomer").value;
  const month = document.getElementById("billMonth").value;
  const amount = Number(document.getElementById("billAmount").value);
  const method = document.getElementById("billMethod").value;
  const txn = document.getElementById("billTxn").value.trim();

  if (!customerId || !month || !amount) {
    showToast("Customer, Month and Amount required", "error");
    return;
  }

  try {
    const custDoc = await db.collection("customers").doc(customerId).get();
    const cust = custDoc.data() || {};

    const bill = {
      customerId,
      customerName: cust.name || "",
      customerPhone: cust.phone || "",
      month,
      amount,
      method,
      txnNo: txn,
      status: method === "pending" ? "pending" : "paid",
      paidAt: method !== "pending" ? firebase.firestore.FieldValue.serverTimestamp() : null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: user.uid
    };

    await db.collection("bills").add(bill);
    showToast("Bill saved", "success");
    document.getElementById("billTxn").value = "";
    loadBillsList();
    loadBillingStats();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function generateAllBills() {
  if (!confirm("Generate bills for all Active customers for current month?")) return;
  const month = document.getElementById("billMonth").value;
  if (!month) { showToast("Select month first", "error"); return; }

  try {
    const snap = await db.collection("customers").get();
    let count = 0;
    const batch = db.batch();

    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.status === "suspended") continue;
      const ref = db.collection("bills").doc();
      batch.set(ref, {
        customerId: doc.id,
        customerName: d.name || "",
        customerPhone: d.phone || "",
        month,
        amount: d.rent || 2500,
        method: "pending",
        txnNo: "",
        status: "pending",
        paidAt: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid,
        autoGenerated: true
      });
      count++;
    }
    await batch.commit();
    showToast(`${count} bills generated`, "success");
    loadBillsList();
    loadBillingStats();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function loadBillsList() {
  const el = document.getElementById("billsList");
  if (!el) return;
  const filter = document.getElementById("billFilter")?.value || "all";

  try {
    const snap = await db.collection("bills").get();
    let docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (filter === "pending") docs = docs.filter(d => d.status === "pending");
    if (filter === "paid") docs = docs.filter(d => d.status === "paid");

    if (docs.length === 0) {
      el.innerHTML = `<div class="empty-state"><p>No bills found</p></div>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Customer</th><th>Month</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
    docs.forEach(d => {
      const phone = d.customerPhone || "";
      const late = Number(d.lateFee) || 0;
      const total = (Number(d.amount) || 0) + late;
      html += `<tr>
        <td>${d.customerName || "-"}<br><small>${phone}</small></td>
        <td>${d.month || "-"}</td>
        <td>₨ ${d.amount || 0}${late ? `<br><small style="color:var(--warning)">+Late ₨${late} = ₨${total}</small>` : ""}</td>
        <td>${d.method || "-"}</td>
        <td><span class="status ${d.status === "paid" ? "active" : "pending"}">${d.status}</span></td>
        <td style="white-space:nowrap;">
          ${d.status === "pending" ? `<button class="btn btn-sm btn-primary" onclick="markPaid('${d.id}')">Mark Paid</button>` : ""}
          ${d.status === "pending" && !late ? `<button class="btn btn-sm btn-outline" style="color:var(--warning);" onclick="applyLateFee('${d.id}')">+Late Fee</button>` : ""}
          <button class="btn btn-sm btn-outline" onclick="editBill('${d.id}')">Edit</button>
          <button class="btn btn-sm btn-outline" onclick="printBill('${d.id}')">PDF</button>
          ${phone ? `<button class="btn btn-sm btn-outline" style="color:#25D366;" onclick="openWhatsApp('${phone}', 'Assalam o Alaikum ${d.customerName || ""}, aapka bill ${d.month || ""} – ₨${total} (${d.status})${late ? " including late fee ₨"+late : ""}. FiberHub ISP.')" title="WhatsApp">WA</button>` : ""}
          <button class="btn btn-sm btn-outline" onclick="deleteBill('${d.id}')" style="color:var(--danger);">Del</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading bills</p>`;
  }
}

async function editBill(id) {
  try {
    const doc = await db.collection("bills").doc(id).get();
    if (!doc.exists) {
      showToast("Bill not found", "error");
      return;
    }
    const d = doc.data();
    const body = `
      <div style="display:grid;gap:12px;">
        <div class="form-field">
          <label>Customer</label>
          <input type="text" value="${d.customerName || ""}" disabled style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-muted);" />
        </div>
        <div class="form-field">
          <label>Month *</label>
          <input type="month" id="editBillMonth" value="${d.month || ""}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);" />
        </div>
        <div class="form-field">
          <label>Amount *</label>
          <input type="number" id="editBillAmount" value="${d.amount || 0}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);" />
        </div>
        <div class="form-field">
          <label>Status</label>
          <select id="editBillStatus" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);">
            <option value="pending" ${d.status === "pending" ? "selected" : ""}>Pending</option>
            <option value="paid" ${d.status === "paid" ? "selected" : ""}>Paid</option>
          </select>
        </div>
        <div class="form-field">
          <label>Method</label>
          <select id="editBillMethod" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);">
            <option value="cash" ${d.method === "cash" ? "selected" : ""}>Cash</option>
            <option value="easypaisa" ${d.method === "easypaisa" ? "selected" : ""}>EasyPaisa</option>
            <option value="jazzcash" ${d.method === "jazzcash" ? "selected" : ""}>JazzCash</option>
            <option value="bank" ${d.method === "bank" ? "selected" : ""}>Bank</option>
            <option value="" ${!d.method ? "selected" : ""}>—</option>
          </select>
        </div>
        <div class="form-field">
          <label>Txn / Receipt No</label>
          <input type="text" id="editBillTxn" value="${d.txnNo || ""}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);" />
        </div>
      </div>
    `;
    showModal("Edit Bill", body, `
      <button class="btn btn-primary" id="btnSaveBillEdit">Save Changes</button>
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').classList.remove('active')">Cancel</button>
    `);

    document.getElementById("btnSaveBillEdit").onclick = async () => {
      const month = document.getElementById("editBillMonth").value;
      const amount = Number(document.getElementById("editBillAmount").value);
      const status = document.getElementById("editBillStatus").value;
      const method = document.getElementById("editBillMethod").value;
      const txnNo = document.getElementById("editBillTxn").value.trim();

      if (!month || !amount) {
        showToast("Month and Amount required", "error");
        return;
      }
      try {
        const update = {
          month,
          amount,
          status,
          method: method || null,
          txnNo: txnNo || "",
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (status === "paid" && d.status !== "paid") {
          update.paidAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        await db.collection("bills").doc(id).update(update);
        document.querySelector(".modal-overlay")?.classList.remove("active");
        showToast("Bill updated", "success");
        loadBillsList();
        loadBillingStats();
      } catch (e) {
        showToast("Update failed: " + e.message, "error");
      }
    };
  } catch (e) {
    showToast("Error loading bill", "error");
  }
}

async function deleteBill(id) {
  if (!confirm("Delete this bill permanently?")) return;
  try {
    await db.collection("bills").doc(id).delete();
    showToast("Bill deleted", "success");
    loadBillsList();
    loadBillingStats();
  } catch (e) {
    showToast("Delete failed: " + e.message, "error");
  }
}

async function markPaid(id) {
  const method = prompt("Payment method:\n1=Cash  2=EasyPaisa  3=JazzCash  4=Bank\n\nType 1-4:");
  const map = { "1": "cash", "2": "easypaisa", "3": "jazzcash", "4": "bank" };
  const m = map[method];
  if (!m) return;

  const txn = prompt("Transaction / Receipt No (optional):") || "";

  try {
    await db.collection("bills").doc(id).update({
      status: "paid",
      method: m,
      txnNo: txn,
      paidAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast("Marked as paid", "success");
    logActivity("billing", "Bill marked paid (" + id.slice(0, 8) + ") via " + m);
    loadBillsList();
    loadBillingStats();
  } catch (e) {
    showToast("Error", "error");
  }
}

async function applyLateFee(id) {
  try {
    let feeAmount = 200;
    try {
      const s = await db.collection("settings").doc("billing").get();
      if (s.exists && s.data().lateFeeAmount != null) feeAmount = Number(s.data().lateFeeAmount) || 200;
    } catch (e) {}
    const custom = prompt("Late fee amount (₨):", String(feeAmount));
    if (custom === null) return;
    const fee = Number(custom) || 0;
    if (fee <= 0) { showToast("Invalid amount", "error"); return; }
    await db.collection("bills").doc(id).update({
      lateFee: fee,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast("Late fee ₨" + fee + " applied", "success");
    loadBillsList();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function printBill(id) {
  try {
    const doc = await db.collection("bills").doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();
    const total = (Number(d.amount) || 0) + (Number(d.lateFee) || 0);
    // QR payload: bill id + amount + month (scannable reference)
    const qrData = encodeURIComponent(`FiberHub|${id.slice(0, 12)}|${d.customerName || ""}|${d.month || ""}|PKR${total}|${d.status || ""}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

    let company = "FiberHub ISP";
    let companyPhone = "";
    try {
      const c = await db.collection("settings").doc("company").get();
      if (c.exists) {
        company = c.data().name || company;
        companyPhone = c.data().phone || "";
      }
    } catch (e) {}

    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Bill - ${d.customerName || ""}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;max-width:480px;margin:auto;color:#111}
        h1{color:#0ea5e9;margin:0 0 4px;font-size:1.6rem}
        .sub{color:#666;margin:0 0 12px;font-size:0.9rem}
        .row{display:flex;justify-content:space-between;margin:8px 0;font-size:0.95rem}
        .total{font-size:1.25em;font-weight:bold;border-top:2px solid #222;padding-top:12px;margin-top:16px}
        .qr-box{text-align:center;margin:20px 0 8px}
        .qr-box img{border:1px solid #ddd;border-radius:8px;padding:6px}
        .badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:0.8rem;font-weight:600;
          background:${d.status === "paid" ? "#dcfce7" : "#fef3c7"};color:${d.status === "paid" ? "#166534" : "#92400e"}}
        @media print{button{display:none}}
      </style></head><body>
      <h1>${company}</h1>
      <p class="sub">Manage Your Network with Confidence${companyPhone ? " · " + companyPhone : ""}</p>
      <hr>
      <div class="row"><span>Bill ID:</span><span>${id.slice(0, 10)}</span></div>
      <div class="row"><span>Customer:</span><strong>${d.customerName || "-"}</strong></div>
      <div class="row"><span>Phone:</span><span>${d.customerPhone || "-"}</span></div>
      <div class="row"><span>Month:</span><span>${d.month || "-"}</span></div>
      <div class="row"><span>Method:</span><span>${d.method || "-"}</span></div>
      <div class="row"><span>Txn No:</span><span>${d.txnNo || "-"}</span></div>
      <div class="row"><span>Bill Amount:</span><span>₨ ${d.amount || 0}</span></div>
      ${(Number(d.lateFee) > 0) ? `<div class="row"><span>Late Fee:</span><span>₨ ${d.lateFee}</span></div>` : ""}
      <div class="row total"><span>Total:</span><span>₨ ${total}</span></div>
      <div class="row"><span>Status:</span><span class="badge">${(d.status || "-").toUpperCase()}</span></div>
      <div class="qr-box">
        <img src="${qrUrl}" alt="QR" width="120" height="120" />
        <p style="font-size:11px;color:#888;margin:6px 0 0;">Scan for bill reference</p>
      </div>
      <button onclick="window.print()" style="padding:10px 20px;font-size:1rem;cursor:pointer;border-radius:8px;border:1px solid #ccc;background:#0ea5e9;color:#fff;">Print / Save PDF</button>
      <p style="margin-top:28px;font-size:11px;color:#999;text-align:center;">Software By Fazul Khan Chandio · 03333909816</p>
      </body></html>
    `);
    w.document.close();
  } catch (e) {
    showToast("Error generating bill", "error");
  }
}

async function loadBillingStats() {
  try {
    const snap = await db.collection("bills").get();
    let paid = 0, pending = 0, total = 0;
    const now = new Date();
    const thisMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

    snap.forEach(doc => {
      const d = doc.data();
      total++;
      if (d.status === "pending") pending++;
      if (d.status === "paid" && d.month === thisMonth) paid += (d.amount || 0);
    });

    const el1 = document.getElementById("statPaid");
    const el2 = document.getElementById("statPending");
    const el3 = document.getElementById("statTotal");
    if (el1) el1.textContent = "₨ " + paid.toLocaleString();
    if (el2) el2.textContent = pending;
    if (el3) el3.textContent = total;
  } catch (e) {}
}

/* ========== USERS (Admin only) ========== */
async function renderUsers(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Create New User</h3>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Full Name *</label>
          <input type="text" id="newUserName" placeholder="Full Name" />
        </div>
        <div class="form-field">
          <label>Email *</label>
          <input type="email" id="newUserEmail" placeholder="email@example.com" />
        </div>
        <div class="form-field">
          <label>Phone</label>
          <input type="tel" id="newUserPhone" placeholder="03XXXXXXXXX" />
        </div>
        <div class="form-field">
          <label>Password *</label>
          <input type="text" id="newUserPassword" placeholder="Min 6 characters" />
        </div>
        <div class="form-field">
          <label>Role *</label>
          <select id="newUserRole">
            <option value="customer">Customer</option>
            <option value="billing">Billing Staff</option>
            <option value="technician">Technician</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" id="createUserBtn" onclick="createNewUser()">Create User</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">All Users</h3>
        <button class="btn btn-outline btn-sm" onclick="loadUsersList()">Refresh</button>
      </div>
      <div id="usersList">Loading...</div>
    </div>
  `;
  loadUsersList();
}

async function createNewUser() {
  const name = document.getElementById("newUserName").value;
  const email = document.getElementById("newUserEmail").value;
  const phone = document.getElementById("newUserPhone").value;
  const password = document.getElementById("newUserPassword").value;
  const role = document.getElementById("newUserRole").value;
  const btn = document.getElementById("createUserBtn");

  btn.disabled = true;
  btn.textContent = "Creating...";

  const result = await adminCreateUser(name, email, phone, password, role);

  if (result.success) {
    showToast("User created successfully!", "success");
    document.getElementById("newUserName").value = "";
    document.getElementById("newUserEmail").value = "";
    document.getElementById("newUserPhone").value = "";
    document.getElementById("newUserPassword").value = "";
    loadUsersList();
  } else {
    showToast(result.error || "Failed to create user", "error");
  }

  btn.disabled = false;
  btn.textContent = "Create User";
}

async function loadUsersList() {
  const el = document.getElementById("usersList");
  if (!el) return;
  el.innerHTML = `<p style="text-align:center;padding:20px;color:var(--text-muted);">Loading...</p>`;

  try {
    const snap = await db.collection("users").orderBy("createdAt", "desc").get();
    
    if (snap.empty) {
      el.innerHTML = `<p style="color:var(--text-muted);padding:16px;">No users found</p>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead><tbody>`;

    snap.forEach(doc => {
      const d = doc.data();
      const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : "-";
      html += `<tr>
        <td>${d.name || "-"}</td>
        <td>${d.email || "-"}</td>
        <td>${d.phone || "-"}</td>
        <td><span class="status ${d.role === "admin" ? "resolved" : d.role === "customer" ? "active" : "pending"}">${d.role || "customer"}</span></td>
        <td>${date}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editUserRole('${doc.id}','${d.role || "customer"}')">Edit Role</button>
          <button class="btn btn-sm btn-outline" onclick="deleteUserDoc('${doc.id}')" style="color:var(--danger);">Del</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    try {
      const snap = await db.collection("users").get();
      let docs = [];
      snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      
      let html = `<div class="table-wrapper"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Actions</th></tr></thead><tbody>`;
      docs.forEach(d => {
        html += `<tr>
          <td>${d.name || "-"}</td>
          <td>${d.email || "-"}</td>
          <td>${d.phone || "-"}</td>
          <td><span class="status active">${d.role || "customer"}</span></td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="editUserRole('${d.id}','${d.role || "customer"}')">Edit Role</button>
            <button class="btn btn-sm btn-outline" onclick="deleteUserDoc('${d.id}')" style="color:var(--danger);">Del</button>
          </td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
      el.innerHTML = html;
    } catch (e2) {
      el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading users</p>`;
    }
  }
}

async function editUserRole(uid, currentRole) {
  const role = prompt("Change role to:\n1 = customer\n2 = billing\n3 = technician\n4 = admin\n\nType 1-4:", 
    currentRole === "admin" ? "4" : currentRole === "technician" ? "3" : currentRole === "billing" ? "2" : "1");
  const map = { "1": "customer", "2": "billing", "3": "technician", "4": "admin" };
  const newRole = map[role];
  if (!newRole) return;

  const name = prompt("Update name (or leave blank):");
  const phone = prompt("Update phone (or leave blank):");

  try {
    const update = { role: newRole, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (name && name.trim()) update.name = name.trim();
    if (phone && phone.trim()) update.phone = phone.trim();
    await db.collection("users").doc(uid).update(update);
    showToast("User updated", "success");
    loadUsersList();
  } catch (e) {
    showToast("Update failed: " + e.message, "error");
  }
}

async function deleteUserDoc(uid) {
  if (uid === user.uid) {
    showToast("You cannot delete yourself", "error");
    return;
  }
  if (!confirm("Delete this user from system?\n(Auth account may still exist in Firebase Console)")) return;
  try {
    await db.collection("users").doc(uid).delete();
    showToast("User removed", "success");
    loadUsersList();
  } catch (e) {
    showToast("Delete failed: " + e.message, "error");
  }
}

/* ========== NETWORK MODULE ========== */
async function renderNetwork(area) {
  area.innerHTML = `
    <div class="stats-grid" id="networkStats">
      <div class="stat-card stat-modern accent-blue"><div class="stat-icon blue">${iconNetwork()}</div><div class="stat-info"><h3 id="nOlts">-</h3><p>OLTs</p></div></div>
      <div class="stat-card stat-modern accent-green"><div class="stat-icon green">${iconCheck()}</div><div class="stat-info"><h3 id="nOnu">-</h3><p>ONU Stock</p></div></div>
      <div class="stat-card stat-modern accent-orange"><div class="stat-icon orange">${iconTools()}</div><div class="stat-info"><h3 id="nRouter">-</h3><p>Router Stock</p></div></div>
      <div class="stat-card stat-modern accent-purple"><div class="stat-icon purple">${iconNetwork()}</div><div class="stat-info"><h3 id="nSplitter">-</h3><p>Splitters</p></div></div>
    </div>

    <div class="card dash-card">
      <div class="card-header">
        <h3 class="card-title">Add Network Item</h3>
      </div>
      <div class="form-row">
        <div class="form-field"><label>Type *</label>
          <select id="netType">
            <option value="olt">OLT</option>
            <option value="pon">PON Port</option>
            <option value="splitter">Splitter</option>
            <option value="onu">ONU Stock</option>
            <option value="router">Router Stock</option>
            <option value="cable">Fiber Cable</option>
            <option value="junction">Junction Box</option>
          </select>
        </div>
        <div class="form-field"><label>Name / Model *</label><input id="netName" placeholder="e.g. Huawei MA5800 / PON-1" /></div>
        <div class="form-field"><label>Parent OLT / Link</label><input id="netParent" placeholder="e.g. OLT-Main (optional)" /></div>
        <div class="form-field"><label>PON / Port</label><input id="netPon" placeholder="e.g. 0/1/1" /></div>
        <div class="form-field"><label>Quantity / Ports</label><input id="netQty" type="number" value="1" /></div>
        <div class="form-field"><label>Location / Notes</label><input id="netLoc" placeholder="Site / Cabinet" /></div>
      </div>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">Hierarchy tip: OLT → PON Port → Splitter → ONU. Parent field se link rakho.</p>
      <button class="btn btn-primary" onclick="saveNetworkItem()">Add Item</button>
    </div>

    <div class="card dash-card">
      <div class="card-header">
        <h3 class="card-title">Network Topology</h3>
        <button class="btn btn-outline btn-sm" onclick="loadNetworkTopology()">Refresh</button>
      </div>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">OLT → PON / Splitter tree (Parent field se link)</p>
      <div id="networkTopology" class="topo-wrap">Loading…</div>
    </div>

    <div class="card dash-card">
      <div class="card-header">
        <h3 class="card-title">Network Inventory</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select id="netFilter" onchange="loadNetworkList()" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-main);color:var(--text-primary);">
            <option value="all">All Types</option>
            <option value="olt">OLT</option>
            <option value="pon">PON</option>
            <option value="splitter">Splitter</option>
            <option value="onu">ONU</option>
            <option value="router">Router</option>
            <option value="cable">Cable</option>
            <option value="junction">Junction</option>
          </select>
          <button class="btn btn-outline btn-sm" onclick="loadNetworkList()">Refresh</button>
        </div>
      </div>
      <div id="networkList">Loading...</div>
    </div>
  `;
  loadNetworkList();
  loadNetworkTopology();
}

async function loadNetworkTopology() {
  const el = document.getElementById("networkTopology");
  if (!el) return;
  try {
    const snap = await db.collection("network").get();
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    if (items.length === 0) {
      el.innerHTML = `<p style="color:var(--text-muted);padding:8px;">No network items. Add OLT first, then PON/Splitter with Parent = OLT name.</p>`;
      return;
    }
    const olts = items.filter(i => i.type === "olt");
    const others = items.filter(i => i.type !== "olt");
    const matchParent = (child, parentName) => {
      const p = (child.parent || "").toLowerCase().trim();
      const n = (parentName || "").toLowerCase().trim();
      return p && n && (p === n || p.includes(n) || n.includes(p));
    };

    let html = "";
    if (olts.length === 0) {
      html += `<p style="color:var(--text-muted);margin-bottom:10px;">No OLT yet — showing all items</p>`;
      html += `<div class="topo-children">`;
      others.forEach(c => {
        html += `<div class="topo-node"><div class="topo-type">${c.type || ""}</div><strong>${c.name || "-"}</strong><small>${c.ponPort || c.location || ""}</small></div>`;
      });
      html += `</div>`;
    } else {
      olts.forEach(olt => {
        const kids = others.filter(c => matchParent(c, olt.name));
        const unlinked = [];
        html += `<div class="topo-olt">
          <div class="topo-olt-title">🖥 OLT · ${olt.name || "OLT"} ${olt.location ? "· " + olt.location : ""}</div>
          <div class="topo-children">`;
        if (kids.length === 0) {
          html += `<div class="topo-node"><small>No linked children (set Parent = ${olt.name})</small></div>`;
        } else {
          kids.forEach(c => {
            html += `<div class="topo-node"><div class="topo-type">${c.type || ""}</div><strong>${c.name || "-"}</strong><small>${c.ponPort || ""} ${c.location || ""}</small></div>`;
          });
        }
        html += `</div></div>`;
      });
      // Items with no parent match
      const linked = new Set();
      olts.forEach(olt => {
        others.forEach(c => { if (matchParent(c, olt.name)) linked.add(c.id); });
      });
      const rest = others.filter(c => !linked.has(c.id));
      if (rest.length) {
        html += `<div class="topo-olt"><div class="topo-olt-title">Unlinked / Other</div><div class="topo-children">`;
        rest.forEach(c => {
          html += `<div class="topo-node"><div class="topo-type">${c.type || ""}</div><strong>${c.name || "-"}</strong><small>${c.parent ? "Parent: " + c.parent : ""} ${c.location || ""}</small></div>`;
        });
        html += `</div></div>`;
      }
    }
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);">Topology load error</p>`;
  }
}

async function saveNetworkItem() {
  const data = {
    type: document.getElementById("netType").value,
    name: document.getElementById("netName").value.trim(),
    parent: document.getElementById("netParent").value.trim(),
    ponPort: document.getElementById("netPon").value.trim(),
    qty: Number(document.getElementById("netQty").value) || 1,
    location: document.getElementById("netLoc").value.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: user.uid
  };
  if (!data.name) { showToast("Name required", "error"); return; }

  try {
    await db.collection("network").add(data);
    showToast("Item added", "success");
    logActivity("network", "Network item added: " + data.type + " · " + data.name);
    document.getElementById("netName").value = "";
    document.getElementById("netParent").value = "";
    document.getElementById("netPon").value = "";
    document.getElementById("netLoc").value = "";
    loadNetworkList();
    loadNetworkTopology();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function loadNetworkList() {
  const el = document.getElementById("networkList");
  if (!el) return;
  const filter = document.getElementById("netFilter")?.value || "all";

  try {
    const snap = await db.collection("network").get();
    let docs = [];
    let counts = { olt: 0, onu: 0, router: 0, splitter: 0, pon: 0 };

    snap.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      docs.push(d);
      if (counts[d.type] !== undefined) counts[d.type] += (d.qty || 1);
    });

    const nOlts = document.getElementById("nOlts");
    const nOnu = document.getElementById("nOnu");
    const nRouter = document.getElementById("nRouter");
    const nSplitter = document.getElementById("nSplitter");
    if (nOlts) nOlts.textContent = counts.olt;
    if (nOnu) nOnu.textContent = counts.onu;
    if (nRouter) nRouter.textContent = counts.router;
    if (nSplitter) nSplitter.textContent = counts.splitter;

    if (filter !== "all") docs = docs.filter(d => d.type === filter);

    if (docs.length === 0) {
      el.innerHTML = `<div class="empty-state"><p>No network items yet</p></div>`;
      return;
    }

    docs.sort((a, b) => (a.type || "").localeCompare(b.type || "") || (a.name || "").localeCompare(b.name || ""));

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Type</th><th>Name</th><th>Parent</th><th>PON/Port</th><th>Qty</th><th>Location</th><th>Action</th></tr></thead><tbody>`;
    docs.forEach(d => {
      html += `<tr>
        <td><span class="status ${d.type === "olt" ? "resolved" : d.type === "onu" ? "active" : "pending"}">${(d.type || "").toUpperCase()}</span></td>
        <td>${d.name || "-"}</td>
        <td>${d.parent || "-"}</td>
        <td>${d.ponPort || "-"}</td>
        <td>${d.qty || 1}</td>
        <td>${d.location || "-"}</td>
        <td><button class="btn btn-sm btn-outline" onclick="deleteNetworkItem('${d.id}')">Del</button></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading</p>`;
  }
}

async function deleteNetworkItem(id) {
  if (!confirm("Delete this item?")) return;
  try {
    await db.collection("network").doc(id).delete();
    showToast("Deleted", "success");
    loadNetworkList();
    if (typeof loadNetworkTopology === "function") loadNetworkTopology();
  } catch (e) {
    showToast("Error", "error");
  }
}

/* ========== REPORTS MODULE ========== */
async function renderReports(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">Reports & Analytics</h3></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
        <button class="btn btn-outline" onclick="runReport('collection')">Monthly Collection</button>
        <button class="btn btn-outline" onclick="runReport('pending')">Pending Bills</button>
        <button class="btn btn-outline" onclick="runReport('customers')">Customer Summary</button>
        <button class="btn btn-outline" onclick="runReport('complaints')">Complaint Report</button>
        <button class="btn btn-outline" onclick="runReport('profit')">Profit / Loss</button>
        <button class="btn btn-primary" onclick="exportExcel()">Export Excel (CSV)</button>
      </div>
      <div id="reportResult"><p style="color:var(--text-muted);">Select a report above</p></div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title">Expenses</h3></div>
      <div class="form-row">
        <div class="form-field"><label>Title</label><input id="expTitle" placeholder="e.g. Fiber cable / Fuel" /></div>
        <div class="form-field"><label>Amount (₨)</label><input id="expAmount" type="number" placeholder="0" /></div>
        <div class="form-field"><label>Category</label>
          <select id="expCat">
            <option value="ops">Operations</option>
            <option value="stock">Stock / Hardware</option>
            <option value="salary">Salary</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="form-field"><label>Date</label><input id="expDate" type="date" /></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveExpense()">Add Expense</button>
      <div id="expensesList" style="margin-top:16px;">Loading...</div>
    </div>
  `;
  const ed = document.getElementById("expDate");
  if (ed) ed.value = new Date().toISOString().slice(0, 10);
  loadExpensesList();
}

async function saveExpense() {
  const title = document.getElementById("expTitle").value.trim();
  const amount = Number(document.getElementById("expAmount").value) || 0;
  const category = document.getElementById("expCat").value;
  const date = document.getElementById("expDate").value || new Date().toISOString().slice(0, 10);
  if (!title || amount <= 0) {
    showToast("Title aur amount required", "error");
    return;
  }
  try {
    await db.collection("expenses").add({
      title, amount, category, date,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: user.uid,
      byName: user.name || ""
    });
    showToast("Expense added", "success");
    logActivity("expense", "Expense: " + title + " ₨" + amount);
    document.getElementById("expTitle").value = "";
    document.getElementById("expAmount").value = "";
    loadExpensesList();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function loadExpensesList() {
  const el = document.getElementById("expensesList");
  if (!el) return;
  try {
    const snap = await db.collection("expenses").get();
    let docs = [];
    let total = 0;
    snap.forEach(doc => {
      const d = { id: doc.id, ...doc.data() };
      docs.push(d);
      total += Number(d.amount) || 0;
    });
    docs.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    if (docs.length === 0) {
      el.innerHTML = `<p style="color:var(--text-muted);font-size:0.9rem;">No expenses yet</p>`;
      return;
    }
    el.innerHTML = `<p style="margin-bottom:8px;font-weight:600;">Total: ₨ ${total.toLocaleString()}</p>
      <div class="table-wrapper"><table>
      <thead><tr><th>Date</th><th>Title</th><th>Cat</th><th>Amount</th><th></th></tr></thead><tbody>
      ${docs.slice(0, 50).map(d => `<tr>
        <td>${d.date || "-"}</td>
        <td>${d.title || "-"}</td>
        <td>${d.category || "-"}</td>
        <td>₨ ${(Number(d.amount) || 0).toLocaleString()}</td>
        <td><button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="deleteExpense('${d.id}')">Del</button></td>
      </tr>`).join("")}
      </tbody></table></div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);">Load error</p>`;
  }
}

async function deleteExpense(id) {
  if (!confirm("Delete expense?")) return;
  try {
    await db.collection("expenses").doc(id).delete();
    showToast("Deleted", "success");
    loadExpensesList();
  } catch (e) {
    showToast("Error", "error");
  }
}

async function runReport(type) {
  const el = document.getElementById("reportResult");
  el.innerHTML = `<p style="text-align:center;padding:20px;color:var(--text-muted);">Loading...</p>`;

  try {
    if (type === "collection") {
      const snap = await db.collection("bills").get();
      const byMonth = {};
      snap.forEach(doc => {
        const d = doc.data();
        if (d.status !== "paid") return;
        const m = d.month || "unknown";
        byMonth[m] = (byMonth[m] || 0) + (d.amount || 0);
      });
      let html = `<h3 style="margin-bottom:12px;">Monthly Collection</h3><div class="table-wrapper"><table>
        <thead><tr><th>Month</th><th>Amount</th></tr></thead><tbody>`;
      Object.keys(byMonth).sort().reverse().forEach(m => {
        html += `<tr><td>${m}</td><td>₨ ${byMonth[m].toLocaleString()}</td></tr>`;
      });
      html += `</tbody></table></div>`;
      el.innerHTML = html;
    }

    if (type === "pending") {
      const snap = await db.collection("bills").get();
      let html = `<h3 style="margin-bottom:12px;">Pending Bills</h3><div class="table-wrapper"><table>
        <thead><tr><th>Customer</th><th>Month</th><th>Amount</th><th>Phone</th></tr></thead><tbody>`;
      let total = 0;
      snap.forEach(doc => {
        const d = doc.data();
        if (d.status !== "pending") return;
        total += d.amount || 0;
        html += `<tr><td>${d.customerName}</td><td>${d.month}</td><td>₨ ${d.amount}</td><td>${d.customerPhone || ""}</td></tr>`;
      });
      html += `</tbody></table></div><p style="margin-top:12px;font-weight:700;">Total Pending: ₨ ${total.toLocaleString()}</p>`;
      el.innerHTML = html;
    }

    if (type === "customers") {
      const snap = await db.collection("customers").get();
      let active = 0, suspended = 0;
      snap.forEach(doc => {
        const s = doc.data().status;
        if (s === "suspended") suspended++; else active++;
      });
      el.innerHTML = `
        <h3 style="margin-bottom:12px;">Customer Summary</h3>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-icon blue">${iconUsers()}</div><div class="stat-info"><h3>${snap.size}</h3><p>Total</p></div></div>
          <div class="stat-card"><div class="stat-icon green">${iconCheck()}</div><div class="stat-info"><h3>${active}</h3><p>Active</p></div></div>
          <div class="stat-card"><div class="stat-icon red">${iconSuspend()}</div><div class="stat-info"><h3>${suspended}</h3><p>Suspended</p></div></div>
        </div>`;
    }

    if (type === "complaints") {
      const snap = await db.collection("complaints").get();
      let pending = 0, progress = 0, resolved = 0;
      snap.forEach(doc => {
        const s = doc.data().status;
        if (s === "pending") pending++;
        else if (s === "in_progress") progress++;
        else if (s === "resolved") resolved++;
      });
      el.innerHTML = `
        <h3 style="margin-bottom:12px;">Complaint Report</h3>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-icon purple">${iconComplaint()}</div><div class="stat-info"><h3>${snap.size}</h3><p>Total</p></div></div>
          <div class="stat-card"><div class="stat-icon orange">${iconComplaint()}</div><div class="stat-info"><h3>${pending}</h3><p>Pending</p></div></div>
          <div class="stat-card"><div class="stat-icon blue">${iconComplaint()}</div><div class="stat-info"><h3>${progress}</h3><p>In Progress</p></div></div>
          <div class="stat-card"><div class="stat-icon green">${iconCheck()}</div><div class="stat-info"><h3>${resolved}</h3><p>Resolved</p></div></div>
        </div>`;
    }

    if (type === "profit") {
      const [billSnap, expSnap] = await Promise.all([
        db.collection("bills").get(),
        db.collection("expenses").get()
      ]);
      let income = 0, expense = 0;
      billSnap.forEach(doc => {
        const d = doc.data();
        if (d.status === "paid") income += (Number(d.amount) || 0) + (Number(d.lateFee) || 0);
      });
      expSnap.forEach(doc => { expense += Number(doc.data().amount) || 0; });
      const profit = income - expense;
      el.innerHTML = `
        <h3 style="margin-bottom:12px;">Profit / Loss</h3>
        <div class="stats-grid">
          <div class="stat-card stat-modern accent-green"><div class="stat-icon green">${iconBill()}</div><div class="stat-info"><h3>₨ ${income.toLocaleString()}</h3><p>Total Income (paid)</p></div></div>
          <div class="stat-card stat-modern accent-orange"><div class="stat-icon orange">${iconBilling()}</div><div class="stat-info"><h3>₨ ${expense.toLocaleString()}</h3><p>Total Expenses</p></div></div>
          <div class="stat-card stat-modern ${profit >= 0 ? "accent-teal" : "accent-red"}"><div class="stat-icon ${profit >= 0 ? "green" : "red"}">${iconCheck()}</div><div class="stat-info"><h3>₨ ${profit.toLocaleString()}</h3><p>${profit >= 0 ? "Profit" : "Loss"}</p></div></div>
        </div>`;
    }
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);">Error: ${e.message}</p>`;
  }
}

async function exportExcel() {
  try {
    const snap = await db.collection("bills").get();
    let csv = "Customer,Phone,Month,Amount,Method,Status\n";
    snap.forEach(doc => {
      const d = doc.data();
      csv += `"${d.customerName || ""}","${d.customerPhone || ""}","${d.month || ""}",${d.amount || 0},"${d.method || ""}","${d.status || ""}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fiberhub-bills-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded", "success");
  } catch (e) {
    showToast("Export failed", "error");
  }
}

async function renderSettings(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">Company Details</h3></div>
      <div class="form-row">
        <div class="form-field"><label>Company Name</label><input id="setCompany" placeholder="FiberHub ISP" /></div>
        <div class="form-field"><label>Phone</label><input id="setPhone" placeholder="03XXXXXXXXX" /></div>
        <div class="form-field"><label>Address</label><input id="setAddress" placeholder="Office Address" /></div>
        <div class="form-field"><label>Support WhatsApp</label><input id="setWhatsapp" placeholder="03XXXXXXXXX" /></div>
      </div>
      <button class="btn btn-primary" onclick="saveCompanySettings()">Save Company</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Packages</h3>
        <button class="btn btn-primary btn-sm" onclick="showPackageForm()">+ Add Package</button>
      </div>
      <div id="packageForm" style="display:none;margin-bottom:16px;padding:12px;background:var(--bg-main);border-radius:10px;">
        <input type="hidden" id="pkgEditId" value="" />
        <div class="form-row">
          <div class="form-field"><label>Name *</label><input id="pkgName" placeholder="e.g. 20 Mbps" /></div>
          <div class="form-field"><label>Speed (Mbps)</label><input id="pkgSpeed" type="number" placeholder="20" /></div>
          <div class="form-field"><label>Monthly Rent (₨) *</label><input id="pkgRent" type="number" placeholder="2500" /></div>
          <div class="form-field"><label>Description</label><input id="pkgDesc" placeholder="Optional" /></div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="savePackage()">Save Package</button>
          <button class="btn btn-outline btn-sm" onclick="hidePackageForm()">Cancel</button>
        </div>
      </div>
      <div id="packagesList">Loading...</div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Areas</h3>
        <button class="btn btn-primary btn-sm" onclick="showAreaForm()">+ Add Area</button>
      </div>
      <div id="areaForm" style="display:none;margin-bottom:16px;padding:12px;background:var(--bg-main);border-radius:10px;">
        <input type="hidden" id="areaEditId" value="" />
        <div class="form-row">
          <div class="form-field"><label>Area Name *</label><input id="areaName" placeholder="e.g. Block A / Gulshan" /></div>
          <div class="form-field"><label>City / Zone</label><input id="areaCity" placeholder="Optional" /></div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="saveArea()">Save Area</button>
          <button class="btn btn-outline btn-sm" onclick="hideAreaForm()">Cancel</button>
        </div>
      </div>
      <div id="areasList">Loading...</div>
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title">Late Fee Settings</h3></div>
      <div class="form-row">
        <div class="form-field"><label>Late Fee Amount (₨)</label><input id="setLateFee" type="number" placeholder="200" value="200" /></div>
        <div class="form-field"><label>Apply after (days overdue)</label><input id="setLateDays" type="number" placeholder="10" value="10" /></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveLateFeeSettings()">Save Late Fee</button>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;">Pending bills pe Late Fee button se apply hoga</p>
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title">WhatsApp / SMS Templates</h3></div>
      <div class="form-field" style="margin-bottom:10px;">
        <label>Bill Reminder Template</label>
        <textarea id="tplBillReminder" rows="2" placeholder="Assalam o Alaikum {name}, aapka bill {month} – ₨{amount} pending hai. FiberHub ISP."></textarea>
      </div>
      <div class="form-field" style="margin-bottom:10px;">
        <label>Complaint Update Template</label>
        <textarea id="tplComplaint" rows="2" placeholder="Assalam o Alaikum {name}, aapki complaint ({issue}) – Status: {status}. FiberHub ISP."></textarea>
      </div>
      <div class="form-field" style="margin-bottom:10px;">
        <label>Welcome / New Connection</label>
        <textarea id="tplWelcome" rows="2" placeholder="Assalam o Alaikum {name}, FiberHub ISP mein khush amdeed. Package: {package}."></textarea>
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveTemplates()">Save Templates</button>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;">Variables: {name} {month} {amount} {issue} {status} {package} {phone}</p>
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title">Backup / Export</h3></div>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:10px;">Firestore data JSON file mein download (documents limit safe)</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="btn btn-outline btn-sm" onclick="exportCollection('customers')">Customers</button>
        <button class="btn btn-outline btn-sm" onclick="exportCollection('bills')">Bills</button>
        <button class="btn btn-outline btn-sm" onclick="exportCollection('complaints')">Complaints</button>
        <button class="btn btn-outline btn-sm" onclick="exportCollection('packages')">Packages</button>
        <button class="btn btn-outline btn-sm" onclick="exportCollection('areas')">Areas</button>
        <button class="btn btn-primary btn-sm" onclick="exportAllBackup()">Full Backup</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Activity Logs</h3>
        <button class="btn btn-outline btn-sm" onclick="loadActivityLogs()">Refresh</button>
      </div>
      <div id="activityLogsList" style="max-height:280px;overflow-y:auto;">Loading...</div>
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title">Auto Suspend (Unpaid Bills)</h3></div>
      <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:12px;">Pending bills wale customers ko suspend karein</p>
      <button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="runAutoSuspend()">Run Auto Suspend Now</button>
      <div id="suspendResult" style="margin-top:12px;"></div>
    </div>
  `;
  loadCompanySettings();
  loadPackagesList();
  loadAreasList();
  loadLateFeeSettings();
  loadTemplates();
  loadActivityLogs();
}

function showPackageForm(id, data) {
  document.getElementById("packageForm").style.display = "block";
  document.getElementById("pkgEditId").value = id || "";
  document.getElementById("pkgName").value = data?.name || "";
  document.getElementById("pkgSpeed").value = data?.speed || "";
  document.getElementById("pkgRent").value = data?.rent || "";
  document.getElementById("pkgDesc").value = data?.description || "";
}

function editPackageById(id) {
  const d = (window._packagesCache && window._packagesCache[id]) || {};
  showPackageForm(id, d);
}

function hidePackageForm() {
  document.getElementById("packageForm").style.display = "none";
  document.getElementById("pkgEditId").value = "";
}

async function savePackage() {
  const id = document.getElementById("pkgEditId").value;
  const name = document.getElementById("pkgName").value.trim();
  const speed = Number(document.getElementById("pkgSpeed").value) || 0;
  const rent = Number(document.getElementById("pkgRent").value) || 0;
  const description = document.getElementById("pkgDesc").value.trim();

  if (!name || !rent) {
    showToast("Name and Rent required", "error");
    return;
  }

  const data = {
    name,
    speed,
    rent,
    description,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (id) {
      await db.collection("packages").doc(id).update(data);
      showToast("Package updated", "success");
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("packages").add(data);
      showToast("Package added", "success");
    }
    hidePackageForm();
    loadPackagesList();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function loadPackagesList() {
  const el = document.getElementById("packagesList");
  if (!el) return;
  try {
    const snap = await db.collection("packages").get();
    let docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => (a.rent || 0) - (b.rent || 0));

    if (docs.length === 0) {
      // Seed defaults once if empty
      const defaults = [
        { name: "10 Mbps", speed: 10, rent: 1500 },
        { name: "20 Mbps", speed: 20, rent: 2500 },
        { name: "30 Mbps", speed: 30, rent: 3000 },
        { name: "50 Mbps", speed: 50, rent: 4000 },
        { name: "100 Mbps", speed: 100, rent: 6000 }
      ];
      for (const p of defaults) {
        await db.collection("packages").add({
          ...p,
          description: "",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      showToast("Default packages created", "success");
      return loadPackagesList();
    }

    window._packagesCache = {};
    docs.forEach(d => { window._packagesCache[d.id] = d; });

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Name</th><th>Speed</th><th>Rent</th><th>Actions</th></tr></thead><tbody>`;
    docs.forEach(d => {
      html += `<tr>
        <td><strong>${d.name || ""}</strong>${d.description ? `<br><small style="color:var(--text-muted)">${d.description}</small>` : ""}</td>
        <td>${d.speed || "-"} Mbps</td>
        <td>₨ ${(d.rent || 0).toLocaleString()}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-outline" onclick="editPackageById('${d.id}')">Edit</button>
          <button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="deletePackage('${d.id}')">Del</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);">Error loading packages. Create Firestore first.</p>`;
  }
}

async function deletePackage(id) {
  if (!confirm("Delete this package?")) return;
  try {
    await db.collection("packages").doc(id).delete();
    showToast("Package deleted", "success");
    loadPackagesList();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

/* ========== Areas CRUD ========== */
function showAreaForm(id, data) {
  document.getElementById("areaForm").style.display = "block";
  document.getElementById("areaEditId").value = id || "";
  document.getElementById("areaName").value = data?.name || "";
  document.getElementById("areaCity").value = data?.city || "";
}
function hideAreaForm() {
  document.getElementById("areaForm").style.display = "none";
  document.getElementById("areaEditId").value = "";
}
function editAreaById(id) {
  const d = (window._areasCache && window._areasCache[id]) || {};
  showAreaForm(id, d);
}
async function saveArea() {
  const id = document.getElementById("areaEditId").value;
  const name = document.getElementById("areaName").value.trim();
  const city = document.getElementById("areaCity").value.trim();
  if (!name) { showToast("Area name required", "error"); return; }
  try {
    const data = { name, city, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (id) {
      await db.collection("areas").doc(id).update(data);
      showToast("Area updated", "success");
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("areas").add(data);
      showToast("Area added", "success");
    }
    hideAreaForm();
    loadAreasList();
  } catch (e) { showToast("Error: " + e.message, "error"); }
}
async function loadAreasList() {
  const el = document.getElementById("areasList");
  if (!el) return;
  try {
    const snap = await db.collection("areas").get();
    let docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    window._areasCache = {};
    docs.forEach(d => { window._areasCache[d.id] = d; });
    if (docs.length === 0) {
      el.innerHTML = `<p style="color:var(--text-muted);padding:8px;">No areas yet. Add first area.</p>`;
      return;
    }
    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Area</th><th>City/Zone</th><th>Actions</th></tr></thead><tbody>`;
    docs.forEach(d => {
      html += `<tr>
        <td><strong>${d.name || ""}</strong></td>
        <td>${d.city || "-"}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editAreaById('${d.id}')">Edit</button>
          <button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="deleteArea('${d.id}')">Del</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);">Error loading areas</p>`;
  }
}
async function deleteArea(id) {
  if (!confirm("Delete this area?")) return;
  try {
    await db.collection("areas").doc(id).delete();
    showToast("Area deleted", "success");
    loadAreasList();
  } catch (e) { showToast("Error: " + e.message, "error"); }
}

/* ========== Late Fee Settings ========== */
async function loadLateFeeSettings() {
  try {
    const doc = await db.collection("settings").doc("billing").get();
    if (doc.exists) {
      const d = doc.data();
      const fee = document.getElementById("setLateFee");
      const days = document.getElementById("setLateDays");
      if (fee) fee.value = d.lateFeeAmount ?? 200;
      if (days) days.value = d.lateFeeDays ?? 10;
    }
  } catch (e) {}
}
async function saveLateFeeSettings() {
  try {
    await db.collection("settings").doc("billing").set({
      lateFeeAmount: Number(document.getElementById("setLateFee").value) || 0,
      lateFeeDays: Number(document.getElementById("setLateDays").value) || 10,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    showToast("Late fee settings saved", "success");
  } catch (e) { showToast("Error: " + e.message, "error"); }
}

async function loadCompanySettings() {
  try {
    const doc = await db.collection("settings").doc("company").get();
    if (doc.exists) {
      const d = doc.data();
      document.getElementById("setCompany").value = d.name || "";
      document.getElementById("setPhone").value = d.phone || "";
      document.getElementById("setAddress").value = d.address || "";
      document.getElementById("setWhatsapp").value = d.whatsapp || "";
    }
  } catch (e) {}
}

async function saveCompanySettings() {
  try {
    await db.collection("settings").doc("company").set({
      name: document.getElementById("setCompany").value.trim(),
      phone: document.getElementById("setPhone").value.trim(),
      address: document.getElementById("setAddress").value.trim(),
      whatsapp: document.getElementById("setWhatsapp").value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    showToast("Company settings saved", "success");
    logActivity("settings", "Company settings updated");
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

/* ========== Templates ========== */
async function loadTemplates() {
  try {
    const doc = await db.collection("settings").doc("templates").get();
    const d = doc.exists ? doc.data() : {};
    const bill = document.getElementById("tplBillReminder");
    const comp = document.getElementById("tplComplaint");
    const wel = document.getElementById("tplWelcome");
    if (bill) bill.value = d.billReminder || "Assalam o Alaikum {name}, aapka bill {month} – ₨{amount} pending hai. FiberHub ISP.";
    if (comp) comp.value = d.complaint || "Assalam o Alaikum {name}, aapki complaint ({issue}) – Status: {status}. FiberHub ISP.";
    if (wel) wel.value = d.welcome || "Assalam o Alaikum {name}, FiberHub ISP mein khush amdeed. Package: {package}.";
  } catch (e) {}
}
async function saveTemplates() {
  try {
    await db.collection("settings").doc("templates").set({
      billReminder: document.getElementById("tplBillReminder").value.trim(),
      complaint: document.getElementById("tplComplaint").value.trim(),
      welcome: document.getElementById("tplWelcome").value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    showToast("Templates saved", "success");
    logActivity("settings", "WhatsApp/SMS templates updated");
  } catch (e) { showToast("Error: " + e.message, "error"); }
}
function applyTemplate(tpl, vars) {
  let s = tpl || "";
  Object.keys(vars || {}).forEach(k => {
    s = s.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k] != null ? String(vars[k]) : "");
  });
  return s;
}

/* ========== Backup / Export ========== */
async function exportCollection(name) {
  try {
    showToast("Exporting " + name + "...", "info");
    const snap = await db.collection(name).get();
    const rows = [];
    snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
    // Strip Firestore Timestamps to plain values for JSON
    const clean = JSON.parse(JSON.stringify(rows, (k, v) => {
      if (v && typeof v === "object" && v.seconds != null && v.nanoseconds != null) {
        return new Date(v.seconds * 1000).toISOString();
      }
      return v;
    }));
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fiberhub-${name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(name + " exported (" + clean.length + " records)", "success");
    logActivity("backup", "Exported collection: " + name + " (" + clean.length + ")");
  } catch (e) {
    showToast("Export failed: " + e.message, "error");
  }
}
async function exportAllBackup() {
  try {
    showToast("Full backup shuru...", "info");
    const cols = ["customers", "bills", "complaints", "packages", "areas", "users", "network"];
    const backup = { exportedAt: new Date().toISOString(), version: "1.8.6", data: {} };
    for (const name of cols) {
      try {
        const snap = await db.collection(name).get();
        const rows = [];
        snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
        backup.data[name] = JSON.parse(JSON.stringify(rows, (k, v) => {
          if (v && typeof v === "object" && v.seconds != null && v.nanoseconds != null) {
            return new Date(v.seconds * 1000).toISOString();
          }
          return v;
        }));
      } catch (e) {
        backup.data[name] = [];
      }
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fiberhub-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Full backup downloaded", "success");
    logActivity("backup", "Full backup exported");
  } catch (e) {
    showToast("Backup failed: " + e.message, "error");
  }
}

/* ========== Activity Logs (small docs only) ========== */
async function logActivity(type, message, meta) {
  try {
    if (!user) return;
    await db.collection("activity_logs").add({
      type: type || "info",
      message: (message || "").slice(0, 300),
      by: user.name || user.email || "System",
      byUid: user.uid || "",
      role: user.role || "",
      meta: meta || null,
      at: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn("logActivity:", e);
  }
}
async function loadActivityLogs() {
  const el = document.getElementById("activityLogsList");
  if (!el) return;
  try {
    let snap;
    try {
      snap = await db.collection("activity_logs").orderBy("at", "desc").limit(40).get();
    } catch (e) {
      snap = await db.collection("activity_logs").limit(40).get();
    }
    if (snap.empty) {
      el.innerHTML = `<p style="color:var(--text-muted);padding:8px;">No activity yet</p>`;
      return;
    }
    let docs = [];
    snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => (b.at?.seconds || 0) - (a.at?.seconds || 0));
    el.innerHTML = docs.map(d => {
      const t = d.at && d.at.toDate ? d.at.toDate().toLocaleString() : "-";
      return `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
        <div><strong>${d.by || "System"}</strong> <span style="color:var(--text-muted);">(${d.role || "-"})</span>
          <span style="float:right;color:var(--text-muted);font-size:0.75rem;">${t}</span>
        </div>
        <div style="color:var(--text-secondary);margin-top:2px;">${d.message || ""}</div>
      </div>`;
    }).join("");
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:8px;">Logs load error (index optional)</p>`;
  }
}

async function runAutoSuspend() {
  if (!confirm("Pending bills wale saare customers suspend ho jayenge. Continue?")) return;
  const el = document.getElementById("suspendResult");
  el.innerHTML = "Processing...";
  try {
    const billSnap = await db.collection("bills").get();
    const pendingCust = new Set();
    billSnap.forEach(doc => {
      const d = doc.data();
      if (d.status === "pending" && d.customerId) pendingCust.add(d.customerId);
    });
    let count = 0;
    for (const cid of pendingCust) {
      await db.collection("customers").doc(cid).update({
        status: "suspended",
        suspendedAt: firebase.firestore.FieldValue.serverTimestamp(),
        suspendReason: "Unpaid bill"
      });
      count++;
    }
    el.innerHTML = `<span style="color:var(--success);">${count} customers suspended (unpaid bills)</span>`;
    showToast(count + " customers suspended", "success");
  } catch (e) {
    el.innerHTML = `<span style="color:var(--danger);">Error: ${e.message}</span>`;
  }
}

/* ========== TECHNICIAN PANEL ========== */
async function renderTechnician(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">My Assigned / Open Jobs</h3>
        <button class="btn btn-outline btn-sm" onclick="loadTechJobs()">Refresh</button>
      </div>
      <div id="techJobsList">Loading...</div>
    </div>
  `;
  loadTechJobs();
}

async function loadTechJobs() {
  const el = document.getElementById("techJobsList");
  if (!el) return;

  try {
    const snap = await db.collection("complaints").get();
    let docs = [];
    snap.forEach(doc => {
      const d = doc.data();
      // Show pending, in_progress, or assigned to this tech
      if (d.status === "pending" || d.status === "in_progress" || d.technicianId === user.uid) {
        docs.push({ id: doc.id, ...d });
      }
    });
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (docs.length === 0) {
      el.innerHTML = `<div class="empty-state"><p>No open jobs right now</p></div>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>ID</th><th>Customer</th><th>Issue</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
    docs.forEach(d => {
      html += `<tr>
        <td>${d.id.slice(0, 8)}</td>
        <td>${d.customerName || "-"}</td>
        <td>${d.issue || "-"}</td>
        <td>${d.customerPhone || "-"}</td>
        <td><span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="viewComplaint('${d.id}')">View</button>
          ${d.status !== "resolved" ? `<button class="btn btn-sm btn-primary" onclick="techUpdateJob('${d.id}')">Update</button>` : ""}
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading jobs</p>`;
  }
}

async function techUpdateJob(id) {
  // Reuse full status modal (Pending / In Progress / Resolved + notes)
  await updateComplaintStatus(id);
  // Refresh tech list after modal closes (short delay for save)
  setTimeout(() => {
    if (typeof loadTechJobs === "function") loadTechJobs();
  }, 1500);
}

async function renderMyBills(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">My Bills & Package Renewal</h3></div>
      <div id="myBillsList">Loading...</div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title">Technician Contacts</h3></div>
      <div id="techContactsList">Loading...</div>
    </div>
  `;
  loadMyBills();
  loadTechContacts();
}

async function loadMyBills() {
  const el = document.getElementById("myBillsList");
  if (!el) return;
  try {
    const snap = await db.collection("bills").get();
    let docs = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (d.customerPhone === user.phone || d.customerName === user.name || (user.email && d.customerId)) {
        // match by phone or we'll also try customer records
        docs.push({ id: doc.id, ...d });
      }
    });
    // Also match via customers collection email
    const custSnap = await db.collection("customers").where("email", "==", user.email).get();
    const myCustIds = [];
    custSnap.forEach(doc => myCustIds.push(doc.id));
    
    docs = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (myCustIds.includes(d.customerId) || d.customerPhone === user.phone) {
        docs.push({ id: doc.id, ...d });
      }
    });
    docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (docs.length === 0) {
      el.innerHTML = `<p style="color:var(--text-muted);padding:16px;">No bills found. Contact office for package renewal.</p>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>`;
    docs.forEach(d => {
      html += `<tr>
        <td>${d.month || "-"}</td>
        <td>₨ ${d.amount || 0}</td>
        <td><span class="status ${d.status === "paid" ? "active" : "pending"}">${d.status}</span></td>
        <td>${d.status === "pending" ? `<button class="btn btn-sm btn-primary" onclick="showToast('Pay via EasyPaisa/JazzCash and contact office with receipt','info')">Renew / Pay</button>` : `<button class="btn btn-sm btn-outline" onclick="printBill('${d.id}')">Receipt</button>`}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading bills</p>`;
  }
}

async function loadTechContacts() {
  const el = document.getElementById("techContactsList");
  if (!el) return;
  try {
    const snap = await db.collection("users").get();
    let techs = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (d.role === "technician") techs.push(d);
    });
    if (techs.length === 0) {
      el.innerHTML = `<p style="color:var(--text-muted);padding:12px;">No technicians listed yet</p>`;
      return;
    }
    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Name</th><th>Phone</th><th>Call</th></tr></thead><tbody>`;
    techs.forEach(t => {
      const phone = t.phone || "";
      html += `<tr>
        <td>${t.name || "Technician"}</td>
        <td>${phone || "-"}</td>
        <td>${phone ? `<a class="btn btn-sm btn-primary" href="tel:${phone}">Call</a>` : "-"}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);">Error loading contacts</p>`;
  }
}

function renderMyProfile(area) {
  const u = getCurrentUser();
  area.innerHTML = `
    <div class="card">
      <h3 class="card-title" style="margin-bottom:16px;">My Profile</h3>
      <div class="form-row">
        <div class="form-field"><label>Name</label><input value="${u.name}" readonly /></div>
        <div class="form-field"><label>Email (Login)</label><input value="${u.email}" readonly /></div>
        <div class="form-field"><label>Phone</label><input value="${u.phone || "-"}" readonly /></div>
        <div class="form-field"><label>Role</label><input value="${roleLabel(u.role)}" readonly /></div>
      </div>
      <button class="btn btn-outline" style="margin-top:12px;" onclick="resetCustomerPassword('${u.email}')">Reset My Password (Email)</button>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title">Technician Helpline</h3></div>
      <div id="techContactsList2">Loading...</div>
    </div>
  `;
  // reuse load into second container
  setTimeout(async () => {
    const el = document.getElementById("techContactsList2");
    if (!el) return;
    try {
      const snap = await db.collection("users").get();
      let techs = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.role === "technician") techs.push(d);
      });
      if (techs.length === 0) {
        el.innerHTML = `<p style="color:var(--text-muted);">No technicians yet</p>`;
        return;
      }
      let html = "";
      techs.forEach(t => {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
          <div><strong>${t.name || "Tech"}</strong><br><span style="color:var(--text-muted);font-size:0.85rem;">${t.phone || "No phone"}</span></div>
          ${t.phone ? `<a class="btn btn-sm btn-primary" href="tel:${t.phone}">Call</a>` : ""}
        </div>`;
      });
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = "Error";
    }
  }, 100);
}

/* ========== Helpers ========== */
function statusClass(status) {
  if (status === "pending") return "pending";
  if (status === "in_progress") return "in-progress";
  if (status === "resolved") return "active";
  return "pending";
}

function statusLabel(status) {
  const map = { pending: "Pending", in_progress: "In Progress", resolved: "Resolved" };
  return map[status] || status;
}

/** Format phone for WhatsApp (Pakistan 03xx → 92xx) */
function formatWhatsAppPhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "92" + p.slice(1);
  if (p.startsWith("92") && p.length >= 12) return p;
  if (p.length === 10) return "92" + p;
  return p;
}

/** Open WhatsApp chat with optional pre-filled message */
function openWhatsApp(phone, message = "") {
  const num = formatWhatsAppPhone(phone);
  if (!num) {
    showToast("Phone number not available", "error");
    return;
  }
  const text = encodeURIComponent(message || "Assalam o Alaikum, FiberHub ISP se rabta kar rahe hain.");
  const url = `https://wa.me/${num}?text=${text}`;
  window.open(url, "_blank");
}

/** Open native SMS app with pre-filled body (works on mobile) */
function openSMS(phone, message = "") {
  let p = String(phone || "").replace(/[^0-9+]/g, "");
  if (!p) {
    showToast("Phone number not available", "error");
    return;
  }
  // Prefer local 03xx for SMS on Pakistan phones
  if (p.startsWith("92") && p.length >= 12) p = "0" + p.slice(2);
  const body = encodeURIComponent(message || "Assalam o Alaikum, FiberHub ISP se rabta.");
  // iOS uses &body= , Android often ?body=
  const url = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? `sms:${p}&body=${body}`
    : `sms:${p}?body=${body}`;
  window.location.href = url;
}

/** Welcome text when new customer account is created */
async function buildWelcomeMessage(name, pkg, email, password) {
  let tpl = "Assalam o Alaikum {name}, aapka FiberHub ISP account / connection ban gaya hai.\nPackage: {package}\nLogin Email: {email}\nPassword: {password}\nApp se login karke complaints aur bills dekh sakte hain.\nShukriya!";
  try {
    const doc = await db.collection("settings").doc("templates").get();
    if (doc.exists && doc.data().welcome) {
      tpl = doc.data().welcome;
      // Ensure login credentials are included if template is short
      if (!tpl.includes("{email}") && !tpl.includes("{password}")) {
        tpl += "\nLogin: {email} / {password}";
      }
    }
  } catch (e) {}
  return applyTemplate(tpl, {
    name: name || "Customer",
    package: pkg || "-",
    email: email || "-",
    password: password || "-",
    phone: "",
    month: "",
    amount: "",
    issue: "",
    status: ""
  });
}

/** Create in-app notification for a customer */
async function createNotification(customerUid, title, message, type = "complaint", refId = null) {
  if (!customerUid) return;
  try {
    await db.collection("notifications").add({
      customerUid,
      title,
      message,
      type,
      refId,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn("Notification create failed:", e);
  }
}

function showModal(title, bodyHtml, footerHtml = null) {
  let overlay = document.querySelector(".modal-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active')">✕</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">
        ${footerHtml || `<button class="btn btn-outline" onclick="this.closest('.modal-overlay').classList.remove('active')">Close</button>`}
      </div>
    </div>
  `;
  overlay.classList.add("active");
}

/* Icons */
function iconDashboard() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`;
}
function iconUsers() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function iconBilling() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
}
function iconComplaint() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
}
function iconNetwork() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`;
}
function iconReports() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
}
function iconSettings() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
}
function iconTools() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
}
function iconCheck() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
}
function iconSuspend() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
}
function iconMoney() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
}
function iconBill() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
}

async function loadVersion() {
  try {
    const res = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      _dashKnownVersion = data.version;
      const el = document.getElementById("appVersion");
      if (el) el.textContent = "v" + data.version;
      // Also show in sidebar footer if present
      const foot = document.querySelector(".sidebar-footer");
      if (foot && !document.getElementById("sidebarVersion")) {
        const v = document.createElement("div");
        v.id = "sidebarVersion";
        v.style.cssText = "text-align:center;font-size:0.7rem;color:var(--text-muted);margin-top:4px;";
        v.textContent = "v" + data.version;
        foot.appendChild(v);
      } else if (document.getElementById("sidebarVersion")) {
        document.getElementById("sidebarVersion").textContent = "v" + data.version;
      }
    }
  } catch (e) {}
}
