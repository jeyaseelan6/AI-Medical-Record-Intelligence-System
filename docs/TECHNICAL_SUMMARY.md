# MedAI: Clinical Records Intelligence System
## Technical Summary & Architecture Overview

---

### EXECUTIVE SUMMARY
MedAI is a clinic-oriented, AI-native decision-support platform designed to digitize and synthesize scattered, unstructured medical records (such as scanned paper prescriptions, lab reports, and discharge summaries) into a unified clinical view. The platform automates longitudinal health tracking, cross-visit safety validation, health forecasts, and patient-record auditing. 

This document serves as the core technical documentation for architects, software engineers, and clinical stakeholders.

---

## SECTION 1: TECHNOLOGY STACK

MedAI is constructed as a modern, lightweight, high-performance web application designed for clinic deployment. The technology selections prioritize zero cold-start latencies, security, auditability, and data integrity.

```
┌──────────────────────────────────────────────┐
│                  FRONTEND                    │
│  - React 18 + Vite (SPA)                     │
│  - Design System: Vanilla CSS Design Tokens  │
│  - Icons: Lucide-React                       │
└──────────────────────┬───────────────────────┘
                       │ HTTPS / REST APIs
                       ▼
┌──────────────────────────────────────────────┐
│                  BACKEND                     │
│  - Node.js + Express                         │
│  - Service-Repository Pattern                │
│  - Document Validator Engine                 │
└──────────────────────┬───────────────────────┘
                       │ PostgreSQL TCP / HTTPS
                       ▼
┌──────────────────────────────────────────────┐
│                 DATA LAYER                   │
│  - PostgreSQL (Neon) with pgvector           │
│  - Cloudinary Secure Object Storage          │
└──────────────────────────────────────────────┘
```

### 1.1 Frontend Architecture
*   **React & Vite**: Used to build a Single Page Application (SPA) offering fast load times and sub-millisecond tab-switching transitions. 
*   **Aesthetics & Style Engine**: Vanilla CSS design tokens (custom variables) are implemented instead of bloated UI frameworks to ensure complete control over rendering. Features custom webkit-scrollbars, hover-lift shadow transitions, glassmorphic layout badges, and desktop-responsive layouts.
*   **Mobile Responsiveness & Clear UI/UX**: The interface utilizes flexible grids and CSS media queries. It transitions dynamically between desktop (sidebar layout) and mobile (collapsed drawer layout) screen heights.
*   **User Interface Indicators**: Displays clear gender-specific profiles (using custom visual tags/badges for Male and Female) and separate patient cards.
*   **Visual Presentation Layer**: Integrated **Lucide React** for clean medical iconography and **Storylane SDK** for interactive product tours.

### 1.2 Backend Engine
*   **Node.js & Express**: Serves as the REST API controller layer using the Service-Repository pattern to decouple HTTP routing from business intelligence.
*   **File Parser & OCR Integration**: Employs pdf-parse alongside multimodal LLM parsers to intake clinical files. It parses multiple formats including **scanned PDF files**, **medical report images (PNG/JPG)**, and **handwritten clinical doctor notes**.

### 1.3 Database & Asset Storage
*   **PostgreSQL (Neon Cloud)**: Served as the single source of clinical truth. Enforces cascading foreign key constraints to isolate patient data.
*   **pgvector Extension**: Powers semantic search queries and RAG (Retrieval-Augmented Generation) context lookup via 3072-dimensional vector indexes.
*   **Cloudinary Storage**: Secure, encrypted cloud storage for original patient file uploads (PDF/Images).

---

## SECTION 2: DESIGN AND ARCHITECTURE

MedAI implements a modular monolith architecture, ensuring high maintainability and cost efficiency for startups while allowing individual services to scale independently.

