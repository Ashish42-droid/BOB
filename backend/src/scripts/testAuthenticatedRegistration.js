import fetch from 'node-fetch';

async function testAuthRegistration() {
  console.log('🔑 1. Logging in as Clinic Assistant (assistant@clinic.org)...');

  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'assistant@clinic.org', role: 'CLINIC_ASSISTANT' })
  });

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✅ Login successful! Issued JWT Token:', token ? token.slice(0, 30) + '...' : 'Missing');

  const testPayload = {
    name: 'Priya Sharma',
    age: 29,
    gender: 'Female',
    village: 'Rampur Village',
    phone: '+91 9876543210',
    preferred_language: 'Hindi',
    abha_number: '91-8822-1144-5566',
    emergency_contact: 'Sunil Sharma (+91 9876543211)'
  };

  console.log('📝 2. Submitting Patient Registration form with JWT Token...');
  const regRes = await fetch('http://localhost:5000/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testPayload)
  });

  const createdPatient = await regRes.json();
  console.log('Registration Response Status:', regRes.status);
  console.log('Created Patient Object:', createdPatient);

  if (regRes.status === 201 && createdPatient.patient_code) {
    console.log(`🎉 SUCCESS! Patient Code Generated: ${createdPatient.patient_code}`);
  } else {
    console.error('❌ Failed patient creation');
  }

  console.log('🔄 3. Simulating page reload by fetching patient list from GET /api/patients...');
  const getRes = await fetch('http://localhost:5000/api/patients', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const allPatients = await getRes.json();

  const found = Array.isArray(allPatients) && allPatients.find(p => p.patient_code === createdPatient.patient_code);
  if (found) {
    console.log('✅ VERIFIED PERSISTENCE ON PAGE RELOAD! Patient in real-time directory:', found.patient_code, found.name);
  } else {
    console.error('❌ Patient not found after page reload!');
  }
}

testAuthRegistration();
