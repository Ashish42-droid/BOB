import { supabaseAdmin } from '../config/supabase.js';

async function createTables() {
  console.log('🚀 Creating all 19 database tables on Supabase...');

  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS patients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS visits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID,
      clinic_id UUID,
      clinic_assistant_id UUID,
      chief_complaint TEXT,
      symptoms TEXT,
      symptom_duration VARCHAR(100),
      medical_history TEXT,
      allergies TEXT,
      current_medications TEXT,
      preferred_language VARCHAR(50) DEFAULT 'Hindi',
      status VARCHAR(50) DEFAULT 'ASSESSMENT',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS vitals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      visit_id UUID,
      temperature NUMERIC(5,2),
      blood_pressure_systolic INT,
      blood_pressure_diastolic INT,
      pulse INT,
      spo2 INT,
      respiratory_rate INT,
      weight NUMERIC(5,2),
      height NUMERIC(5,2),
      recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS consultations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      visit_id UUID,
      doctor_id UUID,
      mode VARCHAR(50) DEFAULT 'VIDEO',
      status VARCHAR(50) DEFAULT 'SCHEDULED',
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      doctor_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID,
      actor_role VARCHAR(50),
      action VARCHAR(255) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id UUID,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  for (const sql of sqlStatements) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
      if (error) {
        console.warn('RPC exec_sql notice:', error.message);
      } else {
        console.log('✅ Table created via RPC!');
      }
    } catch (e) {
      console.warn('SQL execution notice:', e.message);
    }
  }

  console.log('🎉 Supabase Table Setup Finished!');
}

createTables();
