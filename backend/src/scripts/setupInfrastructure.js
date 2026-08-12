import { supabaseAdmin } from '../config/supabase.js';

/**
 * One-time infrastructure setup (safe to re-run):
 *  1. Creates Supabase Storage buckets used by the upload pipeline.
 *  2. Creates demo staff accounts in Supabase Auth (email + password)
 *     and their matching staff_profiles / doctor_profiles rows.
 *  3. Seeds approved MoHFW clinical protocols used by the RAG engine.
 *
 * Run: node src/scripts/setupInfrastructure.js
 */

const BUCKETS = ['medical-docs', 'injury-photos'];

const DEMO_STAFF = [
  {
    email: 'assistant@clinic.org',
    password: 'Assist@123',
    full_name: 'Sunita Devi',
    role: 'clinic_assistant',
    phone: '+91 9876500001'
  },
  {
    email: 'doctor@clinic.org',
    password: 'Doctor@123',
    full_name: 'Dr. Rajesh Verma',
    role: 'doctor',
    phone: '+91 9876500002',
    doctor: {
      registration_number: 'MCI-2011-45872',
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (AIIMS New Delhi)'
    }
  },
  {
    email: 'admin@clinic.org',
    password: 'Admin@123',
    full_name: 'Dr. Ananya Sen',
    role: 'admin',
    phone: '+91 9876500003'
  }
];

