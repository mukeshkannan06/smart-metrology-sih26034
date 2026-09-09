# Smart Metrology — Development Status Log

Project: Smart Metrology (SIH26034)  
Current Phase: Phase 9 — Camera Capture & Temporary Package Image Handling  
Status: IMPLEMENTATION COMPLETE — WAITING FOR HUMAN APPROVAL  

---

## 1. Phase Status Overview

| Phase | Description | Status | Sign-off Date |
|---|---|---|---|
| **Phase 1** | **Project Foundation & Repository Structure** | **APPROVED** | 08 Sep 2026 |
| **Phase 2** | **Frontend Application Shell & Base44-style UI** | **APPROVED** | 08 Sep 2026 |
| **Phase 3** | **Backend Express Foundation** | **APPROVED** | 08 Sep 2026 |
| **Phase 4** | **MongoDB Atlas & Database Foundation** | **APPROVED** | 08 Sep 2026 |
| **Phase 5** | **Authentication & Role-Based Authorization** | **APPROVED** | 08 Sep 2026 |
| **Phase 6** | **Inspector & Assistant Controller Dashboards** | **APPROVED** | 08 Sep 2026 |
| **Phase 7** | **New Inspection Workflow & Package Context** | **APPROVED** | 09 Sep 2026 |
| **Phase 8** | **Multi-Sample Inspection Flow** | **APPROVED** | 09 Sep 2026 |
| **Phase 9** | **Camera Capture & Temporary Image Handling** | **IMPLEMENTATION COMPLETE** | *Pending Review* |
| Phase 10 | Gemini AI/OCR Integration | NOT_STARTED | — |
| Phase 11 | Rule Database & Deterministic Rule Engine | NOT_STARTED | — |
| Phase 12 | Compliance Findings & Inspector Verification | NOT_STARTED | — |
| Phase 13 | Inspection History, Evidence & Audit Logs | NOT_STARTED | — |
| Phase 14 | Consolidated PDF Reporting (jsPDF) | NOT_STARTED | — |
| Phase 15 | Assistant Controller Analytics (Recharts) | NOT_STARTED | — |
| Phase 16 | Integration, Security & Validation | NOT_STARTED | — |
| Phase 17 | Production Build & Deployment Preparation | NOT_STARTED | — |
| Phase 18 | Vercel + Render + MongoDB Atlas Deployment | NOT_STARTED | — |
| Phase 19 | End-to-End SIH Demo Hardening | NOT_STARTED | — |

---

## 2. Phase 1 Accomplishments

* Initialized Git repository and created root `.gitignore` protecting secrets, build outputs, and node_modules.
* Created root `package.json` with orchestration scripts (`dev`, `build`, `install:all`).
* Initialized backend with Node.js, Express, and TypeScript.
* Configured backend TypeScript (`tsconfig.json`), safe config loader, error handling, CORS, and `GET /api/health` endpoint.
* Initialized frontend with React, Vite, and TypeScript.
* Configured Tailwind CSS, Lucide React, and Vite proxy forwarding `/api` to backend port 5000.
* Created minimal Phase 1 foundation screen testing real-time backend API connectivity.
* Added SVG placeholder branding for Smart Metrology in `/frontend/public/assets/branding/`.
* Created `.env.example` templates for both frontend and backend.
* Verified that zero Phase 2+ features were created prematurely (no login, no dashboards, no camera, no Gemini calls, no database schemas, no rule engines).

---

## 3. Phase 2 Accomplishments

* Created responsive application shell (`Sidebar`, `Header`, `AppLayout`) honoring the Base44 prototype UI/UX independently with zero Base44 runtime dependencies.
* Configured role-aware navigation:
  * **Inspector Workspace**: Dashboard, New Inspection, Scan/Capture, My Inspections, History, Findings, Violations, Reports, Generate PDF, Rule Reference, Downloads, Settings, Logout.
  * **Assistant Controller Workspace**: Dashboard, Inspectors, Inspections, Reports & Analytics, Violations, Products/Commodities, Rule Database, Downloads, System Logs, Settings, Logout.
  * *Strictly removed "Products / Commodities" from the Inspector navigation as mandated.*
