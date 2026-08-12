import { supabaseAdmin } from '../config/supabase.js';

async function testSupabaseInsert() {
  console.log('🧪 Testing direct Supabase insert for patients table...');

  const testPatient = {
    patient_code: `TEST-${Date.now()}`,
    name: 'Supabase Test Patient',
    age: 30,
    gender: 'Male',
    village: 'Test Village',
    preferred_language: 'Hindi'
  };

  console.log('Inserting payload:', testPatient);

  const { data, error } = await supabaseAdmin
    .from('patients')
    .insert([testPatient])
    .select();

  if (error) {
    console.error('❌ Supabase Insert Failed with Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Supabase Insert Succeeded! Returned Data:', data);
  }
}

testSupabaseInsert();
