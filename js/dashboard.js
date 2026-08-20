/**
 * FiberHub ISP - Dashboard Controller
 * Role-based navigation & modules
 */

const user = getCurrentUser();

document.addEventListener("DOMContentLoaded", () => {
  if (!protectPage()) return;

  initTheme();
  setupUserInfo();
  setupSidebar();
  setupEvents();
  loadModule("dashboard");
  loadVersion();
});

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

  // Common for staff
  if (role === "admin" || role === "billing" || role === "technician") {
    html += navItem("dashboard", "Dashboard", iconDashboard());
  }

  // Admin + Billing
  if (role === "admin" || role === "billing") {
    html += `<div class="nav-section">Management</div>`;
    html += navItem("customers", "Customers", iconUsers());
    html += navItem("billing", "Billing", iconBilling());
    html += navItem("complaints", "Complaints", iconComplaint());
  }

  // Admin only
  if (role === "admin") {
    html += navItem("network", "Network", iconNetwork());
    html += navItem("reports", "Reports", iconReports());
    html += navItem("settings", "Settings", iconSettings());
  }

  // Technician
  if (role === "technician") {
    html += `<div class="nav-section">Jobs</div>`;
    html += navItem("technician", "My Jobs", iconTools());
    html += navItem("complaints", "Complaints", iconComplaint());
  }

  // Customer
  if (role === "customer") {
    html += navItem("my-complaints", "My Complaints", iconComplaint());
    html += navItem("my-bills", "My Bills / Renewal", iconBilling());
    html += navItem("my-profile", "My Profile", iconUsers());
  }

  nav.innerHTML = html;

  // Active state
  nav.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      nav.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      loadModule(item.dataset.module);
      // Close mobile sidebar
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  // Set first active
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
function renderDashboard(area) {
  // Demo stats
  const stats = [
    { label: "Total Customers", value: "1,248", icon: "blue", svg: iconUsers() },
    { label: "Active Connections", value: "1,102", icon: "green", svg: iconCheck() },
    { label: "Suspended", value: "146", icon: "red", svg: iconSuspend() },
    { label: "Monthly Income", value: "₨ 2.4M", icon: "green", svg: iconMoney() },
    { label: "Pending Bills", value: "87", icon: "orange", svg: iconBill() },
    { label: "Open Complaints", value: "23", icon: "purple", svg: iconComplaint() }
  ];

  let html = `<div class="stats-grid">`;
  stats.forEach(s => {
    html += `
      <div class="stat-card">
        <div class="stat-icon ${s.icon}">${s.svg}</div>
        <div class="stat-info">
          <h3>${s.value}</h3>
          <p>${s.label}</p>
        </div>
      </div>`;
  });
  html += `</div>`;

  html += `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Revenue Overview (Demo)</h3>
      </div>
      <div style="height:200px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);">
        📈 Chart will load here (connect Chart.js or Firebase data)
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Recent Activity</h3>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Time</th><th>Action</th><th>User</th><th>Details</th></tr>
          </thead>
          <tbody>
            <tr><td>10:42 AM</td><td>New Customer</td><td>Billing Staff</td><td>Ali Khan - Package 20Mbps</td></tr>
            <tr><td>10:15 AM</td><td>Bill Paid</td><td>Customer</td><td>Invoice #FH-4821 via EasyPaisa</td></tr>
            <tr><td>09:58 AM</td><td>Complaint Resolved</td><td>Technician</td><td>Fiber cut - Block C</td></tr>
            <tr><td>09:30 AM</td><td>Auto Suspend</td><td>System</td><td>3 customers - unpaid 15 days</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  area.innerHTML = html;
}

/* ========== CUSTOMERS ========== */
function renderCustomers(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Customers</h3>
        <button class="btn btn-primary" onclick="openAddCustomer()">+ New Customer</button>
      </div>
      <div class="form-row" style="margin-bottom:16px;">
        <div class="form-field">
          <input type="text" placeholder="Search by name, CNIC, mobile..." id="customerSearch" />
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>CNIC</th><th>Package</th><th>Status</th><th>ONU Serial</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>C-1001</td><td>Ali Khan</td><td>35202-XXXXXXX-1</td><td>20 Mbps</td>
              <td><span class="status active">Active</span></td>
              <td>FHONU-88421</td>
              <td>
                <button class="btn btn-sm btn-outline">Edit</button>
                <button class="btn btn-sm btn-outline">Bills</button>
              </td>
            </tr>
            <tr>
              <td>C-1002</td><td>Sara Ahmed</td><td>42101-XXXXXXX-5</td><td>50 Mbps</td>
              <td><span class="status active">Active</span></td>
              <td>FHONU-88455</td>
              <td>
                <button class="btn btn-sm btn-outline">Edit</button>
                <button class="btn btn-sm btn-outline">Bills</button>
              </td>
            </tr>
            <tr>
              <td>C-1003</td><td>Usman Ali</td><td>37405-XXXXXXX-2</td><td>10 Mbps</td>
              <td><span class="status suspended">Suspended</span></td>
              <td>FHONU-88301</td>
              <td>
                <button class="btn btn-sm btn-outline">Edit</button>
                <button class="btn btn-sm btn-outline">Bills</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title" style="margin-bottom:12px;">Customer Fields Supported</h3>
      <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.7;">
        New Customer • Edit/Delete • CNIC • Address • GPS Location • Package • ONU Serial • Fiber Port • 
        Bill History • Documents Upload • Status (Active/Suspended)
      </p>
    </div>
  `;
}

