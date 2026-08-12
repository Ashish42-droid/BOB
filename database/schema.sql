-- Virtual Village Clinic PostgreSQL Database Schema
-- Compatible with Supabase PostgreSQL

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_level_enum AS ENUM ('LOW', 'MODERATE', 'HIGH', 'EMERGENCY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE doctor_decision_enum AS ENUM ('APPROVED', 'MODIFIED', 'REJECTED', 'REFERRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE consultation_mode_enum AS ENUM ('VIDEO', 'AUDIO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE consultation_status_enum AS ENUM ('REQUESTED', 'QUEUED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE,
    role user_role NOT NULL DEFAULT 'CLINIC_ASSISTANT',
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Clinics Table
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    village VARCHAR(255) NOT NULL,
    district VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    contact VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clinic Staff Table
CREATE TABLE IF NOT EXISTS clinic_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Patients Table (NO auth_user_id as patient login is NOT required)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    age INT,
    gender VARCHAR(20) NOT NULL,
    phone VARCHAR(50),
    village VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(50) DEFAULT 'Hindi',
    abha_number VARCHAR(50),
    emergency_contact VARCHAR(255),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Patient Consents
CREATE TABLE IF NOT EXISTS patient_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL, -- TELECONSULTATION, DATA_PROCESSING, etc.
    status VARCHAR(50) DEFAULT 'GRANTED',
    given_by VARCHAR(255) DEFAULT 'PATIENT',
    consent_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Visits Table
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id),
    clinic_assistant_id UUID REFERENCES profiles(id),
    chief_complaint TEXT,
    symptoms TEXT,
    symptom_duration VARCHAR(100),
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    preferred_language VARCHAR(50) DEFAULT 'Hindi',
    status VARCHAR(50) DEFAULT 'ASSESSMENT', -- ASSESSMENT, WAITING_DOCTOR, IN_CONSULTATION, COMPLETED
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Vitals Table
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    temperature NUMERIC(5,2), -- in °F
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    pulse INT,
    spo2 INT,
    respiratory_rate INT,
    weight NUMERIC(5,2),
    height NUMERIC(5,2),
    recorded_by UUID REFERENCES profiles(id),
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Medical Documents Table
CREATE TABLE IF NOT EXISTS medical_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- PRESCRIPTION, LAB_REPORT, etc.
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    ocr_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSED, FAILED
    ocr_text TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Document Extractions Table
CREATE TABLE IF NOT EXISTS document_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES medical_documents(id) ON DELETE CASCADE,
    extracted_data JSONB NOT NULL,
    confidence NUMERIC(4,3) DEFAULT 0.85,
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Patient Images Table
CREATE TABLE IF NOT EXISTS patient_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    image_type VARCHAR(50) DEFAULT 'INJURY',
    analysis_status VARCHAR(50) DEFAULT 'PENDING',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. AI Assessments Table
CREATE TABLE IF NOT EXISTS ai_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    model_provider VARCHAR(100) DEFAULT 'Groq',
    model_name VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
    prompt_version VARCHAR(50) DEFAULT 'v1.0',
    summary TEXT,
    observations JSONB,
    missing_information JSONB,
    risk_level risk_level_enum DEFAULT 'LOW',
    risk_reasoning TEXT,
    recommendations JSONB,
    warnings JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Knowledge Sources Table
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    source_organization VARCHAR(255) NOT NULL, -- MoHFW, IPHS, STG
    source_url TEXT,
    document_version VARCHAR(50) DEFAULT '1.0',
    effective_date DATE DEFAULT CURRENT_DATE,
    review_date DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. AI Sources Table (linking AI assessment to clinical knowledge)
CREATE TABLE IF NOT EXISTS ai_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_assessment_id UUID REFERENCES ai_assessments(id) ON DELETE CASCADE,
    knowledge_source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    relevance_score NUMERIC(4,3),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Protocols Table
CREATE TABLE IF NOT EXISTS protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    version VARCHAR(50) DEFAULT '1.0',
    risk_level risk_level_enum DEFAULT 'LOW',
    content TEXT NOT NULL,
    source_id UUID REFERENCES knowledge_sources(id),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Doctor Reviews Table
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(id),
    ai_assessment_id UUID REFERENCES ai_assessments(id),
    decision doctor_decision_enum NOT NULL DEFAULT 'APPROVED',
    doctor_notes TEXT,
    doctor_recommendation TEXT,
    referral_required BOOLEAN DEFAULT FALSE,
    referral_destination VARCHAR(255),
    reviewed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(id),
    mode consultation_mode_enum DEFAULT 'VIDEO',
    status consultation_status_enum DEFAULT 'REQUESTED',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    doctor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(id),
    prescription_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'ISSUED',
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES profiles(id),
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    priority VARCHAR(50) DEFAULT 'NORMAL', -- NORMAL, HIGH, URGENT
    status VARCHAR(50) DEFAULT 'QUEUED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id),
    actor_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
