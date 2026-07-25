# AI Medical Record Intelligence System

An AI-native medical record intelligence platform that converts fragmented, unstructured healthcare documents (Prescriptions, Laboratory Reports, Discharge Summaries) into a structured, chronological patient health timeline and generates explainable, evidence-based clinical safety insights.

Developed for the **YGC Innovation Festival AI Competition 2026**.

---

## 🌟 Key Features

*   **User Authentication & Security**: JWT-based session security with password hashing, isolating user workspaces so practitioners and patients only access profiles they own.
*   **Multimodal Record Upload**: Upload prescriptions or reports in PDF, PNG, or JPEG formats. Handled via `multer` file validation and sent directly to Gemini Vision models.
*   **AI Entity Extraction**: Vision AI parses raw files, performs OCR, and maps patient information, diagnoses, clinical notes, medications (name, dosage, frequency, duration), and lab vitals into structured SQL database tables.
*   **Chronological Health Timeline**: Aggregates historic logs, visits, and physical measurements into a clean vertical timeline.
*   **Longitudinal Cross-Visit Intelligence**: Analyzes patient records over time to identify duplicate drug overlaps, dosage changes, and mathematical prescription inconsistencies.
*   **Vitals Trend Visualizations**: Chronologically parses vital entries (such as body temperature and weight) and plots them on responsive charts using Recharts.
*   **Evidence-Based Q&A (RAG)**: Allows users to ask clinical history questions. It uses `pgvector` similarity matching to retrieve context and prompts Gemini to provide answers complete with sources, extraction confidence scores, and safety ratings.
*   **Resilient Fallback Design**: If the Gemini API key is not configured or hits rate limits (429), the system automatically triggers a self-healing mock fallback so you can demo the uploader, timeline, charts, and QA chats without crashes.

---

## 🛠️ Technology Stack

*   **Frontend**: React.js, React Router, Recharts, Lucide Icons, Vanilla CSS (Clinical Glassmorphism Theme).
*   **Backend**: Node.js, Express.js (ES Modules).
*   **Database**: PostgreSQL (Neon Serverless/Local) with `pgvector` extension enabled.
*   **AI Integration**: Google Generative AI SDK (`gemini-2.0-flash-lite`, `gemini-embedding-001`).

---

## 📁 Repository Structure

```text
med-ai/
├── documents/            # Competition PRD and TDD specifications
├── backend/              # Node/Express API Server
│   ├── src/
│   │   ├── config/       # pg connection pool & transactions
│   │   ├── controllers/  # API business logic
│   │   ├── db/           # SQL database migrations
│   │   ├── middleware/   # JWT auth & Multer upload constraints
│   │   ├── routes/       # Express route mapping
│   │   └── services/     # Gemini SDK integrations
│   ├── test-db.js        # DB migration runner
│   ├── test-ai.js        # Gemini SDK diagnostic tool
│   └── test-list-models.js
└── frontend/             # Vite + React Dashboard UI
    ├── src/
    │   ├── components/   # File uploader, timeline, charts, QA Chat
    │   ├── context/      # AuthContext state
    │   ├── pages/        # Login, Signup, Dashboard views
    │   └── index.css     # Premium clinical design system tokens
```

---

## 🚀 Local Installation Guide

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database instance (local or Neon PostgreSQL cloud database)

### 1. Setup Backend Environment
Go into the `backend` folder and create a `.env` configuration file:
```bash
cd backend
cp .env.example .env
```
Fill in the parameters inside `backend/.env`:
*   `PORT`: Port to host backend (defaults to `5000`).
*   `JWT_SECRET`: Random string to sign tokens.
*   `DATABASE_URL`: Your PostgreSQL connection URI (`postgresql://user:pass@host/dbname?sslmode=require`).
*   `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio.

### 2. Initialize the Database Schema
To automatically connect to your database, create the tables, define foreign key cascades, and build performance indices, run:
```bash
node test-db.js
```

### 3. Verify AI Credentials
Verify that your API key is correctly configured and can generate embeddings and call content generation models:
```bash
npm run test:ai
```

### 4. Boot Dev Servers
Open two terminal windows:

*   **Terminal 1 (Backend API)**:
    ```bash
    cd backend
    npm run dev
    ```
*   **Terminal 2 (React Frontend)**:
    ```bash
    cd frontend
    npm run dev
    ```
    Open your browser at `http://localhost:3000`.

---

## ⚠️ Medical Disclaimer
This software is built for competition demonstration purposes. It processes historical medical records and identifies anomalies to assist analysis. It **does not** replace professional medical diagnostics, treatments, or physician consultations.