### 2.1 Database Schema & Cascading Referential Integrity
To maintain database sanity and strictly isolate customer data, the database implements cascade-delete constraints at the database level:
*   **Delete Patient Profile**: Deleting a patient profile triggers a database-level `ON DELETE CASCADE` which automatically purges all associated timeline events, prescriptions, lab results, insights, chat history, and uploaded files.
*   **Delete Document**: Deleting a document instantly triggers a cascade deletion of its raw records and its corresponding vector data (embeddings) in the `embeddings` table. This ensures the RAG chatbot context is clean and never references deleted files.
*   **Single Unified Timeline**: The system strictly maintains a **single unified timeline** per patient. Uploading multiple records simply appends events chronologically to this single timeline view, preventing duplicate patient logs.

### 2.2 Document Intake Security & Validation
To prevent system pollution, the backend includes an **intelligent intake validation layer**:
*   **Rejects Unrelated Files**: When a file is uploaded, the AI parser first evaluates if it is a valid medical record (prescription, lab report, discharge summary). 
*   **Early Termination**: If it identifies unrelated files (e.g. restaurant menus, non-medical scans, random text files), the system **terminates processing immediately**, rejects the file, and blocks it from being parsed or written to the database.

### 2.3 System Data Flow
```
  [PDF / Image / Handwritten Notes]
                 │
                 ▼
        [Intake Validator]  ──► (Invalid: Reject File)
                 │
                 ▼ (If Valid)
        [Cloudinary Upload]
                 │
                 ▼
      [Extract Text & Vitals]
                 │
        ┌────────┴────────┐
        ▼                 ▼
  [Store DB Logs]   [Create Embeddings]
  (Meds, Vitals)    (text-embedding-3)
        │                 │
        ▼                 ▼
  [AI Forecast]     [pgvector Storage]
        │                 │
        ▼                 ▼
  [AI Health Tab]   [RAG Chat QA Engine]
```

---

## SECTION 3: AI INTEGRATION & CLINICAL SAFETY

AI is integrated as a deterministic data extractor and pattern-reasoning assistant rather than a blind generator, satisfying strict clinical safety standards.

### 3.1 Cognitive Models
*   **Primary Extraction & Reasoning**: **OpenAI GPT-4o-mini** (configured via `AI_PROVIDER=openai`). Selected for its low cost ($0.15/M input tokens), high accuracy, and fast response times (~1.5s).
*   **Embedding Generator**: **OpenAI text-embedding-3-large** configured to output 3072-dimensional vectors for semantic context injection.
*   **Alternative Routing (Gemini 1.5 Flash)**: The system features built-in adapter classes supporting Google AI Studio’s free tier (15 RPM / 1,500 RPD) for zero-cost operation.

### 3.2 Structured Schema Enforcement
All LLM prompts are coupled with strict JSON schema rules. The backend validates the AI's response signature before write operations, ensuring no malformed JSON disrupts the client interface.

### 3.3 Clinical Safety Guardrails
To prevent hallucination risks (typical in clinical AI applications), MedAI implements four strict guardrails:
1.  **Safety Alerts with Confidence Scores**: Every duplicate medication, dosage conflict, or clinical inconsistency alert displays an AI-computed **Confidence Score** (0-100%) indicating how certain the model is about the warning.
2.  **Safety Warnings & Recommendation Blocks**: Every alert card contains an explicit recommendation urging the clinician to consult the prescribing doctor or verify the chart before making modifications.
3.  **Traceability & Verification**: Every extracted vital reading or AI insight card features a direct, clickable **Source Record Link**. Clicking it opens the original uploaded document side-by-side.
4.  **No Treatment Intervention**: The system is strictly instructed via system prompts to *evaluate trends* and *highlight warnings*, but is explicitly prohibited from writing treatment guidelines or modifying medication dosages.

---

## SECTION 4: KEY FEATURES WALKTHROUGH

### 4.1 Separate Patient Profiles Management
*   Provides a dedicated sidebar interface to create, edit, list, and delete individual patient profiles.
*   Clearly tags patient profiles with descriptive icons representing demographic parameters (including Male and Female indicators).

