# MongoDB Atlas Setup Guide — Smart Metrology (SIH26034)

This document provides complete instructions for provisioning and configuring a **MongoDB Atlas M0 Free-Tier Cluster** for the Smart Metrology system.

---

## 1. Overview & Architecture

Smart Metrology uses MongoDB Atlas with Mongoose ODM as its persistent document database.
- **Service Tier**: MongoDB Atlas M0 (Free forever, 512 MB storage, shared RAM, zero cost)
- **Target Database Name**: `smart_metrology`
- **Core Collections Established in Phase 4**:
  - `users`: Legal Metrology officers (Inspectors and Assistant Controllers)
  - `inspections`: Packaged commodity inspection cases
  - `samples`: Individual sample units tied to parent inspections (1:N relationship)
  - `rules`: Legal Metrology (Packaged Commodities) Rules 2011 statutory provisions

---

## 2. Step-by-Step Atlas Setup

### Step 1: Sign Up / Sign In to MongoDB Atlas
1. Navigate to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Log in or create a free account.

### Step 2: Create an M0 Free Cluster
1. Click **Create** or **Build a Database**.
2. Select the **M0 Free** shared tier.
3. Choose a cloud provider and region closest to your deployment (e.g., **AWS / ap-south-1 Mumbai** or GCP).
4. Enter a cluster name (e.g., `Cluster0` or `SmartMetrologyCluster`).
5. Click **Create Deployment**.

### Step 3: Configure Database User Credentials
1. In the MongoDB Atlas sidebar, navigate to **Security** → **Database Access**.
2. Click **Add New Database User**.
3. Authentication Method: **Password**.
4. Set a username (e.g., `smart_admin`).
5. Generate or specify a strong password.  
   *(Tip: If your password contains special characters like `@`, `:`, `/`, or `%`, ensure they are URL-encoded in the connection string, or use an alphanumeric password).*
6. Under **Database User Privileges**, select **Read and write to any database** (or assign readWrite on `smart_metrology`).
7. Click **Add User**.

### Step 4: Configure Network Access (IP Whitelist)
1. In the sidebar, navigate to **Security** → **Network Access**.
2. Click **Add IP Address**.
3. For local development and dynamic cloud deployments:
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Optional:* Add a comment like `Development & Render Backend`.
4. Click **Confirm**. It takes ~1 minute for Atlas to deploy the IP whitelist.

### Step 5: Obtain the Connection String
1. In the sidebar, click **Deployment** → **Database**.
2. Click the **Connect** button next to your cluster.
3. Choose **Drivers** under "Connect to your application".
4. Select Driver: **Node.js**, Version: **5.5 or later**.
5. Copy the connection string format:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Append `/smart_metrology` before the query parameters:
   ```text
   mongodb+srv://smart_admin:YourPassword123@cluster0.xxxxx.mongodb.net/smart_metrology?retryWrites=true&w=majority
   ```

---

## 3. Local Environment Configuration

1. In your local repository, open or create `backend/.env`:
   ```env
   NODE_ENV=development
   PORT=5000
   CORS_ORIGIN=http://localhost:5173
   MONGODB_URI=mongodb+srv://smart_admin:YourPassword123@cluster0.xxxxx.mongodb.net/smart_metrology?retryWrites=true&w=majority
   ```
2. Save the file.  
   *(Note: `.env` is strictly ignored by `.gitignore` and must never be committed to git).*

---

## 4. Verifying Database Connection

1. Build and start the backend:
   ```bash
   npm run dev:backend
   ```
2. Observe the terminal output:
   ```text
   [DATABASE] Connecting to MongoDB Atlas: mongodb+srv://smart_admin:***@cluster0.xxxxx.mongodb.net/smart_metrology...
   ✅ [DATABASE] MongoDB Atlas connected successfully.
   ====================================================
     SMART METROLOGY — SIH26034 API BACKEND
     Phase 4: MongoDB Atlas & Database Foundation Active
   ====================================================
     Status:       Ready & Listening
     Environment:  development
     Port:         5000
     Health Check: http://localhost:5000/api/health
   ====================================================
   ```
