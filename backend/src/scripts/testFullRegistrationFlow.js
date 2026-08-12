import fetch from 'node-fetch';

async function testRegistrationFlow() {
  console.log('🧪 Testing Full Real-Time Patient Registration Flow...');

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

  try {
    // 1. Submit Registration Form to Backend API
    const res = await fetch('http://localhost:5000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    const createdPatient = await res.json();
    console.log('Response Status:', res.status);
    console.log('Created Patient Data:', createdPatient);

    if (res.status === 201 && createdPatient.patient_code) {
      console.log(`✅ TEST PASSED! Generated Patient Code: ${createdPatient.patient_code}`);
    } else {
      console.error('❌ TEST FAILED: Unexpected response status or payload.');
    }

    // 2. Simulate Page Reload by Querying GET /api/patients
    console.log('🔄 Simulating page reload by fetching patient list from GET /api/patients...');
    const getRes = await fetch('http://localhost:5000/api/patients');
    const allPatients = await getRes.json();

    const found = allPatients.find(p => p.patient_code === createdPatient.patient_code);
    if (found) {
      console.log('🎉 VERIFIED ON PAGE RELOAD! Patient persisted in real-time directory:', found);
    } else {
      console.error('❌ Patient not found after page reload!');
    }

  } catch (err) {
    console.error('Test execution error:', err.message);
  }
}

testRegistrationFlow();
