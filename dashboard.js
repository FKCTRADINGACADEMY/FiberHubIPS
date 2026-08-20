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
  area.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">Loading dashboard...</div>`;

  let totalCustomers = 0, activeCustomers = 0, suspendedCustomers = 0;
  let totalComplaints = 0, openComplaints = 0, pendingComplaints = 0;
  let pendingBillsCount = 0, pendingBillsAmount = 0, monthlyIncome = 0;

  const now = new Date();
  const currentMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

  try {
    const custSnap = await db.collection("customers").get();
    totalCustomers = custSnap.size;
    custSnap.forEach(doc => {
      const s = (doc.data().status || "active").toLowerCase();
      if (s === "active") activeCustomers++;
      else if (s === "suspended") suspendedCustomers++;
    });
  } catch (e) { console.warn("Dashboard customers:", e); }

  try {
    const snap = await db.collection("complaints").get();
    totalComplaints = snap.size;
    snap.forEach(doc => {
      const s = doc.data().status;
      if (s === "pending" || s === "in_progress") openComplaints++;
      if (s === "pending") pendingComplaints++;
    });
  } catch (e) { console.warn("Dashboard complaints:", e); }

  try {
    const billSnap = await db.collection("bills").get();
    billSnap.forEach(doc => {
      const b = doc.data();
      const amt = Number(b.amount) || 0;
      if (b.status === "pending") {
        pendingBillsCount++;
        pendingBillsAmount += amt;
      }
      // Paid this month
      if (b.status === "paid" && b.month === currentMonth) {
        monthlyIncome += amt;
      }
    });
  } catch (e) { console.warn("Dashboard bills:", e); }

  const stats = [
    { label: "Total Customers", value: totalCustomers, icon: "purple", svg: iconUsers() },
    { label: "Active Connections", value: activeCustomers, icon: "green", svg: iconCheck() },
    { label: "Suspended", value: suspendedCustomers, icon: "red", svg: iconSuspend() },
    { label: "Monthly Income", value: "₨ " + monthlyIncome.toLocaleString(), icon: "green", svg: iconBill() },
    { label: "Pending Bills", value: pendingBillsCount + " (₨ " + pendingBillsAmount.toLocaleString() + ")", icon: "orange", svg: iconBilling() },
    { label: "Open Complaints", value: openComplaints, icon: "orange", svg: iconComplaint() },
    { label: "Pending Complaints", value: pendingComplaints, icon: "red", svg: iconComplaint() },
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
      if (typeof loadComplaintsList === "function") loadComplaintsList();
      if (typeof loadRecentComplaints === "function") loadRecentComplaints();
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
      alert("Customer Login Details:\n\nEmail: " + data.email + "\nPassword: " + password + "\n\nYe customer ko de dein.");
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
          ${phone ? `<button class="btn btn-sm btn-outline" style="color:#25D366;" onclick="openWhatsApp('${phone}', '${waMsg.replace(/'/g, "\\'")}')" title="WhatsApp">WA</button>` : ""}
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
  if (!confirm("Delete this customer?\n\nCustomer record + login user bhi delete ho jayega.")) return;
  try {
    const doc = await db.collection("customers").doc(id).get();
    if (!doc.exists) {
      showToast("Customer not found", "error");
      return;
    }
    const data = doc.data();

    // Delete customer document
    await db.collection("customers").doc(id).delete();

    // Also remove from users collection (login profile)
    if (data.uid) {
      try {
        await db.collection("users").doc(data.uid).delete();
      } catch (e) {
        console.warn("users delete:", e);
      }
    } else if (data.email) {
      // fallback: find by email
      try {
        const q = await db.collection("users").where("email", "==", data.email).limit(1).get();
        if (!q.empty) await q.docs[0].ref.delete();
      } catch (e) {}
    }

    // Note: Firebase Auth account itself cannot be fully deleted from client-side
    // without Admin SDK / Cloud Function. Users doc delete prevents login access via role check.
    showToast("Customer + login profile deleted", "success");
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
      html += `<tr>
        <td>${d.customerName || "-"}<br><small>${phone}</small></td>
        <td>${d.month || "-"}</td>
        <td>₨ ${d.amount || 0}</td>
        <td>${d.method || "-"}</td>
        <td><span class="status ${d.status === "paid" ? "active" : "pending"}">${d.status}</span></td>
        <td style="white-space:nowrap;">
          ${d.status === "pending" ? `<button class="btn btn-sm btn-primary" onclick="markPaid('${d.id}')">Mark Paid</button>` : ""}
          <button class="btn btn-sm btn-outline" onclick="editBill('${d.id}')">Edit</button>
          <button class="btn btn-sm btn-outline" onclick="printBill('${d.id}')">PDF</button>
          ${phone ? `<button class="btn btn-sm btn-outline" style="color:#25D366;" onclick="openWhatsApp('${phone}', 'Assalam o Alaikum ${d.customerName || ""}, aapka bill ${d.month || ""} – ₨${d.amount || 0} (${d.status}). FiberHub ISP.')" title="WhatsApp">WA</button>` : ""}
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
      <p style="margin-top:30px;font-size:11px;color:#999;text-align:center;">Software By Fazul Khan Chandio • 03333909816</p>
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
      <div class="card-header"><h3 class="card-title">Auto Suspend (Unpaid Bills)</h3></div>
      <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:12px;">Pending bills wale customers ko suspend karein</p>
      <button class="btn btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="runAutoSuspend()">Run Auto Suspend Now</button>
      <div id="suspendResult" style="margin-top:12px;"></div>
    </div>
  `;
  loadCompanySettings();
  loadPackagesList();
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
  } catch (e) {
    showToast("Error: " + e.message, "error");
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
