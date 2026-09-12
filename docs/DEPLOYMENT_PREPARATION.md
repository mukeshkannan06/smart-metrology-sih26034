# Smart Metrology (SIH26034) — Production Deployment Preparation Guide

## Phase 17: Production Readiness Handbook

This document provides complete, definitive instructions for deploying the **Smart Metrology (SIH26034)** application in **Phase 18**.

---

## 1. Target Deployment Architecture

The application employs a decoupled, production-ready architecture designed for high availability, zero cloud storage cost, and deterministic legal enforcement:

```
                            GitHub Repository
                                    │
                   ┌────────────────┴────────────────┐
                   ▼                                 ▼
             Vercel Hosting                    Render Hosting
           (Frontend Service)                (Backend Web Service)
          React + Vite + TS                 Node.js + Express + TS
                   │                                 │
                   │  HTTPS + Bearer JWT / Cookie     │
                   └────────────────────────────────►│
                                                     ├────────► MongoDB Atlas M0
                                                     │         (Statutory Rules & Inspections)
                                                     │
                                                     └────────► Google Gemini API
                                                               (Multimodal AI / OCR Vision)
```

| Component | Target Platform | Runtime / Framework | Cost Tier |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | React 18, Vite, Tailwind CSS, TypeScript | Free Tier |
| **Backend API** | **Render** | Node.js (v20+), Express.js, TypeScript | Free Web Service Tier |
| **Database** | **MongoDB Atlas** | MongoDB 7.0+ M0 Multi-Region Cluster | Free Tier |
| **Multimodal AI** | **Google Gemini** | `gemini-2.5-flash` / Google AI Studio | Free / Pay-as-you-go |
| **PDF Reporting** | **jsPDF (Client-side)** | Deterministic multi-sample consolidated synthesis | Built-in |

> [!IMPORTANT]
> **Prohibited Services**: No external storage providers (Cloudinary, AWS S3, Firebase Storage, Supabase Storage), no Railway, and no Base44 backend services are used.

---

## 2. Ephemeral Filesystem & Temporary Image Storage Architecture

In compliance with the project specifications, **permanent external object storage (Cloudinary / AWS S3) is strictly NOT used**.

### How Temporary Packaging Images Are Handled:
1. When an inspector captures or uploads a package photo on mobile/desktop, the image is transmitted as a base64 payload to `POST /api/inspections/:id/samples/:sampleId/images`.
2. The backend validates magic bytes (JPEG/PNG/WebP), inspects file headers, and stores the buffer in the temporary upload directory (`backend/tmp/uploads/`).
3. The image is passed directly to the **Google Gemini Multimodal Vision API** for declaration extraction (`PRODUCT_NAME`, `NET_QUANTITY`, `MRP`, `MANUFACTURER`, `DATE`, `EXPIRY`, `ORIGIN`, `CONSUMER_CARE`, `USP`, `DIMENSIONS`).
4. Extracted observations are evaluated by the **Deterministic Rule Engine (33 Rules)** and verified by the field inspector.
5. Consolidated PDF reports are generated client-side with photographic evidence thumbnails embedded directly as base64 data streams.

### Render Ephemeral Disk Characteristics:
- On Render free instances, the local disk is **ephemeral**. When the service restarts or spins down after inactivity, local files in `tmp/uploads` are cleared.
- **Application Compatibility**: All critical inspection records, AI observation values, officer verification decisions, timestamps, cryptographic SHA-256 hashes, and audit trails persist permanently in **MongoDB Atlas**.
- If a temporary disk image reference is unlinked after a Render restart, the report generator handles it gracefully using the `UNAVAILABLE_LIFECYCLE` fallback without crashing or losing verification data.

---

## 3. Required Environment Variables

### A. Frontend Environment Variables (Configured in Vercel)

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Live URL of the deployed Render backend | `https://smart-metrology-api.onrender.com` |

*(Note: `VITE_` variables are public in the client bundle. Never put secrets here.)*

### B. Backend Environment Variables (Configured in Render)