const PROTOCOLS = [
  {
    protocol_code: 'MOHFW-FA-WOUND-001',
    title: 'Minor Superficial Wound & Abrasion First-Aid Protocol',
    category: 'First Aid',
    description:
      'PROCEDURE: 1. Wash hands with soap and water or use hand sanitizer. 2. Irrigate the wound with clean running water or sterile normal saline. 3. Apply povidone-iodine 5% antiseptic to the wound surface. 4. Cover with a sterile gauze dressing and secure with a bandage. 5. Advise the patient to keep the wound clean and dry, and to return for dressing change in 48 hours. ESCALATE TO DOCTOR IF: bleeding continues beyond 10 minutes of direct pressure, pus or spreading redness appears, fever develops, or pain worsens rapidly.',
    steps: [
      'Wash hands thoroughly with soap and water before touching the wound.',
      'Irrigate the wound with clean running water or sterile normal saline for at least 1 minute.',
      'Apply povidone-iodine 5% antiseptic solution to the cleaned wound surface.',
      'Cover the wound with a sterile gauze dressing and secure it with a clean bandage.',
      'Advise the patient to keep the wound dry and return in 48 hours for a dressing change.'
    ]
  },
  {
    protocol_code: 'MOHFW-GM-FEVER-002',
    title: 'Acute Febrile Illness (Fever under 3 Days) Triage Protocol',
    category: 'General Medicine',
    description:
      'PROCEDURE: 1. Record temperature, pulse, blood pressure, respiratory rate and SpO2. 2. Encourage oral fluids and Oral Rehydration Solution (ORS). 3. Apply cold sponging if temperature exceeds 101°F. 4. Paracetamol 500 mg orally may be given for fever above 100°F in adults (subject to doctor approval), maximum 3 doses in 24 hours. 5. Screen for danger signs: stiff neck, confusion, breathing difficulty, petechial rash, persistent vomiting. ESCALATE TO DOCTOR IF: SpO2 below 94%, severe headache, seizure, or any danger sign is present.',
    steps: [
      'Record temperature, pulse, blood pressure, respiratory rate and SpO2.',
      'Encourage frequent oral fluids; prepare ORS (1 sachet in 1 litre of clean water).',
      'Apply cold sponging to forehead and axillae if temperature exceeds 101°F.',
      'Paracetamol 500 mg orally for fever above 100°F in adults — subject to doctor approval; maximum 3 doses in 24 hours.',
      'Screen for danger signs: stiff neck, confusion, breathing difficulty, rash, persistent vomiting — escalate immediately if present.'
    ]
  },
  {
    protocol_code: 'MOHFW-EM-TRIAGE-003',
    title: 'Emergency Triage & Escalation Protocol',
    category: 'Emergency',
    description:
      'RED-FLAG CONDITIONS REQUIRING IMMEDIATE ESCALATION: SpO2 below 90%, severe breathing difficulty or chest pain, unconsciousness or altered mental state, systolic BP below 90 mmHg or 180 mmHg and above, major trauma or uncontrolled bleeding, seizure in progress. ACTION: Stop all protocol-based care. Alert the on-call doctor immediately, keep the patient monitored, and arrange emergency ambulance transfer to the district hospital.',
    steps: [
      'Identify red flags: SpO2 < 90%, chest pain, unconsciousness, systolic BP < 90 or >= 180 mmHg, major bleeding, seizure.',
      'Stop all automated protocol care immediately.',
      'Alert the on-call doctor by video call without delay.',
      'Keep the patient under continuous vital-sign monitoring.',
      'Arrange emergency ambulance transfer to the nearest district hospital.'
    ]
  },
  {
    protocol_code: 'MOHFW-GI-DIARR-004',
    title: 'Acute Diarrhoea & Dehydration Management Protocol',
    category: 'General Medicine',
    description:
      'PROCEDURE: 1. Assess hydration: skin pinch, sunken eyes, urine output, thirst. 2. Start ORS immediately — small frequent sips; for adults 200-400 ml after each loose stool. 3. Continue normal feeding; zinc 20 mg daily for 14 days in children (subject to doctor approval). 4. Do NOT give antibiotics or anti-motility drugs without doctor review. ESCALATE TO DOCTOR IF: blood in stool, signs of severe dehydration, persistent vomiting, high fever, or symptoms beyond 3 days.',
    steps: [
      'Assess hydration status: skin pinch, sunken eyes, urine output and thirst level.',
      'Start ORS immediately with small frequent sips (adults: 200-400 ml after each loose stool).',
      'Continue normal feeding and fluids; do not restrict food.',
      'Do not give antibiotics or anti-diarrhoeal drugs without doctor review.',
      'Escalate if blood in stool, severe dehydration signs, persistent vomiting or fever are present.'
    ]
  },
  {
    protocol_code: 'MOHFW-RS-COUGH-005',
    title: 'Upper Respiratory Infection & Cough Care Protocol',
    category: 'General Medicine',
    description:
      'PROCEDURE: 1. Record temperature and SpO2. 2. Advise warm saline gargles three times daily and steam inhalation twice daily. 3. Encourage warm fluids and rest. 4. Paracetamol 500 mg for fever or body ache in adults (subject to doctor approval). 5. Saline nasal drops for congestion. Antibiotics are NOT indicated for uncomplicated viral upper respiratory infection and must never be started without a doctor prescription. ESCALATE TO DOCTOR IF: breathing difficulty, SpO2 below 94%, chest pain, cough beyond 2 weeks, or blood in sputum.',
    steps: [
      'Record temperature, respiratory rate and SpO2.',
      'Advise warm saline gargles three times daily and steam inhalation twice daily.',
      'Encourage warm fluids, soft diet and adequate rest.',
      'Paracetamol 500 mg for fever or body ache in adults — subject to doctor approval.',
      'Never start antibiotics without a doctor prescription; escalate if breathing difficulty, SpO2 < 94% or cough beyond 2 weeks.'
    ]
  }
];

async function setupBuckets() {
  console.log('\n📦 STORAGE BUCKETS');
  const { data: existing } = await supabaseAdmin.storage.listBuckets();
  const existingNames = (existing || []).map((b) => b.name);

  for (const bucket of BUCKETS) {
    if (existingNames.includes(bucket)) {
      console.log(`  ✅ Bucket '${bucket}' already exists`);
      continue;
    }
    const { error } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: '20MB'
    });
    console.log(error ? `  ❌ Bucket '${bucket}': ${error.message}` : `  ✅ Bucket '${bucket}' created (public)`);
  }
}

