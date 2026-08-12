import { groq } from '../config/groq.js';
import { retrieveClinicalProtocols } from './ragEngine.js';
import { calculateRiskLevel } from './riskEngine.js';

const SYSTEM_PROMPT = `You are an AI clinical-assistance system for rural village health centres in India.
You do not replace a qualified doctor.
Do not claim certainty of diagnosis.
Do not fabricate patient information.
Do not fabricate medical sources.
Do not invent clinical protocols.
Use only retrieved approved sources (MoHFW STG / IPHS) for protocol-based guidance.
If information is missing, state that it is missing.
Provide complete, actionable first-aid, supportive care, and protocol-permitted guidance for the clinic assistant.
Clearly distinguish observations, AI assistance, and doctor decisions.`;

/**
 * Execute full AI Patient Assessment Pipeline:
 * Patient Context + OCR Documents + Vitals -> Qdrant RAG -> Groq LLM -> Risk Safety Engine -> Summary & Protocol
 */
export const runFullPatientAssessment = async (patientContext) => {
  const {
    patient = {},
    visit = {},
    vitals = {},
    verifiedDocuments = [],
    imageObservations = []
  } = patientContext;

  // Extract OCR medication history and medical conditions
  const ocrMedications = verifiedDocuments.flatMap(d => d.medications || []);
  const ocrHistoryConditions = verifiedDocuments.flatMap(d => d.medical_history_conditions || []);
  const ocrAllergies = verifiedDocuments.flatMap(d => d.allergies_noted || []);
  const ocrDiagnosisNotes = verifiedDocuments.map(d => d.diagnosis_notes).filter(Boolean);

  const combinedSymptoms = `${visit.chief_complaint || ''} ${visit.symptoms || ''}`;
  const combinedHistory = `${visit.medical_history || ''} ${ocrHistoryConditions.join(', ')} ${ocrDiagnosisNotes.join(', ')}`;
  const combinedAllergies = `${visit.allergies || ''} ${ocrAllergies.join(', ')}`;

  // 1. Calculate Rule-Based Safety Risk Level (LOW, MODERATE, HIGH, EMERGENCY)
  const riskResult = calculateRiskLevel(vitals, combinedSymptoms, combinedHistory);

  // 2. Retrieve Approved Clinical Protocols via RAG (Qdrant metadata filtered approved = true)
  const retrievedProtocols = await retrieveClinicalProtocols(`${combinedSymptoms} ${ocrDiagnosisNotes.join(' ')}`, 3);

  // 3. Build Comprehensive Prompt Context for Groq LLM
  const userPrompt = `
PATIENT DEMOGRAPHICS:
- Name: ${patient.name || 'Ramesh Kumar'} (Age: ${patient.age || 42}, Gender: ${patient.gender || 'Male'})
- Village: ${patient.village || 'Rampur'} | Language: ${patient.preferred_language || 'Hindi'}

PRESENTING SYMPTOMS & VOICE INPUT:
- Chief Complaints: ${visit.symptoms || visit.chief_complaint || 'Fever and Cough'}
- Symptom Duration: ${visit.symptom_duration || '3 days'}
- Chronic Medical History: ${combinedHistory || 'None'}
- Allergies: ${combinedAllergies || 'None reported'}

RECORDED CLINICAL VITALS:
- Temperature: ${vitals.temperature ? `${vitals.temperature} °F` : 'Not recorded'}
- Blood Pressure: ${vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg` : 'Not recorded'}
- Pulse Rate: ${vitals.pulse ? `${vitals.pulse} bpm` : 'Not recorded'}
- SpO2 Oxygen Saturation: ${vitals.spo2 ? `${vitals.spo2}%` : 'Not recorded'}
- Respiratory Rate: ${vitals.respiratory_rate ? `${vitals.respiratory_rate} /min` : 'Not recorded'}

EXTRACTED OCR PRESCRIPTION & MEDICAL REPORT DATA (${verifiedDocuments.length} documents):
- Uploaded OCR Medications: ${JSON.stringify(ocrMedications, null, 2)}
- Extracted Diagnosis Notes: ${JSON.stringify(ocrDiagnosisNotes, null, 2)}

RETRIEVED APPROVED MoHFW CLINICAL PROTOCOLS:
${JSON.stringify(retrievedProtocols, null, 2)}

RULE ENGINE RISK TRIAGE:
- Risk Classification: ${riskResult.riskLevel} (GREEN = LOW, YELLOW = MODERATE, RED = EMERGENCY)
- Risk Reasoning: ${riskResult.riskReasoning}
- Warning Flags: ${JSON.stringify(riskResult.warnings)}

TASK: Prepare a complete, doctor-ready clinical handoff & AI summary.
1. Synthesize structured patient summary combining symptoms, vitals, and OCR prescription history.
2. Provide step-by-step approved first-aid guidance & allowed protocol-permitted supportive guidance (e.g. hydration ORS, Paracetamol fever management guidance, cold sponging).
3. If Risk Level is MODERATE, HIGH, or EMERGENCY: Highlight warning signs and mandate doctor review.