* Implemented Inspector Dashboard with KPI summary cards, quick actions, non-compliance alerts, and recent inspections table.
* Implemented Assistant Controller Dashboard with supervisory KPIs, field officer monitoring, and Recharts visual analytics placeholders (Inspection trends & Violation categories).
* Implemented interactive New Inspection placeholder visualizing the 7-step wizard with Package Context selection (Retail, Wholesale, Institutional, Imported, Export) and multi-sample scoping.
* Created modular reusable UI library: `Button`, `Card`, `DashboardCard`, `Badge`, `Table`, `EmptyState`, `PageHeader`.
* Implemented top header with live backend health indicator (verifying Phase 1 connection) and demo role toggle switcher for Phase 2 UI verification.
* Built placeholder screens for all navigation routes without adding premature database, AI, or business logic.
* Verified that both backend and frontend build cleanly with 0 errors.

---

## 4. Phase 3 Accomplishments

* Established modular Node.js + Express + TypeScript backend foundation decoupled into `app.ts` (configuration) and `server.ts` (bootstrap & graceful shutdown).
* Configured enterprise security headers using `helmet` (content security, MIME sniffing protection, XSS protection, HSTS).
* Configured dynamic CORS using `FRONTEND_URL` / `CORS_ORIGIN` allowing secure multi-environment origins.
* Configured safe body parsing with `express.json({ limit: '2mb' })` protecting against payload flooding.
* Implemented standardized API contracts (`ApiResponse<T>`, `ApiErrorResponse`, `HealthData`).
* Implemented controller layer starting with `HealthController.getHealth` providing uptime, memory usage, service name, environment, and phase metadata.
* Implemented root API router (`/api/`) designed for modular future additions (`/auth`, `/inspections`, `/rules`, `/reports`).
* Implemented centralized error handling:
  * `notFoundHandler` returning uniform JSON 404 responses.
  * `errorHandler` gracefully catching malformed JSON payloads and server errors without leaking stack traces in production.
* Implemented lightweight development request logging (`requestLogger.ts`).
* Maintained 100% backward compatibility with Phase 1 health check and Phase 2 frontend UI shell.
* Verified that zero database (Phase 4), auth (Phase 5), AI (Phase 10), or rule engine (Phase 11) logic was implemented prematurely.

---

## 5. Important Architectural Decisions Recorded
## 5. Phase 4 Accomplishments

* Integrated Mongoose ODM (`^8.12.0` / `^9.9.5`) with full TypeScript type definitions.
* Created modular database connection module (`backend/src/config/database.ts`):
  * Credential sanitization regex to mask passwords in logs (`sanitizeMongoUri`).
  * Connection configuration with safe timeouts (`serverSelectionTimeoutMS: 5000`, `connectTimeoutMS: 10000`, `maxPoolSize: 10`).
  * Disconnected DB graceful fallback: backend server boots cleanly even if `MONGODB_URI` is not yet supplied.
  * Graceful shutdown hooks on `SIGTERM` and `SIGINT` to safely drain and close database connections.
* Defined type-safe MongoDB schemas and models matching Master Engineering Specification:
  * `User`: Officers with roles (`INSPECTOR`, `ASSISTANT_CONTROLLER`), status, demo flag (strictly zero Phase 5 passwords/auth).
  * `Inspection`: Packaging context enum (6 statutory contexts), status, sample counts, unique inspectionNumber.
  * `Sample`: Child samples referencing parent inspection with compound unique index `{ inspectionId: 1, sampleNumber: 1 }` supporting the 1-inspection-to-many-samples architecture.
  * `Rule`: LMPC statutory rule representation with `ruleReference`, `declarationType`, `packageContext`, and `version`.
* Updated `GET /api/health` endpoint to expose database readiness and database name without exposing credentials.
* Created standalone on-demand database seed script (`backend/src/database/seed.ts` via `npm run seed`) populating synthetic demo users, inspection, 5 child samples, and 10 core statutory LMPC 2011 rules.
* Created comprehensive MongoDB Atlas M0 free tier guide in `docs/mongodb-atlas-setup.md`.
* Maintained strict Phase boundaries: zero auth/JWT, zero inspection CRUD, zero AI calls, zero rule evaluation logic.

## 6. Phase 5 Accomplishments

