# Smart Metrology (SIH26034) — Demonstration Credentials

This document provides the synthetic demonstration accounts for testing the Smart Metrology Legal Metrology Enforcement & Compliance system.

> [!NOTE]
> All credentials and profiles listed here are purely synthetic and designed exclusively for Hackathon evaluation and local testing. Passwords in the database are securely hashed using bcrypt (10 rounds).

---

## 1. Demo User Accounts

| Role | Name | Designation | Username | Password | Badge / Officer ID |
|---|---|---|---|---|---|
| **Inspector** | Rajesh Kumar | Inspector of Legal Metrology (North Delhi) | `inspector1` | `Insp@2026!` | `INS-DEL-01` |
| **Inspector** | Priya Sharma | Inspector of Legal Metrology (Central Delhi) | `inspector2` | `Insp@2026!` | `INS-DEL-02` |
| **Assistant Controller** | Dr. Vikram Singh | Assistant Controller of Legal Metrology (HQ) | `controller` | `Admin@2026!` | `AC-HQ-01` |

---

## 2. Role Boundaries & Workspace Separation

### Inspector (`inspector1`, `inspector2`)
* **Role**: `INSPECTOR`
* **Official Designation**: Inspector, Legal Metrology
* **Authorized Workspace**: `/inspector/*`
* **Authorized Actions**: Field packaged commodity inspection, sample entry, declaration verification, non-compliance logging, report generation.
* **Restricted**: Cannot access supervisory administration, officer lists, or system logs (`/controller/*`). Direct API calls return **HTTP 403 Forbidden**.

### Assistant Controller (`controller`)
* **Role**: `ASSISTANT_CONTROLLER`
* **Official Designation**: Assistant Controller of Legal Metrology
* **Authorized Workspace**: `/controller/*`
* **Authorized Actions**: Supervisory monitoring across all field inspectors, commodity catalog oversight, statutory rules repository inspection, zonal compliance audits.

---

## 3. Quick Sign-In on Frontend

The login screen at `http://localhost:5173/login` features one-click "Demo Sign-In" cards that automatically populate these credentials for convenient evaluation during hackathon presentations.