function openAddCustomer() {
  showToast("Add Customer form - connect to Firestore collection 'customers'", "info");
}

/* ========== BILLING ========== */
function renderBilling(area) {
  area.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon green">${iconMoney()}</div>
        <div class="stat-info"><h3>₨ 1,85,000</h3><p>Today Collection</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">${iconBill()}</div>
        <div class="stat-info"><h3>87</h3><p>Pending Bills</p></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">${iconCheck()}</div>
        <div class="stat-info"><h3>312</h3><p>Paid this Month</p></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Billing Actions</h3>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <button class="btn btn-primary" onclick="showToast('Auto Bill Generate - Cloud Function ready','info')">Auto Generate Bills</button>
        <button class="btn btn-outline" onclick="showToast('Manual Bill form','info')">Manual Bill</button>
        <button class="btn btn-outline" onclick="showToast('Receipt Print / PDF','info')">Print Receipt</button>
        <button class="btn btn-outline" onclick="showToast('EasyPaisa Entry','info')">EasyPaisa Entry</button>
        <button class="btn btn-outline" onclick="showToast('JazzCash Entry','info')">JazzCash Entry</button>
        <button class="btn btn-outline" onclick="showToast('Send Due Reminders via WhatsApp/SMS','info')">Due Reminder</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3 class="card-title">Recent Payments</h3></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>FH-4821</td><td>Ali Khan</td><td>₨ 2,500</td><td>EasyPaisa</td><td>20 Aug 2026</td><td><span class="status active">Paid</span></td></tr>
            <tr><td>FH-4819</td><td>Sara Ahmed</td><td>₨ 4,500</td><td>JazzCash</td><td>19 Aug 2026</td><td><span class="status active">Paid</span></td></tr>
            <tr><td>FH-4815</td><td>Usman Ali</td><td>₨ 1,800</td><td>—</td><td>15 Aug 2026</td><td><span class="status pending">Due</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ========== COMPLAINTS ========== */
function renderComplaints(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Complaints</h3>
        <button class="btn btn-primary" onclick="showToast('New Complaint form','info')">+ New Complaint</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>ID</th><th>Customer</th><th>Issue</th><th>Technician</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>CMP-204</td><td>Ali Khan</td><td>No Internet</td><td>Ahmed Tech</td>
              <td><span class="status pending">Pending</span></td>
              <td>20 Aug</td>
              <td><button class="btn btn-sm btn-outline">Assign</button></td>
            </tr>
            <tr>
              <td>CMP-203</td><td>Sara Ahmed</td><td>Slow Speed</td><td>Bilal</td>
              <td><span class="status resolved">In Progress</span></td>
              <td>19 Aug</td>
              <td><button class="btn btn-sm btn-outline">View</button></td>
            </tr>
            <tr>
              <td>CMP-201</td><td>Usman Ali</td><td>Fiber Cut</td><td>Ahmed Tech</td>
              <td><span class="status active">Resolved</span></td>
              <td>18 Aug</td>
              <td><button class="btn btn-sm btn-outline">View</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <p style="color:var(--text-muted);font-size:0.9rem;">
        Features: Complaint ID • Customer Search • Technician Assign • Pending / In Progress / Resolved • Photo Upload • Notes
      </p>
    </div>
  `;
}

/* ========== NETWORK ========== */
function renderNetwork(area) {
  area.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue">${iconNetwork()}</div><div class="stat-info"><h3>4</h3><p>OLTs Online</p></div></div>
      <div class="stat-card"><div class="stat-icon green">${iconCheck()}</div><div class="stat-info"><h3>128</h3><p>PON Ports Used</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">${iconTools()}</div><div class="stat-info"><h3>45</h3><p>ONU Stock</p></div></div>
      <div class="stat-card"><div class="stat-icon purple">${iconNetwork()}</div><div class="stat-info"><h3>22</h3><p>Router Stock</p></div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3 class="card-title">Network Inventory</h3></div>
      <p style="color:var(--text-muted);">OLT • PON Port • Splitter • Fiber Cable • Junction Box • ONU Stock • Router Stock</p>
      <p style="margin-top:12px;color:var(--text-muted);font-size:0.85rem;">Connect Firestore collections: network/olts, network/stock for live data.</p>
    </div>
  `;
}

/* ========== REPORTS ========== */
function renderReports(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">Reports</h3></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <button class="btn btn-outline">Daily Collection</button>
        <button class="btn btn-outline">Monthly Collection</button>
        <button class="btn btn-outline">Expenses</button>
        <button class="btn btn-outline">Profit / Loss</button>
        <button class="btn btn-outline">Customer Report</button>
        <button class="btn btn-outline">Complaint Report</button>
        <button class="btn btn-primary">Export Excel</button>
        <button class="btn btn-primary">PDF Report</button>
      </div>
    </div>
  `;
}

/* ========== SETTINGS ========== */
function renderSettings(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">Settings</h3></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <button class="btn btn-outline">Packages</button>
        <button class="btn btn-outline">Areas</button>
        <button class="btn btn-outline">SMS Templates</button>
        <button class="btn btn-outline">WhatsApp Templates</button>
        <button class="btn btn-outline">Company Details</button>
        <button class="btn btn-outline">Backup / Restore</button>
        <button class="btn btn-outline">Branches</button>
      </div>
    </div>
    <div class="card">
      <h3 class="card-title" style="margin-bottom:8px;">Firebase & PWA</h3>
      <p style="color:var(--text-muted);font-size:0.9rem;">
        Authentication • Firestore (separate collections) • Storage • Hosting • Cloud Functions<br>
        Dark/Light Theme • Offline Support (PWA) • Auto Version Update • QR Code on Bills
      </p>
    </div>
  `;
}

/* ========== TECHNICIAN ========== */
function renderTechnician(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">Assigned Jobs</h3></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Job ID</th><th>Type</th><th>Customer</th><th>Address</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>JOB-88</td><td>Installation</td><td>New User</td><td>Block A, Street 5</td><td><span class="status pending">Pending</span></td><td><button class="btn btn-sm btn-primary">Start</button></td></tr>
            <tr><td>JOB-87</td><td>Complaint</td><td>Ali Khan</td><td>Block C</td><td><span class="status resolved">In Progress</span></td><td><button class="btn btn-sm btn-outline">Update</button></td></tr>
            <tr><td>JOB-85</td><td>Maintenance</td><td>—</td><td>OLT-02</td><td><span class="status active">Done</span></td><td><button class="btn btn-sm btn-outline">View</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ========== CUSTOMER PORTAL ========== */
function renderMyComplaints(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">My Complaints</h3>
        <button class="btn btn-primary" onclick="showToast('Submit new complaint form','info')">+ New Complaint</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>ID</th><th>Issue</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            <tr><td>CMP-180</td><td>Slow Speed</td><td><span class="status active">Resolved</span></td><td>10 Aug 2026</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMyBills(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">My Bills & Package Renewal</h3></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Invoice</th><th>Month</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td>FH-4801</td><td>August 2026</td><td>₨ 2,500</td><td><span class="status pending">Due</span></td>
              <td><button class="btn btn-sm btn-primary">Pay / Renew</button></td></tr>
            <tr><td>FH-4750</td><td>July 2026</td><td>₨ 2,500</td><td><span class="status active">Paid</span></td>
              <td><button class="btn btn-sm btn-outline">Receipt</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMyProfile(area) {
  const u = getCurrentUser();
  area.innerHTML = `
    <div class="card">
      <h3 class="card-title" style="margin-bottom:16px;">My Profile</h3>
      <div class="form-row">
        <div class="form-field"><label>Name</label><input value="${u.name}" readonly /></div>
        <div class="form-field"><label>Email</label><input value="${u.email}" readonly /></div>
        <div class="form-field"><label>Role</label><input value="${roleLabel(u.role)}" readonly /></div>
      </div>
    </div>
  `;
}

/* ========== Icons (SVG) ========== */
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
    const res = await fetch("version.json?t=" + Date.now());
    if (res.ok) {
      const data = await res.json();
      console.log("App version:", data.version);
    }
  } catch (e) {}
}