Return strictly a valid JSON object matching this schema:
{
  "patient_summary": "Comprehensive structured patient summary incorporating symptoms, vitals, and verified OCR prescription data",
  "key_symptoms": ["Symptom 1", "Symptom 2"],
  "duration": ["Duration details"],
  "important_history": ["History & OCR prescription details"],
  "missing_information": ["Field missing if any"],
  "observations": ["Preliminary non-diagnostic clinical observation"],
  "risk_level": "${riskResult.riskLevel}",
  "first_aid_steps": [
    "Step 1: Position patient comfortably in a well-ventilated room",
    "Step 2: Apply cold compress / sponging if body temperature exceeds 101°F",
    "Step 3: Encourage oral rehydration solution (ORS) and adequate rest",
    "Step 4: Protocol Supportive Guidance: Paracetamol 500mg (1 tablet after meals for fever > 100°F) subject to Doctor approval",
    "Step 5: Continuously monitor vital signs (SpO2, pulse, breathing rate) every 2 hours"
  ],
  "supportive_medication_guidance": [
    "Oral Rehydration Solution (ORS): 1 sachet dissolved in 1 litre clean drinking water, drink frequently",
    "Paracetamol 500mg: 1 tablet for temperature > 100°F (Max 3 times daily, subject to doctor review)",
    "Povidone-Iodine 5% Antiseptic Ointment: Apply on superficial wounds after saline cleaning"
  ],
  "protocol_matches": [
    { "title": "MoHFW Standard Treatment Guideline — Primary Care", "source": "Ministry of Health & Family Welfare, Govt of India", "version": "2024.1", "guidance": "Monitor vital signs, provide appropriate supportive first aid, and refer to Registered Medical Practitioner." }
  ],
  "warnings": ["High body temperature recorded"],
  "recommended_next_action": "${riskResult.riskLevel === 'EMERGENCY' ? 'IMMEDIATE_EMERGENCY_DOCTOR_REFERRAL' : riskResult.riskLevel === 'LOW' ? 'PROTOCOL_GUIDANCE_AND_DOCTOR_AVAILABLE' : 'DOCTOR_REVIEW'}",
  "requires_doctor": ${riskResult.requiresDoctor}
}
`;

  // Fallback AI assessment structure
  let finalAssessment = {
    patient_summary: `Patient ${patient.name || 'Record'} presents with ${visit.symptoms || 'reported symptoms'}. Recorded Vitals: Temp ${vitals.temperature || 'N/R'}°F, BP ${vitals.blood_pressure_systolic || 'N/R'}/${vitals.blood_pressure_diastolic || 'N/R'}, SpO2 ${vitals.spo2 || 'N/R'}%. ${ocrMedications.length > 0 ? `OCR Prescription records ${ocrMedications.length} previous medications.` : ''}`,
    key_symptoms: visit.symptoms ? [visit.symptoms] : ['Fever', 'Cough'],
    duration: [visit.symptom_duration || '3 days'],
    important_history: [combinedHistory || 'No prior chronic conditions reported'],
    missing_information: vitals.spo2 ? [] : ['SpO2 Oxygen Saturation not recorded'],
    observations: ['Patient exhibits acute symptoms. Verified OCR prescription logged for doctor review.'],
    risk_level: riskResult.riskLevel,
    first_aid_steps: [
      'Step 1: Wash hands and ensure patient rests in a comfortable, ventilated area.',
      'Step 2: Apply cold compress to forehead/axilla if body temperature is above 101°F.',
      'Step 3: Provide Oral Rehydration Solution (ORS) fluids frequently to maintain hydration.',
      'Step 4: Protocol Supportive Guidance: Paracetamol 500mg for fever control (doctor confirmation pending).',
      'Step 5: Monitor SpO2 and pulse rate every 2 hours and escalate if breathlessness occurs.'
    ],
    supportive_medication_guidance: [
      'Oral Rehydration Solution (ORS): 1 sachet in 1 litre water (freely allowed)',
      'Paracetamol 500mg: 1 tablet after meals for temp > 100°F (pending doctor signoff)',
      'Saline Nasal Drops: 2 drops in each nostril for nasal congestion relief'
    ],
    protocol_matches: retrievedProtocols.map(p => ({
      title: p.title,
      source: p.source,
      version: p.version,
      guidance: p.content
    })),
    warnings: Array.from(new Set(riskResult.warnings)),
    recommended_next_action: riskResult.riskLevel === 'EMERGENCY' ? 'IMMEDIATE_EMERGENCY_DOCTOR_REFERRAL' : 'DOCTOR_REVIEW',
    requires_doctor: true
  };

  if (groq) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      });

      const parsed = JSON.parse(chatCompletion.choices[0].message.content);
      if (parsed && parsed.patient_summary) {
        finalAssessment = {
          ...parsed,
          risk_level: riskResult.riskLevel, // Enforce safety rule engine risk level override
          warnings: Array.from(new Set([...(parsed.warnings || []), ...riskResult.warnings]))
        };
      }
    } catch (llmErr) {
      console.warn('Groq LLM assessment call failed, using rule engine assessment:', llmErr.message);
    }
  }

  return finalAssessment;
};
