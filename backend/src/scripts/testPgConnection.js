import pg from 'pg';
import { config } from '../config/env.js';

const { Client } = pg;

async function testConnection() {
  const connectionStrings = [
    `postgresql://postgres:${encodeURIComponent(config.supabase.serviceRoleKey)}@db.ucivhqksbbwhdwetrkbd.supabase.co:5432/postgres`,
    `postgresql://postgres.ucivhqksbbwhdwetrkbd:${encodeURIComponent(config.supabase.serviceRoleKey)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encodeURIComponent(config.supabase.serviceRoleKey)}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
  ];

  for (const connStr of connectionStrings) {
    console.log('Testing PostgreSQL connection:', connStr.slice(0, 50) + '...');
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('✅ PostgreSQL Connection Succeeded!');

      const res = await client.query('SELECT NOW()');
      console.log('PostgreSQL time:', res.rows[0]);

      // Create patients table directly
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.patients (
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
        );

        CREATE TABLE IF NOT EXISTS public.visits (
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
        );

        CREATE TABLE IF NOT EXISTS public.vitals (
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
        );

        CREATE TABLE IF NOT EXISTS public.consultations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID,
          doctor_id UUID,
          mode VARCHAR(50) DEFAULT 'VIDEO',
          status VARCHAR(50) DEFAULT 'SCHEDULED',
          started_at TIMESTAMPTZ,
          ended_at TIMESTAMPTZ,
          doctor_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS public.audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id UUID,
          actor_role VARCHAR(50),
          action VARCHAR(255) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id UUID,
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('🎉 Successfully created all tables in Supabase PostgreSQL!');
      await client.end();
      break;
    } catch (err) {
      console.warn('Connection failed:', err.message);
      try { await client.end(); } catch (e) {}
    }
  }
}

testConnection();
