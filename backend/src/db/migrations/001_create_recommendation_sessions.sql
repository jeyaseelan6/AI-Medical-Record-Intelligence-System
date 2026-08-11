-- =========================================================================
-- MedAI Round 2 Migration: 001_create_recommendation_sessions.sql
-- Purpose: Persist local doctor recommendation sessions and audit metadata
-- =========================================================================

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

-- Indexes for efficient lookup, multi-tenant isolation, and audit queries
CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_user_id ON recommendation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_patient_id ON recommendation_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_created_at ON recommendation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_specialty ON recommendation_sessions(recommended_specialty);
