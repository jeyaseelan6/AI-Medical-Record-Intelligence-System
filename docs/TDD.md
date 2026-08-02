# **Technical Design Document (TDD)**

# **Project Name**

AI Medical Record Intelligence System (MedAI)

Version: 1.0

Development Approach:  
 Solo Full-Stack AI Application

---

# **1. Technical Vision**

Build a production-style AI medical record intelligence platform that converts unstructured healthcare documents into structured patient information and generates explainable insights through AI reasoning.

The system follows:

```
Document Snapshot ➔ Extraction Pipeline ➔ Structured SQL Data ➔ Intelligence Engine ➔ User Dashboard
                                                                       └─ pgvector RAG ──> QA Assistant
```

The AI is not a chatbot wrapper. The AI acts as a multi-stage intelligence pipeline:

1. Parse multi-modal documents (PDF plain text or Snap Vision base64).
2. Extract medical entities under JSON Mode object guidelines.
3. Index chunks to PostgreSQL using `pgvector` operators.
4. Perform cross-visit clinical checks (longitudinal safety scanner).
5. Expose evidence-based QA chat streams with persistent storage and dialog document previews.

---

# **2. System Architecture Overview**

```
              User  
               │  
               ▼  
         React Frontend (Vite)  
               │  
               ▼  
       Express.js Backend API  
               │  
      ┌────────┴────────┐  
      ▼                 ▼  
  PostgreSQL         AI Engine (Gemini / OpenAI)  
   (pgvector)           ├── ai-models.json routing  
      │                 ├── OCR & Vision parsing  
      ▼                 └── Longitudinal safety scanning  
  Medical Data &  
  Persistent Chats  
```

---

# **3. Technology Stack**

*   **Frontend**: React.js, Vite, Vanilla CSS. Recharts for dynamic vitals mapping.
*   **Backend**: Node.js, Express.js. `pdf-parse` for local PDF data conversion.
*   **Database**: Neon PostgreSQL, `pgvector` for semantic indexing.
*   **AI Integrations**: `@google/generative-ai` & `openai` SDK. Hot-swappable routing mapped via `ai-models.json`.

---

# **4. Application Modules**

### **Module 1: Authentication Service**
*   **Purpose**: Control user access. Secure JWT auth tokens are generated on logins/signups and stored in browser `localStorage`.
*   **Access Isolation**: Verified using a central `requireAuth` middleware before any query execution.

### **Module 2: Medical Document Management & Loader UI**
*   **Upload Processing**: Accepts snaps and uploads. Files are sent directly to **Cloudinary** (folder `med-ai`) and the temporary disk file is deleted. If Cloudinary is unconfigured or a network error occurs, the pipeline automatically falls back to local disk storage in the `/uploads` static directory.
*   **Ingestion Animation**: An animated laser overlay (`.scanner-laser`) and cycling steps (*"OCR Extraction..."* ➔ *"Vision Parsing..."*) prevent UI locking.
*   **Categorization Resolver**: Classifies files using AI. If ambiguous, the backend scans filenames for clinical matches (`rx`, `lab`, `discharge`), fallback defaulting to `Medical Notes`.
*   **Deletion Handler**: Supports deleting any file, which automatically cleanses associated database events, medications, lab values, and unlinks file footprints.

### **Module 3: AI Document Processing Pipeline**
*   **Multi-Modal OCR & Vision**:
    *   PDF files are parsed to text buffers locally using `pdf-parse` before completions.
    *   Image uploads (PNG, JPG) are sent as base64 images to vision endpoints.
*   **JSON Mode Entity Extraction**: Returns strict, structured JSON arrays containing patient profiles, diagnoses, symptoms, prescriptions, and lab readings.

### **Module 4: Chronological Timeline Engine**
*   **Logic**: Joins events on the patient profile, sorts them chronologically (newest first), and outputs structured lists showing diagnoses, doctors, and treatments.

### **Module 5: Medication Safety Scanner (Longitudinal Audit)**
*   **Logic**: Loops patient prescription records, cross-checking active drugs.
*   **JSON Mode Alignment**: Formats findings under a JSON object (wrapping array elements inside an `"insights"` key) to satisfy both Gemini and OpenAI JSON Mode schemas, avoiding parsing crashes.

### **Module 6: Dynamic Health Trend Engine**
*   **Logic**: Scans timeline lab results. Groups numeric values dynamically by normal test titles (Temperature, Weight, Heart Rate, Blood Sugar, Hemoglobin, Blood Pressure).
*   **Interface**: Constructs selector tabs for *only the vitals present*, charting values chronologically.

### **Module 7: Medical RAG Question Answering Engine**
*   **Vector Engine**: Clinician questions are vectorized into 3072-dimensional arrays.
*   **Database Join Query**: Executes similarity lookups:
    ```sql
    SELECT e.content_chunk, (e.embedding_vector <=> $1::vector) as distance
    FROM embeddings e
    JOIN documents d ON d.id = e.document_id
    WHERE d.patient_id = $2
    ORDER BY distance ASC
    LIMIT 5;
    ```