* **Backend Authentication Architecture**:
  * Installed and integrated `bcryptjs`, `jsonwebtoken`, and `cookie-parser` with full TypeScript definitions.
  * Added `jwtSecret` and `jwtExpiresIn` (24h) configuration in `backend/src/config/index.ts` with safe environment variable handling.
  * Updated `User` model: unique lowercase `username`, `passwordHash` (hidden with `select: false`), and `comparePassword()` helper.
  * Added `requireAuth` middleware to authenticate JWT via HTTP-only cookies or Authorization Bearer header.
  * Added `requireRole(...roles)` RBAC middleware strictly returning HTTP 403 Forbidden when unauthorized.
  * Implemented `AuthController` endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, and RBAC verification endpoints (`/test/inspector-only`, `/test/controller-only`).
  * Mounted authentication router on `/api/auth` in backend.
* **Database Credentials & Seeding**:
  * Seeded 3 synthetic demo accounts into MongoDB Atlas with secure bcrypt-hashed passwords:
    * `inspector1` / `Insp@2026!` (Rajesh Kumar, Inspector, Badge: INS-DEL-01)
    * `inspector2` / `Insp@2026!` (Priya Sharma, Inspector, Badge: INS-DEL-02)
    * `controller` / `Admin@2026!` (Dr. Vikram Singh, Assistant Controller, Badge: AC-HQ-01)
  * Documented all credentials, role boundaries, and login flows in `docs/demo-credentials.md`.
* **Frontend Authentication & Protected Routes**:
  * Updated `navigation.ts` user profile and roles (`INSPECTOR` and `ASSISTANT_CONTROLLER`).
  * Implemented `AuthContext.tsx` with session checking on mount (`GET /api/auth/me`), reactive `login()`, `logout()`, and loading states.
  * Implemented `ProtectedRoute.tsx` guarding workspace routes and redirecting unauthenticated traffic to `/login`.
  * Created `LoginPage.tsx` featuring official SIH & Legal Metrology branding, error handling, password reveal toggle, and 1-click demo sign-in cards.
  * Replaced Phase 2 mock role switcher with authenticated user badge and Logout button in `Header.tsx`.
  * Updated `Sidebar.tsx` to display active user role badge and wired Logout button to real session termination.
  * Updated `App.tsx` routing: public `/login` route, role-based root redirect (`/`), and protected route wrappers for `/inspector/*` and `/controller/*`.
* **Verification & Testing**:
  * Automated 10-step end-to-end test suite verified 100% pass rate: 401 on missing credentials, 401 on bad password, 200 on login + cookie issuance, 200 on session `/me`, 200 on allowed role endpoint, 403 on disallowed role endpoint, and 200 on logout.
  * Zero TypeScript errors on backend (`tsc` exit code 0) and frontend (`tsc && vite build` exit code 0).
  * Strict phase boundary compliance: zero Phase 6+ features introduced.

---

## 7. Phase 6 Accomplishments

* **Backend Dashboard Architecture & Scoped APIs**:
  * Created `backend/src/services/dashboard.service.ts` implementing typed Mongoose aggregation pipelines:
    * `getInspectorDashboardData(inspectorId, userId)`: strictly queries inspections assigned to the authenticated officer (`inspectorId`), calculates total/in-progress/completed/sample metrics, status distributions, and recent inspections.
    * `getControllerDashboardData()`: supervisory aggregations across all enrolled field inspectors and jurisdiction-wide inspection records, plus active statutory LMPC rule count.
  * Created `backend/src/controllers/dashboard.controller.ts` enforcing session identity via `req.user` and ignoring client-supplied user parameters to prevent data leakage.
  * Created `backend/src/routes/dashboard.routes.ts` mounting `GET /api/dashboard/inspector` (guarded by `requireRole(INSPECTOR)`) and `GET /api/dashboard/controller` (guarded by `requireRole(ASSISTANT_CONTROLLER)`).
  * Mounted router under `/api/dashboard` in `backend/src/routes/index.ts`.