### 4.2 Chronological Timeline & Audit Overlay
*   Consolidates a patient's multi-year history into a **single unified timeline**.
*   Supports parsing of PDF files, scanned document images, and handwritten doctor notes.
*   Clicking a source document opens an inline modal overlay, offering immediate verification of the parsed notes.

### 4.3 AI Safety & Vitals Alerts
*   Identifies cross-visit anomalies such as **duplicate medications**, **dosage conflicts**, or **patient identity conflicts**.
*   Every alert features an automated parser that scans the AI's `evidence` citation and attaches a **Source Record Link** for one-click verification.
*   Displays persistent **Medical Safety Disclaimers** and acknowledgements advising user consultation with prescribing doctors.

```
┌──────────────────────────────────────────────┐
│             MEDAI CLINIC PORTAL              │
├───────────────┬──────────────┬───────────────┤
│ 📋 Timeline   │  ⚠️ Alerts   │  📈 Forecast  │
├───────────────┴──────────────┴───────────────┤
│                                              │
│ • Unified Chronological Patient Timeline     │
│ • Cross-Visit Medication Safety Alerts       │
│ • Delta Vitals Carousel with Chrono Deltas   │
│ • Clickable Source Record Preview Popups     │
│                                              │
└──────────────────────────────────────────────┘
```

### 4.4 AI Health Forecast & Metric Logs
*   Provides a **30-Day Wellness Outlook** narrative and a **Cardiovascular Risk Indicator** (Low, Moderate, High, or Not Enough Data).
*   Displays a list of active projected vital trajectories (hiding metrics that lack sufficient forecasting data).
*   Includes collapsible **History & Logs carousels** directly inside each card, calculating chronological deltas (e.g. `+5.0 mg/dl lower than previous reading`).

---

## SECTION 5: KEY ENGINEERING CHALLENGES & MITIGATIONS

During development, several performance and clinical-safety challenges were solved:

### 5.1 Tab-Switching Reload Latency
*   *Challenge*: Originally, the AI Health Forecast re-fetched data from the API every time a user clicked the tab, showing a loading spinner on every switch.
*   *Mitigation*: Lifted the state up into the parent dashboard controller (`Dashboard.jsx`), caching the forecast data once on initial load or patient selection. Switching tabs is now instantaneous with zero loading delays.

### 5.2 Naming Collisions in Extracted Metrics
*   *Challenge*: Different lab templates name the same vitals differently (e.g., one writes "Blood Sugar", another "Fasting Glucose", and another "FPG"), resulting in duplicate, empty trajectory cards.
*   *Mitigation*: Implemented a normalization mapper in `TrendCharts.jsx` that clusters variations into standardized categories. Added a filter to hide any cards with zero raw history to ensure no `N/A` cards appear.

### 5.3 Safety Citation Mappings
*   *Challenge*: AI-generated safety alerts cited sources as free text, making it difficult for doctors to quickly verify where the issue occurred.
*   *Mitigation*: Wrote a regex date-and-file matcher in `InsightCards.jsx` that extracts citations from the AI's evidence text and displays active clickable source file links.

---

## SECTION 6: UNIQUE IMPACT & VALUE PROPOSITION

MedAI offers significant benefits to modern healthcare practices:

1.  **Reduces Medication Errors**: Instantly alerts doctors if a patient is prescribed duplicate molecules or dosage ranges across different clinics or visits.
2.  **Saves Physician Time**: Synthesizes a history folder in seconds, reducing patient intake audit times from 20 minutes to under 1 minute.
3.  **Low Operating Costs**: Highly optimized token usage on `gpt-4o-mini` allows a clinic to run hundreds of analyses daily for less than $1.
4.  **100% Auditability**: Rather than functioning as a black-box AI, it links every insight back to its original physical file source.
