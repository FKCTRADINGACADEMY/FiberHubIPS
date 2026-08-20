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
async function renderDashboard(area) {
  area.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading...</div>`;

  let totalComplaints = 0;
  let openComplaints = 0;
  let pendingComplaints = 0;

  try {
    const snap = await db.collection("complaints").get();
    totalComplaints = snap.size;
    snap.forEach(doc => {
      const s = doc.data().status;
      if (s === "pending" || s === "in_progress") openComplaints++;
      if (s === "pending") pendingComplaints++;
    });
  } catch (e) {
    console.log("Dashboard stats error:", e);
  }

  const stats = [
    { label: "Total Complaints", value: totalComplaints, icon: "purple", svg: iconComplaint() },
    { label: "Open Complaints", value: openComplaints, icon: "orange", svg: iconComplaint() },
    { label: "Pending", value: pendingComplaints, icon: "red", svg: iconSuspend() },
    { label: "System Status", value: "Online", icon: "green", svg: iconCheck() }
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
        <h3 class="card-title">Recent Complaints</h3>
        <button class="btn btn-primary btn-sm" onclick="loadModule('complaints')">View All</button>
      </div>
      <div id="recentComplaintsList">Loading...</div>
    </div>
  `;
  area.innerHTML = html;
  loadRecentComplaints();
}

