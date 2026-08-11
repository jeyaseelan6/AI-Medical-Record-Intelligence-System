-- Create extension for pgvector if it exists (for RAG context search)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop tables if they exist (clean setup)
DROP TABLE IF EXISTS recommendation_sessions CASCADE;
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS lab_results CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS medical_events CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients Table
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER,
    gender VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Documents Table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    document_type VARCHAR(100), -- 'Prescription', 'Lab Report', 'Discharge Summary'
    processing_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Processing', 'Completed', 'Failed'
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Medical Events Table
CREATE TABLE medical_events (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    event_date DATE NOT NULL,
    doctor_name VARCHAR(255),
    diagnosis TEXT, -- Parsed diagnosis summary or comma-separated values
    symptoms TEXT, -- Patient's reported symptoms
    notes TEXT, -- General clinical or physical exam notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medications Table
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    medical_event_id INTEGER REFERENCES medical_events(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(255), -- e.g. "500mg" or "1 tablet"
    frequency VARCHAR(255), -- e.g. "Daily" or "Morning/Night"
    duration VARCHAR(255) -- e.g. "7 days"
);

-- 6. Lab Results Table
CREATE TABLE lab_results (
    id SERIAL PRIMARY KEY,
    medical_event_id INTEGER REFERENCES medical_events(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL, -- e.g. "Hemoglobin", "Weight", "Temperature"
    value VARCHAR(255), -- e.g. "12.5", "70", "38.2"
    unit VARCHAR(50), -- e.g. "g/dL", "kg", "C"
    normal_range VARCHAR(255) -- e.g. "13.5 - 17.5"
);

-- 7. AI Insights Table
CREATE TABLE ai_insights (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    insight_type VARCHAR(100) NOT NULL, -- 'duplicate_medication', 'dosage_conflict', 'trend_alert', 'quality_issue'
    description TEXT NOT NULL,
    confidence_score NUMERIC(5,2), -- Scale 0 to 100
    evidence TEXT, -- Verifiable quotes or dates
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Embeddings Table (vector matches 768 dimensions of text-embedding-004)
CREATE TABLE IF NOT EXISTS embeddings (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding_vector vector(3072)
);

-- 9. Chat Messages Table (stores patient RAG chat history)
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL, -- 'user' or 'ai'
    message_text TEXT NOT NULL,
    evidence TEXT,
    confidence INTEGER,
    risk_level VARCHAR(50),
    recommendation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Recommendation Sessions Table (Round 2 Care Navigation Audit)
CREATE TABLE IF NOT EXISTS recommendation_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    insight_id INTEGER REFERENCES ai_insights(id) ON DELETE SET NULL,
    issue_type VARCHAR(100),
    risk_level VARCHAR(50),
    clinical_summary TEXT,
    recommended_care_type VARCHAR(100),
    recommended_specialty VARCHAR(100),
    alternative_specialties JSONB DEFAULT '[]'::jsonb,
    specialty_reason TEXT,
    confidence_score NUMERIC(5,2),
    location_query VARCHAR(255),
    normalized_location VARCHAR(255),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    availability_preference VARCHAR(50),
    search_radius_km NUMERIC(6,2) DEFAULT 25.0,
    total_providers_found INTEGER DEFAULT 0,
    providers_result JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- DATABASE OPTIMIZATION & INDEXES
-- =========================================================================

-- Index user queries by email (crucial for quick login lookup)
CREATE INDEX idx_users_email ON users(email);

-- Index patients by user_id to display user workspace patients list instantly
CREATE INDEX idx_patients_user_id ON patients(user_id);

-- Index documents by patient_id to fetch all uploaded files efficiently
CREATE INDEX idx_documents_patient_id ON documents(patient_id);

-- Composite Index on medical events (patient_id, event_date desc) to speed up timeline rendering
CREATE INDEX idx_medical_events_timeline ON medical_events(patient_id, event_date DESC);

-- Index foreign keys for cascading lookups and JOIN optimizations
CREATE INDEX idx_medications_event ON medications(medical_event_id);
CREATE INDEX idx_lab_results_event ON lab_results(medical_event_id);
CREATE INDEX idx_ai_insights_patient ON ai_insights(patient_id);
CREATE INDEX idx_embeddings_document ON embeddings(document_id);
CREATE INDEX idx_chat_messages_patient ON chat_messages(patient_id);
CREATE INDEX idx_recommendation_sessions_user_id ON recommendation_sessions(user_id);
CREATE INDEX idx_recommendation_sessions_patient_id ON recommendation_sessions(patient_id);
CREATE INDEX idx_recommendation_sessions_created_at ON recommendation_sessions(created_at DESC);
CREATE INDEX idx_recommendation_sessions_specialty ON recommendation_sessions(recommended_specialty);