* **Database Seeding & Clean Data Separation**:
  * Enhanced `seed.ts` with multi-status demo inspection records (`INS-2026-001` In-Progress, `INS-2026-002` Completed) for `inspector1` (`Rajesh Kumar`).
  * Purged legacy test user documents and kept `inspector2` (`Priya Sharma`) at **0 inspections**, establishing a verified test case for empty-state rendering and multi-user data isolation.
* **Frontend Dashboards & Live Telemetry**:
  * Created `frontend/src/services/dashboardService.ts` providing typed API clients for dashboard fetching.
  * Implemented **Inspector Dashboard** (`InspectorDashboard.tsx`):
    * Real-time officer identity banner and live KPI cards (`My Inspections`, `In Progress`, `Completed`, `Samples Examined`).
    * Recharts visual analytics (Status PieChart & Packaging Context BarChart) deriving directly from database.
    * Recent inspections table with status badges and links to inspection findings.
    * Professional `<EmptyState />` display for officers with 0 inspections (`inspector2`).
    * Quick action buttons navigating to existing Phase 2 placeholder wizard routes.
  * Implemented **Assistant Controller Dashboard** (`ControllerDashboard.tsx`):
    * Supervisory authority banner and 5 KPI cards (`Field Inspectors`, `Total Inspections`, `In Progress`, `Completed`, `Statutory Rules`).
    * Recharts visual analytics: Status Breakdown PieChart, Field Inspector Workload Comparison BarChart.
    * Enrolled Field Inspectors roster table with live inspection assignments and officer status.
    * Recent Statewide Inspections table across jurisdiction.
    * Quick actions to rule database and analytics.
* **Verification & Testing**:
  * Automated 10-step end-to-end test suite (`test_dashboard_e2e.cjs`) verified 100% pass rate:
    * Unauthenticated calls blocked with 401.
    * Inspector 1 accesses own inspections and metrics.
    * Cross-role access blocked with 403 Forbidden (Inspector accessing Controller API; Controller accessing Inspector API).
    * Inspector 2 data isolation verified (sees 0 inspections, zero leakage of Inspector 1 data).
    * Controller supervisory aggregations verified across all officers.
  * Zero TypeScript errors on backend (`tsc` exit code 0) and frontend (`tsc && vite build` exit code 0, 2221 modules transformed).
  * Zero Phase 7+ features introduced (strictly preserved Phase boundaries).

---

---

## 8. Task A Accomplishments — Complete Removal of "Single-Piece Retail Package"

* **Elimination of Non-Statutory Context**:
  * Removed `SINGLE_PIECE_RETAIL_PACKAGE` enum value from `backend/src/models/Inspection.ts`.
  * Removed `SINGLE_PIECE_RETAIL_PACKAGE` from rule `LMPC-R06-1-C` in `backend/src/database/seed.ts`.
  * Removed `Single-Piece` references from `frontend/src/pages/controller/RuleDatabase.tsx` and `frontend/src/pages/inspector/RuleReference.tsx`.
  * Removed `Single-Piece Retail` from mock row in `frontend/src/pages/inspector/MyInspections.tsx`.
  * Removed `Single-Piece` option from `frontend/src/pages/inspector/NewInspectionPlaceholder.tsx`.
* **Permanent Statutory 5-Context Standard**:
  * The application now enforces strictly the 5 codified packaging contexts recognized under LMPC 2011:
    1. `RETAIL_PACKAGE` (Rule 6(1))
    2. `WHOLESALE_PACKAGE` (Rule 24)
    3. `INDUSTRIAL_INSTITUTIONAL_PACKAGE` (Rule 3)
    4. `IMPORTED_PACKAGE` (Rule 6(1)(g))
    5. `EXPORT_PACKAGE` (Rule 34)
* **Active Guardrail**:
  * `InspectionController.createInspection` explicitly validates and rejects any payload providing `SINGLE_PIECE_RETAIL_PACKAGE` with HTTP 400 Bad Request and an informative statutory deprecation message.
* **Verification**:
  * Full repository grep confirms 0 active occurrences of `Single-Piece Retail Package` across the entire codebase.

---

## 9. Phase 7 Accomplishments — New Inspection Workflow & Package Context

