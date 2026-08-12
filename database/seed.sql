-- Seed Data for Virtual Village Clinic (Expanded India-Level Demo Data)

-- 1. Default Clinics across India
INSERT INTO clinics (id, name, village, district, state, contact, status)
VALUES 
('c0000000-0000-0000-0000-000000000001', 'Rampur Village Health Centre', 'Rampur', 'Varanasi', 'Uttar Pradesh', '+91 9876543210', 'ACTIVE'),
('c0000000-0000-0000-0000-000000000002', 'Anandpur Tele-Health Sub-Centre', 'Anandpur', 'Patna', 'Bihar', '+91 9876543211', 'ACTIVE'),
('c0000000-0000-0000-0000-000000000003', 'Chandanpur Rural Wellness Clinic', 'Chandanpur', 'Indore', 'Madhya Pradesh', '+91 9876543212', 'ACTIVE'),
('c0000000-0000-0000-0000-000000000004', 'Sundarban Coastal Health Post', 'Sundarban', 'South 24 Parganas', 'West Bengal', '+91 9876543213', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 2. Staff Profiles (Clinic Assistants, 5 Doctors, Admin)
INSERT INTO profiles (id, role, name, phone, email, status)
VALUES 
('p0000000-0000-0000-0000-000000000001', 'CLINIC_ASSISTANT', 'Sunita Devi (Assistant)', '+91 9876500001', 'assistant@clinic.org', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000002', 'DOCTOR', 'Dr. Rajesh Verma (MBBS, MD - AIIMS New Delhi)', '+91 9876500002', 'doctor@clinic.org', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000003', 'ADMIN', 'Dr. Ananya Sen (Health Director)', '+91 9876500003', 'admin@clinic.org', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000004', 'DOCTOR', 'Dr. Priya Nair (MBBS, MS - JIPMER Puducherry)', '+91 9876500004', 'dr.priya@clinic.org', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000005', 'DOCTOR', 'Dr. Arfan Ahmed (MBBS, MD - PGIMER Chandigarh)', '+91 9876500005', 'dr.arfan@clinic.org', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000006', 'DOCTOR', 'Dr. Sunita Kulkarni (MBBS, DNB - KEM Mumbai)', '+91 9876500006', 'dr.sunita@clinic.org', 'ACTIVE'),
('p0000000-0000-0000-0000-000000000007', 'DOCTOR', 'Dr. Vikramaditya Singh (MBBS, MD - BHU Varanasi)', '+91 9876500007', 'dr.vikram@clinic.org', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

-- 3. Knowledge Source (MoHFW STG & IPHS)
INSERT INTO knowledge_sources (id, title, source_organization, source_url, document_version, status)
VALUES 
('k0000000-0000-0000-0000-000000000001', 'MoHFW Standard Treatment Guidelines - Primary Care 2024', 'Ministry of Health & Family Welfare, Govt of India', 'https://main.mohfw.gov.in', '2024.1', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 4. Approved Protocols
INSERT INTO protocols (id, name, category, version, risk_level, content, source_id, status)
VALUES 
(
  'pr000000-0000-0000-0000-000000000001',
  'Minor Superficial Wound & Abrasion First-Aid Protocol',
  'First Aid',
  '1.0',
  'LOW',
  'PROCEDURE: 1. Clean hands with soap/sanitizer. 2. Irrigate wound with clean water or sterile saline solution. 3. Apply antiseptic (povidone-iodine). 4. Cover with clean sterile gauze/bandage. 5. Instruct patient to keep wound clean and dry. WARNING SIGNS: Active bleeding > 10 mins, pus, fever, severe pain -> Escalate to Doctor.',
  'k0000000-0000-0000-0000-000000000001',
  'ACTIVE'
),
(
  'pr000000-0000-0000-0000-000000000002',
  'Acute Febrile Illness (Fever < 3 days) Triage Protocol',
  'General Medicine',
  '1.0',
  'MODERATE',
  'PROCEDURE: 1. Measure oral/axillary temperature and SpO2. 2. Provide oral rehydration fluids. 3. Cold compress if temp > 101F. 4. Check for warning signs: stiff neck, confusion, breathing difficulty, petechial rash. WARNING SIGNS: SpO2 < 94%, severe headache, persistent vomiting -> Immediate Doctor Referral.',
  'k0000000-0000-0000-0000-000000000001',
  'ACTIVE'
),
(
  'pr000000-0000-0000-0000-000000000003',
  'Emergency Triage & Escalation Protocol',
  'Emergency',
  '1.0',
  'EMERGENCY',
  'RED ALERT CONDITIONS: SpO2 < 90%, Severe dyspnea / chest pain, Unconsciousness / altered sensorium, Systolic BP < 90 mmHg or > 180 mmHg, Severe trauma / major hemorrhage. ACTION: Stop AI protocol. Immediate Doctor Alert + Hospital Emergency Ambulance Dispatch.',
  'k0000000-0000-0000-0000-000000000001',
  'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- 5. 4 Sample Demo Patients (India-level rural patients)
INSERT INTO patients (id, patient_code, name, date_of_birth, age, gender, phone, village, preferred_language, abha_number, emergency_contact, created_by)
VALUES 
(
  'pt000000-0000-0000-0000-000000000001',
  'PAT-2026-001',
  'Ramesh Kumar',
  '1984-05-12',
  42,
  'Male',
  '+91 9876512345',
  'Rampur (Varanasi, UP)',
  'Hindi',
  '12-3456-7890-1234',
  'Sita Devi (Wife) - 9876512346',
  'p0000000-0000-0000-0000-000000000001'
),
(
  'pt000000-0000-0000-0000-000000000002',
  'PAT-2026-002',
  'Sunita Devi',
  '1991-08-24',
  35,
  'Female',
  '+91 9876512347',
  'Anandpur (Patna, Bihar)',
  'Hindi',
  '23-4567-8901-2345',
  'Manoj Kumar (Husband) - 9876512348',
  'p0000000-0000-0000-0000-000000000001'
),
(
  'pt000000-0000-0000-0000-000000000003',
  'PAT-2026-003',
  'Vikram Patel',
  '1968-11-03',
  58,
  'Male',
  '+91 9876512349',
  'Chandanpur (Indore, MP)',
  'Hindi',
  '34-5678-9012-3456',
  'Rajesh Patel (Son) - 9876512350',
  'p0000000-0000-0000-0000-000000000001'
),
(
  'pt000000-0000-0000-0000-000000000004',
  'PAT-2026-004',
  'Ananya Biswas',
  '1998-02-14',
  28,
  'Female',
  '+91 9876512351',
  'Sundarban (24 Parganas, WB)',
  'Bengali',
  '45-6789-0123-4567',
  'Bimal Biswas (Father) - 9876512352',
  'p0000000-0000-0000-0000-000000000001'
)
ON CONFLICT (patient_code) DO NOTHING;
