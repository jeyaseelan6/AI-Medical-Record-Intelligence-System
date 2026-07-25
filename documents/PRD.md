# **Product Requirements Document (PRD)**

# **Project Name**

AI Medical Record Intelligence System

Version: 1.0

Competition:  
 YGC Innovation Festival AI Competition 2026

Development Approach:  
 Solo AI Product Build

---

# **1\. Product Vision**

Build an AI-powered medical record intelligence system that transforms fragmented medical documents into a structured, explainable, and trustworthy patient health timeline.

The system helps users understand their medical history by extracting information from multiple healthcare documents, identifying important patterns, detecting inconsistencies, and answering questions using evidence from medical records.

The system is not designed to diagnose diseases or replace doctors.

It acts as an intelligent medical record assistant that helps patients and healthcare professionals understand complex medical histories.

---

# **2\. Problem Statement**

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

# **3\. Target Users**

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

# **4\. Product Goals**

## **Competition Goals**

Successfully demonstrate:

* Deep AI integration  
* Real-world problem solving  
* End-to-end functional application  
* Medical document intelligence  
* Responsible AI behaviour

## **Product Goals**

The system should:

1. Convert unstructured medical documents into structured information.  
2. Create a chronological patient medical timeline.  
3. Perform intelligent analysis across multiple visits.  
4. Provide explainable AI insights.  
5. Detect medical record quality issues.  
6. Maintain safety by showing confidence and limitations.

---

# **5\. Non-Goals (Not Building)**

To avoid scope expansion:

The system will NOT:

* Diagnose diseases  
* Replace doctors  
* Recommend medications  
* Provide emergency medical decisions  
* Build a hospital management system  
* Perform autonomous medical treatment decisions

---

# **6\. Core Features**

# **F1. User Authentication**

Priority:  
 High

Description:

Users create an account and access their private workspace.

Functions:

* Signup  
* Login  
* Logout  
* Secure user session

Expected outcome:

Users cannot access other users' medical records.

---

# **F2. Medical Document Upload**

Priority:  
 High

Description:

Users upload medical documents.

Supported formats:

* PDF  
* PNG  
* JPG

Examples:

* Prescription images  
* Lab reports  
* Medical summaries

Workflow:

Upload document

↓

Processing status

↓

AI analysis

↓

Structured medical information

---

# **F3. AI Medical Document Understanding**

Priority:  
 Critical

The AI extracts medical information from documents.

Extract:

## **Patient Information**

* Name  
* Age  
* Gender  
* Weight  
* Height  
* BMI

## **Medical Event**

* Date  
* Doctor/provider  
* Visit type  
* Symptoms  
* Diagnosis

## **Medication Information**

* Medicine name  
* Dosage  
* Frequency  
* Duration

## **Investigation Information**

* Lab tests  
* Vital measurements  
* Medical observations

Output:

Structured medical data.

---

# **F4. Patient Timeline Intelligence**

Priority:  
 Critical

Creates a chronological medical history.

Example:

Patient Timeline:

2019-05-01

Condition:  
 Dengue

Medication:  
 Medicine A

Investigation:  
 CBC recommended

2020-01-02

Condition:  
 Fever

Medication:  
 Medicine B

Follow-up:  
 15 days

The timeline should allow users to understand:

"What happened to this patient over time?"

---

# **F5. Prescription Cross-Visit Intelligence**

Priority:  
 Critical

Requirement:  
 R2

The AI compares prescriptions across visits.

Detect:

## **Duplicate prescriptions**

Example:

Same medicine appears repeatedly.

## **Dosage conflicts**

Example:

Previous:  
 10 days

Current:  
 20 days

## **Medication changes**

Example:

Medicine added or removed.

Output:

Finding:  
 "Similar medication detected in previous visit."

Evidence:  
 "Prescription dated XX"

Confidence:  
 XX%

---

# **F6. Health Trend Intelligence**

Priority:  
 High

Requirement:  
 R3

Tracks health measurements over time.

Examples:

* Temperature  
* Blood pressure  
* Lab values  
* Weight

Example output:

"Recorded temperature increased from 37°C to 38°C across two visits. The trend should be reviewed with a healthcare professional."