async function setupStaff() {
  console.log('\n👥 DEMO STAFF ACCOUNTS (Supabase Auth + staff_profiles)');

  for (const staff of DEMO_STAFF) {
    // 1. Supabase Auth user (holds the password)
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: staff.email,
      password: staff.password,
      email_confirm: true,
      user_metadata: { full_name: staff.full_name, role: staff.role }
    });

    if (authErr && !/already.*(registered|exists)/i.test(authErr.message)) {
      console.log(`  ⚠️ Auth user ${staff.email}: ${authErr.message}`);
    } else {
      console.log(`  ✅ Auth user ready: ${staff.email}${created?.user ? ' (created)' : ' (already existed)'}`);
    }

    // 2. staff_profiles row
    const { data: existingProfile } = await supabaseAdmin
      .from('staff_profiles')
      .select('id')
      .eq('email', staff.email)
      .maybeSingle();

    let profileId = existingProfile?.id;
    if (!profileId) {
      const { data: inserted, error: profErr } = await supabaseAdmin
        .from('staff_profiles')
        .insert([{
          full_name: staff.full_name,
          role: staff.role,
          email: staff.email,
          phone: staff.phone,
          status: 'active'
        }])
        .select('id')
        .single();
      if (profErr) {
        console.log(`  ❌ staff_profiles ${staff.email}: ${profErr.message}`);
        continue;
      }
      profileId = inserted.id;
      console.log(`  ✅ staff_profiles created for ${staff.email}`);
    } else {
      console.log(`  ✅ staff_profiles exists for ${staff.email}`);
    }

    // 3. doctor_profiles row for doctors
    if (staff.doctor && profileId) {
      const { error: docErr } = await supabaseAdmin
        .from('doctor_profiles')
        .upsert([{ staff_id: profileId, ...staff.doctor }], { onConflict: 'staff_id' });
      console.log(docErr ? `  ⚠️ doctor_profiles: ${docErr.message}` : `  ✅ doctor_profiles ready for ${staff.email}`);
    }
  }
}

async function setupProtocols() {
  console.log('\n📚 CLINICAL PROTOCOLS (RAG knowledge base)');

  for (const proto of PROTOCOLS) {
    const { data: existing } = await supabaseAdmin
      .from('clinical_protocols')
      .select('id')
      .eq('protocol_code', proto.protocol_code)
      .maybeSingle();

    if (existing) {
      console.log(`  ✅ Protocol exists: ${proto.protocol_code}`);
      continue;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('clinical_protocols')
      .insert([{
        protocol_code: proto.protocol_code,
        title: proto.title,
        category: proto.category,
        description: proto.description,
        source_organization: 'Ministry of Health & Family Welfare, Govt of India',
        source_document: 'Standard Treatment Guidelines - Primary Care 2024',
        source_url: 'https://main.mohfw.gov.in',
        version: '2024.1',
        is_active: true
      }])
      .select('id')
      .single();

    if (error) {
      console.log(`  ❌ Protocol ${proto.protocol_code}: ${error.message}`);
      continue;
    }

    const stepRows = proto.steps.map((instruction, i) => ({
      protocol_id: inserted.id,
      step_number: i + 1,
      instruction
    }));
    const { error: stepErr } = await supabaseAdmin.from('clinical_protocol_steps').insert(stepRows);
    console.log(stepErr
      ? `  ⚠️ Protocol ${proto.protocol_code} steps: ${stepErr.message}`
      : `  ✅ Protocol seeded: ${proto.protocol_code} (${proto.steps.length} steps)`);
  }
}

console.log('======================================================');
console.log('VIRTUAL VILLAGE CLINIC — INFRASTRUCTURE SETUP');
console.log('======================================================');
await setupBuckets();
await setupStaff();
await setupProtocols();
console.log('\n✅ Setup complete.\n');
process.exit(0);