* **Backend Inspection Subsystem**:
  * Implemented `InspectionService` (`backend/src/services/inspection.service.ts`):
    * Sequential unique inspection number generation (`INS-YYYY-XXX`, e.g. `INS-2026-003`).
    * Creation of root inspection document with initial status `READY_FOR_SAMPLING`.
    * Enforced role-based data isolation on inspection queries: field inspectors are strictly scoped to their own records; supervisory Assistant Controllers view all records.
    * Ownership authorization on single-inspection retrieval (`getInspectionById`): returns HTTP 403 Forbidden if an inspector attempts to access an inspection belonging to a different officer.
  * Implemented `InspectionController` (`backend/src/controllers/inspection.controller.ts`):
    * `POST /api/inspections`: Role guard (`INSPECTOR`), inputs validation (commodity, location, positive sample count >= 1, statutory 5 contexts).
    * `GET /api/inspections`: Scoped listing with search filtering across commodity, location, brand, and inspection number.
    * `GET /api/inspections/:id`: Data-isolated retrieval by MongoDB `_id` or `inspectionNumber`.
  * Implemented `inspection.routes.ts` mounted under `/api/inspections`:
    * Protected by `requireAuth` session middleware.
    * `POST /api/inspections` restricted to `INSPECTOR` role (Assistant Controller receives HTTP 403).
* **Frontend Inspection Subsystem**:
  * Created `frontend/src/services/inspectionService.ts`:
    * Type definitions for `PackageContext`, `InspectionStatus`, `InspectionData`, and `CreateInspectionPayload`.
    * `PACKAGE_CONTEXT_DEFINITIONS` metadata dictionary with statutory references and legal descriptions.
    * API client functions: `createInspection`, `fetchMyInspections`, `fetchInspectionById`.
  * Created `frontend/src/pages/inspector/NewInspectionPage.tsx`:
    * 3-step structured wizard:
      * **Step 1: Details & Premises** (Commodity, Brand, Location, Market, Remarks with real-time validation).
      * **Step 2: Statutory Package Context & Sample Scope** (Strict 5-context selector with statutory citations and multi-sample scope selector).
      * **Step 3: Review & Initiate** (Comprehensive metadata review card, statutory readiness banner, loading submission state).
    * Seamless navigation to Inspection Workspace upon creation.
  * Created `frontend/src/pages/inspector/InspectionWorkspace.tsx`:
    * Dedicated workspace mounted at `/inspector/inspections/:id`.
    * Live database retrieval by ID with loading spinner and error handling.
    * Inspection case metadata display (Number, Status, Commodity, Brand, Location, Sample Scope, Officer Badge).
    * Statutory context guidance card highlighting governing LMPC provisions.
    * Phase 8 Roadmap Banner informing user that child sample collection and camera capture will be enabled in Phase 8.
  * Updated `frontend/src/pages/inspector/MyInspections.tsx`:
    * Removed hardcoded placeholder data.
    * Integrated live API call via `fetchMyInspections()`.
    * Added search filter, loading indicator, and actionable `<EmptyState />` linking directly to New Inspection.
    * Table action navigating to `/inspector/inspections/:id`.
  * Updated `frontend/src/App.tsx`:
    * Replaced placeholder wizard with `NewInspectionPage`.
    * Mounted `/inspector/inspections/:id` routing to `InspectionWorkspace`.
* **Testing & Verification**:
  * **Unit & Controller Logic Suite (`scratch/unit_test_phase7.ts`)**:
    * 8/8 tests passed 100%: Unauthenticated rejection (401), Controller creation block (403), `SINGLE_PIECE_RETAIL_PACKAGE` rejection (400), Commodity validation (400), Location validation (400), Invalid sample count validation (400), Invalid context validation (400), Cross-inspector data isolation (403).
  * **Build Verification**:
    * Backend TypeScript: `npm --prefix backend run build` exited with code 0.
    * Frontend Vite: `npm --prefix frontend run build` exited with code 0 (2,223 modules transformed).

---

## 10. Phase 8 Accomplishments — Multi-Sample Inspection Management

* **1:N Parent-Child Relationship Established**:
  * Connected child `Sample` records directly to parent `Inspection` documents via `inspectionId` ObjectId reference.
  * Verified that an inspection with planned scope `samplesCount: 5` contains exactly 5 child sample records in MongoDB Atlas, with zero separate inspection records created.