---

# **F7. Multi-Document Medical Reasoning**

Priority:  
 Critical

Requirement:  
 R4

The system answers questions requiring information from multiple records.

Examples:

Question:

"Was this medication prescribed before?"

Answer:

"Yes. The medication appeared in the prescription dated 03-Oct-2019."

Question:

"Are there any missing allergy records?"

Answer:

"No allergy information was found in the uploaded documents."

---

# **F8. AI Confidence and Safety Layer**

Priority:  
 Critical

Requirement:  
 R5

Every AI-generated insight should include:

* Finding  
* Evidence source  
* Confidence score  
* Risk level  
* Recommendation

Example:

Finding:  
 Medication repeated across visits.

Confidence:  
 92%

Recommendation:  
 "Consult a healthcare professional before making medication decisions."

---

# **F9. Medical Record Quality Intelligence**

Priority:  
 High

Requirement:  
 R6 (Additional differentiation)

The AI evaluates the quality of medical records.

Detect:

## **Identity mismatch**

Example:

Document A:  
 John Doe

Document B:  
 Priya Sharma

Output:

"Multiple patient identities detected. Records should not be merged without verification."

## **Missing information**

Examples:

* No allergy information  
* Missing lab results

## **Data inconsistency**

Examples:

Weight changes unexpectedly.

Diagnosis does not match complaint.

Medication quantity mismatch.

---

# **7\. User Workflow**

Complete application flow:

User

↓

Signup/Login

↓

Create patient profile

↓

Upload medical documents

↓

AI processing

↓

Document analysis completed

↓

Medical dashboard

↓

View:

* Timeline  
* Medications  
* Trends  
* AI findings

↓

Ask questions

↓

Receive evidence-based AI response

---

# **8\. AI System Architecture**

High-level flow:

Medical Documents

↓

Document Intelligence Layer

(OCR \+ Vision AI \+ LLM)

↓

Structured Medical Data

↓

Neon PostgreSQL Database

↓

Medical Intelligence Engine

|

├── Timeline Engine

├── Medication Analysis Engine

├── Trend Analysis Engine

├── Question Answering Engine

└── Record Quality Engine

↓

Confidence & Safety Layer

↓

React Dashboard

---

# **9\. Technology Stack**

Frontend:

React.js

Backend:

Node.js

Express.js

Database:

Neon PostgreSQL

pgvector

AI:

LLM API / Free available AI models

Embedding model

Storage:

AWS S3 (if required)

Hosting:

AWS

Version Control:

GitHub

Development:

Google Antigravity

---

# **10\. Database Entities**

## **Users**

Stores authentication information.

## **Patients**

Stores patient profile.

## **Documents**

Stores uploaded medical documents.

## **Medical Events**

Stores visits and health events.

## **Medications**

Stores medicine information.

## **Lab Results**

Stores measurements and trends.

## **AI Insights**

Stores generated findings.

## **Embeddings**

Stores semantic medical document vectors.

---

# **11\. Demo Scenario**

The final demo should show:

## **Step 1**

Login

## **Step 2**

Upload provided medical documents

## **Step 3**

AI processes documents

## **Step 4**

Show generated patient timeline

## **Step 5**

Show AI findings:

* Medication repetition  
* Data inconsistencies  
* Missing information

## **Step 6**

Ask:

"Did this patient receive this medicine before?"

## **Step 7**

Show:

Answer \+ Evidence \+ Confidence

---

# **12\. Success Criteria**

The application succeeds if judges can clearly see:

✓ AI is the core engine  
 ✓ Documents are intelligently understood  
 ✓ Patient history is reconstructed  
 ✓ Multiple records are reasoned together  
 ✓ Insights are explainable  
 ✓ Safety is considered  
 ✓ Application works end-to-end

---

# **13\. Development Priority**

Must Have:

1. Authentication  
2. Document upload  
3. AI extraction  
4. Timeline generation  
5. AI reasoning  
6. Confidence layer  
7. Dashboard

Nice to Have:

* Advanced medical knowledge integration  
* More complex visualizations  
* Additional AI agents  
* Multi-language support

