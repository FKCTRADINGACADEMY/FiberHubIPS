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
        <div class="form-field"><label>Email</label><input id="cEmail" placeholder="email@example.com" /></div>
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
      <button class="btn btn-primary" id="saveCustomerBtn" onclick="saveCustomer()">Save Customer</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Customers</h3>
        <button class="btn btn-primary" onclick="showCustomerForm()">+ New Customer</button>
      </div>
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-field"><input type="text" id="customerSearch" placeholder="Search name, CNIC, phone, ONU..." oninput="loadCustomersList()" /></div>
      </div>
      <div id="customersList">Loading...</div>
    </div>
  `;
  loadCustomersList();
}

function showCustomerForm(id) {
  document.getElementById("customerFormCard").style.display = "block";
  document.getElementById("customerFormTitle").textContent = id ? "Edit Customer" : "New Customer";
  document.getElementById("editCustomerId").value = id || "";
  if (!id) {
    ["cName","cCnic","cPhone","cEmail","cOnu","cPort","cArea","cGps","cAddress"].forEach(i => {
      const el = document.getElementById(i); if (el) el.value = "";
    });
    document.getElementById("cPackage").value = "20 Mbps";
    document.getElementById("cRent").value = "2500";
    document.getElementById("cStatus").value = "active";
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
    email: document.getElementById("cEmail").value.trim(),
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
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.createdBy = user.uid;
      await db.collection("customers").add(data);
      showToast("Customer added", "success");
    }
    hideCustomerForm();
    loadCustomersList();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
  btn.disabled = false;
  btn.textContent = "Save Customer";
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
      html += `<tr>
        <td>${d.name || "-"}<br><small style="color:var(--text-muted)">${d.area || ""}</small></td>
        <td>${d.cnic || "-"}</td>
        <td>${d.phone || "-"}</td>
        <td>${d.package || "-"}</td>
        <td>${d.onuSerial || "-"}</td>
        <td><span class="status ${d.status === "active" ? "active" : "suspended"}">${d.status || "active"}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editCustomer('${d.id}')">Edit</button>
          <button class="btn btn-sm btn-outline" onclick="deleteCustomer('${d.id}')">Del</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error: ${e.message}</p>`;
  }
}

async function editCustomer(id) {
  try {
    const doc = await db.collection("customers").doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();
    showCustomerForm(id);
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
  if (!confirm("Delete this customer?")) return;
  try {
    await db.collection("customers").doc(id).delete();
    showToast("Customer deleted", "success");
    loadCustomersList();
  } catch (e) {
    showToast("Delete failed", "error");
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
      html += `<tr>
        <td>${d.customerName || "-"}<br><small>${d.customerPhone || ""}</small></td>
        <td>${d.month || "-"}</td>
        <td>₨ ${d.amount || 0}</td>
        <td>${d.method || "-"}</td>
        <td><span class="status ${d.status === "paid" ? "active" : "pending"}">${d.status}</span></td>
        <td>
          ${d.status === "pending" ? `<button class="btn btn-sm btn-primary" onclick="markPaid('${d.id}')">Mark Paid</button>` : ""}
          <button class="btn btn-sm btn-outline" onclick="printBill('${d.id}')">PDF</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading bills</p>`;
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
    loadBillsList();
    loadBillingStats();
  } catch (e) {
    showToast("Error", "error");
  }
}

async function printBill(id) {
  try {
    const doc = await db.collection("bills").doc(id).get();
    if (!doc.exists) return;
    const d = doc.data();
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Bill - ${d.customerName}</title>
      <style>body{font-family:Arial;padding:40px;max-width:500px;margin:auto}
      h1{color:#1e88e5} .row{display:flex;justify-content:space-between;margin:8px 0}
      .total{font-size:1.3em;font-weight:bold;border-top:2px solid #333;padding-top:10px;margin-top:20px}
      @media print{button{display:none}}</style></head><body>
      <h1>FiberHub ISP</h1>
      <p>Manage Your Network with Confidence</p><hr>
      <div class="row"><span>Customer:</span><strong>${d.customerName || "-"}</strong></div>
      <div class="row"><span>Phone:</span><span>${d.customerPhone || "-"}</span></div>
      <div class="row"><span>Month:</span><span>${d.month || "-"}</span></div>
      <div class="row"><span>Method:</span><span>${d.method || "-"}</span></div>
      <div class="row"><span>Txn No:</span><span>${d.txnNo || "-"}</span></div>
      <div class="row total"><span>Amount:</span><span>₨ ${d.amount || 0}</span></div>
      <div class="row"><span>Status:</span><strong>${d.status}</strong></div>
      <br><button onclick="window.print()">Print / Save PDF</button>
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
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Created</th></tr></thead><tbody>`;

    snap.forEach(doc => {
      const d = doc.data();
      const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString() : "-";
      const roleColor = d.role === "admin" ? "purple" : d.role === "technician" ? "orange" : d.role === "billing" ? "green" : "blue";
      html += `<tr>
        <td>${d.name || "-"}</td>
        <td>${d.email || "-"}</td>
        <td>${d.phone || "-"}</td>
        <td><span class="status ${d.role === "admin" ? "resolved" : d.role === "customer" ? "active" : "pending"}">${d.role || "customer"}</span></td>
        <td>${date}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    el.innerHTML = html;
  } catch (e) {
    // Fallback without orderBy
    try {
      const snap = await db.collection("users").get();
      let docs = [];
      snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      
      let html = `<div class="table-wrapper"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead><tbody>`;
      docs.forEach(d => {
        html += `<tr>
          <td>${d.name || "-"}</td>
          <td>${d.email || "-"}</td>
          <td>${d.phone || "-"}</td>
          <td><span class="status active">${d.role || "customer"}</span></td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
      el.innerHTML = html;
    } catch (e2) {
      el.innerHTML = `<p style="color:var(--danger);padding:16px;">Error loading users</p>`;
    }
  }
}