3. Test the Health endpoint:
   ```bash
   curl http://localhost:5000/api/health
   ```
   **Expected Response:**
   ```json
   {
     "success": true,
     "status": "ok",
     "service": "smart-metrology-backend",
     "phase": 4,
     "tagline": "Scan. Verify. Comply.",
     "environment": "development",
     "database": {
       "status": "connected",
       "readyState": 1,
       "databaseName": "smart_metrology"
     },
     "uptime": 12.34,
     "uptimeFormatted": "0h 0m 12s",
     "memory": {
       "rssMb": 48.21,
       "heapTotalMb": 24.50,
       "heapUsedMb": 18.72
     },
     "timestamp": "2026-09-08T18:00:00.000Z"
   }
   ```

---

## 5. Seeding Synthetic Base Data

To populate the database with synthetic demo data (users, sample inspection with 5 child samples, and core LMPC 2011 statutory rules):

Run from project root:
```bash
npm run seed
```
Or from within the `backend/` directory:
```bash
npm --prefix backend run seed
```

**Seed Execution Output:**
```text
====================================================
  SMART METROLOGY — SIH26034 DATABASE SEED
  Phase 4: Populating Synthetic Base Data
====================================================
[1/4] Seeding Demo Users...
  ✓ Demo User: Rajesh Kumar (INSPECTOR, ID: INS-DEL-01)
  ✓ Demo User: Priya Sharma (INSPECTOR, ID: INS-DEL-02)
  ✓ Demo User: Dr. Vikram Singh (ASSISTANT_CONTROLLER, ID: AC-HQ-01)

[2/4] Seeding Sample Inspection...
  ✓ Demo Inspection: INS-2026-001 (Packaged Wheat Flour (Atta))

[3/4] Seeding Samples for Inspection...
  ✓ Sample #1 linked to inspection INS-2026-001
  ✓ Sample #2 linked to inspection INS-2026-001
  ✓ Sample #3 linked to inspection INS-2026-001
  ✓ Sample #4 linked to inspection INS-2026-001
  ✓ Sample #5 linked to inspection INS-2026-001

[4/4] Seeding Core LMPC Statutory Rules...
  ✓ Rule Rule 6(1)(a): NAME_AND_ADDRESS
  ✓ Rule Rule 6(1)(b): COMMON_GENERIC_NAME
  ✓ Rule Rule 6(1)(c): NET_QUANTITY
  ✓ Rule Rule 6(1)(d): MONTH_YEAR_OF_MANUFACTURE
  ✓ Rule Rule 6(1)(da): BEST_BEFORE_EXPIRY
  ✓ Rule Rule 6(1)(e): MRP
  ✓ Rule Rule 6(1)(ea): UNIT_SALE_PRICE
  ✓ Rule Rule 6(1)(f): CONSUMER_CARE
  ✓ Rule Rule 6(1)(g): COUNTRY_OF_ORIGIN
  ✓ Rule Rule 7: FONT_SIZE_AND_PROMINENCE

====================================================
✅ [SEED] Database seeded successfully!
====================================================
[DATABASE] Mongoose disconnected gracefully.
[SEED] Database connection closed cleanly.
```

---

## 6. Disconnected DB Graceful Fallback

If `MONGODB_URI` is omitted from `backend/.env` or the cluster is temporarily unreachable:
- The backend server starts cleanly without crashing.
- `GET /api/health` reports `"database": { "status": "disconnected", "readyState": 0 }`.
- Frontend UI displays backend connectivity status gracefully.
- Clear console guidance points to this setup guide.

---

## 7. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| `MongoServerSelectionError: connection timed out` | IP is not whitelisted in Atlas Network Access | Go to **Atlas Network Access** and add `0.0.0.0/0` |
| `MongoServerError: bad auth : authentication failed` | Incorrect username or un-encoded special characters in password | Verify credentials in Atlas **Database Access**; URL-encode special characters (e.g., `#` → `%23`) |
| `MongooseError: The uri parameter to openUri() must be a string` | `MONGODB_URI` environment variable is missing | Check that `backend/.env` exists and contains a valid `MONGODB_URI` entry |
| Port 5000 Already in Use | Stale background Node.js process | Terminate the process listening on port 5000 before restarting |

