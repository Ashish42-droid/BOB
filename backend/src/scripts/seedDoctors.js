import { supabaseAdmin } from '../config/supabase.js';

/**
 * Seeds 5 specialist doctor accounts (safe to re-run).
 * Each doctor gets: Supabase Auth user (password), staff_profiles row,
 * and doctor_profiles row with specialization + registration number.
 *
 * Run: node src/scripts/seedDoctors.js
 */

export const DOCTORS = [
  {
    email: 'dr.priya@clinic.org',
    password: 'Priya@1234',
    full_name: 'Dr. Priya Nair',
    phone: '+91 9876500011',
    registration_number: 'MCI-2014-38217',
    specialization: 'Pediatrics',
    qualification: 'MBBS, MD Pediatrics (JIPMER Puducherry)'
  },
  {
    email: 'dr.arjun@clinic.org',
    password: 'Arjun@1234',
    full_name: 'Dr. Arjun Mehta',
    phone: '+91 9876500012',
    registration_number: 'MCI-2010-27594',
    specialization: 'Cardiology',
    qualification: 'MBBS, DM Cardiology (PGIMER Chandigarh)'
  },
  {
    email: 'dr.kavita@clinic.org',
    password: 'Kavita@1234',
    full_name: 'Dr. Kavita Rao',
    phone: '+91 9876500013',
    registration_number: 'MCI-2016-45021',
    specialization: 'Dermatology',
    qualification: 'MBBS, MD Dermatology (KEM Hospital Mumbai)'
  },
  {
    email: 'dr.sanjay@clinic.org',
    password: 'Sanjay@1234',
    full_name: 'Dr. Sanjay Gupta',
    phone: '+91 9876500014',
    registration_number: 'MCI-2008-19873',
    specialization: 'Orthopedics',
    qualification: 'MBBS, MS Orthopedics (BHU Varanasi)'
  },
  {
    email: 'dr.meera@clinic.org',
    password: 'Meera@1234',
    full_name: 'Dr. Meera Iyer',
    phone: '+91 9876500015',
    registration_number: 'MCI-2012-33468',
    specialization: 'General Medicine',
    qualification: 'MBBS, MD Internal Medicine (CMC Vellore)'
  }
];

async function seedDoctor(doc) {
  // 1. Auth user (password holder)
  const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: doc.email,
    password: doc.password,
    email_confirm: true,
    user_metadata: { full_name: doc.full_name, role: 'doctor' }
  });
  if (authErr && !/already.*(registered|exists)/i.test(authErr.message)) {
    console.log(`  ⚠️ Auth ${doc.email}: ${authErr.message}`);
  } else {
    console.log(`  ✅ Auth user ready: ${doc.email}${created?.user ? ' (created)' : ''}`);
  }

  // 2. staff_profiles
  const { data: existing } = await supabaseAdmin
    .from('staff_profiles')
    .select('id')
    .eq('email', doc.email)
    .maybeSingle();

  let staffId = existing?.id;
  if (!staffId) {
    const { data: inserted, error } = await supabaseAdmin
      .from('staff_profiles')
      .insert([{
        full_name: doc.full_name,
        role: 'doctor',
        email: doc.email,
        phone: doc.phone,
        status: 'active'
      }])
      .select('id')
      .single();
    if (error) {
      console.log(`  ❌ staff_profiles ${doc.email}: ${error.message}`);
      return;
    }
    staffId = inserted.id;
  }

  // 3. doctor_profiles (specialization + registration)
  const { error: docErr } = await supabaseAdmin
    .from('doctor_profiles')
    .upsert([{
      staff_id: staffId,
      registration_number: doc.registration_number,
      specialization: doc.specialization,
      qualification: doc.qualification
    }], { onConflict: 'staff_id' });

  console.log(docErr
    ? `  ⚠️ doctor_profiles ${doc.email}: ${docErr.message}`
    : `  ✅ ${doc.full_name} — ${doc.specialization}`);
}

console.log('======================================================');
console.log('SEEDING 5 SPECIALIST DOCTOR ACCOUNTS');
console.log('======================================================');
for (const doc of DOCTORS) {
  await seedDoctor(doc);
}
console.log('\nLogin credentials (all active):');
for (const doc of DOCTORS) {
  console.log(`  ${doc.email}  /  ${doc.password}  — ${doc.specialization}`);
}
process.exit(0);