*   **Citations**: Embeds document details (`file_name`, `uploaded_at`) alongside vector chunks to provide evidence-based source visibility.
*   **Conversational Memory**: Stores and feeds the patient's recent 6 messages into the LLM system prompt to support relative follow-up queries.
*   **Dialog Badging**: Embeds document references as clickable badges, launching the dashboard's preview modal box.

### **Module 8: QA Safety Disclaimer Banner**
*   **Logic**: Displays a semantic alert warning banner directly above the chat assistant's input field: *"Clinical Notice: AI Clinical Assistant can make mistakes. Always refer to a doctor..."* to comply with medical validation guidelines.
*   **Warning Triggers**: If the AI assessment shows a "Medium" or "High" risk, or if the model confidence score drops below 80%, a prominent consultation banner is injected in the assistant's response.

### **Module 9: Database Chat History Persistence**
*   **Logic**: User prompts and matched AI answers are saved to the `chat_messages` table, and restored on load.

### **Module 10: Delete Document Modal UI**
*   **Logic**: Replaced browser standard confirmation popups with a custom styled React modal overlay. Presents clear, non-technical warning notifications prior to triggering clinical record removal.

---

# **5. Database Schema Design**

### **users**
*   `id` SERIAL PRIMARY KEY
*   `name` VARCHAR
*   `email` VARCHAR UNIQUE
*   `password_hash` VARCHAR
*   `created_at` TIMESTAMP

### **patients**
*   `id` SERIAL PRIMARY KEY
*   `user_id` INTEGER REFERENCES users(id) ON DELETE CASCADE
*   `patient_name` VARCHAR
*   `age` INTEGER
*   `gender` VARCHAR
*   `created_at` TIMESTAMP

### **documents**
*   `id` SERIAL PRIMARY KEY
*   `patient_id` INTEGER REFERENCES patients(id) ON DELETE CASCADE
*   `file_name` VARCHAR
*   `file_url` VARCHAR
*   `document_type` VARCHAR
*   `processing_status` VARCHAR
*   `uploaded_at` TIMESTAMP

### **medical_events**
*   `id` SERIAL PRIMARY KEY
*   `patient_id` INTEGER REFERENCES patients(id) ON DELETE CASCADE
*   `document_id` INTEGER REFERENCES documents(id) ON DELETE CASCADE
*   `event_date` DATE
*   `doctor_name` VARCHAR
*   `diagnosis` TEXT
*   `symptoms` TEXT
*   `notes` TEXT

### **medications**
*   `id` SERIAL PRIMARY KEY
*   `medical_event_id` INTEGER REFERENCES medical_events(id) ON DELETE CASCADE
*   `medicine_name` VARCHAR
*   `dosage` VARCHAR
*   `frequency` VARCHAR
*   `duration` VARCHAR

### **lab_results**
*   `id` SERIAL PRIMARY KEY
*   `medical_event_id` INTEGER REFERENCES medical_events(id) ON DELETE CASCADE
*   `test_name` VARCHAR
*   `value` VARCHAR
*   `unit` VARCHAR
*   `normal_range` VARCHAR

### **ai_insights**
*   `id` SERIAL PRIMARY KEY
*   `patient_id` INTEGER REFERENCES patients(id) ON DELETE CASCADE
*   `insight_type` VARCHAR
*   `description` TEXT
*   `confidence_score` INTEGER
*   `evidence` TEXT
*   `created_at` TIMESTAMP

### **embeddings**
*   `id` SERIAL PRIMARY KEY
*   `document_id` INTEGER REFERENCES documents(id) ON DELETE CASCADE
*   `content_chunk` TEXT
*   `embedding_vector` vector(3072)

### **chat_messages**
*   `id` SERIAL PRIMARY KEY
*   `patient_id` INTEGER REFERENCES patients(id) ON DELETE CASCADE
*   `sender` VARCHAR(10) -- 'user' or 'ai'
*   `message_text` TEXT
*   `evidence` TEXT
*   `confidence` INTEGER
*   `risk_level` VARCHAR(50)
*   `recommendation` TEXT
*   `created_at` TIMESTAMP

---

# **6. API Endpoint Design**

### **Authentication**
*   `POST /api/auth/signup`: Registers new accounts.
*   `POST /api/auth/login`: Validates credentials, returning a JWT token.

### **Patient Workspace**
*   `POST /api/patients`: Instantiates new patient files.
*   `GET /api/patients`: Pulls user-owned profiles.
*   `PUT /api/patients/:id`: Modifies basic patient fields.
*   `DELETE /api/patients/:id`: Cascades and deletes the entire profile.

### **Document Ingestion**
*   `POST /api/documents/upload`: Accepts snaps and uploads attachments.
*   `GET /api/documents/:patientId`: Lists documents.
*   `DELETE /api/documents/:documentId`: Removes the document, unlinks Cloudinary media assets, drops matching timeline event records, and wipes vector RAG search embeddings.

### **Medical Timeline & Insights**
*   `GET /api/timeline/:patientId`: Resolves chronological medical lists.
*   `GET /api/insights/:patientId`: Runs safety audits.

### **RAG QA Chat & History**
*   `POST /api/ask`: Runs similarity search and responds.
*   `GET /api/ask/history/:patientId`: Restores conversation threads.
