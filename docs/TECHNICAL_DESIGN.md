# MedAI: System Architecture & Technical Design

This document details the engineering standards, design choices, performance optimizations, and best practices that govern the MedAI Clinical Intelligence System codebase.

---

## 🏗️ Architectural Pattern: Modular Monolith

MedAI uses a strict **separation of concerns** based on a modular MVC/Service pattern:
```
[Client App] ──(HTTP/REST)──> [API Router Layer] ──> [Controller Layer] ──> [Service Layer] ──> [DB / AI Providers]
```

1.  **Router Layer** (`backend/src/routes/`): Handles HTTP routing, input parameters path resolution, and executes authentication guards (`requireAuth`).
2.  **Controller Layer** (`backend/src/controllers/`): Manages request validation, state responses, authorization ownership verification, and formats outputs.
3.  **Service Layer** (`backend/src/services/`): Houses core business logic. All third-party SDK calls (Gemini, OpenAI, PDF parsers) are encapsulated here, keeping controllers decoupled from third-party APIs.
4.  **Database Configuration** (`backend/src/config/db.js`): Exposes a unified client pool resolver.

---

## ⚡ Database Performance & Optimization Design

PostgreSQL acts as the single source of truth. The database layer incorporates performance and isolation parameters:

### 1. Cascade Constraints (Preventing Orphaned Leaks)
All tables referencing patients include cascade delete actions (`ON DELETE CASCADE`). When a patient workspace is deleted, all medical event rows, medications list, lab reports, embeddings, and chat history are atomically removed, keeping database clean and safe.

### 2. High-Performance Indexing Strategy
To ensure sub-100ms loads at scale, database indexes are explicitly defined for search keys:
*   `idx_users_email` (B-Tree): Speed up user authentication checks.
*   `idx_patients_user_id` (B-Tree): Optimizes workspace patients list loads.
*   `idx_documents_patient_id` (B-Tree): Accelerates patient attachment lookups.
*   `idx_medical_events_timeline` (Composite B-Tree on `(patient_id, event_date DESC)`): Speeds up chronological timeline chart loads without execution sorts.
*   `idx_chat_messages_patient` (B-Tree): Pulls chronological patient RAG dialogue instantly.

### 3. In-Database Vector Distance Optimization
Rather than pulling files into application memory and calculating vector similarity inside Node.js loop structures, similarity indexing runs inside PostgreSQL using `pgvector` Cosine Distance (`<=>`) operators. This minimizes memory overhead and network bandwidth.

---

## 🛡️ Robustness & Safety Measures

### 1. Universal Centralized Error Handling
The backend routes capture and isolate runtime exceptions using a central express error-middleware wrapper. This guarantees that database failures or LLM timeouts do not crash the Node.js server. Instead, a clean, standardized format response is returned to the client:
```json
{
  "success": false,
  "message": "Detailed context-safe message"
}
```

### 2. Decoupled Environment Strategy (Hot-Swappable Providers)
AI integrations do not hardcode model string arguments. Provider configuration is managed via environment parameters:
*   `AI_PROVIDER`: Hot-swappable between `gemini` and `openai`.
*   `EXTRACT_MODEL_NAME` / `EMBED_MODEL_NAME` / `REASON_MODEL_NAME`: Permits running lightweight models (`gpt-4o-mini`, `gemini-2.0-flash-lite`) for fast extractions, and switching to high-capability models without changing source code.

### 3. ES6 CommonJS Compatibility Resolvers
To use legacy CommonJS parsing packages (like `pdf-parse`) in modern ES6 module systems (`"type": "module"`), we utilize Node's dynamic require compiler:
```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
```

---

## 🎨 Frontend UX & Visual State Performance

1.  **State Recovery (Auto-Persist Chat logs)**: Chat messages are saved to the database. Switching patient contexts or reloading tabs recovers logs instantly, preventing context loss.
2.  **Adaptive Grouping Metrics (Trend Visualization)**: Rather than hardcoding fixed graph canvases (like temperature/weight), `TrendCharts.jsx` traverses patient timeline history, groups metrics, and auto-generates tabs on-the-fly.
3.  **Visual Processing Indicators**: Upload events trigger keyframe scanning lasers and status steps, preventing the UI from locking up during model extractions.