| Variable | Required | Description | Example Value |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Execution mode | `production` |
| `PORT` | Auto | Render binds this automatically | `10000` (Render default) |
| `FRONTEND_URL` | **Yes** | Live Vercel frontend URL for CORS | `https://smart-metrology.vercel.app` |
| `CORS_ORIGIN` | **Yes** | Same as FRONTEND_URL or comma list | `https://smart-metrology.vercel.app` |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/smart_metrology?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | 256-bit cryptographic secret for session JWTs | *Generate a random 64-character hex string* |
| `JWT_EXPIRES_IN`| No | Token validity duration | `24h` |
| `GEMINI_API_KEY`| **Yes** | Google AI Studio Vision API key | *Your API Key from Google AI Studio* |
| `GEMINI_MODEL`  | No | Gemini vision model | `gemini-2.5-flash` |

---

## 4. Build & Start Commands Reference

### Frontend (Vercel Settings)
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Backend (Render Settings)
- **Environment**: Node
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

---

## 5. Phase 18 Step-by-Step Deployment Sequence

When you are ready to begin **Phase 18**, follow these steps in order:

### Step 1: MongoDB Atlas Network Access Configuration
1. Log into your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
2. Navigate to **Network Access** under Security.
3. Click **Add IP Address** and choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   *Reason*: Render free instances use dynamic egress IPs; `0.0.0.0/0` ensures the backend can always connect.
4. Verify your database user credentials under **Database Access**.

### Step 2: Deploy Backend to Render
1. Log into [Render](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Fill in the service configuration:
   - **Name**: `smart-metrology-backend` (or your preferred name)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = *(your Atlas connection string)*
   - `JWT_SECRET` = *(strong random secret)*
   - `GEMINI_API_KEY` = *(your Google AI Studio key)*
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `FRONTEND_URL` = `https://<your-project>.vercel.app` *(update once Vercel is created)*
   - `CORS_ORIGIN` = `https://<your-project>.vercel.app`
6. Click **Create Web Service** and wait for the build to finish.
7. Copy your Render backend URL (e.g. `https://smart-metrology-backend.onrender.com`).
8. Verify health check by visiting `https://smart-metrology-backend.onrender.com/api/health` in your browser. It must return `{"status":"OK","database":"connected"}`.

### Step 3: Deploy Frontend to Vercel
1. Log into [Vercel](https://vercel.com/).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit $\rightarrow$ select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://smart-metrology-backend.onrender.com` *(your Render backend URL from Step 2)*
6. Click **Deploy**.
7. Once deployment finishes, copy your Vercel URL (e.g. `https://smart-metrology.vercel.app`).

### Step 4: Link Frontend URL into Render Backend
1. Go back to Render $\rightarrow$ your Web Service $\rightarrow$ **Environment**.
2. Set `FRONTEND_URL` and `CORS_ORIGIN` to your exact Vercel URL from Step 3:
   `https://smart-metrology.vercel.app`
3. Save changes. Render will automatically redeploy with the updated CORS configuration.

---

## 6. Post-Deployment Smoke Test Matrix

After completing Phase 18 deployment, verify the following core flows:

| Test Case | Steps | Expected Result |
| :--- | :--- | :--- |
| **1. API Health Check** | Visit `https://<render-url>/api/health` in browser | HTTP 200 `{"status":"OK","database":"connected"}` |
| **2. Demo Inspector Login** | Use quick-login with `inspector1` / `Insp@2026!` | Logs in, redirects to `/inspector/dashboard` |
| **3. Demo Controller Login** | Use quick-login with `controller` / `Admin@2026!` | Logs in, redirects to `/controller/dashboard` |
| **4. New Inspection Workflow** | Create inspection with 5 statutory package contexts | Inspection created, sample #1 generated |
| **5. AI Declaration Extraction** | Capture/attach photo, trigger AI analysis | Gemini extracts declarations, rule engine evaluates |
| **6. Inspector Verification** | Confirm or correct findings, submit verification | Status changes to VERIFIED, compliance rate computed |
| **7. Multi-Sample Consolidation** | Add sample #2, evaluate and verify | Both samples appear under single inspection case |
| **8. Consolidated PDF** | Click "Generate PDF Report" on inspection detail | Single multi-sample report downloads with cryptographic hash |
| **9. Supervisory Analytics** | Log in as Assistant Controller, check metrics | Roster, chart distribution, and violations load |
| **10. SPA Deep Refresh** | Navigate to `/controller/dashboard` and press F5 | Page reloads without 404 error (handled by `vercel.json`) |

