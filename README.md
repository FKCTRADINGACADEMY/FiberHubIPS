# FiberHub ISP Management System

**Manage Your Network with Confidence**

A complete ISP management software with multi-role login, billing, complaints, network inventory, technician panel, reports, and more. Built as a Progressive Web App (PWA) ready for GitHub Pages + Firebase.

---

## Features Included

### 🔐 Authentication & Roles
- **Admin** – Full access
- **Billing Staff** – Customers, Billing, Complaints
- **Technician** – Assigned jobs, Complaints
- **Customer (User)** – Only Complaints + Package Renewal / Bills

### 📊 Dashboard
- Total Customers, Active / Suspended Connections
- Monthly Income, Pending Bills, Open Complaints
- Revenue overview + Recent Activity

### 👥 Customer Module
- New / Edit / Delete
- CNIC, Address, GPS, Package, ONU Serial, Fiber Port
- Bill History, Documents Upload

### 💵 Billing
- Auto / Manual Bill Generate
- Receipt Print / PDF
- EasyPaisa & JazzCash Entry
- Due Reminder, Late Fee
- Auto Suspend on unpaid + Auto Reconnect after payment (ready for Cloud Functions)

### 🛠 Complaint System
- Complaint ID, Customer Search, Technician Assign
- Status: Pending / In Progress / Resolved
- Photo Upload + Notes

### 🌐 Network Module
- OLT, PON Port, Splitter, Fiber Cable, Junction Box
- ONU Stock, Router Stock

### 👨‍🔧 Technician Panel
- Assigned Jobs (Installation / Maintenance / Complaint)
- Live Status update

### 📈 Reports
- Daily / Monthly Collection, Expenses, Profit/Loss
- Customer & Complaint Reports
- Excel Import/Export + PDF Reports (structure ready)

### ⚙️ Settings
- Packages, Areas, SMS / WhatsApp Templates
- Company Details, Backup/Restore, Branch Support

### 🔥 Firebase Ready
- Authentication
- Firestore (separate collections to avoid 1MB document limit)
- Storage
- Cloud Functions (hooks ready)
- Hosting optional

### ⭐ Extra
- Dark / Light Theme
- PWA (Offline support + Installable)
- Automatic version check
- QR Code on Bills (structure)
- WhatsApp Bill Reminder (structure)
- Activity Logs
- Responsive (Mobile friendly)

---

## Demo Login (No Firebase needed)

| Role        | Email                 | Password    |
|-------------|-----------------------|-------------|
| Admin       | admin@fiberhub.com    | admin123    |
| Billing     | billing@fiberhub.com  | billing123  |
| Technician  | tech@fiberhub.com     | tech123     |
| Customer    | user@fiberhub.com     | user123     |

---

## Quick Start (GitHub + GitHub Pages)

1. **Create a new GitHub repository** (e.g. `fiberhub-isp`)

2. **Upload all files** from this folder to the root of the repo

3. **Enable GitHub Pages**
   - Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`

4. Open the published URL → Login with demo credentials

---

## Connect Real Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project → Enable **Authentication** (Email/Password)
3. Create **Firestore Database**
4. Enable **Storage**
5. Project Settings → Add Web App → Copy the config
6. Open `js/firebase-config.js` and replace `YOUR_API_KEY` etc. with your real config
7. In Firestore, create a collection `users` and documents with this structure:

```json
{
  "name": "Admin User",
  "email": "admin@yourdomain.com",
  "role": "admin"
}
```

Roles: `admin` | `billing` | `technician` | `customer`

8. Create the user in Firebase Authentication (Email/Password)

---

## Recommended Firestore Structure (keeps docs small)

```
/users/{uid}
/customers/{customerId}
/customers/{customerId}/bills/{billId}
/customers/{customerId}/documents/{docId}
/complaints/{complaintId}
/packages/{packageId}
/areas/{areaId}
/payments/{paymentId}
/network/olts/{oltId}
/network/stock/{itemId}
/settings/company
/activity_logs/{logId}
/branches/{branchId}
```

---

## PWA Installation

- Open the site on mobile/desktop
- Browser will show “Add to Home Screen” / Install
- Works offline (cached pages)

To force update version:
- Edit `version.json` and `sw.js` CACHE_VERSION
- Users will see “New version available”

---

## Project Structure

```
fiberhub-isp/
├── index.html              ← Login page
├── dashboard.html          ← Main app
├── css/
│   ├── style.css
│   └── themes.css
├── js/
│   ├── firebase-config.js  ← Put your Firebase keys here
│   ├── auth.js
│   ├── app.js
│   └── dashboard.js
├── assets/
│   └── logo.png
├── manifest.json
├── sw.js
├── version.json
└── README.md
```

---

## Next Steps (Expand)

- Connect real Firestore queries in `dashboard.js` modules
- Add Cloud Functions for Auto Bill, Auto Suspend, WhatsApp reminders
- Add Chart.js for revenue graphs
- Implement PDF generation (jsPDF)
- Excel export (SheetJS)
- Full CRUD forms for Customers / Bills / Complaints

---

## License

Free to use and modify for your ISP business.

**FiberHub ISP** – Manage Your Network with Confidence.
```
