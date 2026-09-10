# SMART METROLOGY — ANTIGRAVITY PROJECT CONTEXT

> Permanent project context and engineering handoff document.
>
> This file exists so that any new Antigravity conversation working on this
> repository can understand the project's purpose, architecture, current
> development state, constraints, and development methodology without
> depending on previous conversation history.

---

# 1. PROJECT IDENTITY

## Project Name
Smart Metrology

## Hackathon
Smart India Hackathon 2026

## Problem Statement
SIH26034 — Legal Metrology packaged commodity compliance inspection.

## Project Purpose
Smart Metrology is an AI-assisted web application intended to help
Legal Metrology inspectors inspect packaged commodities by:

1. Collecting minimal inspection and package context.
2. Capturing images of the actual commodity package.
3. Using multimodal AI/OCR to extract visible package declarations.
4. Using a deterministic Rule Engine to determine which legal requirements
   apply to the inspection context.
5. Comparing extracted observations against applicable requirements.
6. Presenting potential findings to the Inspector.
7. Allowing the Inspector to review, correct, and confirm findings.
8. Preserving evidence and inspection history.
9. Generating a consolidated PDF inspection report.
10. Providing an Assistant Controller of Legal Metrology dashboard for
    monitoring inspections, inspectors, violations, reports, and rules.

The application is an engineering prototype for SIH and must not pretend
to replace the legal authority or professional judgment of Legal Metrology
officials.

---

# 2. CORE PROJECT PRINCIPLE

The fundamental architecture is:

Inspector provides minimal context
        ↓
Package images captured
        ↓
AI / OCR extracts observations
        ↓
Deterministic Rule Engine determines applicable requirements
        ↓
Observations compared with applicable requirements
        ↓
Potential findings generated
        ↓
Inspector reviews and verifies
        ↓
Final inspection record
        ↓
Evidence + history + consolidated PDF report

IMPORTANT:
AI is assistive.
AI must NOT independently determine the law.
The Rule Engine must determine applicability using deterministic,
versioned rule data.
The Inspector must remain the final human verification authority for
inspection findings.

---

# 3. LEGAL SAFETY PRINCIPLES

Smart Metrology deals with Legal Metrology requirements.

Therefore:
- Never invent legal rules.
- Never assume a declaration is universally mandatory.
- Never allow an LLM to decide legal applicability by itself.
- Never convert an AI observation directly into a legal violation.
- Always preserve the applicable rule reference.
- Always preserve the rule version used.
- Preserve evidence associated with findings.
- Preserve AI confidence.
- Preserve Inspector verification separately.
- Preserve historical rule traceability.
- Rules must be updateable without rewriting the AI prompt.
- Legal rules must be represented in the Rule Database.
- The Rule Engine must determine applicability.
- AI should extract observations from images.
- Inspector verification determines the final human-confirmed result.

The application must clearly distinguish:
AI observation
→ Rule applicability
→ Rule evaluation
→ Inspector verification
→ Final finding

These are NOT the same thing.

---

# 4. OFFICIAL LEGAL SOURCE POLICY

Primary official source:
Department of Consumer Affairs — Legal Metrology
Official repository:
https://consumeraffairs.gov.in/pages/legal-metrology-act

Legal Metrology overview:
https://consumeraffairs.gov.in/index.php/pages/legal-metrology-overview

Consolidated Legal Metrology (Packaged Commodities) Rules, 2011:
https://consumeraffairs.gov.in/public/upload/admin/cmsfiles/whatsnews/Book_on_Legal_Metrology_Packaged_Commodities_Rules%2C2011_with_all_amendments_whatsnews.pdf

SIH26034 reference:
https://sih2026.vuce.in/en/ps/SIH26034

If official legal PDFs are required for future legal verification and they
are not available in the project, STOP and request the official PDFs.
Do NOT reconstruct missing legal material from memory.

---

# 5. IMPORTANT DECLARATION PRINCIPLE

The following declaration categories exist in the engineering baseline:
1. Product / Common / Generic Name
2. Manufacturer / Packer / Importer
3. Country of Origin
4. Net Quantity
5. MRP
6. Date of Manufacture / Packing / Import
7. Best Before / Use By where applicable
8. Consumer Care Details
9. Unit Sale Price where applicable
10. Dimensions where relevant

IMPORTANT:
These are NOT universally mandatory for every product.
Applicability depends on:
- package context
- commodity
- imported status
- quantity
- package structure
- exclusions
- exemptions
- effective date
- rule version
- other legal conditions

Never hard-code all declarations as mandatory for every product.

---

# 6. PACKAGE AND INSPECTION CONTEXTS

The active application supports exactly these package contexts:
1. Retail Package
2. Wholesale Package
3. Industrial / Institutional Package
4. Imported Package
5. Export Package

## PROHIBITED CONTEXT
The following context has been intentionally removed:
Single-Piece Retail Package

