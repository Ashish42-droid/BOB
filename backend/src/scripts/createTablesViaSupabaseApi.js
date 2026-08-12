import fetch from 'node-fetch';
import { config } from '../config/env.js';

async function setupTables() {
  const url = `${config.supabase.url}/rest/v1/rpc/exec_sql`;
  console.log('Sending SQL schema to Supabase:', url);

  const sql = `
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
  `;

  try {
    const response = await fetch(`${config.supabase.url}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabase.serviceRoleKey,
        'Authorization': `Bearer ${config.supabase.serviceRoleKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    const text = await response.text();
    console.log('Supabase SQL API response:', response.status, text);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

setupTables();