/* ========== NETWORK MODULE ========== */
async function renderNetwork(area) {
  area.innerHTML = `
    <div class="stats-grid" id="networkStats">
      <div class="stat-card"><div class="stat-icon blue">${iconNetwork()}</div><div class="stat-info"><h3 id="nOlts">-</h3><p>OLTs</p></div></div>
      <div class="stat-card"><div class="stat-icon green">${iconCheck()}</div><div class="stat-info"><h3 id="nOnu">-</h3><p>ONU Stock</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">${iconTools()}</div><div class="stat-info"><h3 id="nRouter">-</h3><p>Router Stock</p></div></div>
      <div class="stat-card"><div class="stat-icon purple">${iconNetwork()}</div><div class="stat-info"><h3 id="nSplitter">-</h3><p>Splitters</p></div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Add Network Item</h3>
      </div>
      <div class="form-row">
        <div class="form-field"><label>Type</label>
          <select id="netType">
            <option value="olt">OLT</option>
            <option value="onu">ONU Stock</option>
            <option value="router">Router Stock</option>
            <option value="splitter">Splitter</option>
            <option value="cable">Fiber Cable</option>
            <option value="junction">Junction Box</option>
          </select>
        </div>
        <div class="form-field"><label>Name / Model</label><input id="netName" placeholder="e.g. Huawei MA5800" /></div>
        <div class="form-field"><label>Quantity / Ports</label><input id="netQty" type="number" value="1" /></div>
        <div class="form-field"><label>Location / Notes</label><input id="netLoc" placeholder="Site / Notes" /></div>
      </div>
      <button class="btn btn-primary" onclick="saveNetworkItem()">Add Item</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Network Inventory</h3>
        <button class="btn btn-outline btn-sm" onclick="loadNetworkList()">Refresh</button>
      </div>
      <div id="networkList">Loading...</div>
    </div>
  `;
  loadNetworkList();
}

async function saveNetworkItem() {
  const data = {
    type: document.getElementById("netType").value,
    name: document.getElementById("netName").value.trim(),
    qty: Number(document.getElementById("netQty").value) || 1,
    location: document.getElementById("netLoc").value.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: user.uid
  };
  if (!data.name) { showToast("Name required", "error"); return; }

  try {
    await db.collection("network").add(data);
    showToast("Item added", "success");
    document.getElementById("netName").value = "";
    document.getElementById("netLoc").value = "";
    loadNetworkList();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function loadNetworkList() {
  const el = document.getElementById("networkList");
  if (!el) return;

  try {
    const snap = await db.collection("network").get();
    let docs = [];
    let counts = { olt: 0, onu: 0, router: 0, splitter: 0 };

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

    if (docs.length === 0) {
      el.innerHTML = `<div class="empty-state"><p>No network items yet</p></div>`;
      return;
    }

    let html = `<div class="table-wrapper"><table>
      <thead><tr><th>Type</th><th>Name</th><th>Qty</th><th>Location</th><th>Action</th></tr></thead><tbody>`;
    docs.forEach(d => {
      html += `<tr>
        <td>${(d.type || "").toUpperCase()}</td>
        <td>${d.name || "-"}</td>
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
        <button class="btn btn-primary" onclick="exportExcel()">Export Excel (CSV)</button>
      </div>
      <div id="reportResult"><p style="color:var(--text-muted);">Select a report above</p></div>
    </div>
  `;
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

function renderSettings(area) {
  area.innerHTML = `<div class="card"><div class="card-header"><h3 class="card-title">Settings</h3></div>
    <p style="color:var(--text-muted);padding:20px;">Packages, Areas, SMS/WhatsApp Templates, Company Details — next update</p></div>`;
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
  const choice = prompt("Update status:\n1 = Start (In Progress)\n2 = Resolved\n\nType 1 or 2:");
  if (!choice) return;
  const status = choice === "1" ? "in_progress" : choice === "2" ? "resolved" : null;
  if (!status) { showToast("Invalid", "error"); return; }

  const note = prompt("Add note (optional):") || "";

  try {
    await db.collection("complaints").doc(id).update({
      status,
      technicianId: user.uid,
      technicianName: user.name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      notes: firebase.firestore.FieldValue.arrayUnion({
        text: note || `Status → ${statusLabel(status)}`,
        by: user.name,
        at: Date.now()
      })
    });
    showToast("Job updated", "success");
    loadTechJobs();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
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
