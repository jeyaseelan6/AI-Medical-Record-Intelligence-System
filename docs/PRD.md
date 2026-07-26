# **Product Requirements Document (PRD)**

# **Project Name**

AI Medical Record Intelligence System (MedAI)

Version: 1.0

Development Approach:  
 Solo AI Product Build

---

# **1. Product Vision**

Build an AI-powered medical record intelligence system that transforms fragmented medical documents into a structured, explainable, and trustworthy patient health timeline.

The system helps users understand their medical history by extracting information from multiple healthcare documents, identifying important patterns, detecting inconsistencies, and answering questions using evidence from medical records.

The system is not designed to diagnose diseases or replace doctors. It acts as an intelligent medical record assistant that helps patients and healthcare professionals understand complex medical histories.

---

# **2. Problem Statement**

Medical information is often scattered across:

* Prescription papers  
* Laboratory reports  
* Discharge summaries  
* Medical notes  
* Different healthcare providers

Patients and healthcare professionals face challenges:

* Difficulty understanding long medical histories  
* Missing important previous information  
* Repeated or conflicting prescriptions  
* Difficulty tracking health changes over time  
* Incomplete medical records  
* Patient identity/document mismatches

The system solves this by creating an AI-powered medical intelligence layer over existing records.

---

# **3. Target Users**

## **Primary User**

Patient / Caregiver

Needs:

* Upload personal medical records  
* Understand medical history  
* View health timeline  
* Identify important findings  
* Ask questions about previous records

## **Secondary User**

Healthcare Professional

Needs:

* Quickly review patient history  
* Understand previous treatments  
* Identify missing information  
* Review AI-generated summaries

---

# **4. Product Goals**

The system should:

1. Convert unstructured medical documents into structured information.  
2. Create a chronological patient medical timeline.  
3. Perform intelligent analysis across multiple visits.  
4. Provide explainable AI insights.  
5. Detect medical record quality issues.  
6. Maintain safety by showing confidence and limitations.

---

# **5. Non-Goals (Not Building)**

The system will NOT:

* Diagnose diseases  
* Replace doctors  
* Recommend medications  
* Provide emergency medical decisions  
* Build a hospital management system  
* Perform autonomous medical treatment decisions

---

# **6. Core Features**

### **F1. User Authentication**
* **Priority**: High
* **Description**: Users create an account and access their private workspace.
* **Functions**: Signup, Secure Login, Logout, Secure JWT-based User Session.
* **Expected Outcome**: Users cannot access other users' medical records.

### **F2. Medical Document Upload (with Animated Laser Loading)**
* **Priority**: High
* **Description**: Users upload medical documents (PDF, PNG, JPG).
* **Processing UX**: The system provides high-fidelity upload animations including a laser scan overlay (`.scanner-laser`) and cycles through active processing status updates (*"OCR Extraction..."* ➔ *"Vision Parsing..."* ➔ *"Safety Scan..."* ➔ *"Chart Integration..."*) to prevent the user interface from locking.
* **Document Auto-Categorization Fallback**: Uses AI to categorize documents. If categorization is ambiguous, it parses the original file name for clinical keywords (e.g. `rx`, `lab`, `discharge`), defaulting to `Medical Notes`.

### **F3. AI Medical Document Understanding**
* **Priority**: Critical
* **Description**: Extracts structured information from documents:
  * **Patient Info**: Name, age, gender, weight, height.
  * **Medical Event**: Date, doctor, visit type, symptoms, diagnosis.
  * **Medications**: Medicine name, dosage, frequency, duration.
  * **Investigations**: Lab tests, vital measurements.

### **F4. Patient Timeline Intelligence**
* **Priority**: Critical
* **Description**: Reconstructs patient history chronologically, sorting events by date and listing active diagnoses, symptoms, and corresponding medications.

### **F5. Prescription Cross-Visit Intelligence**
* **Priority**: Critical
* **Description**: Compares prescriptions across visits to detect duplicate medications, dosage conflicts, and medication changes. Shows confidence percentages and recommendations.

### **F6. Dynamic Health Trend Intelligence**
* **Priority**: High
* **Description**: Dynamically extracts *any* numeric health measurements parsed from patient-specific records (Body Temperature, Weight, Heart Rate, Blood Sugar, Hemoglobin, Blood Pressure). 
* **Dynamic Tabs UI**: Rather than hardcoding tabs, the interface automatically detects all unique numeric vitals present in the patient's record, dynamically creating chart tabs for each.

### **F7. Multi-Document Medical Reasoning (with Dialog Citations)**
* **Priority**: Critical
* **Description**: Solves clinician queries regarding historical documents. 
* **Dialog Integration**: Responses include clickable document citation badges. Clicking a badge opens the original scanned file/PDF directly inside a preview dialog.

### **F8. QA Safety Disclaimer Banner**
* **Priority**: Critical
* **Description**: To ensure clinical safety, a permanent warning banner is pinned directly above the chat input area: *"Notice: AI Clinical Assistant may make mistakes. Always refer to a doctor or qualified medical professional for clinical advice."* The disclaimer is styled in soft amber to be highly visible yet visually pleasant.

### **F9. Medical Record Quality Intelligence**
* **Priority**: High
* **Description**: Detects patient identity mismatches across files, missing clinical data, and data inconsistencies.

### **F10. Persistent QA Chat Logs**
* **Priority**: High
* **Description**: Prevents chat history loss. All user queries and corresponding AI answers (with evidence and risk metrics) are auto-saved to the database and loaded chronologically upon patient workspace load.

### **F11. Gender-specific Visual UI Accents (Softer Tones)**
* **Priority**: Medium
* **Description**: Provides visual separation. Displays soft sky blue indicators (`M` badges/borders) for male profiles and soft rose pink indicators (`F` badges/borders) for female profiles, with matching banner gradients.

---

# **7. Technology Stack**

* **Frontend**: React.js (Vite), TailwindCSS/Vanilla CSS (Outfit & Inter Typography).
* **Backend**: Node.js, Express.js.
* **Database**: Neon PostgreSQL, `pgvector` for semantic search index operations.
* **AI Orchestration**: Google Generative AI SDK & OpenAI SDK.
* **Model Configurations**: Dynamic and non-hardcoded. Configured using `ai-models.json` settings mappings.

---

# **8. Database Entities**

* **Users**: ID, name, email, password_hash, created_at.
* **Patients**: ID, user_id, patient_name, age, gender, created_at.
* **Documents**: ID, patient_id, file_name, file_url, document_type, processing_status, uploaded_at.
* **Medical Events**: ID, patient_id, document_id, event_date, doctor_name, diagnosis, symptoms, notes.
* **Medications**: ID, medical_event_id, medicine_name, dosage, frequency, duration.
* **Lab Results**: ID, medical_event_id, test_name, value, unit, normal_range.
* **AI Insights**: ID, patient_id, insight_type, description, confidence_score, evidence, created_at.
* **Embeddings**: ID, document_id, content_chunk, embedding_vector.
* **Chat Messages**: ID, patient_id, sender, message_text, evidence, confidence, risk_level, recommendation, created_at.
