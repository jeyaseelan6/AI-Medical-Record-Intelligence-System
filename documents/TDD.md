# **Technical Design Document (TDD)**

# **Project Name**

AI Medical Record Intelligence System

Version: 1.0

Competition:  
 YGC Innovation Festival AI Competition 2026

Development Approach:  
 Solo Full-Stack AI Application

---

# **1\. Technical Vision**

Build a production-style AI medical record intelligence platform that converts unstructured healthcare documents into structured patient information and generates explainable insights through AI reasoning.

The system follows:

Document → Extraction → Structured Medical Data → Intelligence Engine → User Dashboard

The AI is not a chatbot wrapper.

The AI acts as a multi-stage intelligence pipeline:

1. Understand documents  
2. Extract medical entities  
3. Organize patient history  
4. Compare medical events  
5. Generate evidence-based insights  
6. Explain findings safely

---

# **2\. System Architecture Overview**

                User  
                  |  
                  |  
            React Frontend  
                  |  
                  |  
          Express.js Backend API  
                  |  
        \-----------------------  
        |                     |  
 PostgreSQL Database       AI Engine  
 NeonDB                    LLM \+ Embeddings  
        |                     |  
        |              \----------------  
        |              |              |  
 Medical Data     Extraction     Reasoning  
                  Pipeline       Pipeline

                  |  
            Vector Search  
             pgvector

                  |  
          AI Insight Generator

                  |  
          Confidence Layer  
                  |  
          Dashboard  
---

# **3\. Technology Stack**

## **Frontend**

React.js

Purpose:

* User interface  
* Dashboard  
* Upload workflow  
* Timeline visualization  
* AI conversation interface

Libraries:

* React Router  
* Axios  
* Chart library  
* UI component library

---

## **Backend**

Node.js \+ Express.js

Responsibilities:

* Authentication  
* API management  
* File handling  
* AI orchestration  
* Database operations

---

## **Database**

Neon PostgreSQL

With pgvector extension.

Responsibilities:

Structured storage:

* Users  
* Patients  
* Medical events  
* Medications  
* AI insights

Vector storage:

* Document embeddings  
* Medical context retrieval

---

## **AI Layer**

LLM:

Free/available LLM APIs or models.

Responsibilities:

* Document understanding  
* Information extraction  
* Medical reasoning  
* Explanation generation

Embedding Model:

Purpose:

Convert medical documents into searchable vectors.

---

## **Cloud Infrastructure**

AWS

Usage:

* Backend hosting  
* File storage  
* Application deployment

---

# **4\. Application Modules**

---

# **Module 1: Authentication Service**

Purpose:

Control user access.

Flow:

User signup

↓

Password encryption

↓

Store user

↓

Login

↓

Generate session/token

Database:

users table

---

# **Module 2: Medical Document Management**

Purpose:

Handle uploaded medical files.

Input:

* PDF  
* PNG  
* JPG

Flow:

Upload File

↓

Validate File

↓

Store File

↓

Create Processing Job

↓

Send to AI Pipeline

Database:

documents table

---

# **Module 3: AI Document Processing Pipeline**

This is the core intelligence.

## **Step 1: Document Understanding**

Input:

Medical image/PDF

Processing:

OCR / Vision model

Output:

Raw text

Example:

Date:  
03-Oct-2019

Diagnosis:  
FEVER

Medicine:  
DEMO MEDICINE 1  
---

## **Step 2: Medical Information Extraction**

LLM converts raw text into structured JSON.

Example:

Input:

Prescription text

Output:

{  
 "date":"2019-10-03",  
 "diagnosis":\["Fever"\],  
 "medications":\[  
   {  
    "name":"Demo Medicine 1",  
    "frequency":"Morning Night",  
    "duration":"10 days"  
   }  
 \]  
}  
---

## **Step 3: Validation Layer**

Checks:

* Missing fields  
* Invalid formats  
* Patient mismatch  
* Duplicate information

---

## **Step 4: Store Structured Data**

Save into database.

---

# **Module 4: Patient Timeline Engine**

Purpose:

Create chronological medical history.

Input:

Medical events

Processing:

Sort by date.

Combine related events.

Output:

Patient Timeline

04 July 2019

Diagnosis:  
Fever

Medication:  
Medicine A

Follow-up:  
15 July 2019

03 October 2019

Diagnosis:  
Fever

Medication:  
Medicine A  
---

# **Module 5: Medication Intelligence Engine**

Requirement:

R2

Purpose:

Compare medicines across visits.

Process:

Retrieve all patient medications.

Compare:

* Medicine name  
* Dosage  
* Frequency  
* Duration

Detect:

## **Duplicate Medication**

Example:

Medicine A appears in:  
Visit 1  
Visit 2  
Visit 3

## **Dosage Conflict**

Example:

Previous:

1 tablet daily

Current:

2 tablets daily

## **Medication Change**

Example:

Added:  
 Medicine B

Removed:  
 Medicine C

Output:

{  
"type":"duplicate\_medication",  
"medicine":"Medicine A",  
"confidence":0.91  
}  
---

# **Module 6: Health Trend Engine**

Requirement:

R3

Purpose:

Analyze measurements over time.

Input:

Historical values.

Example:

Temperature:

Visit 1:  
37°C

Visit 2:  
38°C

AI output:

"The recorded temperature increased between visits."

Supported:

* Temperature  
* Blood pressure  
* Weight  
* Lab values

---

# **Module 7: Medical Question Answering Engine**

Requirement:

R4

Architecture:

RAG (Retrieval Augmented Generation)

Flow:

User Question

↓

Create embedding

↓

Search relevant medical records

↓

Retrieve evidence

↓

LLM reasoning

↓

Generate answer

Example:

Question:

"Was this medication prescribed before?"

Retrieval:

Find previous prescriptions.

Answer:

"Yes, it appeared on 03 October 2019."

Evidence:

Document date.

---

# **Module 8: Confidence & Safety Engine**

Requirement:

R5

Every AI response must include:

Finding:

Evidence:

Confidence Score:

Risk Level:

Recommendation:

Example:

Finding:  
Possible duplicate medication detected.

Evidence:  
Same medicine found in two prescriptions.

Confidence:  
88%

Recommendation:  
Consult a healthcare professional before making decisions.  
---

# **Module 9: Medical Record Quality Engine**

Purpose:

Differentiate the project.

Detect:

## **Patient mismatch**

Example:

Name mismatch.

## **Missing information**

Example:

"No allergy information found."

## **Data inconsistency**

Example:

Weight:

25kg

later:

58kg

## **Prescription calculation issue**

Example:

Duration does not match quantity.

---

# **5\. Database Design**

## **users**

id  
name  
email  
password\_hash  
created\_at  
---

## **patients**

id  
user\_id  
patient\_name  
age  
gender  
created\_at  
---

## **documents**

id  
patient\_id  
file\_name  
file\_url  
document\_type  
processing\_status  
uploaded\_at  
---

## **medical\_events**

id  
patient\_id  
document\_id  
event\_date  
doctor\_name  
diagnosis  
symptoms  
notes  
---

## **medications**

id  
medical\_event\_id  
medicine\_name  
dosage  
frequency  
duration  
---

## **lab\_results**

id  
medical\_event\_id  
test\_name  
value  
unit  
normal\_range  
---

## **ai\_insights**

id  
patient\_id  
insight\_type  
description  
confidence\_score  
evidence  
created\_at  
---

## **embeddings**

id  
document\_id  
content\_chunk  
embedding\_vector  
---

# **6\. API Design**

## **Authentication**

POST

/api/auth/signup

POST

/api/auth/login  
---

## **Patient**

POST

/api/patients

GET

/api/patients/:id  
---

## **Documents**

POST

/api/documents/upload

GET

/api/documents/:patientId  
---

## **Timeline**

GET

/api/timeline/:patientId  
---

## **AI Insights**

GET

/api/insights/:patientId  
---

## **Question Answering**

POST

/api/ask

Request:

{  
"patientId":1,  
"question":"Was this medicine used before?"  
}

Response:

{  
"answer":"Yes",  
"evidence":"Prescription dated 03-Oct-2019",  
"confidence":0.92  
}  
---

# **7\. AI Prompt Strategy**

The AI should work through specialized prompts.

Not one giant prompt.

---

## **Extraction Prompt**

Role:

Medical document information extractor.

Output:

Strict JSON.

---

## **Timeline Prompt**

Role:

Medical history organizer.

---

## **Risk Analysis Prompt**

Role:

Medical record reviewer.

---

## **Question Answering Prompt**

Role:

Evidence-based medical record assistant.

---

# **8\. Security Considerations**

For competition:

Basic implementation.

Required:

* Authentication  
* User isolation  
* Protected APIs  
* No public patient data

Medical disclaimer:

"This system provides information from uploaded records and does not provide medical diagnosis."

---

# **9\. Deployment Architecture**

AWS EC2

|  
|-- React Frontend  
|  
|-- Express Backend  
|  
|-- Nginx

NeonDB  
|  
PostgreSQL \+ pgvector

AI APIs  
|  
LLM Provider  
---

# **10\. Development Plan (8 Working Days)**

## **Day 1**

Foundation

* GitHub setup  
* React setup  
* Express setup  
* NeonDB setup  
* Authentication

---

## **Day 2**

Document pipeline

* Upload  
* Storage  
* OCR  
* AI extraction

---

## **Day 3**

Medical database

* Save extracted data  
* Timeline generation

---

## **Day 4**

AI intelligence

* Medication comparison  
* Trend analysis

---

## **Day 5**

RAG system

* Embeddings  
* Vector search  
* Question answering

---

## **Day 6**

Safety layer

* Confidence scoring  
* Evidence display  
* Record quality checks

---

## **Day 7**

Frontend polish

* Dashboard  
* Timeline UI  
* Insight cards

---

## **Day 8**

Competition preparation

* Test provided dataset  
* Fix bugs  
* Prepare presentation  
* Record demo

---

# **11\. Final Technical Positioning**

The project demonstrates:

"An AI-native medical record intelligence platform that combines document understanding, retrieval augmented generation, longitudinal reasoning, and responsible AI safety mechanisms to transform fragmented healthcare records into actionable insights."

This TDD keeps the system technically deep enough for the judges while remaining feasible for a solo 8-day implementation.