* **Automated Sequential Numbering & Unique Codes**:
  * Implemented automated assignment of `sampleNumber` (`1, 2, ... N`) and formatted `sampleCode` (`INS-YYYY-XXX-S0N`, e.g. `INS-2026-003-S01`).
  * Enforced database-level duplicate prevention via compound unique indexes: `{ inspectionId: 1, sampleNumber: 1 }` and `{ inspectionId: 1, sampleCode: 1 }`.
* **Technical Lifecycle Only**:
  * Implemented technical state machine: `PENDING`, `IN_PROGRESS`, `READY_FOR_ANALYSIS`.
  * Active Guardrail: Explicitly rejects any premature legal compliance status (`COMPLIANT`, `NON_COMPLIANT`, `LEGAL_VIOLATION`) with HTTP 400 Bad Request.
* **Backend Subsystem**:
  * Implemented `SampleService` (`backend/src/services/sample.service.ts`):
    * `createSample`: Sequential numbering, sample limit enforcement (`samples.length < inspection.samplesCount`), duplicate prevention.
    * `listSamplesForInspection`: Scoped by user role; calculates live progress telemetry (`totalExpected`, `totalCreated`, `completed`, `inProgress`, `pending`, `remaining`, `percentComplete`).
    * `getSampleById`: Resolves sample by ID or sampleCode with strict ownership validation.
    * `updateSample`: Modifies notes and technical status with guardrails against legal compliance statuses.
  * Implemented `SampleController` (`backend/src/controllers/sample.controller.ts`) with HTTP handlers and validation.
  * Implemented `sample.routes.ts` mounted under `/api/inspections/:inspectionId/samples` in `inspection.routes.ts`.
* **Frontend Subsystem**:
  * Implemented `sampleService.ts` (`frontend/src/services/sampleService.ts`) with typed client functions.
  * Enhanced `InspectionWorkspace.tsx` (`frontend/src/pages/inspector/InspectionWorkspace.tsx`):
    * Dynamic animated progress bar and counters (`X / Y completed`, `Z remaining`).
    * "Add Sample" action button allocating the next sequential unit automatically.
    * Milestone banner when all planned units are registered (`All planned samples added`).
    * Interactive sample roster table with unit numbering, status badges, notes snippet, and "Open Unit" button.
    * Empty state for cases with 0 samples.
  * Created `SampleWorkspace.tsx` (`frontend/src/pages/inspector/SampleWorkspace.tsx`):
    * Dedicated individual specimen examination view mounted at `/inspector/inspections/:inspectionId/samples/:sampleId`.
    * Previous / Next sample navigation buttons (`< Sample 01`, `Sample 03 >`).
    * Parent inspection summary strip.
    * Editable technical status selector (`PENDING`, `IN_PROGRESS`, `READY_FOR_ANALYSIS`).
    * Editable officer field notes with persistence and save confirmation.
    * Visible disabled placeholders for Phase 9 (Camera Capture), Phase 10 (Gemini OCR), and Phase 11 (Rule Engine).
  * Registered route in `frontend/src/App.tsx`.
* **Testing & Verification**:
  * **Phase 8 Automated Test Suite (`scratch/test_phase8_samples.ts`)**: 10/10 tests passed 100%.
  * **Phase 7 Regression Suite (`scratch/unit_test_phase7.ts`)**: 8/8 tests passed 100%.
  * **Build Verification**: Backend `tsc` passed with 0 errors; Frontend `vite build` passed with 0 errors (2,225 modules transformed).

---

## 11. Phase 9 Accomplishments

* **Data Model & Temporary Storage Architecture**:
  * Extended `ISample` with embedded `images: ISampleImage[]` (`backend/src/models/Sample.ts`).
  * Designed `ISampleImage` storing `imageId`, `sequence`, `mimeType`, `sizeBytes`, `width`, `height`, `fileName`, `temporaryReference`, and `capturedAt`.
  * Implemented zero-cloud temporary filesystem persistence utility (`backend/src/utils/tempStorage.ts`) in `backend/tmp/uploads/`.
  * Added binary magic bytes verification (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `52 49 46 46...57 45 42 50` for WEBP) to prevent forged or corrupt uploads.
  * Increased Express payload limits to 10MB in `backend/src/app.ts` to support high-resolution photo transfers.
