import { runFullPatientAssessment } from '../services/aiOrchestrator.js';

async function testLLM() {
  console.log('🧪 Testing Groq LLM Patient Assessment...');

  const result = await runFullPatientAssessment({
    patient: { name: 'Priyam Mishra', age: 26, gender: 'male', village: 'Rampur' },
    visit: { chief_complaint: 'Tez bukhar 3 din se aur khansi', symptoms: 'High fever for 3 days and dry cough', symptom_duration: '3 days' },
    vitals: { temperature: 101.2, blood_pressure_systolic: 120, blood_pressure_diastolic: 80, pulse: 88, spo2: 97, respiratory_rate: 18 },
    verifiedDocuments: [
      { medications: [{ name: 'Paracetamol', strength: '500mg', frequency: 'TDS', duration: '5 days' }] }
    ],
    imageObservations: []
  });

  console.log('🎉 Groq LLM Full Assessment Output:');
  console.log(JSON.stringify(result, null, 2));
}

testLLM();
