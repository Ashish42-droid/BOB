import { supabaseAdmin } from '../config/supabase.js';

async function debugInsert() {
  console.log('🔍 Testing live Supabase insert for Ashish Kumar...');

  const patientRecord = {
    patient_code: `PAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    name: 'Ashish Kumar',
    age: 26,
    gender: 'Male',
    phone: '+91 9876543210',
    village: 'Rampur',
    preferred_language: 'Hindi',
    abha_number: '12-3456-7890-1234',
    emergency_contact: 'Family'
  };

  console.log('Sending payload to Supabase:', patientRecord);

  const { data, error } = await supabaseAdmin
    .from('patients')
    .insert([patientRecord])
    .select();

  if (error) {
    console.error('❌ SUPABASE INSERT ERROR RETURNED:', JSON.stringify(error, null, 2));
  } else {
    console.log('🎉 SUPABASE INSERT SUCCESSFUL! Returned Row:', data);
  }
}

debugInsert();