async function loadRecentComplaints() {
  const el = document.getElementById("recentComplaintsList");
  if (!el) return;

  try {
    const snap = await db.collection("complaints")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    if (snap.empty) {
      el.innerHTML = `<p style="color:var(--text-muted);padding:20px;text-align:center;">No complaints yet</p>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>ID</th><th>Customer</th><th>Issue</th><th>Status</th><th>Date</th></tr></thead><tbody>`;

    snap.forEach(doc => {
      const d = doc.data();
      const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : "-";
      html += `<tr>
        <td>${doc.id.slice(0, 8)}</td>
        <td>${d.customerName || d.customerEmail || "-"}</td>
        <td>${d.issue || "-"}</td>
        <td><span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span></td>
        <td>${date}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:12px;">Error loading complaints. Make sure Firestore is created.</p>`;
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
      html += `<tr>
        <td title="${d.id}">${d.id.slice(0, 8)}</td>
        <td>${d.customerName || "-"}<br><small style="color:var(--text-muted)">${d.customerEmail || ""}</small></td>
        <td>${d.customerPhone || "-"}</td>
        <td>${d.issue || "-"}</td>
        <td><span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span></td>
        <td>${d.technicianName || "Not Assigned"}</td>
        <td>${date}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="viewComplaint('${d.id}')">View</button>
          ${d.status !== "resolved" ? `<button class="btn btn-sm btn-primary" onclick="updateComplaintStatus('${d.id}')">Update</button>` : ""}
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

async function viewComplaint(id) {
  try {
    const doc = await db.collection("complaints").doc(id).get();
    if (!doc.exists) {
      showToast("Complaint not found", "error");
      return;
    }
    const d = doc.data();
    const date = d.createdAt ? d.createdAt.toDate().toLocaleString() : "-";

    const notes = (d.notes || []).map(n => 
      `<div style="padding:8px 0;border-bottom:1px solid var(--border);">
        <strong>${n.by || "System"}</strong> <small style="color:var(--text-muted)">${n.at ? new Date(n.at).toLocaleString() : ""}</small>
        <p style="margin-top:4px;">${n.text}</p>
      </div>`
    ).join("") || "<p style='color:var(--text-muted)'>No notes yet</p>";

    showModal("Complaint Details", `
      <div style="display:grid;gap:12px;">
        <div><strong>ID:</strong> ${id}</div>
        <div><strong>Customer:</strong> ${d.customerName || "-"} (${d.customerEmail || "-"})</div>
        <div><strong>Phone:</strong> ${d.customerPhone || "-"}</div>
        <div><strong>Issue:</strong> ${d.issue}</div>
        <div><strong>Description:</strong><br>${d.description || "-"}</div>
        <div><strong>Status:</strong> <span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span></div>
        <div><strong>Technician:</strong> ${d.technicianName || "Not Assigned"}</div>
        <div><strong>Created:</strong> ${date}</div>
        <div><strong>Notes:</strong>${notes}</div>
      </div>
    `);
  } catch (e) {
    showToast("Error loading complaint", "error");
  }
}

async function updateComplaintStatus(id) {
  const newStatus = prompt("Enter new status:\n1 = Pending\n2 = In Progress\n3 = Resolved\n\nType 1, 2 or 3:");
  if (!newStatus) return;

  const map = { "1": "pending", "2": "in_progress", "3": "resolved" };
  const status = map[newStatus.trim()];
  if (!status) {
    showToast("Invalid status", "error");
    return;
  }

  const techName = status === "in_progress" ? prompt("Technician name (optional):") : null;
  const note = prompt("Add note (optional):");

  try {
    const update = {
      status: status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (techName) {
      update.technicianName = techName;
      update.technicianId = user.uid;
    }

    const noteObj = {
      text: note || `Status changed to ${statusLabel(status)}`,
      by: user.name,
      at: Date.now()
    };

    await db.collection("complaints").doc(id).update({
      ...update,
      notes: firebase.firestore.FieldValue.arrayUnion(noteObj)
    });

    showToast("Complaint updated successfully", "success");
    loadComplaintsList();
  } catch (e) {
    showToast("Update failed: " + e.message, "error");
  }
}

/* ========== CUSTOMER: My Complaints ========== */
async function renderMyComplaints(area) {
  area.innerHTML = `
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
}

function showNewComplaintForm() {
  document.getElementById("newComplaintForm").style.display = "block";
}

function hideNewComplaintForm() {
  document.getElementById("newComplaintForm").style.display = "none";
}

async function loadMyComplaints() {
  const el = document.getElementById("myComplaintsList");
  if (!el) return;

  try {
    const snap = await db.collection("complaints")
      .where("customerUid", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><p>You have not submitted any complaints yet.<br>Click "+ New Complaint" to submit one.</p></div>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>ID</th><th>Issue</th><th>Status</th><th>Technician</th><th>Date</th><th></th></tr></thead><tbody>`;

    snap.forEach(doc => {
      const d = doc.data();
      const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : "-";
      html += `<tr>
        <td>${doc.id.slice(0, 8)}</td>
        <td>${d.issue}</td>
        <td><span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span></td>
        <td>${d.technicianName || "-"}</td>
        <td>${date}</td>
        <td><button class="btn btn-sm btn-outline" onclick="viewComplaint('${doc.id}')">View</button></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    // If index error, try without orderBy
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

      let html = `<div class="table-wrapper"><table>
        <thead><tr><th>ID</th><th>Issue</th><th>Status</th><th>Date</th></tr></thead><tbody>`;
      docs.forEach(d => {
        const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : "-";
        html += `<tr>
          <td>${d.id.slice(0, 8)}</td>
          <td>${d.issue}</td>
          <td><span class="status ${statusClass(d.status)}">${statusLabel(d.status)}</span></td>
          <td>${date}</td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
      el.innerHTML = html;
    } catch (e2) {
      el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading. Create Firestore database first.</p>`;
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
    const complaint = {
      customerUid: user.uid,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: phone || user.phone || "",
      issue: issue,
      description: description,
      status: "pending",
      technicianId: null,
      technicianName: null,
      notes: [{
        text: "Complaint submitted by customer",
        by: user.name,
        at: Date.now()
      }],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection("complaints").add(complaint);
    showToast("Complaint submitted successfully! ID: " + ref.id.slice(0, 8), "success");
    
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

/* ========== Other Modules (basic) ========== */
function renderCustomers(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Customers</h3>
        <button class="btn btn-primary" onclick="showToast('Customer module - next update','info')">+ New Customer</button>
      </div>
      <p style="color:var(--text-muted);padding:20px;">Customer management module will be connected next. Complaint system is now live.</p>
    </div>
  `;
}

function renderBilling(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">Billing & Payments</h3></div>
      <p style="color:var(--text-muted);padding:20px;">Billing module coming in next update. Complaint system is live now.</p>
    </div>
  `;
}

function renderNetwork(area) {
  area.innerHTML = `<div class="card"><div class="card-header"><h3 class="card-title">Network Module</h3></div>
    <p style="color:var(--text-muted);padding:20px;">Coming soon.</p></div>`;
}

function renderReports(area) {
  area.innerHTML = `<div class="card"><div class="card-header"><h3 class="card-title">Reports</h3></div>
    <p style="color:var(--text-muted);padding:20px;">Coming soon.</p></div>`;
}

function renderSettings(area) {
  area.innerHTML = `<div class="card"><div class="card-header"><h3 class="card-title">Settings</h3></div>
    <p style="color:var(--text-muted);padding:20px;">Coming soon.</p></div>`;
}

function renderTechnician(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">My Assigned Jobs</h3></div>
      <p style="color:var(--text-muted);padding:12px;">Complaints assigned to you will appear here. Go to <strong>Complaints</strong> to see all open tickets.</p>
    </div>
  `;
}

function renderMyBills(area) {
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">My Bills & Package Renewal</h3></div>
      <p style="color:var(--text-muted);padding:20px;">Billing module coming soon. You can already submit complaints.</p>
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

/* ========== Helpers ========== */
function statusClass(status) {
  if (status === "pending") return "pending";
  if (status === "in_progress") return "resolved";
  if (status === "resolved") return "active";
  return "pending";
}

function statusLabel(status) {
  const map = { pending: "Pending", in_progress: "In Progress", resolved: "Resolved" };
  return map[status] || status;
}

function showModal(title, bodyHtml) {
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
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').classList.remove('active')">Close</button>
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

async function loadVersion() {
  try {
    const res = await fetch("version.json?t=" + Date.now());
    if (res.ok) {
      const data = await res.json();
      console.log("App version:", data.version);
    }
  } catch (e) {}
}
