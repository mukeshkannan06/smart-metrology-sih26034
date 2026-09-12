# SMART METROLOGY — SIH26034

> **Scan. Verify. Comply.**

Smart Metrology is an AI-assisted Legal Metrology packaged commodity inspection system being developed for Smart India Hackathon problem statement **SIH26034**.

The application is an **assistive inspection system** designed to assist Inspectors of Legal Metrology in examining packaged commodities and identifying potential declaration-related non-compliances according to official Legal Metrology (Packaged Commodities) Rules.

---

## 📍 Current Development Status

* **Current Phase**: **Phase 17 — Production Build & Deployment Preparation**
* **Status**: **Phase 17 Complete & Validated — Deployment Ready for Phase 18**
* **Completed & Approved Phases**:
  * Phase 1: Project Foundation & Repository Structure (Approved)
  * Phase 2: Frontend Application Shell & Base44-style UI (Approved)
  * Phase 3: Backend Express Foundation (Approved)
  * Phase 4: MongoDB Atlas & Database Foundation (Approved)
  * Phase 5: Authentication & Role-Based Authorization (Approved)
  * Phase 6: Inspector & Assistant Controller Dashboards (Approved)
  * Phase 7: New Inspection Workflow & Package Context (Approved)
  * Phase 8: Multi-Sample Inspection (Approved)
  * Phase 9: Camera Capture & Temporary Image Handling (Approved)
  * Phase 10: Gemini Multimodal AI/OCR Integration (Approved)
  * Phase 11: Legal Metrology 33-Rule Database & Deterministic Rule Engine (Approved)
  * Phase 12: Compliance Findings & Inspector Verification (Approved)
  * Phase 13: Inspection History, Evidence & Audit (Approved)
  * Phase 14: Consolidated PDF Reporting (Approved)
  * Phase 15: Assistant Controller Analytics & Monitoring (Approved)
  * Phase 16: Integration, Security & Validation (Approved)
  * Phase 17: Production Build & Deployment Preparation (Completed & Validated)

> 📖 **Deployment Guide**: Complete step-by-step instructions for deploying to Vercel and Render in Phase 18 are documented in [`docs/DEPLOYMENT_PREPARATION.md`](docs/DEPLOYMENT_PREPARATION.md).
> 🔑 **Demo Credentials**: For demonstration account logins (`inspector1`, `inspector2`, `controller`), see [`docs/demo-credentials.md`](docs/demo-credentials.md).

---

## 🛠️ Technology Stack (Established Architecture)

* **Frontend**: React (v18), Vite, TypeScript, Tailwind CSS, Lucide React (Deployed to **Vercel** in Phase 18)
* **Backend**: Node.js, Express.js, TypeScript (Deployed to **Render** in Phase 18)
* **Database**: MongoDB Atlas M0 Multi-Region Cluster
* **AI/OCR**: Google Gemini API Multimodal Vision (`gemini-2.5-flash`, server-side only)
* **Rule Engine**: Deterministic condition evaluation engine (33 statutory rules, 0% `eval()`)
* **Charts**: Recharts
* **Reporting**: jsPDF (Deterministic multi-sample consolidated synthesis)
* **Source Control**: Git & GitHub (Manually controlled by user)

### 🚫 Prohibited Technologies
* **No Railway** (Strictly Render for backend)
* **No Cloudinary** (No external image storage dependency for prototype)
* **No Base44 runtime/backend services** (Base44 is visual/functional reference only)
* **No unnecessary microservices or paid external services**

---

## 📁 Repository Structure

```
smart-metrology/
│
├── frontend/                     # React + Vite + TypeScript Frontend
│   ├── public/assets/branding/   # Branding assets & SVG logo placeholder
│   ├── src/
│   │   ├── App.tsx               # Phase 1 Foundation entry view
│   │   ├── index.css             # Tailwind base styles
│   │   ├── main.tsx              # React DOM mounting
│   │   └── vite-env.d.ts         # Environment type definitions
│   ├── .env.example              # Frontend environment template
│   ├── index.html                # HTML entry point
│   ├── package.json              # Frontend dependencies and scripts
│   ├── tailwind.config.js        # Tailwind CSS configuration
│   ├── tsconfig.json             # TypeScript configuration
│   └── vite.config.ts            # Vite bundler & API proxy configuration
│
├── backend/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/index.ts       # Typed environment variable loader & validator
│   │   ├── controllers/          # Request controllers (health.controller.ts)
│   │   ├── middleware/           # Security & utility middleware (requestLogger, notFound, error)
│   │   ├── routes/               # API routes (health.routes.ts, index.ts)
│   │   ├── types/api.ts          # Standard API response & error contracts
│   │   ├── app.ts                # Express application setup & middleware stack
│   │   └── server.ts             # Server entry point & graceful shutdown
│   ├── .env.example              # Backend environment template
│   ├── package.json              # Backend dependencies (express, cors, helmet, dotenv)
│   └── tsconfig.json             # Backend TypeScript configuration
│
├── docs/
│   └── development-status.md     # Phase tracking and architectural records
│
├── .gitignore                    # Git ignore file (excludes secrets, node_modules)
├── package.json                  # Root orchestration scripts
└── README.md                     # Project documentation
```

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js**: v18+ (tested on Node v24.x)
* **npm**: v9+ (tested on npm 11.x)
* **Git**

### 1. Install Dependencies
Run from the repository root:
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```
Or install in each directory individually:
```bash
# In backend/
cd backend && npm install

# In frontend/
cd ../frontend && npm install
```

### 2. Environment Configuration
Copy the `.env.example` templates to `.env`:

**Backend (`backend/.env`):**
```bash
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
# Free-tier M0 Atlas connection string (see docs/mongodb-atlas-setup.md)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/smart_metrology?retryWrites=true&w=majority
```

**Frontend (`frontend/.env`):**
```bash
VITE_API_BASE_URL=http://localhost:5000
```

> **Note**: Never place secrets (API keys, database credentials) in repository code or commit `.env` files.

### 3. Run Applications Locally
### 3. Database Seeding (Phase 4)
Populate synthetic demo users, inspection, child samples, and core LMPC statutory rules:
```bash
npm run seed
```

### 4. Run Applications Locally

#### Option A: Run Both Concurrently (Recommended)
From root:
```bash
npm run dev
```

#### Option B: Run Individually
**Terminal 1 (Backend):**
```bash
npm run dev:backend
# Starts Express server at http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
npm run dev:frontend
# Starts Vite dev server at http://localhost:5173
```

---

## 🩺 Health Check Verification

Once the backend is running, verify the health endpoint:
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "success": true,
  "status": "ok",
  "service": "smart-metrology-backend",
  "phase": 1,
  "phase": 4,
  "tagline": "Scan. Verify. Comply.",
  "uptime": 1.25,
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
  "timestamp": "2026-09-08T..."
}
```

Open `http://localhost:5173` in a browser to see the Phase 1 Foundation view showing live backend connectivity.
Open `http://localhost:5173` in a browser to see the Phase 2 UI Shell with live backend connectivity.

---

## 📋 Phased Development Methodology

Smart Metrology follows an incremental, human-supervised development model:

```
PLAN ──> HUMAN REVIEW ──> IMPLEMENT ──> BUILD ──> TEST ──> MANUAL VERIFY ──> HUMAN APPROVAL ──> NEXT PHASE
```

* **No automatic phase skipping**.
* **Each phase requires explicit human sign-off before the next phase begins**.