Do NOT reintroduce it.
Do NOT create:
- Single-Piece Retail Package
- SINGLE_PIECE_RETAIL_PACKAGE
- single_piece_retail_package
- single-piece-retail-package
- singlePieceRetailPackage
- singlePieceRetail

It must not exist in:
- frontend UI
- frontend constants
- enums
- backend validation
- database seed data
- database schema
- Rule Database
- Rule Engine
- demo data
- documentation
- API validation
- test fixtures

If a request attempts to introduce it, reject it.
Do NOT rewrite Git history to remove old references if they exist in Git
history. The requirement concerns the active application and source tree.

---

# 7. IMPORTED PACKAGE BEHAVIOUR

When Imported Package is selected:
Do NOT ask the Inspector unnecessary manual questions such as:
"Where was it imported from?"

The package image should be analyzed by AI/OCR.
The system should attempt to extract relevant visible information such as:
- country of origin
- importer
- manufacturer
- other visible declarations

The extracted observation is then evaluated by the Rule Engine.

---

# 8. MULTI-SAMPLE INSPECTION MODEL

One Inspection may contain multiple Samples.
Correct relationship:

Inspection
 ├── Sample 1
 │    ├── Images
 │    ├── AI Extraction
 │    ├── Findings
 │    └── Verification
 ├── Sample 2
 │    ├── Images
 │    ├── AI Extraction
 │    ├── Findings
 │    └── Verification
 └── Sample N

Do NOT create unrelated inspections for each sample.
If the Inspector enters a sample count of 5, there is:
ONE Inspection containing FIVE Samples.

The Inspector determines the sample count.
The application must NOT invent or prescribe a legally required sample
count unless such a requirement exists in the Rule Database and is
explicitly represented there.

---

# 9. TECHNOLOGY STACK

## Frontend
React, Vite, TypeScript
## UI
Tailwind CSS, Lucide icons
## Backend
Node.js, Express.js, TypeScript
## Database
MongoDB Atlas (AWS Mumbai / ap-south-1)
## AI
Google Gemini API (Backend-only)
## PDF
jsPDF
## Charts
Recharts
## Version Control
Git & GitHub (Controlled exclusively by Project Owner)
## Frontend Deployment
Vercel
## Backend Deployment
Render
## Database Deployment
MongoDB Atlas

---

# 10. PROHIBITED TECHNOLOGIES / ARCHITECTURAL DECISIONS

Do NOT introduce:
- Railway
- Cloudinary
- mandatory S3/object storage
- Base44 backend / database / runtime dependency
- unnecessary microservices
- unnecessary databases
- LLM-only legal decision making
- hard-coded legal rules
- hard-coded universal declaration requirements
- frontend-exposed secrets

The architecture is a modular monolith.

---

# 11. RULE DATABASE & RULE ENGINE PRINCIPLES

1. Rule Database is separate from the AI prompt.
2. Rule Database is updateable and versioned.
3. Baseline contains 33 rules (SIH26034_LMPC_Rule_Database_v1.0.json/.csv).
4. Deterministic condition evaluation (zero eval() or new Function()).
5. Controlled validator registry.
6. Temporal validity: future rules remain inactive; expired rules remain inactive.
7. Wholesale package safety: Rule 24 wholesale packages strictly suppress retail MRP.
8. Distinguish AI observation from rule applicability from human verification.

---

# 12. GIT RESPONSIBILITY — CRITICAL

Git and GitHub are controlled entirely by the project owner.
Antigravity must NOT manage Git.
Antigravity must NOT:
- run git commands
- execute Git through terminal
- modify .git or .git/index
- commit, push, pull, fetch, reset, merge, rebase, branch

The project owner personally handles all Git operations.
Antigravity is responsible ONLY for application code and testing.

---

# 13. PHASE ROADMAP

- Phase 1: Project Foundation & Structure [APPROVED]
- Phase 2: Frontend Application Shell [APPROVED]
- Phase 3: Backend Express Foundation [APPROVED]
- Phase 4: MongoDB Atlas Integration [APPROVED]
- Phase 5: Authentication & RBAC [APPROVED]
- Phase 6: Dashboards [APPROVED]
- Phase 7: New Inspection Workflow [APPROVED]
- Phase 8: Multi-Sample Inspection Flow [APPROVED]
- Phase 9: Camera Capture & Temporary Images [APPROVED]
- Phase 10: Gemini Multimodal AI & OCR [APPROVED]
- Phase 11: Rule Database & Deterministic Rule Engine [APPROVED]
- Phase 12: Compliance Findings & Inspector Verification [NEXT]
- Phase 13: Inspection History, Evidence & Audit
- Phase 14: Consolidated PDF Reporting
- Phase 15: Assistant Controller Analytics
- Phase 16: Integration, Security & Validation
- Phase 17: Production Build & Deployment Preparation
- Phase 18: Vercel + Render + MongoDB Atlas Deployment
- Phase 19: End-to-End SIH Demo Hardening

