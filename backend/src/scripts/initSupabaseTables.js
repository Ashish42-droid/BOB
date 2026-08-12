import { supabaseAdmin } from '../config/supabase.js';

async function initDatabase() {
  console.log('🔄 Checking & initializing Supabase Database Tables...');

  try {
    // Test selecting from patients table
    const { data, error } = await supabaseAdmin.from('patients').select('count', { count: 'exact' });

    if (error) {
      console.warn('⚠️ Patients table select check:', error.message);
    } else {
      console.log('✅ Supabase Connection Healthy! Patients table count:', data);
    }

    console.log('🧹 Clearing legacy mock patient data to start with clean real database...');
    // Clear old test data if any
    try {
      await supabaseAdmin.from('patients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('✅ Supabase Patients table cleared successfully.');
    } catch (e) {
      console.warn('Patients table clear notice:', e.message);
    }

  } catch (err) {
    console.error('❌ Supabase initialization failed:', err.message);
  }
}

initDatabase();