* **Backend Business Logic & API Layer**:
  * Implemented `SampleService.attachImageToSample`:
    * Strict Inspector ownership enforcement (returns HTTP 403 for other inspectors or Assistant Controller).
    * Validates MIME type, max 5MB size limit, and 5 images maximum per sample.
    * Automatically advances sample technical status from `PENDING` to `CAPTURED`.
  * Implemented `SampleService.getSampleImages`:
    * Returns attached image metadata records for authorized Inspector or Assistant Controller.
  * Implemented `SampleService.getSampleImageFile`:
    * Resolves file on disk and returns binary stream with private non-cachable headers (`Cache-Control: private, no-store`).
    * Gated by inspection access rights (no public URLs).
  * Implemented `SampleService.removeImageFromSample`:
    * Verifies Inspector ownership, purges physical file from disk, pulls metadata record, and re-sequences remaining photos.
    * Reverts sample status to `PENDING` if all evidence photos are removed.
  * Registered routes in `backend/src/routes/sample.routes.ts` mounted under `/api/inspections/:inspectionId/samples/:sampleId/images`.
* **Frontend Components & UI**:
  * Created `CameraCaptureModal.tsx` (`frontend/src/components/camera/CameraCaptureModal.tsx`):
    * Mobile-first camera interface with HTML5 `getUserMedia({ video: { facingMode: { ideal: 'environment' } } })`.
    * Permission requested strictly on-demand (only when modal opens).
    * Camera toggle (front/back), viewfinder framing guide ("Keep PDP inside frame • Ensure text is clear • Avoid glare").
    * Instant preview freeze with Retake and Confirm actions.
    * Desktop file chooser fallback with drag-and-drop support.
    * Client-side validation for JPEG/PNG/WEBP and 5MB size limit.
    * Media tracks immediately stopped on unmount or close to release hardware.
  * Updated `SampleWorkspace.tsx` (`frontend/src/pages/inspector/SampleWorkspace.tsx`):
    * Replaced disabled Phase 9 placeholder with live **Package Visual Evidence** gallery.
    * Responsive photo cards showing sequence badge (`#1`, `#2`), thumbnail, file size, and capture date.
    * Full-size lightbox image preview modal with metadata header.
    * Delete photo action with confirmation dialog.
    * Technical lifecycle status selector updated to include `CAPTURED`.
    * Clear statutory notices: visual evidence collection only; zero compliance claims.
* **Automated & Regression Testing**:
  * **Phase 9 Test Suite (`scratch/test_phase9_images.ts`)**: 24/24 tests passed 100%.
  * **Phase 8 Regression Suite (`scratch/test_phase8_samples.ts`)**: 10/10 tests passed 100%.
  * **Phase 7 Regression Suite (`scratch/unit_test_phase7.ts`)**: 8/8 tests passed 100%.
  * **Build Verification**: Backend `tsc` passed with 0 errors; Frontend `vite build` passed with 0 errors.

---

## 12. Important Architectural Decisions Recorded

* **Prohibited Technologies Preserved**: Confirmed zero references or usage of Railway, Cloudinary, AWS S3, Google Cloud Storage, or Firebase Storage.
* **Base44 Independence**: Confirmed zero Base44 APIs, database, or runtime dependencies.
* **Strict Phase Boundaries**:
  * Zero Gemini Multimodal Vision / OCR Integrations (Reserved for Phase 10).
  * Zero Rule Engine Compliance Evaluations (Reserved for Phase 11).
  * Zero Compliance Findings or Status Mutations (`COMPLIANT`/`NON_COMPLIANT` belong to Phase 12).
  * Zero PDF Document Generation (Reserved for Phase 14).
* **Backend-Enforced Data Isolation**: Inspector data isolation is strictly enforced at the database query level (`{ inspectorId: req.user.inspectorId }`), never by client-side filtering.
* **Dual Role Model Preserved**: Clear separation between `INSPECTOR` (field execution) and `ASSISTANT_CONTROLLER` (supervisory oversight).
* **1:N Inspection-to-Sample Hierarchy**: Preserved from Phase 4 foundation for future inspection workflows.



